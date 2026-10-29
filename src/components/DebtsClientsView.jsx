import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, MessageCircle, Crown, Phone, Plus, Pencil, Trash2, X } from 'lucide-react'
import { normalizeWhatsAppPhone } from '../lib/dateUtils'

export default function DebtsClientsView({
  clients,
  exchangeRate,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onRegisterTransaction
}) {
  const [activeSubTab, setActiveSubTab] = useState('fiados') // 'fiados' or 'membresias'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+58412')
  const [debtUsd, setDebtUsd] = useState('0')
  const [plan, setPlan] = useState('Cliente Regular')
  const [planRenueva, setPlanRenueva] = useState('15 de cada mes')

  const openCreateModal = () => {
    setEditingClient(null)
    setName('')
    setPhone('+58412')
    setDebtUsd('0')
    setPlan(activeSubTab === 'membresias' ? 'Suscripción VIP (4 Cortes/Mes)' : 'Cliente Regular')
    setPlanRenueva('15 de cada mes')
    setIsModalOpen(true)
  }

  const openEditModal = (c) => {
    setEditingClient(c)
    setName(c.name)
    setPhone(c.phone || '+58412')
    setDebtUsd(String(c.debt_usd || 0))
    setPlan(c.plan || 'Cliente Regular')
    setPlanRenueva(c.plan_renueva || '15 de cada mes')
    setIsModalOpen(true)
  }

  const handleSaveClient = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    if (editingClient) {
      onUpdateClient({
        ...editingClient,
        name: name.trim(),
        phone: phone.trim(),
        debt_usd: parseFloat(debtUsd) || 0,
        plan: plan.trim() || 'Cliente Regular',
        plan_renueva: planRenueva.trim()
      })
    } else {
      onAddClient({
        id: 'c_' + Date.now(),
        name: name.trim(),
        phone: phone.trim(),
        debt_usd: parseFloat(debtUsd) || 0,
        plan: plan.trim() || 'Cliente Regular',
        plan_renueva: planRenueva.trim(),
        last_visit: new Date().toISOString().split('T')[0],
        last_service: 'Registro Directo',
        last_staff: 'Local',
        cycle_days: 15,
        visits_count: 1
      })
    }
    setIsModalOpen(false)
  }

  const totalDebtUSD = clients.reduce((sum, c) => sum + (c.debt_usd || 0), 0)
  const totalDebtBs = totalDebtUSD * exchangeRate

  const vipClients = clients.filter(c => c.plan && c.plan !== 'Cliente Regular')

  const handleSettle = (client) => {
    const debtAmount = client.debt_usd || 0
    if (confirm(`¿Confirmas que ${client.name} ya pagó los $${debtAmount.toFixed(2)} USD que debía?\n\nAl confirmar, este dinero se sumará a los ingresos de la caja de hoy.`)) {
      onUpdateClient({ ...client, debt_usd: 0 })
      if (onRegisterTransaction && debtAmount > 0) {
        onRegisterTransaction({
          id: 'tx_settle_' + Date.now(),
          type: 'ingreso',
          item_name: `Cobro de Deuda - ${client.name}`,
          category: 'Cobro Fiado',
          staff_name: 'Cobro de Caja',
          staff_id: null,
          client_name: client.name,
          client_phone: client.phone || '',
          monto_usd: debtAmount,
          monto_bs: parseFloat((debtAmount * exchangeRate).toFixed(2)),
          tasa_bcv: exchangeRate,
          metodo_pago: 'efectivo_usd',
          comision_usd: 0,
          ganancia_negocio_usd: debtAmount,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fecha: new Date().toISOString()
        })
      }
    }
  }

  const openWhatsAppReminder = (client) => {
    const cleanPhone = normalizeWhatsAppPhone(client.phone || '')
    if (!cleanPhone || cleanPhone.length < 9) {
      alert(`El cliente ${client.name} no tiene un teléfono válido registrado para enviarle WhatsApp.`)
      return
    }
    const debtBs = ((client.debt_usd || 0) * exchangeRate).toFixed(2)
    const text = encodeURIComponent(
      `¡Épale ${client.name.split(' ')[0]}! 👋 ¿Cómo estás pana? Te escribo de la barbería para recordarte con cariño el saldo pendiente de $${(client.debt_usd || 0).toFixed(2)} USD (Bs. ${debtBs} a la tasa de hoy). Puedes pasarlo por Pago Móvil cuando puedas o te llegas al local. ¡Un abrazo!`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank')
  }

  const openWhatsAppVipRenewal = (client) => {
    const cleanPhone = normalizeWhatsAppPhone(client.phone || '')
    if (!cleanPhone || cleanPhone.length < 9) {
      alert(`El cliente ${client.name} no tiene un teléfono válido registrado para enviarle WhatsApp.`)
      return
    }
    const text = encodeURIComponent(
      `¡Buenas ${client.name.split(' ')[0]}! 👋 Te escribo de la barbería para avisarte que tu ${client.plan} le toca renovación pronto (${client.plan_renueva || 'este mes'}). Avísame para apartarte tu cupo fijo en la semana. ¡Saludos!`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Clientes, Fiados & Membresías
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              {clients.length} Clientes
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Agrega clientes, anota o cobra fiados por WhatsApp y gestiona tus membresías fijas del mes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab pills */}
          <div className="flex items-center gap-1.5 bg-dark-850 p-1 rounded-xl border border-dark-700/80">
            <button
              onClick={() => setActiveSubTab('fiados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'fiados'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Directorio y Fiados</span>
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
              <span>Club VIP ({vipClients.length})</span>
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-xs shadow-lg shadow-gold-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Cliente / Fiado</span>
          </button>
        </div>
      </div>

      {/* View 1: FIADOS & DIRECTORIO */}
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
              Puedes editar el saldo o cobrar en 1 clic por WhatsApp
            </span>
          </div>

          {/* Client List */}
          {clients.length === 0 ? (
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center space-y-3">
              <h3 className="font-bold text-white text-base">Tu lista de clientes está limpia</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Agrega un cliente manualmente con el botón dorado o regístralo al momento de hacer un cobro en caja.
              </p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-gold-500 text-black text-xs font-black"
              >
                + Agregar Primer Cliente
              </button>
            </div>
          ) : (
            <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-dark-800">
              {clients.map((c) => {
                const hasDebt = (c.debt_usd || 0) > 0
                const debtInBs = ((c.debt_usd || 0) * exchangeRate).toFixed(2)

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
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{c.name}</h4>
                          {c.plan && c.plan !== 'Cliente Regular' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30 font-bold">
                              👑 {c.plan}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {c.phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
                      <div className="text-right mr-1">
                        {hasDebt ? (
                          <>
                            <div className="text-sm font-black text-amber-400">
                              Debe: ${(c.debt_usd || 0).toFixed(2)} USD
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              Bs. {debtInBs}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Solvente ($0)
                          </span>
                        )}
                      </div>

                      {hasDebt && (
                        <>
                          <button
                            onClick={() => openWhatsAppReminder(c)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                            title="Enviar WhatsApp con el monto ya calculado"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                            <span>Cobrar WA</span>
                          </button>

                          <button
                            onClick={() => handleSettle(c)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold active:scale-95 transition-all"
                          >
                            ✓ Ya Pagó
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => openEditModal(c)}
                        className="p-2 rounded-xl bg-dark-850 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750"
                        title="Editar cliente, anotar fiado o asignar plan VIP"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${c.name} de la lista de clientes?`)) {
                            onDeleteClient(c.id)
                          }
                        }}
                        className="p-2 rounded-xl bg-dark-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-750"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
                  {vipClients.length} clientes con plan mensual fijo
                </span>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="text-xs text-black font-black bg-gold-500 hover:bg-gold-400 px-3.5 py-2 rounded-xl"
            >
              + Agregar Miembro VIP
            </button>
          </div>

          {vipClients.length === 0 ? (
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              No tienes clientes en el Club VIP todavía. Usa el botón "+ Agregar Miembro VIP" o edita cualquier cliente para asignarle un plan mensual.
            </div>
          ) : (
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
                      Renovación: <strong className="text-slate-300">{vip.plan_renueva || 'Mensual'}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openWhatsAppVipRenewal(vip)}
                      className="px-3 py-2 rounded-xl bg-dark-800 hover:bg-gold-500 hover:text-black text-slate-200 border border-dark-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Avisar</span>
                    </button>
                    <button
                      onClick={() => openEditModal(vip)}
                      className="p-2 rounded-xl bg-dark-850 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Agregar o Editar Cliente / Fiado / Plan VIP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base">
                  {editingClient ? 'Editar Cliente / Saldo Fiado' : 'Agregar Cliente o Anotar Fiado'}
                </h3>
                <p className="text-xs text-slate-400">
                  Gestiona sus datos, cuánto debe o su membresía mensual
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nombre y Apellido
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Roberto Gómez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp / Teléfono
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. +584121234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  Saldo Pendiente / Fiado ($ USD) — Pon 0 si no debe nada
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={debtUsd}
                  onChange={(e) => setDebtUsd(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-amber-500/40 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gold-400 mb-1">
                    Tipo de Cliente / Membresía
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="Cliente Regular">Cliente Regular</option>
                    <option value="Suscripción VIP (4 Cortes/Mes)">👑 VIP (4 Cortes/Mes)</option>
                    <option value="Suscripción Barba Ilimitada">👑 VIP Barba Ilimitada</option>
                    <option value="Membresía Mensual Completa">👑 Membresía Completa</option>
                  </select>
                </div>

                {plan !== 'Cliente Regular' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Fecha de Renovación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Día 15 de cada mes"
                      value={planRenueva}
                      onChange={(e) => setPlanRenueva(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-dark-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-black shadow-lg shadow-gold-500/20"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
