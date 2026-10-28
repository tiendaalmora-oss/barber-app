import React, { useState } from 'react'
import { X, Check, ArrowDownRight, Tag, DollarSign } from 'lucide-react'

export default function QuickExpenseModal({
  isOpen,
  onClose,
  exchangeRate,
  onRegisterExpense
}) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('insumos')
  const [amountUSD, setAmountUSD] = useState('')
  const [currencyMode, setCurrencyMode] = useState('USD') // 'USD' or 'Bs'
  const [paymentMethod, setPaymentMethod] = useState('efectivo_usd')

  if (!isOpen) return null

  const categories = [
    { id: 'insumos', label: 'Insumos / Hojillas' },
    { id: 'servicios', label: 'Luz / Internet / Agua' },
    { id: 'alquiler', label: 'Alquiler del Local' },
    { id: 'comida', label: 'Comida / Café / Hielo' },
    { id: 'limpieza', label: 'Artículos de Limpieza' },
    { id: 'otro', label: 'Otros Gastos' },
  ]

  const numAmount = parseFloat(amountUSD) || 0
  const finalUSD = currencyMode === 'USD' ? numAmount : numAmount / exchangeRate
  const finalBs = currencyMode === 'USD' ? numAmount * exchangeRate : numAmount

  const handleSubmit = (e) => {
    e.preventDefault()
    if (finalUSD <= 0 || !description.trim()) return

    const expense = {
      id: 'exp_' + Date.now(),
      type: 'gasto',
      item_name: description.trim(),
      category: category,
      staff_name: 'Gasto Operativo',
      staff_id: null,
      client_name: '-',
      monto_usd: -finalUSD,
      monto_bs: -finalBs,
      tasa_bcv: exchangeRate,
      metodo_pago: paymentMethod,
      comision_usd: 0,
      ganancia_negocio_usd: -finalUSD,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fecha: new Date().toISOString()
    }

    onRegisterExpense(expense)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-2xl shadow-2xl p-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Registrar Gasto de Caja</h3>
              <p className="text-xs text-slate-400">Salidas de dinero (luz, alquiler, insumos, comida)</p>
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
          
          {/* Concepto / Descripción */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Descripción del Gasto
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Botellón de agua y café para clientes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-medium"
              autoFocus
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Categoría
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`p-2 rounded-xl border text-left text-xs transition-all ${
                    category === c.id
                      ? 'bg-red-500/15 border-red-500/60 text-white font-bold'
                      : 'bg-dark-800 border-dark-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Monto y Moneda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Monto del Gasto
              </label>
              <div className="flex items-center gap-1 bg-dark-800 p-0.5 rounded-lg border border-dark-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCurrencyMode('USD')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    currencyMode === 'USD' ? 'bg-red-500 text-white' : 'text-slate-400'
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode('Bs')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    currencyMode === 'Bs' ? 'bg-red-500 text-white' : 'text-slate-400'
                  }`}
                >
                  Bs.
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {currencyMode === 'USD' ? '$' : 'Bs.'}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                placeholder="0.00"
                value={amountUSD}
                onChange={(e) => setAmountUSD(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white font-mono font-bold text-lg focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Equivalent preview */}
            {numAmount > 0 && (
              <div className="text-right text-xs text-slate-400 font-mono mt-1">
                Equivalente: <strong className="text-white">{currencyMode === 'USD' ? `Bs. ${finalBs.toFixed(2)}` : `$${finalUSD.toFixed(2)} USD`}</strong> (Tasa: {exchangeRate.toFixed(2)})
              </div>
            )}
          </div>

          {/* Método de Pago utilizado */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              ¿De dónde salió el dinero?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('efectivo_usd')}
                className={`p-2 rounded-xl border text-xs font-medium text-center transition-all ${
                  paymentMethod === 'efectivo_usd'
                    ? 'bg-dark-750 border-red-500/60 text-white'
                    : 'bg-dark-800 border-dark-700/60 text-slate-400'
                }`}
              >
                💵 Gaveta (Efectivo $)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('pago_movil')}
                className={`p-2 rounded-xl border text-xs font-medium text-center transition-all ${
                  paymentMethod === 'pago_movil'
                    ? 'bg-dark-750 border-red-500/60 text-white'
                    : 'bg-dark-800 border-dark-700/60 text-slate-400'
                }`}
              >
                📱 Cuenta Banco / Pago Móvil
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-red-600/25 active:scale-[0.99] transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            DESCONTAR GASTO DE CAJA
          </button>

        </form>

      </div>
    </div>
  )
}
