import React, { useState } from 'react'
import { X, Check, DollarSign, User, Scissors, CreditCard, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react'

export default function QuickCashModal({
  isOpen,
  onClose,
  nicheData,
  exchangeRate,
  onRegisterTransaction
}) {
  const [selectedStaff, setSelectedStaff] = useState(nicheData.staff[0]?.id || '')
  const [selectedItem, setSelectedItem] = useState(nicheData.services[0]?.id || '')
  const [customPrice, setCustomPrice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pago_movil')
  const [clientName, setClientName] = useState('')

  if (!isOpen) return null

  // Resolve staff
  const staffObj = nicheData.staff.find(s => s.id === selectedStaff) || nicheData.staff[0]
  
  // Resolve item (service or product)
  const allItems = [...nicheData.services, ...nicheData.products]
  const itemObj = allItems.find(i => i.id === selectedItem) || nicheData.services[0]
  
  // Price resolution
  const finalPriceUSD = customPrice !== '' ? parseFloat(customPrice) || 0 : (itemObj?.price_usd || 0)
  const finalPriceBs = (finalPriceUSD * exchangeRate).toFixed(2)

  // Commission math
  const commissionPct = staffObj?.commission_pct || 50
  const staffCommissionUSD = itemObj?.cost_usd 
    ? 0 // products usually don't give percentage
    : (finalPriceUSD * (commissionPct / 100))
  const businessProfitUSD = finalPriceUSD - staffCommissionUSD

  const handleSubmit = (e) => {
    e.preventDefault()
    if (finalPriceUSD <= 0) return

    const transaction = {
      id: 'tx_' + Date.now(),
      type: 'ingreso',
      item_name: itemObj?.name || 'Servicio Personalizado',
      category: itemObj?.category || 'Cortes',
      staff_name: staffObj?.name || 'Venta del Local',
      staff_id: staffObj?.id,
      client_name: clientName.trim() || 'Cliente Mostrador',
      monto_usd: finalPriceUSD,
      monto_bs: parseFloat(finalPriceBs),
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
      <div className="bg-dark-900 border border-dark-700 w-full max-w-lg rounded-2xl shadow-2xl p-5 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Anotar Cobro en Caja</h3>
              <p className="text-xs text-slate-400">Registra el corte y divide la comisión de una vez</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
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

          {/* 2. Seleccionar Servicio o Producto */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              2. ¿Qué se hizo o qué compró?
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {nicheData.services.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => { setSelectedItem(item.id); setCustomPrice(''); }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedItem === item.id && customPrice === ''
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                      : 'bg-dark-800 border-dark-700/60 text-slate-300 hover:border-dark-600'
                  }`}
                >
                  <div className="text-xs font-medium truncate">{item.name}</div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-bold text-emerald-400">${item.price_usd}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Bs. {(item.price_usd * exchangeRate).toFixed(1)})
                    </span>
                  </div>
                </button>
              ))}
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

          {/* Nombre del cliente */}
          <div>
            <input
              type="text"
              placeholder="Nombre del cliente (opcional, ej. Pedro)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Caja con la división de la plata */}
          <div className="p-3.5 rounded-xl bg-dark-850 border border-dark-700/80 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-dark-750">
              <span className="text-xs text-slate-400">Total a Cobrar:</span>
              <div className="text-right">
                <span className="text-lg font-black text-white">${finalPriceUSD.toFixed(2)}</span>
                <span className="text-xs text-gold-400 font-mono ml-2">
                  (Bs. {finalPriceBs})
                </span>
              </div>
            </div>

            {/* Split */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
              <div className="p-2 rounded-lg bg-dark-900 border border-dark-800">
                <span className="text-[10px] text-slate-400 block truncate">
                  Para {staffObj?.name.split(' ')[0]} ({commissionPct}%):
                </span>
                <span className="text-sm font-bold text-amber-400">
                  ${staffCommissionUSD.toFixed(2)} USD
                </span>
              </div>
              <div className="p-2 rounded-lg bg-dark-900 border border-dark-800">
                <span className="text-[10px] text-slate-400 block truncate">
                  Para el Local (Ganancia Limpia):
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
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-gold-500/25 active:scale-[0.99] transition-all"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            GUARDAR COBRO Y DIVIDIR PLATA
          </button>

        </form>

      </div>
    </div>
  )
}
