import React, { useState } from 'react'
import { X, Check, DollarSign, User, Scissors, ShoppingBag, Plus, Minus, Trash2, CreditCard, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react'

export default function QuickCashModal({
  isOpen,
  onClose,
  nicheData,
  exchangeRate,
  onRegisterTransaction,
  clients = []
}) {
  const [selectedStaff, setSelectedStaff] = useState(nicheData.staff[0]?.id || '')
  const [activeItemTab, setActiveItemTab] = useState('servicios') // 'servicios' | 'productos'
  const [paymentMethod, setPaymentMethod] = useState('pago_movil')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  // Multi-item cart: holds services and products on the same bill
  const [cart, setCart] = useState(() => {
    const firstSvc = nicheData.services[0]
    return firstSvc ? [{
      id: firstSvc.id,
      name: firstSvc.name,
      price_usd: firstSvc.price_usd,
      isProduct: false,
      qty: 1
    }] : []
  })

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
        return [...prev, {
          id: item.id,
          name: item.name,
          price_usd: item.price_usd,
          isProduct: isProduct,
          cost_usd: item.cost_usd,
          stock: item.stock,
          qty: 1
        }]
      }
    })
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

  // Commission is earned strictly on services
  const servicesTotalUSD = cart.filter(ci => !ci.isProduct).reduce((sum, ci) => sum + (ci.price_usd * ci.qty), 0)
  const staffCommissionUSD = servicesTotalUSD * (commissionPct / 100)
  const businessProfitUSD = totalUSD - staffCommissionUSD

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
      monto_usd: totalUSD,
      monto_bs: parseFloat(totalBs),
      tasa_bcv: exchangeRate,
      metodo_pago: paymentMethod,
      comision_usd: staffCommissionUSD,
      ganancia_negocio_usd: businessProfitUSD,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fecha: new Date().toISOString()
    }

    onRegisterTransaction(transaction)
    onClose()
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
              <input
                type="tel"
                placeholder="WhatsApp (ej. +584121234567)"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Caja con la división de la plata */}
          <div className="p-3.5 rounded-xl bg-dark-850 border border-dark-700/80 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-dark-750">
              <span className="text-xs text-slate-400">Total Factura:</span>
              <div className="text-right">
                <span className="text-xl font-black text-white">${totalUSD.toFixed(2)}</span>
                <span className="text-xs text-gold-400 font-mono ml-2 font-bold">
                  (Bs. {totalBs})
                </span>
              </div>
            </div>

            {/* Split */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
              <div className="p-2 rounded-lg bg-dark-900 border border-dark-800">
                <span className="text-[10px] text-slate-400 block truncate">
                  Para {staffObj?.name.split(' ')[0]} ({commissionPct}% cortes):
                </span>
                <span className="text-sm font-bold text-amber-400">
                  ${staffCommissionUSD.toFixed(2)} USD
                </span>
              </div>
              <div className="p-2 rounded-lg bg-dark-900 border border-dark-800">
                <span className="text-[10px] text-slate-400 block truncate">
                  Para el Local (Limpio + Productos):
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  ${businessProfitUSD.toFixed(2)} USD
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
            <span>GUARDAR COBRO (${totalUSD.toFixed(2)}) Y DIVIDIR PLATA</span>
          </button>

        </form>

      </div>
    </div>
  )
}
