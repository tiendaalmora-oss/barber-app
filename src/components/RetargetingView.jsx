import React, { useState } from 'react'
import { BellRing, MessageSquare, Clock, Award, Zap, Settings2, Check, Flame, UserCheck, Calendar, Sparkles, Plus, RotateCcw } from 'lucide-react'

export default function RetargetingView({
  clients,
  onUpdateClient,
  retargetingConfig,
  onSaveRetargetingConfig,
  businessProfile
}) {
  const [campaignMode, setCampaignMode] = useState('normal') // 'normal' | 'slow_day'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'overdue' | 'soon' | 'vip'
  const [showConfig, setShowConfig] = useState(false)
  const [configForm, setConfigForm] = useState(retargetingConfig)
  const [savedToast, setSavedToast] = useState(false)

  const publicUrl = `${window.location.origin}/?reserva=1`

  // Calculate days since last visit
  const getDaysSince = (dateStr) => {
    if (!dateStr) return 20
    const last = new Date(dateStr + 'T00:00:00')
    const now = new Date()
    const diffTime = now.getTime() - last.getTime()
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  // Enrich clients with computed status
  const enrichedClients = clients.map(c => {
    const days = getDaysSince(c.last_visit)
    const cycle = c.cycle_days || retargetingConfig.defaultCycleDays || 15
    const remaining = cycle - days
    let status = 'ok' // green
    if (days >= cycle) {
      status = 'overdue' // red: ya le toca
    } else if (remaining <= 3) {
      status = 'soon' // yellow: le toca pronto
    }
    const visits = c.visits_count || 1
    const isNearVip = visits >= (retargetingConfig.loyaltyGoal - 1)
    return {
      ...c,
      daysSince: days,
      cycleDays: cycle,
      remainingDays: remaining,
      status,
      visits,
      isNearVip
    }
  }).sort((a, b) => b.daysSince - a.daysSince)

  const overdueCount = enrichedClients.filter(c => c.status === 'overdue').length
  const soonCount = enrichedClients.filter(c => c.status === 'soon').length
  const vipReadyCount = enrichedClients.filter(c => c.isNearVip).length

  const filteredClients = enrichedClients.filter(c => {
    if (filterStatus === 'overdue') return c.status === 'overdue'
    if (filterStatus === 'soon') return c.status === 'soon'
    if (filterStatus === 'vip') return c.isNearVip
    return true
  })

  // Build personalized message for a client
  const buildPersonalizedMessage = (client) => {
    const baseTemplate = campaignMode === 'slow_day'
      ? retargetingConfig.slowDayTemplate
      : retargetingConfig.normalTemplate

    let msg = baseTemplate
      .replace(/\{cliente\}/g, client.name.split(' ')[0])
      .replace(/\{dias\}/g, client.daysSince.toString())
      .replace(/\{servicio\}/g, client.last_service || 'corte')
      .replace(/\{negocio\}/g, businessProfile.businessName || 'nuestra barbería')
      .replace(/\{link\}/g, publicUrl)

    // Add automatic Loyalty Card hook if close to reward or unlocked
    const goal = retargetingConfig.loyaltyGoal || 5
    if (client.visits >= goal) {
      msg += `\n\n🎁 *¡TARJETA VIP COMPLETA!* Ya acumulaste tus ${goal} visitas, así que en este turno te toca tu premio: *${retargetingConfig.loyaltyReward}*.`
    } else if (client.visits === goal - 1) {
      msg += `\n\n🎟️ *¡Dato VIP!* Llevas ${client.visits} de ${goal} visitas en tu tarjeta. ¡Con este turno completas la meta y ganas *${retargetingConfig.loyaltyReward}*!`
    }

    return msg
  }

  const handleSendWhatsApp = (client) => {
    const cleanPhone = (client.phone || '').replace(/[^0-9]/g, '')
    const msg = buildPersonalizedMessage(client)
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const handleSaveConfig = (e) => {
    e.preventDefault()
    onSaveRetargetingConfig(configForm)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
    setShowConfig(false)
  }

  const handleCycleChange = (client, newCycle) => {
    onUpdateClient({ ...client, cycle_days: parseInt(newCycle) })
  }

  const handleStampChange = (client, delta) => {
    const goal = retargetingConfig.loyaltyGoal || 5
    const current = client.visits_count || 1
    const next = current + delta
    if (next < 0) return
    onUpdateClient({ ...client, visits_count: next > goal ? 1 : next })
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-dark-900 via-dark-900 to-amber-500/10 border border-gold-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30 text-[10px] font-black uppercase tracking-wider">
              <BellRing className="w-3.5 h-3.5 animate-bounce" />
              <span>Retargeting & Tarjeta de Fidelidad Automática</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Radar de Clientes (¿A quién le toca corte?)
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              El sistema calcula los días desde la última venta de cada cliente, te avisa quién ya necesita retoque y te arma el mensaje de WhatsApp con su nombre, su tarjeta de fidelidad y el link de tu agenda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 text-xs font-bold transition-all"
            >
              <Settings2 className="w-4 h-4 text-gold-400" />
              <span>Configurar Tiempos y Mensaje</span>
            </button>
          </div>
        </div>

        {/* Campaign Mode Switcher: Normal vs Día Suave */}
        <div className="mt-4 pt-4 border-t border-dark-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>¿Qué tipo de mensaje quieres enviar hoy?</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => setCampaignMode('normal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                campaignMode === 'normal'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-dark-850 text-slate-400 border-dark-750 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Recordatorio de Retoque Normal</span>
            </button>

            <button
              onClick={() => setCampaignMode('slow_day')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                campaignMode === 'slow_day'
                  ? 'bg-amber-500/20 text-gold-400 border-gold-500/50 shadow-sm'
                  : 'bg-dark-850 text-slate-400 border-dark-750 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Levantar Día Flojo (Promo Hoy/Mañana)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Configuration Panel */}
      {showConfig && (
        <form onSubmit={handleSaveConfig} className="bg-dark-900 border-2 border-gold-500/40 rounded-2xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Configurar Ciclo de Retorno, Fidelidad y Plantillas</h3>
              <p className="text-[11px] text-slate-400">Personaliza cada cuántos días avisa el sistema y qué dice el mensaje</p>
            </div>
            {savedToast && (
              <span className="text-xs font-bold text-emerald-400">✓ Guardado</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tiempo Estimado para Retoque (Días)
              </label>
              <select
                value={configForm.defaultCycleDays}
                onChange={(e) => setConfigForm({ ...configForm, defaultCycleDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-bold focus:outline-none focus:border-gold-500"
              >
                <option value={10}>Cada 10 días (Degradé rápido)</option>
                <option value={12}>Cada 12 días</option>
                <option value={15}>Cada 15 días (Quincenal ideal)</option>
                <option value={21}>Cada 21 días (Uñas / Salón)</option>
                <option value={30}>Cada 30 días (Mensual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Meta Tarjeta de Fidelidad (Cortes)
              </label>
              <select
                value={configForm.loyaltyGoal}
                onChange={(e) => setConfigForm({ ...configForm, loyaltyGoal: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-bold focus:outline-none focus:border-gold-500"
              >
                <option value={4}>Al 4to servicio toca premio</option>
                <option value={5}>Al 5to servicio toca premio</option>
                <option value={6}>Al 6to servicio toca premio</option>
                <option value={10}>Al 10mo servicio toca premio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gold-400 mb-1">
                🎁 Premio al Completar Tarjeta
              </label>
              <input
                type="text"
                value={configForm.loyaltyReward}
                onChange={(e) => setConfigForm({ ...configForm, loyaltyReward: e.target.value })}
                placeholder="Ej. Arreglo de Barba o Cejas GRATIS"
                className="w-full px-3 py-2.5 rounded-xl bg-dark-850 border border-gold-500/30 text-xs text-white focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Plantilla Normal (Variables: {'{cliente}'}, {'{dias}'}, {'{servicio}'}, {'{link}'})
              </label>
              <textarea
                rows={3}
                value={configForm.normalTemplate}
                onChange={(e) => setConfigForm({ ...configForm, normalTemplate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">
                Plantilla Día Flojo / Promo Relámpago
              </label>
              <textarea
                rows={3}
                value={configForm.slowDayTemplate}
                onChange={(e) => setConfigForm({ ...configForm, slowDayTemplate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-gold-500/30 text-xs text-white focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-4 py-2 rounded-xl bg-dark-800 text-slate-400 text-xs font-bold"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-xs shadow-lg shadow-gold-500/20"
            >
              Guardar Configuración
            </button>
          </div>
        </form>
      )}

      {/* Semáforo Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterStatus === 'all'
              ? 'bg-dark-800 border-gold-500/50 shadow-md'
              : 'bg-dark-900 border-dark-800 hover:border-dark-700'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 uppercase">Todos en Base</span>
          <div className="text-2xl font-black text-white mt-1">{enrichedClients.length}</div>
          <span className="text-[10px] text-slate-400">Clientes registrados</span>
        </button>

        <button
          onClick={() => setFilterStatus('overdue')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterStatus === 'overdue'
              ? 'bg-red-500/15 border-red-500/50 shadow-md'
              : 'bg-dark-900 border-dark-800 hover:border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-400 uppercase">🔴 Ya les Toca</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">{overdueCount}</div>
          <span className="text-[10px] text-slate-400">Pasaron su fecha de corte</span>
        </button>

        <button
          onClick={() => setFilterStatus('soon')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterStatus === 'soon'
              ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
              : 'bg-dark-900 border-dark-800 hover:border-amber-500/30'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-400 uppercase">🟡 Próximos 3 Días</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{soonCount}</div>
          <span className="text-[10px] text-slate-400">Ideal para agendar hoy</span>
        </button>

        <button
          onClick={() => setFilterStatus('vip')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterStatus === 'vip'
              ? 'bg-purple-500/15 border-purple-500/50 shadow-md'
              : 'bg-dark-900 border-dark-800 hover:border-purple-500/30'
          }`}
        >
          <span className="text-[11px] font-bold text-purple-400 uppercase">🎟️ Cerca del Premio</span>
          <div className="text-2xl font-black text-purple-400 mt-1">{vipReadyCount}</div>
          <span className="text-[10px] text-slate-400">A 1 corte del regalo VIP</span>
        </button>
      </div>

      {/* Client Retargeting Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map(client => {
          const goal = retargetingConfig.loyaltyGoal || 5
          const stamps = Array.from({ length: goal }, (_, idx) => idx < client.visits)

          return (
            <div
              key={client.id}
              className={`bg-dark-900 border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all ${
                client.status === 'overdue'
                  ? 'border-red-500/35 hover:border-red-500/60'
                  : client.status === 'soon'
                  ? 'border-amber-500/35 hover:border-amber-500/60'
                  : 'border-dark-800 hover:border-dark-700'
              }`}
            >
              <div className="space-y-3">
                {/* Top row: Name + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-white text-base flex items-center gap-2">
                      <span>{client.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Último: <strong className="text-slate-200">{client.last_service || 'Corte Clásico'}</strong> ({client.last_staff || 'Equipo'})
                    </p>
                  </div>

                  {client.status === 'overdue' && (
                    <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-black uppercase shrink-0">
                      🔴 Hace {client.daysSince} días (¡Le Toca!)
                    </span>
                  )}
                  {client.status === 'soon' && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase shrink-0">
                      🟡 Hace {client.daysSince} días (En {client.remainingDays}d)
                    </span>
                  )}
                  {client.status === 'ok' && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase shrink-0">
                      🟢 Hace {client.daysSince} días (Al día)
                    </span>
                  )}
                </div>

                {/* Cycle configurator per client */}
                <div className="flex items-center justify-between bg-dark-850 border border-dark-750 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gold-400" />
                    <span>Avisar cada:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {[10, 15, 21, 30].map(d => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => handleCycleChange(client, d)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                          client.cycleDays === d
                            ? 'bg-gold-500 text-black'
                            : 'bg-dark-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loyalty Stamp Card */}
                <div className="bg-dark-950 border border-dark-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-purple-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      <span>Tarjeta VIP ({client.visits}/{goal} visitas)</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStampChange(client, 1)}
                        className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold"
                        title="Sumar o reiniciar sello"
                      >
                        {client.visits >= goal ? '🎁 Reiniciar Tarjeta' : '+1 Sello'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {stamps.map((filled, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 h-7 rounded-lg border flex items-center justify-center text-xs font-bold transition-all ${
                          filled
                            ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-sm'
                            : 'bg-dark-900 border-dark-800 text-slate-600'
                        }`}
                      >
                        {filled ? '✂️' : idx + 1}
                      </div>
                    ))}
                  </div>

                  {client.visits >= goal - 1 && (
                    <p className="text-[10px] text-emerald-400 font-semibold">
                      {client.visits >= goal
                        ? `🎉 ¡Completó los ${goal} cortes! Le toca: ${retargetingConfig.loyaltyReward}`
                        : `🔥 ¡Está a solo 1 visita de ganar ${retargetingConfig.loyaltyReward}! (Se incluye en el WhatsApp)`}
                    </p>
                  )}
                </div>
              </div>

              {/* Action CTA: Send Personalized WhatsApp */}
              <div className="pt-1">
                <button
                  onClick={() => handleSendWhatsApp(client)}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
                    campaignMode === 'slow_day'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {campaignMode === 'slow_day'
                      ? `Enviar Promo Día Suave a ${client.name.split(' ')[0]}`
                      : `Enviar Recordatorio + Link a ${client.name.split(' ')[0]}`}
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
