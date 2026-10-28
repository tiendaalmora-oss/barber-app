import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, MessageCircle, DollarSign, Crown, Phone, UserCheck } from 'lucide-react'

export default function DebtsClientsView({ clients, exchangeRate }) {
  const [activeSubTab, setActiveSubTab] = useState('fiados') // 'fiados' or 'membresias'
  const [clientList, setClientList] = useState(clients)

  const totalDebtUSD = clientList.reduce((sum, c) => sum + (c.debt_usd || 0), 0)
  const totalDebtBs = totalDebtUSD * exchangeRate

  const vipClients = clientList.filter(c => c.plan && c.plan !== 'Cliente Regular')

  const handleSettle = (id, name, amount) => {
    if (confirm(`¿Confirmas que ${name} ya pagó los $${amount.toFixed(2)} USD que debía?`)) {
      setClientList(prev => prev.map(c => c.id === id ? { ...c, debt_usd: 0 } : c))
    }
  }

  const openWhatsAppReminder = (client) => {
    const debtBs = (client.debt_usd * exchangeRate).toFixed(2)
    const text = encodeURIComponent(
      `¡Épale ${client.name.split(' ')[0]}! 👋 ¿Cómo estás pana? Te escribo de la barbería para recordarte con cariño el saldo pendiente de $${client.debt_usd.toFixed(2)} USD (Bs. ${debtBs} a la tasa de hoy). Puedes pasarlo por Pago Móvil cuando puedas o te llegas al local. ¡Un abrazo!`
    )
    window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank')
  }

  const openWhatsAppVipRenewal = (client) => {
    const text = encodeURIComponent(
      `¡Buenas ${client.name.split(' ')[0]}! 👋 Te escribo de la barbería para avisarte que tu ${client.plan} le toca renovación pronto (${client.plan_renueva || 'este mes'}). Avísame para apartarte tu cupo fijo en la semana. ¡Saludos!`
    )
    window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Clientes, Fiados & Membresías
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              Gestión Criolla
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cobra los fiados por WhatsApp sin pena y gestiona tus clientes fijos del mes
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 bg-dark-850 p-1 rounded-xl border border-dark-700/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('fiados')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'fiados'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Los Fiados
          </button>
          <button
            onClick={() => setActiveSubTab('membresias')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'membresias'
                ? 'bg-gold-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Club VIP (Membresías)
          </button>
        </div>
      </div>

      {/* View 1: FIADOS */}
      {activeSubTab === 'fiados' && (
        <div className="space-y-4">
          {/* Banner total en la calle */}
          <div className="p-4 bg-gradient-to-r from-amber-950/40 to-dark-900 border border-amber-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-300 font-bold block uppercase tracking-wider">
                  Total de Plata en la Calle (Fiados):
                </span>
                <span className="text-2xl font-black text-amber-400">
                  ${totalDebtUSD.toFixed(2)} <span className="text-sm font-semibold text-white">USD</span>
                </span>
                <span className="text-xs text-gold-400 font-mono ml-2 font-bold">
                  (Bs. {totalDebtBs.toFixed(2)})
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400 hidden sm:block">
              Toca "Cobrar" para mandar WhatsApp listo
            </span>
          </div>

          {/* Table */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-dark-800">
            {clientList.map((c) => {
              const hasDebt = c.debt_usd > 0
              const debtInBs = (c.debt_usd * exchangeRate).toFixed(2)

              return (
                <div 
                  key={c.id} 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-dark-850/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      hasDebt 
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{c.name}</h4>
                      <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {c.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      {hasDebt ? (
                        <>
                          <div className="text-sm font-black text-amber-400">
                            Debe: ${c.debt_usd.toFixed(2)} USD
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            Bs. {debtInBs}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Al día (Solvente)
                        </span>
                      )}
                    </div>

                    {hasDebt && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openWhatsAppReminder(c)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                          title="Enviar WhatsApp con el monto ya calculado"
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                          <span>Cobrar</span>
                        </button>

                        <button
                          onClick={() => handleSettle(c.id, c.name, c.debt_usd)}
                          className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700 text-xs font-semibold active:scale-95 transition-all"
                        >
                          Ya Pagó
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* View 2: CLUB VIP / MEMBRESÍAS */}
      {activeSubTab === 'membresias' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-gold-950/40 to-dark-900 border border-gold-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-300 font-bold block uppercase tracking-wider">
                  Club de Suscripciones Mensuales:
                </span>
                <span className="text-base text-slate-200">
                  {vipClients.length} clientes pagando mensualidad fija adelantada
                </span>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              Ingreso Seguro Cada Mes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {vipClients.map((vip) => (
              <div 
                key={vip.id}
                className="bg-dark-900 border border-dark-800 hover:border-gold-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <h4 className="font-bold text-white text-sm">{vip.name}</h4>
                  </div>
                  <div className="text-xs text-gold-400 font-semibold mt-1">
                    {vip.plan}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Renovación: <strong className="text-slate-300">{vip.plan_renueva}</strong>
                  </div>
                </div>

                <button
                  onClick={() => openWhatsAppVipRenewal(vip)}
                  className="px-3 py-2 rounded-xl bg-dark-800 hover:bg-gold-500 hover:text-black text-slate-200 border border-dark-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Avisar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
