import React, { useState, useEffect } from 'react'
import { X, Check, DollarSign, User, Scissors, ShoppingBag, Plus, Minus, Trash2, CreditCard, Smartphone, ShieldCheck, AlertCircle, Receipt } from 'lucide-react'
import PhoneCountryInput from './PhoneCountryInput'
import { normalizeWhatsAppPhone, formatMethodName } from '../lib/dateUtils'

const SPLIT_METHOD_OPTIONS = [
  { id: 'efectivo_usd', label: '💵 Efectivo $ (Gaveta)' },
  { id: 'pago_movil', label: '📲 Pago Móvil (Bs)' },
  { id: 'punto_de_venta', label: '💳 Punto de Venta' },
  { id: 'zelle', label: '🟡 Zelle / Binance' },
  { id: 'fiado', label: '📝 Fiado (Queda debiendo)' },
]

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

  // Split / Mixed Payment state ('mixto')
  const [splitMethod1, setSplitMethod1] = useState('efectivo_usd')
  const [splitMethod2, setSplitMethod2] = useState('pago_movil')
  const [splitCurrency1, setSplitCurrency1] = useState('USD') // 'USD' | 'Bs'
  const [splitInput1, setSplitInput1] = useState('')

  // Resolve item commission based on 3-tier cascade:
  // 1. Staff specific custom commission for this service (matching by ID or by Name)
  // 2. Service level standard commission in catalog
  // 3. Staff base commission fallback
  const resolveItemCommission = (item, staff) => {
    if (!item || item.isProduct) return 0

    // Look up original catalog service
    const catalogSvc = (nicheData.services || []).find(s => s.id === item.id || s.name.toLowerCase() === (item.name || '').toLowerCase())
    const svcId = catalogSvc?.id || item.id
    const svcName = catalogSvc?.name || item.name || ''

    // 1. Staff specific custom commission
    if (staff?.service_commissions) {
      if (staff.service_commissions[svcId] !== undefined) {
        return Number(staff.service_commissions[svcId])
      }
      if (svcName && staff.service_commissions[svcName] !== undefined) {
        return Number(staff.service_commissions[svcName])
      }
      // Match by service name in case-insensitive keys
      const matchingKey = Object.keys(staff.service_commissions).find(k => {
        const cat = (nicheData.services || []).find(s => s.id === k)
        return (cat && cat.name.toLowerCase() === svcName.toLowerCase()) || k.toLowerCase() === svcName.toLowerCase()
      })
      if (matchingKey && staff.service_commissions[matchingKey] !== undefined) {
        return Number(staff.service_commissions[matchingKey])
      }
    }

    // 2. Service level standard commission
    if (catalogSvc && Number(catalogSvc.commission_pct) > 0) {
      return Number(catalogSvc.commission_pct)
    }

    // 3. Staff base commission fallback
    return Number(staff?.commission_pct) || 50
  }

  // Pre-fill fields whenever opened from an appointment or normal trigger
  useEffect(() => {
    if (!isOpen) return

    setTipUSD(0)
    setCustomTip('')
    setSplitInput1('')
    setSplitCurrency1('USD')
    setSplitMethod1('efectivo_usd')
    setSplitMethod2('pago_movil')

    if (prefillData) {
      setClientName(prefillData.clientName || '')
      setClientPhone(prefillData.clientPhone || '')
      const targetStaffId = prefillData.staffId || nicheData.staff[0]?.id || ''
      setSelectedStaff(targetStaffId)
      const targetStaffObj = nicheData.staff.find(s => s.id === targetStaffId) || nicheData.staff[0]

      // Pre-fill cart with the appointment's service
      const svcMatch = (nicheData.services || []).find(s => 
        s.name.toLowerCase() === (prefillData.serviceName || '').toLowerCase()
      )

      if (svcMatch) {
        const itemComm = resolveItemCommission(svcMatch, targetStaffObj)
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
          commission_pct: targetStaffObj?.commission_pct || 50,
          isProduct: false,
          qty: 1
        }])
      }
    } else {
      // Normal open: reset or default
      setClientName('')
      setClientPhone('')
      const defaultStaffId = nicheData.staff[0]?.id || ''
      if (defaultStaffId) setSelectedStaff(defaultStaffId)
      const defaultStaffObj = nicheData.staff[0]
      const firstSvc = nicheData.services[0]
      const firstComm = firstSvc ? resolveItemCommission(firstSvc, defaultStaffObj) : 50
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

  const handleSelectStaff = (newStaffId) => {
    setSelectedStaff(newStaffId)
    const newStaffObj = nicheData.staff.find(s => s.id === newStaffId)
    if (newStaffObj) {
      setCart(prev => prev.map(ci => {
        if (ci.isProduct) return ci
        const nextComm = resolveItemCommission(ci, newStaffObj)
        return { ...ci, commission_pct: nextComm }
      }))
    }
  }

  // Add or increment item
  const handleAddItem = (item, isProduct) => {
    setCart(prev => {
      const idx = prev.findIndex(ci => ci.id === item.id)
      if (idx >= 0) {
        return prev.map((ci, i) => i === idx ? { ...ci, qty: ci.qty + 1 } : ci)
      } else {
        const currentStaffObj = nicheData.staff.find(s => s.id === selectedStaff) || staffObj
        const itemComm = resolveItemCommission(item, currentStaffObj)
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

  // Split / Mixed payment live calculations
  const parsedSplit1Raw = parseFloat(splitInput1)
  const split1USD = !isNaN(parsedSplit1Raw) && parsedSplit1Raw > 0
    ? (splitCurrency1 === 'Bs' && exchangeRate > 0 ? (parsedSplit1Raw / exchangeRate) : parsedSplit1Raw)
    : 0
  const split1Bs = split1USD * exchangeRate
  const split2USD = Math.max(0, grandTotalUSD - split1USD)
  const split2Bs = split2USD * exchangeRate
  const isSplitValid = paymentMethod !== 'mixto' || (
    split1USD > 0.001 &&
    split1USD < (grandTotalUSD - 0.001) &&
    splitMethod1 !== splitMethod2
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (totalUSD <= 0 || cart.length === 0) {
      alert('Por favor agrega al menos un servicio o producto para registrar el cobro.')
      return
    }

    if (paymentMethod === 'mixto') {
      if (splitMethod1 === splitMethod2) {
        alert('En Pago Mixto debes elegir dos métodos de pago diferentes (ej: Efectivo $ y Pago Móvil).')
        return
      }
      if (split1USD <= 0 || split1USD >= grandTotalUSD) {
        alert(`En Pago Mixto, ingresa en la 1ra parte un monto mayor a $0 y menor al total a cobrar ($${grandTotalUSD.toFixed(2)} USD).`)
        return
      }
    }

    const combinedItemName = cart.map(ci => ci.qty > 1 ? `${ci.qty}x ${ci.name}` : ci.name).join(' + ')
    const productItems = cart.filter(ci => ci.isProduct).map(ci => ({ id: ci.id, qty: ci.qty }))

    // Compute exact split breakdown if paymentMethod === 'mixto'
    let paymentSplits = null
    if (paymentMethod === 'mixto' && grandTotalUSD > 0) {
      const cleanSplit1USD = Math.round(split1USD * 100) / 100
      const cleanSplit2USD = Math.round((grandTotalUSD - cleanSplit1USD) * 100) / 100
      const ratio1 = cleanSplit1USD / grandTotalUSD
      const net1USD = Math.round(totalUSD * ratio1 * 100) / 100
      const net2USD = Math.round((totalUSD - net1USD) * 100) / 100

      paymentSplits = [
        {
          method: splitMethod1,
          amount_usd: cleanSplit1USD,
          amount_bs: Math.round(cleanSplit1USD * exchangeRate * 100) / 100,
          net_income_usd: net1USD
        },
        {
          method: splitMethod2,
          amount_usd: cleanSplit2USD,
          amount_bs: Math.round(cleanSplit2USD * exchangeRate * 100) / 100,
          net_income_usd: net2USD
        }
      ]
    }

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
      payment_splits: paymentSplits,
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
      if (Array.isArray(completedTx.payment_splits) && completedTx.payment_splits.length > 0) {
        msg += `💳 *Método de pago:* PAGO MIXTO\n`
        completedTx.payment_splits.forEach(sp => {
          msg += `  • ${formatMethodName(sp.method)}: $${Number(sp.amount_usd).toFixed(2)} USD (Bs. ${Number(sp.amount_bs).toFixed(2)})\n`
        })
        msg += `\n`
      } else {
        msg += `💳 *Método de pago:* ${formatMethodName(completedTx.metodo_pago).toUpperCase()}\n\n`
      }
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
            {Array.isArray(completedTx.payment_splits) && completedTx.payment_splits.length > 0 && (
              <div className="pt-2 border-t border-dark-800/80 space-y-1 text-[11px]">
                <div className="text-purple-400 font-sans font-bold uppercase tracking-wider text-[10px]">
                  🔀 Desglose de Pago Mixto:
                </div>
                {completedTx.payment_splits.map((sp, i) => (
                  <div key={i} className="flex justify-between text-slate-300">
                    <span>• {formatMethodName(sp.method)}:</span>
                    <span className="font-bold text-white">
                      ${Number(sp.amount_usd).toFixed(2)} <span className="text-slate-500">(Bs. {Number(sp.amount_bs).toFixed(0)})</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
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
                  onClick={() => handleSelectStaff(st.id)}
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
                          <button
                            type="button"
                            onClick={() => {
                              const currentVal = ci.commission_pct !== undefined ? ci.commission_pct : commissionPct
                              const promptVal = prompt(`Ajustar comisión para "${ci.name}" (%) en este cobro:`, currentVal)
                              if (promptVal !== null) {
                                const parsed = parseFloat(promptVal)
                                if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                                  handleUpdateItemCommission(ci.id, parsed)
                                }
                              }
                            }}
                            title="Toca para ajustar el % de comisión de este servicio para este cobro"
                            className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold shrink-0 font-mono transition-colors cursor-pointer"
                          >
                            {ci.commission_pct ?? commissionPct}% ✎
                          </button>
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

          {/* 3. Método de Pago (Venezuela Criollo + Pago Mixto) */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              3. ¿Cómo pagó el cliente?
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: 'pago_movil', label: 'Pago Móvil', badge: 'Bs. Banco' },
                { id: 'efectivo_usd', label: 'Efectivo $', badge: 'Gaveta' },
                { id: 'punto_de_venta', label: 'Punto Venta', badge: 'Bs. Tarjeta' },
                { id: 'zelle', label: 'Zelle / Binance', badge: 'Dólares' },
                { id: 'fiado', label: 'Fiado (Debe)', badge: 'Pendiente' },
                { id: 'mixto', label: '🔀 Mixto', badge: '2 Métodos' },
              ].map(method => (
                <button
                  type="button"
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    paymentMethod === method.id
                      ? method.id === 'mixto'
                        ? 'bg-purple-500/20 border-purple-500/70 text-purple-200 font-bold shadow-sm'
                        : 'bg-blue-500/20 border-blue-500/60 text-white font-bold'
                      : 'bg-dark-800 border-dark-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] leading-tight">{method.label}</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">{method.badge}</div>
                </button>
              ))}
            </div>

            {/* Calculadora Interactiva de Pago Mixto (Se despliega al elegir 'mixto') */}
            {paymentMethod === 'mixto' && (
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/35 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-purple-500/20">
                  <span className="font-bold text-purple-300 uppercase tracking-wider">
                    🔀 División de Cobro Mixto
                  </span>
                  <span className="font-mono text-slate-300">
                    Total: <strong className="text-white">${grandTotalUSD.toFixed(2)}</strong> (Bs. {grandTotalBs})
                  </span>
                </div>

                {/* Parte 1: Lo que entrega primero el cliente */}
                <div className="p-2.5 rounded-xl bg-dark-900/90 border border-dark-750 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      1ra Parte (Recibido):
                    </span>
                    <div className="flex items-center gap-1 bg-dark-950 border border-dark-750 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSplitCurrency1('USD')
                          setSplitInput1('')
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          splitCurrency1 === 'USD'
                            ? 'bg-emerald-500 text-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        En $ USD
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitCurrency1('Bs')
                          setSplitInput1('')
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          splitCurrency1 === 'Bs'
                            ? 'bg-emerald-500 text-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        En Bs.
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={splitMethod1}
                      onChange={(e) => {
                        const nextM1 = e.target.value
                        setSplitMethod1(nextM1)
                        if (nextM1 === splitMethod2) {
                          const alt = SPLIT_METHOD_OPTIONS.find(o => o.id !== nextM1)
                          if (alt) setSplitMethod2(alt.id)
                        }
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-semibold focus:outline-none focus:border-purple-500"
                    >
                      {SPLIT_METHOD_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>

                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder={splitCurrency1 === 'USD' ? 'Monto 1ra parte ($)' : 'Monto 1ra parte (Bs)'}
                        value={splitInput1}
                        onChange={(e) => setSplitInput1(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 rounded-xl bg-dark-950 border border-purple-500/40 focus:border-purple-400 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none"
                      />
                      {splitInput1 !== '' && (
                        <button
                          type="button"
                          onClick={() => setSplitInput1('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {split1USD > 0 && (
                    <div className="text-right text-[10px] font-mono text-slate-400">
                      1ra Parte: <strong className="text-emerald-400">${split1USD.toFixed(2)} USD</strong> (Bs. {split1Bs.toFixed(2)})
                    </div>
                  )}
                </div>

                {/* Parte 2: Restante Automático */}
                <div className="p-2.5 rounded-xl bg-dark-900/90 border border-dark-750 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      2da Parte (Restante Automático):
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Se calcula solo al instante
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <select
                      value={splitMethod2}
                      onChange={(e) => {
                        const nextM2 = e.target.value
                        setSplitMethod2(nextM2)
                        if (nextM2 === splitMethod1) {
                          const alt = SPLIT_METHOD_OPTIONS.find(o => o.id !== nextM2)
                          if (alt) setSplitMethod1(alt.id)
                        }
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-semibold focus:outline-none focus:border-purple-500"
                    >
                      {SPLIT_METHOD_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>

                    <div className="px-3 py-1.5 rounded-xl bg-dark-950 border border-amber-500/30 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">Falta cobrar:</span>
                      <div className="text-right font-mono">
                        <span className="text-sm font-black text-amber-400 block leading-tight">
                          ${split2USD.toFixed(2)} USD
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold block">
                          Bs. {split2Bs.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isSplitValid && splitInput1 !== '' && (
                  <p className="text-[11px] text-red-400 font-semibold text-center">
                    ⚠️ El monto de la 1ra parte debe ser menor al total (${grandTotalUSD.toFixed(2)}) y con métodos distintos.
                  </p>
                )}
              </div>
            )}
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

          {/* 4. Propina Libre Manual para el Profesional (En $ o Bs, sin montos predeterminados) */}
          <div className="p-3 rounded-xl bg-dark-950/70 border border-dark-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>🪙 Propina {staffObj?.name.split(' ')[0] ? `para ${staffObj.name.split(' ')[0]}` : ''} (Opcional)</span>
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
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
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
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    tipCurrency === 'Bs'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bs. Bolívares
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-amber-400">
                  {tipCurrency === 'USD' ? '$' : 'Bs.'}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={tipCurrency === 'USD' ? 'Escribe el monto de propina en $ (ej: 2)' : 'Escribe el monto de propina en Bs (ej: 150)'}
                  value={customTip}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomTip(val)
                    const num = parseFloat(val)
                    if (!isNaN(num) && num > 0) {
                      setTipUSD(tipCurrency === 'Bs' && exchangeRate > 0 ? (num / exchangeRate) : num)
                    } else {
                      setTipUSD(0)
                    }
                  }}
                  className={`w-full pl-9 pr-8 py-2 rounded-xl bg-dark-850 border text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none transition-all ${
                    tipUSD > 0
                      ? 'border-amber-500/80 ring-1 ring-amber-500/20'
                      : 'border-dark-700/80 focus:border-amber-500'
                  }`}
                />
                {customTip !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTip('')
                      setTipUSD(0)
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    title="Limpiar propina"
                  >
                    ✕
                  </button>
                )}
              </div>

              {tipUSD > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right shrink-0">
                  <span className="text-[11px] font-mono font-bold text-amber-300 block">
                    {tipCurrency === 'Bs'
                      ? `+$${tipUSD.toFixed(2)} USD (Bs. ${(tipUSD * exchangeRate).toFixed(2)})`
                      : `+$${tipUSD.toFixed(2)} USD (Bs. ${(tipUSD * exchangeRate).toFixed(2)})`}
                  </span>
                </div>
              )}
            </div>
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
