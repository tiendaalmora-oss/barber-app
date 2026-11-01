import React, { useState, useEffect } from 'react'
import { X, Check, RefreshCw, DollarSign, Sparkles } from 'lucide-react'

export default function ExchangeRateModal({ isOpen, onClose, currentRate, onSaveRate }) {
  const [rate, setRate] = useState(currentRate)
  const [liveBcv, setLiveBcv] = useState(889.26)
  const [liveParalelo, setLiveParalelo] = useState(988.88)
  const [loadingLive, setLoadingLive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchLiveRates = async () => {
    setLoadingLive(true)
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const oficial = data.find(d => d.fuente === 'oficial')
          const paralelo = data.find(d => d.fuente === 'paralelo')
          if (oficial && oficial.promedio) {
            setLiveBcv(Number(oficial.promedio.toFixed(2)))
          }
          if (paralelo && paralelo.promedio) {
            setLiveParalelo(Number(paralelo.promedio.toFixed(2)))
          }
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        }
      }
    } catch (e) {
      // Offline fallback: keep default current 2026 rates
    } finally {
      setLoadingLive(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setRate(currentRate)
      fetchLiveRates()
    }
  }, [isOpen, currentRate])

  if (!isOpen) return null

  const handleSave = (e) => {
    e.preventDefault()
    const numericRate = parseFloat(rate)
    if (numericRate > 0) {
      onSaveRate(numericRate)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-2xl shadow-2xl p-5 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Tasa de Cambio (BCV / Paralelo)</h3>
              <p className="text-xs text-slate-400">Ajusta el valor para cálculos en Bolívares</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Internet Rate Indicator */}
        <div className="mt-3 px-3 py-2 rounded-xl bg-dark-850 border border-dark-750 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${loadingLive ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
            <span className="text-slate-300">
              BCV Oficial Hoy: <strong className="text-gold-400 font-mono">Bs. {liveBcv.toFixed(2)}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={fetchLiveRates}
            disabled={loadingLive}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-all"
            title="Refrescar tasa del BCV en vivo"
          >
            <RefreshCw className={`w-3 h-3 ${loadingLive ? 'animate-spin text-gold-400' : ''}`} />
            <span>{lastUpdated ? lastUpdated : 'Actualizar'}</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Valor del Dólar en Bolívares (Bs / 1 USD)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                Bs.
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 focus:border-gold-500 focus:outline-none text-white font-mono font-bold text-lg"
                autoFocus
              />
            </div>
          </div>

          {/* Quick presets (BCV en vivo + Paralelo + incrementos) */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 px-0.5">
              Cargar con 1 Clic:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRate(liveBcv.toFixed(2))}
                className="py-2 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <span>🏛️ BCV ({liveBcv.toFixed(2)})</span>
              </button>

              {liveParalelo && (
                <button
                  type="button"
                  onClick={() => setRate(liveParalelo.toFixed(2))}
                  className="py-2 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <span>⚡ Paralelo ({liveParalelo.toFixed(2)})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRate((prev) => (parseFloat(prev || 0) + 1.0).toFixed(2))}
                className="flex-1 py-1 px-2 bg-dark-800 hover:bg-dark-750 text-slate-300 rounded-lg text-xs font-medium border border-dark-700"
              >
                +1.00 Bs
              </button>
              <button
                type="button"
                onClick={() => setRate((prev) => (parseFloat(prev || 0) + 5.0).toFixed(2))}
                className="flex-1 py-1 px-2 bg-dark-800 hover:bg-dark-750 text-slate-300 rounded-lg text-xs font-medium border border-dark-700"
              >
                +5.00 Bs
              </button>
              <button
                type="button"
                onClick={() => setRate((prev) => Math.max(1, parseFloat(prev || 0) - 1.0).toFixed(2))}
                className="flex-1 py-1 px-2 bg-dark-800 hover:bg-dark-750 text-slate-300 rounded-lg text-xs font-medium border border-dark-700"
              >
                -1.00 Bs
              </button>
            </div>
          </div>

          {/* Example preview */}
          <div className="p-3 rounded-xl bg-dark-850 border border-dark-800 text-xs space-y-1">
            <div className="text-slate-400">Ejemplo de conversión automática:</div>
            <div className="flex justify-between text-slate-200">
              <span>Corte básico ($5.00):</span>
              <span className="font-bold text-gold-400">Bs. {(5 * parseFloat(rate || 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-200">
              <span>Combo corte + barba ($10.00):</span>
              <span className="font-bold text-gold-400">Bs. {(10 * parseFloat(rate || 0)).toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 font-semibold text-xs border border-dark-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-gold-500/20"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Guardar Tasa
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
