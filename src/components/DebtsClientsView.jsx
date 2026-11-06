import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, MessageCircle, Crown, Phone, Plus, Pencil, Trash2, X, Search, DollarSign, Sparkles, Filter, Check, ArrowRight, UserCheck } from 'lucide-react'
import { normalizeWhatsAppPhone } from '../lib/dateUtils'
import PhoneCountryInput from './PhoneCountryInput'

export default function DebtsClientsView({
  clients = [],
  exchangeRate = 889.26,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onRegisterTransaction
}) {
  const [filterType, setFilterType] = useState('all') // 'all' | 'deudores' | 'solventes' | 'vip'
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [debtUsd, setDebtUsd] = useState('0')
  const [plan, setPlan] = useState('Cliente Regular')
  const [planRenueva, setPlanRenueva] = useState('15 de cada mes')

  const totalDebtUSD = clients.reduce((sum, c) => sum + (c.debt_usd || 0), 0)
  const totalDebtBs = totalDebtUSD * exchangeRate

  const debtorsCount = clients.filter(c => (c.debt_usd || 0) > 0).length
  const solventClientsCount = clients.filter(c => !c.debt_usd || c.debt_usd === 0).length
  const vipClients = clients.filter(c => c.plan && c.plan !== 'Cliente Regular')

  // Filter clients by search query and active filter tab
  const filteredClients = clients.filter(c => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchesName = (c.name || '').toLowerCase().includes(q)
      const matchesPhone = (c.phone || '').includes(q)
      if (!matchesName && !matchesPhone) return false
    }

    // 2. Filter Type
    if (filterType === 'deudores') return (c.debt_usd || 0) > 0
    if (filterType === 'solventes') return !c.debt_usd || c.debt_usd === 0
    if (filterType === 'vip') return c.plan && c.plan !== 'Cliente Regular'

    return true
  })

  const openCreateModal = () => {
    setEditingClient(null)
    setName('')
    setPhone('')
    setDebtUsd('0')
    setPlan(filterType === 'vip' ? 'Suscripción VIP (4 Cortes/Mes)' : 'Cliente Regular')
    setPlanRenueva('15 de cada mes')
    setIsModalOpen(true)
  }

  const openEditModal = (c) => {
    setEditingClient(c)
    setName(c.name)
    setPhone(c.phone || '')
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

  const handleSettle = (client) => {
    const debtAmount = client.debt_usd || 0
    if (window.confirm(`¿Confirmas que ${client.name} ya pagó los $${debtAmount.toFixed(2)} USD que debía?\n\nAl confirmar, este dinero se sumará a los ingresos de la caja de hoy automáticamente.`)) {
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
      `¡Buenas ${client.name.split(' ')[0]}! 👋 Te escribo del local para avisarte que a tu ${client.plan} le toca renovación pronto (${client.plan_renueva || 'este mes'}). Avísame para apartarte tu cupo fijo en la semana. ¡Saludos!`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* ─── HERO COMMAND CENTER: CONTROL DE FIADOS & CLIENTES ─── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-dark-850 via-dark-900 to-dark-950 border border-dark-750/80 p-5 sm:p-7 rounded-3xl shadow-2xl">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-dark-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse ring-4 ring-amber-500/20" />
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              Control de Cuentas por Cobrar • Fiados
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-300 font-medium">
              {clients.length} {clients.length === 1 ? 'cliente' : 'clientes en directorio'}
            </span>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Cliente / Fiado</span>
          </button>
        </div>

        {/* Main Hero Metric: Plata en la Calle */}
        <div className="relative z-10 py-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total de Plata en la Calle (Por Cobrar)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                  ${totalDebtUSD.toFixed(2)}
                </span>
                <span className="text-base sm:text-lg font-bold text-white">
                  USD
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm">
                <span className="font-mono font-bold text-slate-300">
                  ≈ Bs. {totalDebtBs.toFixed(2)}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400/90 text-xs font-medium">
                  {debtorsCount} {debtorsCount === 1 ? 'cliente con saldo pendiente' : 'clientes con saldo pendiente'}
                </span>
              </div>
            </div>

            {/* Quick Status Breakdown */}
            <div className="flex items-center gap-2 bg-dark-950/80 border border-dark-800 p-2.5 rounded-2xl">
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">⚠️ En Deuda</span>
                <span className="text-xs font-black font-mono text-white">{debtorsCount} clientes</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">✓ Solventes</span>
                <span className="text-xs font-black font-mono text-white">{solventClientsCount} clientes</span>
              </div>
              {vipClients.length > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-gold-500/10 border border-gold-500/20 text-left">
                  <span className="text-[10px] uppercase font-bold text-gold-400 block">👑 Club VIP</span>
                  <span className="text-xs font-black font-mono text-white">{vipClients.length} miembros</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ─── SEARCH & FILTER BAR ─── */}
      <div className="bg-dark-900 border border-dark-800/80 p-3 sm:p-4 rounded-3xl shadow-xl space-y-3">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 bg-dark-850 p-1 rounded-2xl border border-dark-750/80 w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'all', label: `Todos (${clients.length})` },
              { id: 'deudores', label: `⚠️ Con Deuda (${debtorsCount})` },
              { id: 'solventes', label: `✓ Solventes (${solventClientsCount})` },
              { id: 'vip', label: `👑 Club VIP (${vipClients.length})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  filterType === f.id
                    ? 'bg-amber-500 text-black shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* ─── CLIENTS DIRECTORY GRID ─── */}
      {filteredClients.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800/80 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto flex items-center justify-center shadow-inner">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-white text-base sm:text-lg">
              {clients.length === 0
                ? 'Tu lista de clientes está vacía'
                : 'No se encontraron clientes con este filtro'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {clients.length === 0
                ? 'Comienza agregando tu primer cliente o anota fiados para llevar tus cuentas claras sin papeles.'
                : 'Intenta limpiar el buscador o seleccionar otro filtro para ver el resto de clientes.'}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black text-xs font-black shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
          >
            + Agregar Cliente o Fiado
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filteredClients.map((c) => {
            const hasDebt = (c.debt_usd || 0) > 0
            const debtInBs = ((c.debt_usd || 0) * exchangeRate).toFixed(2)
            const isVip = c.plan && c.plan !== 'Cliente Regular'

            return (
              <div 
                key={c.id}
                className={`relative overflow-hidden bg-dark-900 border hover:border-dark-700/90 rounded-3xl p-4 sm:p-5 shadow-xl transition-all group flex flex-col justify-between gap-3.5 ${
                  hasDebt 
                    ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/15 via-dark-900 to-dark-900' 
                    : 'border-dark-800/90'
                }`}
              >
                {/* Accent status edge */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  hasDebt ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />

                {/* Top Section: Client Avatar, Name & Debt Pill */}
                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-inner border ${
                      hasDebt 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-white text-base tracking-tight truncate">
                          {c.name}
                        </h4>
                        {isVip && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30 font-bold flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            <span>{c.plan}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {c.phone || 'Sin número'}
                        </span>
                        {isVip && c.plan_renueva && (
                          <span className="text-[10px] text-slate-500">
                            • Renueva: {c.plan_renueva}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-right shrink-0">
                    {hasDebt ? (
                      <div className="px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-right">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">Debe</span>
                        <span className="text-sm font-black font-mono text-amber-400 block">${(c.debt_usd || 0).toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">Bs. {debtInBs}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Solvente ($0)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="pl-2 pt-2 border-t border-dark-800/80 flex items-center justify-between gap-2 flex-wrap">
                  
                  <div className="flex items-center gap-2 flex-1">
                    {hasDebt ? (
                      <>
                        {/* Action 1: Cobrar por WhatsApp */}
                        <button
                          type="button"
                          onClick={() => openWhatsAppReminder(c)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                          title="Enviar recordatorio cordial con monto en $ y Bs."
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>Cobrar por WhatsApp</span>
                        </button>

                        {/* Action 2: Ya Pagó (Asentar en Caja) */}
                        <button
                          type="button"
                          onClick={() => handleSettle(c)}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold active:scale-95 transition-all"
                          title="Marcar como pagado y sumar a ingresos de hoy"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Ya Pagó</span>
                        </button>
                      </>
                    ) : isVip ? (
                      <button
                        type="button"
                        onClick={() => openWhatsAppVipRenewal(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-gold-500/15 hover:bg-gold-500/25 text-gold-400 border border-gold-500/30 text-xs font-bold active:scale-95 transition-all"
                        title="Enviar recordatorio de renovación VIP"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>Aviso Renovación</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sin saldos pendientes</span>
                      </span>
                    )}
                  </div>

                  {/* Actions: Editar & Eliminar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      className="p-2 rounded-2xl bg-dark-850 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750 transition-all active:scale-95"
                      title="Editar datos, anotar fiado o plan VIP"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar a ${c.name} de la lista de clientes?`)) {
                          onDeleteClient(c.id)
                        }
                      }}
                      className="p-2 rounded-2xl bg-dark-850 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-dark-750 transition-all active:scale-95"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* ─── MODAL: AGREGAR O EDITAR CLIENTE / FIADO / PLAN VIP ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-dark-900 border border-dark-750 w-full max-w-md rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <div>
                <h3 className="font-black text-white text-base sm:text-lg">
                  {editingClient ? 'Editar Cliente / Saldo Fiado' : 'Agregar Cliente o Anotar Fiado'}
                </h3>
                <p className="text-xs text-slate-400">
                  Controla cuánto debe o si pertenece a tu club de membresías
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3.5">
              
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
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  WhatsApp / Teléfono
                </label>
                <PhoneCountryInput
                  value={phone}
                  onChange={setPhone}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1 flex items-center justify-between">
                  <span>Saldo Pendiente / Fiado ($ USD)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Pon 0 si no debe nada</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={debtUsd}
                    onChange={(e) => setDebtUsd(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl bg-dark-850 border border-amber-500/40 text-xs text-white font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                {parseFloat(debtUsd) > 0 && (
                  <span className="text-[11px] text-amber-400 font-mono mt-1 block">
                    ≈ Bs. {(parseFloat(debtUsd) * exchangeRate).toFixed(2)} a la tasa BCV oficial
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gold-400 mb-1">
                    Tipo de Membresía / Plan
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white focus:outline-none"
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
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-dark-800 hover:bg-dark-750 text-slate-300 rounded-2xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black font-black rounded-2xl text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
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
