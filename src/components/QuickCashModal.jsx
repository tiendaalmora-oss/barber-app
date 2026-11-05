import React, { useState, useEffect } from 'react'
import { X, Check, DollarSign, User, Scissors, ShoppingBag, Plus, Minus, Trash2, CreditCard, Smartphone, ShieldCheck, AlertCircle, Receipt } from 'lucide-react'
import PhoneCountryInput from './PhoneCountryInput'
import { normalizeWhatsAppPhone } from '../lib/dateUtils'

export default function QuickCashModal({
  isOpen,
  onClose,
  nicheData,
  exchangeRate,
  businessProfile = {},
  onRegisterTransaction,
  clients = [],
  prefillData = null
}) {
  const [selectedStaff, setSelectedStaff] = useState(nicheData.staff[0]?.id || '')
  const [activeItemTab, setActiveItemTab] = useState('servicios') // 'servicios' | 'productos'
  const [paymentMethod, setPaymentMethod] = useState('pago_movil')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  // Multi-item cart: holds services and products on the same bill
  const [cart, setCart] = useState([])
  const [tipUSD, setTipUSD] = useState(0)
  const [tipCurrency, setTipCurrency] = useState('USD') // 'USD' | 'Bs'
  const [customTip, setCustomTip] = useState('')
  const [completedTx, setCompletedTx] = useState(null)

  // Pre-fill fields whenever opened from an appointment or normal trigger
  useEffect(() => {
    if (!isOpen) return

    setTipUSD(0)
    setCustomTip('')

    if (prefillData) {
      setClientName(prefillData.clientName || '')
      setClientPhone(prefillData.clientPhone || '')
      if (prefillData.staffId) {
        setSelectedStaff(prefillData.staffId)
      } else if (nicheData.staff[0]?.id) {
        setSelectedStaff(nicheData.staff[0].id)
      }

      // Pre-fill cart with the appointment's service
      const svcMatch = (nicheData.services || []).find(s => 
        s.name.toLowerCase() === (prefillData.serviceName || '').toLowerCase()
      )

      if (svcMatch) {
        const itemComm = (!svcMatch.isProduct && Number(svcMatch.commission_pct) > 0)
          ? Number(svcMatch.commission_pct)
          : (staffObj?.commission_pct || 50)
        setCart([{
          id: svcMatch.id,
          name: svcMatch.name,
          price_usd: svcMatch.price_usd,
          commission_pct: itemComm,
          isProduct: false,
          qty: 1
        }])
      } else if (prefillData.serviceName) {
        setCart([{
          id: 'svc_' + Date.now(),
          name: prefillData.serviceName,
          price_usd: 5,
          commission_pct: staffObj?.commission_pct || 50,
          isProduct: false,
          qty: 1
        }])
      }
    } else {
      // Normal open: reset or default
      setClientName('')
      setClientPhone('')
      if (nicheData.staff[0]?.id) setSelectedStaff(nicheData.staff[0].id)
      const firstSvc = nicheData.services[0]
      const firstComm = firstSvc && Number(firstSvc.commission_pct) > 0
        ? Number(firstSvc.commission_pct)
        : (nicheData.staff[0]?.commission_pct || 50)
      setCart(firstSvc ? [{
        id: firstSvc.id,
        name: firstSvc.name,
        price_usd: firstSvc.price_usd,
        commission_pct: firstComm,
        isProduct: false,
        qty: 1
      }] : [])
    }
  }, [isOpen, prefillData])

  if (!isOpen) return null

  // Resolve staff
  const staffObj = nicheData.staff.find(s => s.id === selectedStaff) || nicheData.staff[0]
  const commissionPct = staffObj?.commission_pct || 50

  const servicesList = nicheData.services || []
  const productsList = nicheData.products || []

  // Add or increment item
  const handleAddItem = (item, isProduct) => {
    setCart(prev => {
      const idx = prev.findIndex(ci => ci.id === item.id)
      if (idx >= 0) {
        return prev.map((ci, i) => i === idx ? { ...ci, qty: ci.qty + 1 } : ci)
      } else {
        const itemComm = (!isProduct && Number(item.commission_pct) > 0)
          ? Number(item.commission_pct)
          : (staffObj?.commission_pct || 50)
        return [...prev, {
          id: item.id,
          name: item.name,
          price_usd: item.price_usd,
          isProduct: isProduct,
          cost_usd: item.cost_usd,
          stock: item.stock,
          commission_pct: itemComm,
          qty: 1
        }]
      }
    })
  }

  const handleUpdateItemCommission = (itemId, nextPct) => {
    setCart(prev => prev.map(ci => ci.id === itemId ? { ...ci, commission_pct: Number(nextPct) || 0 } : ci))
  }

  // Adjust quantity
  const handleUpdateQty = (itemId, delta) => {
    setCart(prev => {
      return prev.map(ci => {
        if (ci.id === itemId) {
          const nextQty = ci.qty + delta
          return nextQty > 0 ? { ...ci, qty: nextQty } : null
        }
        return ci
      }).filter(Boolean)
    })
  }

  // Remove single item
  const handleRemoveItem = (itemId) => {
    setCart(prev => prev.filter(ci => ci.id !== itemId))
  }

  // Clear all items
  const handleClearCart = () => {
    setCart([])
  }

  // Totals & Commission math
  const totalUSD = cart.reduce((sum, ci) => sum + (ci.price_usd * ci.qty), 0)
  const totalBs = (totalUSD * exchangeRate).toFixed(2)

  // Commission is earned strictly on services, respecting custom % per service
  const staffCommissionUSD = cart
    .filter(ci => !ci.isProduct)
    .reduce((sum, ci) => {
      const pct = typeof ci.commission_pct === 'number' ? ci.commission_pct : commissionPct
      return sum + (ci.price_usd * ci.qty * (pct / 100))
    }, 0)
  const businessProfitUSD = totalUSD - staffCommissionUSD

  // Grand total including tip
  const grandTotalUSD = totalUSD + tipUSD
  const grandTotalBs = (grandTotalUSD * exchangeRate).toFixed(2)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (totalUSD <= 0 || cart.length === 0) {
      alert('Por favor agrega al menos un servicio o producto para registrar el cobro.')
      return
    }

    const combinedItemName = cart.map(ci => ci.qty > 1 ? `${ci.qty}x ${ci.name}` : ci.name).join(' + ')
    const productItems = cart.filter(ci => ci.isProduct).map(ci => ({ id: ci.id, qty: ci.qty }))

    const transaction = {
      id: 'tx_' + Date.now(),
      type: 'ingreso',
      item_name: combinedItemName,
      product_id: productItems[0]?.id || null, // backward compatibility
      product_items: productItems,
      items: cart,
      category: cart.some(ci => ci.isProduct) && cart.some(ci => !ci.isProduct) 
        ? 'Corte + Producto' 
        : cart.some(ci => ci.isProduct) ? 'Venta Productos' : 'Cortes',
      staff_name: staffObj?.name || 'Venta del Local',
      staff_id: staffObj?.id,
      client_name: clientName.trim() || 'Cliente Mostrador',
      client_phone: clientPhone.trim() || '',
      monto_usd: totalUSD, // Ingreso neto del local por servicios y productos
      monto_bs: parseFloat(totalBs),
      propina_usd: tipUSD, // Propina registrada aparte
      propina_bs: parseFloat((tipUSD * exchangeRate).toFixed(2)),
      propina_moneda_origen: tipCurrency,
      total_cobrado_usd: grandTotalUSD, // Total cobrado al cliente
      total_cobrado_bs: parseFloat(grandTotalBs),
      propina_staff_id: tipUSD > 0 ? staffObj?.id : null,
      propina_staff_name: tipUSD > 0 ? (staffObj?.name || 'Venta del Local') : null,
      tasa_bcv: exchangeRate,
      metodo_pago: paymentMethod,
      comision_usd: staffCommissionUSD,
      ganancia_negocio_usd: businessProfitUSD,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fecha: new Date().toISOString(),
      appointment_id: prefillData?.appointmentId || null
    }

    onRegisterTransaction(transaction)
    setCompletedTx(transaction)
  }

  // If completedTx is active, show the Digital Invoice screen!
  if (completedTx) {
    const cleanPhone = normalizeWhatsAppPhone(completedTx.client_phone || '')
    const bizName = businessProfile?.businessName || 'Mi Negocio'
    
    const handleSendWhatsAppInvoice = () => {
      let msg = `🧾 *FACTURA / RECIBO DE PAGO • ${bizName.toUpperCase()}*\n`
      msg += `👤 *Cliente:* ${completedTx.client_name}\n`
      msg += `💈 *Atendido por:* ${completedTx.staff_name}\n`
      msg += `📅 *Fecha:* ${completedTx.fecha ? completedTx.fecha.split('T')[0] : 'Hoy'} - ${completedTx.hora}\n`
      msg += `------------------------------------\n`
      msg += `✂️ *DETALLE DE SU CUENTA:*\n`
      ;(completedTx.items || []).forEach(it => {
        msg += `• ${it.qty > 1 ? `${it.qty}x ` : ''}${it.name}: $${(it.price_usd * (it.qty || 1)).toFixed(2)}\n`
      })
      if (completedTx.propina_usd > 0) {
        msg += `🪙 *Propina:* $${completedTx.propina_usd.toFixed(2)} USD (Bs. ${completedTx.propina_bs.toFixed(2)})\n`
      }
      msg += `------------------------------------\n`
      msg += `💰 *TOTAL PAGADO: $${completedTx.total_cobrado_usd.toFixed(2)} USD*\n`
      msg += `👉 *Al cambio BCV: Bs. ${completedTx.total_cobrado_bs.toFixed(2)}*\n`
      msg += `💳 *Método de pago:* ${(completedTx.metodo_pago || '').replace(/_/g, ' ').toUpperCase()}\n\n`
      msg += `¡Gracias por visitarnos, te esperamos pronto! ✨`

      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`
      window.open(url, '_blank')
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <div className="bg-dark-900 border-2 border-emerald-500/50 w-full max-w-md rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              ✓ Cobro Registrado en Caja
            </span>
            <h3 className="text-xl font-black text-white mt-1">
              Comprobante de Pago
            </h3>
            <p className="text-xs text-slate-400">
              {bizName} • {completedTx.hora}
            </p>
          </div>

          {/* Ticket Body */}
          <div className="bg-dark-950 p-4 rounded-2xl border border-dark-800 text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between font-sans">
              <span className="text-slate-400">Cliente:</span>
              <span className="font-bold text-white">{completedTx.client_name}</span>
            </div>
            <div className="flex justify-between font-sans">
              <span className="text-slate-400">Atendió:</span>
              <span className="font-bold text-gold-400">{completedTx.staff_name}</span>
            </div>
            <div className="pt-2 border-t border-dark-800 space-y-1">
              {(completedTx.items || []).map((it, idx) => (
                <div key={idx} className="flex justify-between text-slate-300">
                  <span className="truncate pr-2">{it.qty > 1 ? `${it.qty}x ` : ''}{it.name}</span>
                  <span className="font-bold">${(it.price_usd * (it.qty || 1)).toFixed(2)}</span>
                </div>
              ))}
              {completedTx.propina_usd > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>🪙 Propina:</span>
                  <span className="font-bold">+${completedTx.propina_usd.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-dark-800 flex justify-between font-sans text-sm font-black">
              <span className="text-white">TOTAL COBRADO:</span>
              <span className="text-emerald-400 font-mono text-base">${completedTx.total_cobrado_usd.toFixed(2)}</span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              Bs. {completedTx.total_cobrado_bs.toFixed(2)} (Tasa: {exchangeRate.toFixed(2)})
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSendWhatsAppInvoice}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Smartphone className="w-4 h-4 stroke-[2.5]" />
              <span>Enviar Factura por WhatsApp</span>
            </button>

            <button
              onClick={() => {
                setCompletedTx(null)
                onClose()
              }}
              className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold transition-all"
            >
              Listo / Siguiente Cobro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-lg rounded-2xl shadow-2xl p-5 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Anotar Cobro en Caja</h3>
              <p className="text-xs text-slate-400">Agrega cortes y productos a la misma factura</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {prefillData && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-emerald-300 mt-2 shrink-0">
            <span>📅 Cobrando turno de <strong>{prefillData.clientName}</strong></span>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Auto-Cita</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          
          {/* 1. Seleccionar Barbero / Personal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              1. ¿Quién atendió? ({nicheData.roleName})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {nicheData.staff.map((st) => (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => setSelectedStaff(st.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedStaff === st.id
                      ? 'bg-gold-500/15 border-gold-500/60 text-white shadow-sm'
                      : 'bg-dark-800 border-dark-700/60 text-slate-300 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-base mb-1">
                    <span>{st.avatar}</span>
                    <span className="text-xs font-bold truncate">{st.name.split(' ')[0]}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Comisión: <span className="text-gold-400 font-semibold">{st.commission_pct}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Seleccionar Servicios y Productos Múltiples */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                2. Elige los Servicios y Productos:
              </label>
              <div className="flex items-center gap-1 bg-dark-800 p-0.5 rounded-lg border border-dark-750">
                <button
                  type="button"
                  onClick={() => setActiveItemTab('servicios')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                    activeItemTab === 'servicios'
                      ? 'bg-gold-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  <span>Servicios ({servicesList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveItemTab('productos')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                    activeItemTab === 'productos'
                      ? 'bg-gold-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>Productos ({productsList.length})</span>
                </button>
              </div>
            </div>

            {/* Grid de Ítems según la pestaña activa */}
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-dark-950 rounded-xl border border-dark-800">
              {activeItemTab === 'servicios' ? (
                servicesList.map(item => {
                  const inCart = cart.find(ci => ci.id === item.id)
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleAddItem(item, false)}
                      className={`cursor-pointer p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        inCart
                          ? 'bg-gold-500/15 border-gold-500 text-white shadow-sm'
                          : 'bg-dark-850 border-dark-750 text-slate-300 hover:border-dark-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold leading-tight line-clamp-1">{item.name}</span>
                        {inCart && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gold-500 text-black font-black shrink-0">
                            {inCart.qty}x
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-dark-800/60">
                        <span className="text-xs font-black text-emerald-400">${item.price_usd}</span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Bs. {(item.price_usd * exchangeRate).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )
                })
              ) : (
                productsList.length === 0 ? (
                  <div className="col-span-2 py-4 text-center text-xs text-slate-500">
                    No tienes productos registrados en tu Inventario.
                  </div>
                ) : (
                  productsList.map(item => {
                    const inCart = cart.find(ci => ci.id === item.id)
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAddItem(item, true)}
                        className={`cursor-pointer p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                          inCart
                            ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                            : 'bg-dark-850 border-dark-750 text-slate-300 hover:border-dark-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold leading-tight line-clamp-1">{item.name}</span>
                          {inCart && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-black font-black shrink-0">
                              {inCart.qty}x
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-dark-800/60">
                          <div>
                            <span className="text-xs font-black text-emerald-400">${item.price_usd}</span>
                            <span className="text-[9px] text-blue-400 ml-1 font-mono">
                              (Disp: {item.stock})
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono">
                            Bs. {(item.price_usd * exchangeRate).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )
              )}
            </div>

            {/* Ticket de la Cuenta (Carrito Interactivo) */}
            <div className="p-2.5 rounded-xl bg-dark-850 border border-dark-750 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-dark-800">
                <span>Factura / Cuenta ({cart.reduce((s, ci) => s + ci.qty, 0)} ítems):</span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-[10px] text-red-400 hover:underline flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vaciar</span>
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-500 italic">
                  Toca arriba para agregar cortes y productos a la factura
                </div>
              ) : (
                <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                  {cart.map(ci => (
                    <div key={ci.id} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span className="text-xs">{ci.isProduct ? '🧴' : '✂️'}</span>
                        <span className="font-semibold text-white truncate text-[11px]">{ci.name}</span>
                        {!ci.isProduct && (
                          <span 
                            title={`Comisión: ${ci.commission_pct || commissionPct}%`}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold shrink-0 font-mono"
                          >
                            {ci.commission_pct || commissionPct}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-dark-900 border border-dark-750 rounded-lg px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(ci.id, -1)}
                            className="w-4 h-4 rounded text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-mono font-bold text-gold-400 px-1">{ci.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(ci.id, 1)}
                            className="w-4 h-4 rounded text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-xs w-14 text-right">
                          ${(ci.price_usd * ci.qty).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(ci.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5"
                          title="Eliminar de la cuenta"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Método de Pago (Venezuela Criollo) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              3. ¿Cómo pagó el cliente?
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'pago_movil', label: 'Pago Móvil', badge: 'Bs. Banco' },
                { id: 'efectivo_usd', label: 'Efectivo $', badge: 'Gaveta' },
                { id: 'punto_de_venta', label: 'Punto Venta', badge: 'Bs. Tarjeta' },
                { id: 'zelle', label: 'Zelle / Binance', badge: 'Dólares' },
                { id: 'fiado', label: 'Fiado (Debe)', badge: 'Pendiente' },
              ].map(method => (
                <button
                  type="button"
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    paymentMethod === method.id
                      ? 'bg-blue-500/20 border-blue-500/60 text-white font-bold'
                      : 'bg-dark-800 border-dark-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] leading-tight">{method.label}</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">{method.badge}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre y WhatsApp del cliente (para Retargeting y Fidelidad) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                list="existing-clients-list"
                placeholder="Nombre del cliente (suma sello VIP)"
                value={clientName}
                onChange={(e) => {
                  const val = e.target.value
                  setClientName(val)
                  const match = clients.find(c => c.name.toLowerCase() === val.toLowerCase())
                  if (match && match.phone) setClientPhone(match.phone)
                }}
                className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
              />
              <datalist id="existing-clients-list">
                {clients.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <PhoneCountryInput
                value={clientPhone}
                onChange={setClientPhone}
                placeholder="WhatsApp del cliente"
              />
            </div>
          </div>

          {/* 4. Propina para el Profesional (Aparte) */}
          <div className="p-3 rounded-xl bg-dark-950/70 border border-dark-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>🪙 Propina {staffObj?.name.split(' ')[0] ? `para ${staffObj.name.split(' ')[0]}` : ''} (Aparte)</span>
              </label>

              {/* Currency Toggle: [$ USD] | [Bs. Bolívares] */}
              <div className="flex items-center gap-1 bg-dark-900 border border-dark-750 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setTipCurrency('USD')
                    setTipUSD(0)
                    setCustomTip('')
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    tipCurrency === 'USD'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  $ Dólares
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipCurrency('Bs')
                    setTipUSD(0)
                    setCustomTip('')
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    tipCurrency === 'Bs'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bs. Bolívares
                </button>
              </div>
            </div>

            {/* Current tip readout */}
            {tipUSD > 0 && (
              <div className="text-right">
                <span className="text-[11px] font-mono font-bold text-amber-400">
                  {tipCurrency === 'Bs'
                    ? `Bs. ${(tipUSD * exchangeRate).toFixed(0)} (~$${tipUSD.toFixed(2)} USD)`
                    : `+$${tipUSD.toFixed(2)} USD (Bs. ${(tipUSD * exchangeRate).toFixed(2)})`}
                </span>
              </div>
            )}

            {/* Quick chips depending on selected currency */}
            {tipCurrency === 'USD' ? (
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 1, 2, 5].map(amt => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => {
                      setTipUSD(amt)
                      setCustomTip('')
                    }}
                    className={`py-1.5 rounded-xl border text-center transition-all text-xs font-bold font-mono ${
                      tipUSD === amt && customTip === ''
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-dark-800 border-dark-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {amt === 0 ? 'Sin propina' : `+$${amt}`}
                  </button>
                ))}
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Otro $"
                    value={customTip}
                    onChange={(e) => {
                      const val = e.target.value
                      setCustomTip(val)
                      const num = parseFloat(val)
                      setTipUSD(!isNaN(num) && num > 0 ? num : 0)
                    }}
                    className={`w-full py-1.5 px-2 rounded-xl bg-dark-800 border text-center text-xs font-mono font-bold focus:outline-none ${
                      customTip !== ''
                        ? 'border-amber-500 text-amber-300'
                        : 'border-dark-700/60 text-slate-400 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 50, 100, 200].map(amtBs => {
                  const amtUSD = amtBs > 0 && exchangeRate > 0 ? (amtBs / exchangeRate) : 0
                  const isSelected = customTip === '' && (
                    amtBs === 0 ? tipUSD === 0 : Math.abs((tipUSD * exchangeRate) - amtBs) < 1.5
                  )
                  return (
                    <button
                      type="button"
                      key={amtBs}
                      onClick={() => {
                        setTipUSD(amtUSD)
                        setCustomTip('')
                      }}
                      className={`py-1.5 rounded-xl border text-center transition-all text-xs font-bold font-mono ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-dark-800 border-dark-700/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      {amtBs === 0 ? 'Sin propina' : `+Bs.${amtBs}`}
                    </button>
                  )
                })}
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    min="0"
                    placeholder="Otro Bs."
                    value={customTip}
                    onChange={(e) => {
                      const val = e.target.value
                      setCustomTip(val)
                      const num = parseFloat(val)
                      if (!isNaN(num) && num > 0 && exchangeRate > 0) {
                        setTipUSD(num / exchangeRate)
                      } else {
                        setTipUSD(0)
                      }
                    }}
                    className={`w-full py-1.5 px-2 rounded-xl bg-dark-800 border text-center text-xs font-mono font-bold focus:outline-none ${
                      customTip !== ''
                        ? 'border-amber-500 text-amber-300'
                        : 'border-dark-700/60 text-slate-400 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Caja con la división de la plata */}
          <div className="p-3.5 rounded-xl bg-dark-850 border border-dark-700/80 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-dark-750">
              <span className="text-xs text-slate-400">Total a Cobrar al Cliente:</span>
              <div className="text-right">
                <span className="text-xl font-black text-white">${grandTotalUSD.toFixed(2)}</span>
                <span className="text-xs text-gold-400 font-mono ml-2 font-bold">
                  (Bs. {grandTotalBs})
                </span>
              </div>
            </div>

            {/* Split */}
            <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
              <div className="p-2 rounded-lg bg-dark-900 border border-dark-800">
                <span className="text-[10px] text-slate-400 block truncate">
                  Comisión {staffObj?.name.split(' ')[0]}:
                </span>
                <span className="text-xs font-bold text-amber-400">
                  ${staffCommissionUSD.toFixed(2)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-dark-900 border border-dark-800">
                <span className="text-[10px] text-slate-400 block truncate">
                  Propina (Aparte):
                </span>
                <span className="text-xs font-bold text-gold-400">
                  +${tipUSD.toFixed(2)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-dark-900 border border-dark-800">
                <span className="text-[10px] text-slate-400 block truncate">
                  Para el Local:
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  ${businessProfitUSD.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={totalUSD <= 0}
            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all ${
              totalUSD > 0
                ? 'bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black shadow-gold-500/25 active:scale-[0.99]'
                : 'bg-dark-800 text-slate-500 cursor-not-allowed border border-dark-750'
            }`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>GUARDAR COBRO (${grandTotalUSD.toFixed(2)}) Y DIVIDIR PLATA</span>
          </button>

        </form>

      </div>
    </div>
  )
}
