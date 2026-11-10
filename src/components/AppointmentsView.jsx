import React, { useState } from 'react'
import { Calendar as CalendarIcon, Clock, User, Plus, CheckCircle2, ChevronLeft, ChevronRight, MessageSquare, Trash2, Settings, DollarSign, Sparkles, AlertCircle, Clock3 } from 'lucide-react'
import { getLocalDateIso, normalizeWhatsAppPhone, normalizeTimeSlot, inferServiceDuration, formatDurationLabel, getScheduleForDate, isTimeSlotInPast, timeToMinutes } from '../lib/dateUtils'

export default function AppointmentsView({ 
  appointments = [], 
  nicheData = { staff: [], services: [], roleName: 'Barbero', rolePlural: 'Barberos' }, 
  onAddAppointment, 
  onToggleAppointmentStatus, 
  onDeleteAppointment, 
  clients = [], 
  businessProfile = {}, 
  onOpenSettings, 
  onChargeAppointment 
}) {
  // Today's ISO date string strictly in local timezone
  const getTodayStr = () => getLocalDateIso()

  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [showAddModal, setShowAddModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pendiente' | 'en_atencion' | 'completada'
  
  // Form fields
  const [newClient, setNewClient] = useState('')
  const [newDate, setNewDate] = useState(getTodayStr())
  const [newTime, setNewTime] = useState('03:00 PM')
  const [newStaff, setNewStaff] = useState(nicheData?.staff?.[0]?.id || '')
  const [newService, setNewService] = useState(nicheData?.services?.[0]?.name || '')

  // Filter list by selected date and optional status filter
  const dateAppointments = appointments.filter(a => {
    if (!a.date) return true // legacy fallback
    return a.date === selectedDate
  })

  const filteredList = dateAppointments.filter(a => {
    if (statusFilter === 'all') return true
    return a.status === statusFilter
  })

  const pendingCount = dateAppointments.filter(a => a.status === 'pendiente' || !a.status).length
  const inProgressCount = dateAppointments.filter(a => a.status === 'en_atencion').length
  const completedCount = dateAppointments.filter(a => a.status === 'completada').length

  const toggleStatus = (id) => {
    if (onToggleAppointmentStatus) {
      onToggleAppointmentStatus(id)
    }
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newClient.trim()) return

    const canonicalTime = normalizeTimeSlot(newTime) || newTime.trim()
    const matchedService = (nicheData?.services || []).find(s => s.name === newService)
    const dur = matchedService?.duration_min || inferServiceDuration(newService)

    // Check collision with existing appointments
    const reqStart = timeToMinutes(canonicalTime)
    const reqEnd = reqStart + dur
    const staffList = nicheData?.staff || []
    const isSingleChair = Boolean(businessProfile?.singleChairMode !== false || staffList.length <= 1)

    const collidingApt = (appointments || []).find(apt => {
      if (apt.date !== newDate || apt.status === 'cancelada') return false
      const aptStart = timeToMinutes(apt.time)
      const aptDur = apt.duration_min || inferServiceDuration(apt.service)
      const aptEnd = aptStart + aptDur
      const overlaps = Math.max(reqStart, aptStart) < Math.min(reqEnd, aptEnd)
      if (!overlaps) return false

      if (isSingleChair) return true
      return !apt.staff_id || apt.staff_id === newStaff
    })

    if (collidingApt) {
      const confirmForce = window.confirm(
        `⚠️ ADVERTENCIA DE COLISIÓN DE HORARIO:\n\n` +
        `Ya existe una cita (${collidingApt.client_name || 'Cita previa'}) a las ${collidingApt.time} (${collidingApt.duration_min || 30} min) que se cruza con este horario (${canonicalTime}, ${dur} min).\n\n` +
        `¿Deseas registrarla de todas formas y permitir el solapamiento?`
      )
      if (!confirmForce) return
    }

    const newItem = {
      id: 'app_' + Date.now(),
      client_name: newClient.trim(),
      date: newDate,
      time: canonicalTime,
      staff_id: isSingleChair ? (staffList[0]?.id || 'e1') : newStaff,
      service: newService,
      duration_min: dur,
      status: 'pendiente'
    }

    if (onAddAppointment) onAddAppointment(newItem)
    
    // Reset form
    setNewClient('')
    setShowAddModal(false)
  }

  // Quick date change
  const changeDateByDays = (days) => {
    const current = new Date(selectedDate + 'T12:00:00')
    current.setDate(current.getDate() + days)
    setSelectedDate(getLocalDateIso(current))
  }

  // Generate 7-day strip centered on Monday..Sunday of selectedDate's week
  const getDaysOfWeek = (baseDateStr) => {
    const base = new Date(baseDateStr + 'T12:00:00')
    const dayOfWeek = base.getDay() // 0 = Sun, 1 = Mon...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek
    const monday = new Date(base)
    monday.setDate(base.getDate() + diffToMonday)

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + idx)
      const iso = getLocalDateIso(d)
      const count = (appointments || []).filter(a => a.date === iso && a.status !== 'cancelada').length
      return {
        iso,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        count,
        isToday: iso === getTodayStr(),
        isSelected: iso === selectedDate
      }
    })
  }

  const weekDays = getDaysOfWeek(selectedDate)

  const formatDateLabel = (dateStr) => {
    const today = getTodayStr()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = getLocalDateIso(tomorrow)

    if (dateStr === today) return 'Hoy'
    if (dateStr === tomorrowStr) return 'Mañana'

    const [year, month, day] = dateStr.split('-')
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${day} de ${months[parseInt(month, 10) - 1]}`
  }

  const getMonthYearLabel = (dateStr) => {
    if (!dateStr) return ''
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const parts = dateStr.split('-')
    if (parts.length < 3) return dateStr
    const monthIdx = parseInt(parts[1], 10) - 1
    return `${months[monthIdx]} ${parts[0]}`
  }

  const handleWhatsAppReminder = (apt, staffObj) => {
    const foundClient = clients.find(c => c.name.toLowerCase() === apt.client_name.toLowerCase())
    const rawPhone = apt.client_phone || foundClient?.phone || ''
    const cleanPhone = normalizeWhatsAppPhone(rawPhone)
    const bizName = businessProfile?.businessName || 'nuestro local'
    const msg = `👋 ¡Activo *${apt.client_name.split(' ')[0]}*! 💈✂️ Te escribimos de *${bizName}* para confirmar tu turno de *${formatDateLabel(apt.date || selectedDate)}* a las *${apt.time}* (${apt.service} con ${staffObj?.name || 'el equipo'}).\n\n¿Me confirmas tu asistencia? ¡Te esperamos puntual!`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* ─── HEADER COMMAND BAR: AGENDA & CITAS ─── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-dark-850 via-dark-900 to-dark-950 border border-dark-750/80 p-5 sm:p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse ring-4 ring-purple-500/20" />
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
              Agenda de Turnos • {formatDateLabel(selectedDate)}
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs text-slate-300 font-medium">
              {dateAppointments.length} {dateAppointments.length === 1 ? 'cliente agendado' : 'clientes agendados'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Control de Turnos & Citas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organiza el flujo de clientes sin filas de espera y cobra en caja con 1 toque
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-dark-800/90 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Configurar los horarios de atención y bloques de reserva de tu agenda"
            >
              <Settings className="w-3.5 h-3.5 text-gold-400" />
              <span className="hidden sm:inline">Modificar Horarios</span>
            </button>
          )}

          <button
            onClick={() => {
              setNewDate(selectedDate)
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-600/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Apartar Turno</span>
          </button>
        </div>
      </div>

      {/* ─── INTERACTIVE 7-DAY APPLE-STYLE CALENDAR STRIP ─── */}
      <div className="bg-dark-900 border border-dark-800/80 p-4 sm:p-5 rounded-3xl shadow-xl space-y-3.5">
        
        {/* Month Selector & Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-purple-400" />
            <h3 className="font-black text-white text-sm sm:text-base">
              {getMonthYearLabel(selectedDate)}
            </h3>
            {selectedDate !== getTodayStr() && (
              <button
                onClick={() => setSelectedDate(getTodayStr())}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-all ml-1"
              >
                Volver a Hoy
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Week Shift Buttons */}
            <button
              onClick={() => changeDateByDays(-7)}
              className="p-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700/80 transition-all"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Native Date Picker Popover */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700/80 text-xs text-slate-300 font-bold cursor-pointer transition-all">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Otra fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer text-xs"
              />
            </label>

            <button
              onClick={() => changeDateByDays(7)}
              className="p-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700/80 transition-all"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7-Day Pills Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {weekDays.map((d) => (
            <button
              key={d.iso}
              onClick={() => setSelectedDate(d.iso)}
              className={`p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center transition-all relative group ${
                d.isSelected
                  ? 'bg-gradient-to-b from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-purple-600/30 scale-[1.02] border border-purple-400/50'
                  : 'bg-dark-850 hover:bg-dark-800 text-slate-400 hover:text-slate-200 border border-dark-750/70'
              }`}
            >
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider block opacity-90">
                {d.dayName}
              </span>
              <span className="text-sm sm:text-lg font-black font-mono mt-0.5 block">
                {d.dayNum}
              </span>

              {/* Dot / Count Badge for appointments on that date */}
              {d.count > 0 ? (
                <span className={`mt-1 text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold flex items-center gap-0.5 ${
                  d.isSelected
                    ? 'bg-white text-purple-900 font-black'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block animate-pulse" />
                  <span>{d.count}</span>
                </span>
              ) : d.isToday ? (
                <span className="mt-1 text-[9px] font-bold text-emerald-400 block">
                  Hoy
                </span>
              ) : (
                <span className="mt-1 h-3 block" />
              )}
            </button>
          ))}
        </div>

        {/* Status Filters Bar */}
        <div className="flex items-center justify-between border-t border-dark-800/80 pt-3 gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 bg-dark-850 p-1 rounded-xl border border-dark-750/80 overflow-x-auto">
            {[
              { id: 'all', label: `Todos (${dateAppointments.length})` },
              { id: 'pendiente', label: `⏳ Por Atender (${pendingCount})` },
              { id: 'en_atencion', label: `⚡ En Silla (${inProgressCount})` },
              { id: 'completada', label: `✓ Listos (${completedCount})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                  statusFilter === f.id
                    ? 'bg-purple-600 text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 hidden md:inline">
            💡 Toca el estado de cualquier turno para cambiarlo a "En la Silla" o "Listo"
          </span>
        </div>

      </div>

      {/* ─── APPOINTMENTS LIST FOR SELECTED DATE ─── */}
      {filteredList.length === 0 ? (
        <div className="relative overflow-hidden bg-dark-900 border border-dark-800/80 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mx-auto flex items-center justify-center shadow-inner">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-white text-base sm:text-lg">
              {dateAppointments.length === 0
                ? `Agenda despejada para el ${formatDateLabel(selectedDate)}`
                : `No hay turnos con el filtro seleccionado`}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {dateAppointments.length === 0
                ? 'No hay clientes agendados en esta fecha. Puedes apartar un turno manual o recibir citas desde tu catálogo web.'
                : 'Cambia el filtro de arriba a "Todos" para ver todas las citas agendadas.'}
            </p>
          </div>
          <button
            onClick={() => {
              setNewDate(selectedDate)
              setShowAddModal(true)
            }}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
          >
            + Apartar Turno para el {formatDateLabel(selectedDate)}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filteredList.map((apt) => {
            const staffObj = (nicheData?.staff || []).find(s => s.id === apt.staff_id)
            const isCompleted = apt.status === 'completada'
            const isInChair = apt.status === 'en_atencion'

            return (
              <div 
                key={apt.id}
                className={`relative overflow-hidden bg-dark-900 border hover:border-dark-700/90 rounded-3xl p-4 sm:p-5 shadow-xl transition-all group flex flex-col justify-between gap-3.5 ${
                  isCompleted 
                    ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/15 via-dark-900 to-dark-900' 
                    : isInChair 
                    ? 'border-blue-500/40 bg-gradient-to-br from-blue-950/20 via-dark-900 to-dark-900' 
                    : 'border-dark-800/90'
                }`}
              >
                {/* Status indicator glow edge */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  isCompleted ? 'bg-emerald-500' : isInChair ? 'bg-blue-500' : 'bg-purple-500'
                }`} />

                {/* Top Section: Time, Duration & Status Toggle */}
                <div className="flex items-center justify-between gap-2 pl-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800/90 border border-dark-750 text-white font-mono font-bold text-xs sm:text-sm shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{apt.time}</span>
                    </div>

                    <span className="text-[10px] px-2 py-1 rounded-xl bg-dark-850 text-slate-400 border border-dark-750 font-bold">
                      ⏱️ {formatDurationLabel(apt.duration_min || inferServiceDuration(apt.service))}
                    </span>
                  </div>

                  {/* Status Toggle Badge */}
                  <button
                    onClick={() => toggleStatus(apt.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
                      isCompleted 
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                        : isInChair 
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 ring-2 ring-blue-500/20 animate-pulse' 
                        : 'bg-dark-800 text-amber-400 border-dark-700 hover:border-amber-500/40'
                    }`}
                    title="Click para cambiar estado (Esperando → En la Silla → Listo)"
                  >
                    {isCompleted && (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Listo</span>
                      </>
                    )}
                    {isInChair && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                        <span>En la Silla</span>
                      </>
                    )}
                    {!isCompleted && !isInChair && (
                      <>
                        <Clock3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Esperando</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Middle Section: Client Name, Service & Staff */}
                <div className="pl-2 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-white text-base tracking-tight truncate">
                      {apt.client_name}
                    </h4>
                    {apt.source === 'web' && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30 font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Link Web</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold text-slate-200 bg-dark-850 px-2.5 py-0.5 rounded-lg border border-dark-750">
                      ✂️ {apt.service}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <span>{staffObj?.avatar || '👤'}</span>
                      <span className="text-slate-300 font-medium">{staffObj?.name || 'Cualquier especialista'}</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Row: Cobrar + WhatsApp + Borrar */}
                <div className="pl-2 pt-2 border-t border-dark-800/80 flex items-center justify-between gap-2 flex-wrap">
                  
                  <div className="flex items-center gap-2 flex-1">
                    {/* Action 1: Cobrar en Caja */}
                    {!isCompleted && onChargeAppointment && (
                      <button
                        type="button"
                        onClick={() => onChargeAppointment(apt)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black font-black text-xs shadow-md shadow-gold-500/20 active:scale-95 transition-all"
                        title="Cobrar este turno en Caja con 1 toque"
                      >
                        <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Cobrar en Caja</span>
                      </button>
                    )}

                    {/* Action 2: Recordatorio WhatsApp Anti-Embarque */}
                    <button
                      type="button"
                      onClick={() => handleWhatsAppReminder(apt, staffObj)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
                      title="Enviar recordatorio de turno por WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>

                  {/* Action 3: Eliminar Cita */}
                  {onDeleteAppointment && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Eliminar el turno de ${apt.client_name}?`)) {
                          onDeleteAppointment(apt.id)
                        }
                      }}
                      className="p-2 rounded-2xl bg-dark-850 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-dark-750 transition-all active:scale-95"
                      title="Cancelar / Eliminar turno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* ─── MODAL APARTAR NUEVO TURNO ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-dark-900 border border-dark-750 w-full max-w-md rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <div>
                <h3 className="font-black text-white text-base sm:text-lg">
                  Apartar Nuevo Turno
                </h3>
                <p className="text-xs text-slate-400">
                  Programa la fecha y hora para evitar que el cliente espere de pie
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Castillo"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Selector de FECHA */}
              <div>
                <label className="block text-xs font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Fecha de la Cita
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Selector de HORA */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Hora Estimada</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-2 max-h-32 overflow-y-auto p-1.5 bg-dark-950 rounded-2xl border border-dark-800">
                  {(() => {
                    const sched = getScheduleForDate(businessProfile, newDate)
                    const slotsList = (sched.enabled && sched.slots.length > 0)
                      ? sched.slots
                      : (businessProfile?.bookingSlots || ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '05:30 PM', '07:00 PM'])
                    const staffList = nicheData?.staff || []
                    const isSingleChair = Boolean(businessProfile?.singleChairMode !== false || staffList.length <= 1)
                    const matchedService = (nicheData?.services || []).find(s => s.name === newService)
                    const curDur = matchedService?.duration_min || inferServiceDuration(newService) || 30

                    return slotsList.map(h => {
                      const hStart = timeToMinutes(h)
                      const hEnd = hStart + curDur
                      const isOccupied = (appointments || []).some(a => {
                        if (a.date !== newDate || a.status === 'cancelada') return false
                        const aStart = timeToMinutes(a.time)
                        const aDur = a.duration_min || inferServiceDuration(a.service)
                        const aEnd = aStart + aDur
                        const overlaps = Math.max(hStart, aStart) < Math.min(hEnd, aEnd)
                        if (!overlaps) return false
                        if (isSingleChair) return true
                        return !a.staff_id || a.staff_id === newStaff
                      })
                      const isPast = isTimeSlotInPast(h, newDate, 10)
                      const isSelected = newTime === h
                      return (
                        <button
                          type="button"
                          key={h}
                          onClick={() => setNewTime(h)}
                          className={`py-1.5 text-[11px] rounded-xl border font-mono transition-all text-center relative ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-500 font-bold shadow-sm'
                              : isOccupied
                              ? 'bg-red-950/30 text-red-400 border-red-900/40 line-through'
                              : isPast
                              ? 'bg-dark-900 text-slate-500 border-dark-800 line-through opacity-50'
                              : 'bg-dark-850 text-slate-300 border-dark-750 hover:text-white'
                          }`}
                          title={isOccupied ? 'Horario ocupado por otra cita' : isPast ? 'Hora ya transcurrida' : 'Disponible'}
                        >
                          {h}
                        </button>
                      )
                    })
                  })()}
                </div>
                <input
                  type="text"
                  placeholder="O escribe la hora personalizada (ej. 05:00 PM)"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ¿Quién lo atiende? ({nicheData?.roleName || 'Especialista'})
                </label>
                <select
                  value={newStaff}
                  onChange={(e) => setNewStaff(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white focus:outline-none"
                >
                  {(nicheData?.staff || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Servicio a Realizar</label>
                <select
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white focus:outline-none"
                >
                  {(nicheData?.services || []).map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} (${s.price_usd} • {formatDurationLabel(s.duration_min || inferServiceDuration(s), true)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-dark-800 hover:bg-dark-750 text-slate-300 rounded-2xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs shadow-lg shadow-purple-600/25 active:scale-95 transition-all"
                >
                  Guardar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
