import React, { useState } from 'react'
import { Users, CheckCircle2, DollarSign, Wallet, Award, ArrowRight } from 'lucide-react'

export default function CommissionsView({ nicheData, transactions, exchangeRate }) {
  const [paidStatus, setPaidStatus] = useState({})

  const staffStats = nicheData.staff.map((st) => {
    const staffTx = transactions.filter((t) => t.staff_id === st.id && t.monto_usd > 0)
    const totalEarnedUSD = staffTx.reduce((sum, t) => sum + (t.comision_usd || 0), 0)
    const totalBilledUSD = staffTx.reduce((sum, t) => sum + (t.monto_usd || 0), 0)
    const servicesCount = staffTx.length

    return {
      ...st,
      servicesCount,
      totalBilledUSD,
      totalEarnedUSD,
      totalEarnedBs: totalEarnedUSD * exchangeRate,
      isPaid: paidStatus[st.id] || false
    }
  })

  const handlePayCommission = (staffId, staffName, amount) => {
    if (confirm(`¿Confirmas que le entregaste a ${staffName} su comisión de $${amount.toFixed(2)} USD?`)) {
      setPaidStatus(prev => ({ ...prev, [staffId]: true }))
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Comisiones de los Muchachos
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              {nicheData.rolePlural}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cuentas claras conservan amistades: cuánto le toca a cada quien hoy
          </p>
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {staffStats.map((st) => (
          <div 
            key={st.id} 
            className={`bg-dark-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
              st.isPaid 
                ? 'border-emerald-500/40 bg-emerald-950/10 shadow-lg' 
                : 'border-dark-800 hover:border-dark-700 shadow-md'
            }`}
          >
            <div>
              {/* Profile Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-dark-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-2xl shadow-inner">
                    {st.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-snug">{st.name}</h3>
                    <span className="text-xs text-slate-400">
                      Pactado: <strong className="text-gold-400">{st.commission_pct}%</strong>
                    </span>
                  </div>
                </div>

                {st.isPaid && (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pagado
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="p-2.5 rounded-xl bg-dark-850 border border-dark-750">
                  <span className="text-slate-400 block text-[10px] uppercase">Cortes de Hoy</span>
                  <span className="text-base font-black text-white">{st.servicesCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-dark-850 border border-dark-750">
                  <span className="text-slate-400 block text-[10px] uppercase">Generó en Caja</span>
                  <span className="text-base font-black text-slate-200">${st.totalBilledUSD.toFixed(2)}</span>
                </div>
              </div>

              {/* Commission to Pay */}
              <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-dark-850 to-dark-800 border border-amber-500/30">
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">
                  Plata que le toca entregarle:
                </span>
                <div className="text-2xl font-black text-white mt-0.5">
                  ${st.totalEarnedUSD.toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
                </div>
                <div className="text-xs text-gold-400 font-mono mt-0.5">
                  Bs. {st.totalEarnedBs.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={() => handlePayCommission(st.id, st.name, st.totalEarnedUSD)}
              disabled={st.isPaid || st.totalEarnedUSD === 0}
              className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${
                st.isPaid
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : st.totalEarnedUSD === 0
                  ? 'bg-dark-800 text-slate-600 border border-dark-700 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:scale-95'
              }`}
            >
              {st.isPaid ? 'Comisión Entregada' : 'Entregar Plata / Pagar Comisión'}
            </button>
          </div>
        ))}
      </div>

    </div>
  )
}
