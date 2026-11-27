import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, User, Plus, CheckCircle2, ChevronLeft, ChevronRight, MessageSquare, Trash2, Settings, DollarSign, Sparkles, AlertCircle, Clock3 } from 'lucide-react'
import { getLocalDateIso, normalizeWhatsAppPhone, normalizeTimeSlot, inferServiceDuration, formatDurationLabel, getScheduleForDate, isTimeSlotInPast, timeToMinutes, isStaffAvailableOnDate, isStaffAvailableForSlot } from '../lib/dateUtils'
import { isArgentina } from '../lib/brandConfig'
import { getOperativeStaff } from '../lib/securityUtils'

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
  const isAr = isArgentina(null, businessProfile)

  // Today's ISO date string strictly in local timezone
  const getTodayStr = () => getLocalDateIso()

  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [showAddModal, setShowAddModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pendiente' | 'en_atencion' | 'completada'
  const [staffFilter, setStaffFilter] = useState('all') // 'all' | staff.id
  
  // Form fields
  const operativeStaff = getOperativeStaff(nicheData?.staff)
  const [newClient, setNewClient] = useState('')
  const [newDate, setNewDate] = useState(getTodayStr())
  const [newTime, setNewTime] = useState('03:00 PM')
  const [newStaff, setNewStaff] = useState(operativeStaff[0]?.id || '')
  const [newService, setNewService] = useState(nicheData?.services?.[0]?.name || '')

  // Keep selected staff & service synced when team/catalog loads or changes
  useEffect(() => {
    if (operativeStaff.length > 0 && !operativeStaff.some(s => s.id === newStaff)) {
      setNewStaff(operativeStaff[0].id)
    }
  }, [operativeStaff, newStaff])

  useEffect(() => {
    const services = nicheData?.services || []
    if (services.length > 0 && !services.some(s => s.name === newService)) {
      setNewService(services[0].name)
    }
  }, [nicheData?.services, newService])

  const getEffectivePeriod = (rawTime) => {
    const norm = normalizeTimeSlot(rawTime)
    return /\bAM$/i.test(norm) ? 'AM' : 'PM'
  }

  const applyPeriodToTime = (rawTime, period) => {
    const norm = normalizeTimeSlot(rawTime) || '03:00 PM'
    const m = norm.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (m) {
      return `${m[1].padStart(2, '0')}:${m[2]} ${period}`
    }
    const cleanDigits = String(rawTime || '').replace(/\s*(AM|PM)\s*$/i, '').trim()
    return cleanDigits ? `${cleanDigits} ${period}` : `03:00 ${period}`
  }

  // Filter list by selected date, sort strictly chronologically, then apply status + staff filters
  const dateAppointments = appointments
    .filter(a => {
      if (!a.date) return true // legacy fallback
      return a.date === selectedDate
    })
    .slice()
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))

  const filteredList = dateAppointments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (staffFilter !== 'all') {
      const targetSt = operativeStaff.find(s => s.id === staffFilter)
      const matchesStaff = a.staff_id === staffFilter || (targetSt && a.staff_name === targetSt.name)
      if (!matchesStaff) return false
    }
    return true
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
    const staffList = operativeStaff
    const effectiveStaffObj = staffList.find(s => s.id === newStaff) || staffList[0] || null
    const effectiveStaffId = effectiveStaffObj?.id || newStaff || 'e1'
    const isSingleChair = Boolean(businessProfile?.singleChairMode !== false || staffList.length <= 1)

    if (effectiveStaffObj && !isStaffAvailableOnDate(effectiveStaffObj, newDate)) {
      const confirmOff = window.confirm(
        `⚠️ ${effectiveStaffObj.name} está marcado como LIBRE / AUSENTE el ${newDate}.\n\n` +
        `¿Deseas agendar esta cita de todas formas?`
      )
      if (!confirmOff) return
    } else if (effectiveStaffObj && !isStaffAvailableForSlot(effectiveStaffObj, newDate, canonicalTime, dur)) {
      const blk = (effectiveStaffObj.blocked_hours || []).find(b => b && b.date === newDate)
      const blkInfo = blk ? ` (${blk.start} – ${blk.end})` : ''
      const confirmPartialOff = window.confirm(
        `⏱️ ${effectiveStaffObj.name} tiene un bloqueo horario parcial${blkInfo} el ${newDate}.\n\n` +
        `¿Deseas agendar este turno de todas formas?`
      )
      if (!confirmPartialOff) return
    }

    const collidingApt = (appointments || []).find(apt => {
      if (apt.date !== newDate || apt.status === 'cancelada' || apt.status === 'completada') return false
      const aptStart = timeToMinutes(apt.time)
      const aptDur = apt.duration_min || inferServiceDuration(apt.service)
      const aptEnd = aptStart + aptDur
      const overlaps = Math.max(reqStart, aptStart) < Math.min(reqEnd, aptEnd)
      if (!overlaps) return false

      if (isSingleChair) return true
      return !apt.staff_id || apt.staff_id === effectiveStaffId
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
      staff_id: effectiveStaffId,
      staff_name: effectiveStaffObj?.name || '',
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
    const cleanPhone = normalizeWhatsAppPhone(rawPhone, isAr ? 'AR' : 'VE')
    const bizName = businessProfile?.businessName || 'nuestro local'
    const greeting = isAr ? `👋 ¡Hola *${apt.client_name.split(' ')[0]}*!` : `👋 ¡Activo *${apt.client_name.split(' ')[0]}*!`
    const msg = `${greeting} 💈✂️ Te escribimos de *${bizName}* para confirmar tu turno de *${formatDateLabel(apt.date || selectedDate)}* a las *${apt.time}* (${apt.service} con ${staffObj?.name || 'el equipo'}).\n\n¿Me confirmas tu asistencia? ¡Te esperamos puntual!`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* ─── HEADER COMPACTO: AGENDA & TURNOS ─── */}
      <div className="bg-dark-900 border border-dark-800 px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Agenda de Turnos
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 border border-dark-700">
              {formatDateLabel(selectedDate)} · {dateAppointments.length} {dateAppointments.length === 1 ? 'turno' : 'turnos'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            Ordenados cronológicamente por hora · Toca el estado para pasar a silla o cobrar
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white border border-dark-750 text-xs font-bold transition-all active:scale-95"
              title="Configurar los horarios de atención de tu agenda"
            >
              <Settings className="w-3.5 h-3.5 text-gold-400" />
              <span className="hidden sm:inline">Horarios</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setNewDate(selectedDate)
              setShowAddModal(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'Nuevo Turno' : 'Apartar Turno'}</span>
          </button>
        </div>
      </div>

      {/* ─── CALENDARIO SEMANAL & FILTROS ─── */}
      <div className="bg-dark-900 border border-dark-800 p-3.5 sm:p-4 rounded-2xl shadow-lg space-y-3">
        {/* Mes + Controles de fecha */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-purple-400 shrink-0" />
            <h3 className="font-bold text-white text-sm">
              {getMonthYearLabel(selectedDate)}
            </h3>
            {selectedDate !== getTodayStr() && (
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayStr())}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-all"
              >
                Hoy
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => changeDateByDays(-7)}
              className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-400 hover:text-white border border-dark-750 transition-all"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-slate-300 font-bold cursor-pointer transition-all">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer text-xs"
              />
            </label>

            <button
              type="button"
              onClick={() => changeDateByDays(7)}
              className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-400 hover:text-white border border-dark-750 transition-all"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tira compacta de 7 días */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {weekDays.map((d) => (
            <button
              type="button"
              key={d.iso}
              onClick={() => setSelectedDate(d.iso)}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all border ${
                d.isSelected
                  ? 'bg-purple-600 text-white border-purple-400/60 shadow-md shadow-purple-600/25'
                  : 'bg-dark-850 hover:bg-dark-800 text-slate-400 hover:text-slate-200 border-dark-800'
              }`}
            >
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-85">
                {d.dayName}
              </span>
              <span className="text-sm sm:text-base font-black font-mono leading-tight my-0.5">
                {d.dayNum}
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 rounded-full min-h-[14px] leading-[14px] ${
                d.count > 0
                  ? d.isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-purple-500/20 text-purple-300'
                  : d.isToday
                  ? 'text-emerald-400'
                  : 'text-transparent'
              }`}>
                {d.count > 0 ? d.count : d.isToday ? 'Hoy' : '0'}
              </span>
            </button>
          ))}
        </div>

        {/* Fila unificada de filtros: Estado + Especialista */}
        <div className="pt-2.5 border-t border-dark-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-xl border border-dark-800 overflow-x-auto max-w-full">
              {[
                { id: 'all', label: `Todos (${dateAppointments.length})` },
                { id: 'pendiente', label: `Por atender (${pendingCount})` },
                { id: 'en_atencion', label: `En silla (${inProgressCount})` },
                { id: 'completada', label: `Listos (${completedCount})` },
              ].map(f => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                    statusFilter === f.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Filtro por Especialista / Barbero */}
            {operativeStaff.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
                <button
                  type="button"
                  onClick={() => setStaffFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition-all ${
                    staffFilter === 'all'
                      ? 'bg-dark-800 text-white border-dark-650'
                      : 'bg-transparent text-slate-400 border-dark-800 hover:text-white'
                  }`}
                >
                  Todo el equipo
                </button>
                {operativeStaff.map(st => {
                  const stCount = dateAppointments.filter(a => a.staff_id === st.id || a.staff_name === st.name).length
                  const isOffDate = !isStaffAvailableOnDate(st, selectedDate)
                  const hasPartialHours = Array.isArray(st.blocked_hours) && st.blocked_hours.some(b => b && b.date === selectedDate)
                  return (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => setStaffFilter(staffFilter === st.id ? 'all' : st.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition-all ${
                        staffFilter === st.id
                          ? 'bg-gold-500/20 text-gold-300 border-gold-500/50'
                          : isOffDate
                          ? 'bg-rose-500/10 text-rose-300/80 border-rose-500/25'
                          : 'bg-dark-850 text-slate-300 border-dark-800 hover:border-dark-700'
                      }`}
                      title={isOffDate ? `${st.name} libra este día` : hasPartialHours ? `${st.name} tiene bloqueo por horas este día` : st.name}
                    >
                      <span>{st.avatar || '✂️'}</span>
                      <span className="truncate max-w-[90px]">{st.name.split(' ')[0]}</span>
                      <span className="text-[10px] font-mono opacity-75">({stCount})</span>
                      {hasPartialHours && !isOffDate && <span className="text-[9px] text-amber-400">⏱️</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── LISTA CRONOLÓGICA LIMPIA DEL DÍA ─── */}
      {filteredList.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mx-auto flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-white text-sm sm:text-base">
              {dateAppointments.length === 0
                ? `Agenda despejada para ${formatDateLabel(selectedDate)}`
                : 'No hay turnos con los filtros actuales'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {dateAppointments.length === 0
                ? 'Aún no hay turnos registrados para este día.'
                : 'Prueba limpiando los filtros de estado o especialista.'}
            </p>
          </div>
          {dateAppointments.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                setNewDate(selectedDate)
                setShowAddModal(true)
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md transition-all"
            >
              + {isAr ? 'Nuevo Turno' : 'Apartar Turno'} ({formatDateLabel(selectedDate)})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setStaffFilter('all') }}
              className="px-4 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-bold border border-dark-700"
            >
              Mostrar todos ({dateAppointments.length})
            </button>
          )}
        </div>
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl divide-y divide-dark-800/80 overflow-hidden shadow-xl">
          {filteredList.map((apt) => {
            const staffObj = (nicheData?.staff || []).find(s => s.id === apt.staff_id) ||
              (apt.staff_name ? (nicheData?.staff || []).find(s => s.name === apt.staff_name) : null)
            const isCompleted = apt.status === 'completada'
            const isInChair = apt.status === 'en_atencion'
            const durLabel = formatDurationLabel(apt.duration_min || inferServiceDuration(apt.service))

            return (
              <div
                key={apt.id}
                className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 transition-colors ${
                  isCompleted
                    ? 'bg-emerald-950/10 opacity-80'
                    : isInChair
                    ? 'bg-blue-950/15'
                    : 'hover:bg-dark-850/60'
                }`}
              >
                {/* Franja lateral de estado */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                  isCompleted ? 'bg-emerald-500' : isInChair ? 'bg-blue-500' : 'bg-amber-400'
                }`} />

                {/* Bloque Izquierdo + Centro: Hora + Cliente + Servicio + Barbero */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1 pl-1.5">
                  {/* Columna fija de Hora */}
                  <div className="w-20 sm:w-24 shrink-0 pt-0.5 sm:pt-0">
                    <div className="font-mono font-black text-white text-sm leading-none">
                      {apt.time}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                      {durLabel}
                    </div>
                  </div>

                  {/* Información principal */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-sm tracking-tight truncate">
                        {apt.client_name}
                      </h4>
                      {apt.source === 'web' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-gold-500/15 text-gold-400 border border-gold-500/30 font-bold inline-flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Web</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleStatus(apt.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all inline-flex items-center gap-1 ${
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : isInChair
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/25 hover:border-amber-400/60'
                        }`}
                        title="Tocar para cambiar estado (Esperando → En silla → Listo)"
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Listo</span>
                          </>
                        ) : isInChair ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                            <span>En silla</span>
                          </>
                        ) : (
                          <>
                            <Clock3 className="w-3 h-3" />
                            <span>Esperando</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
                      <span className="text-slate-200 font-medium truncate max-w-[240px]">
                        ✂️ {apt.service}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <span>{staffObj?.avatar || '👤'}</span>
                        <span>{staffObj?.name || apt.staff_name || 'Por asignar'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones Derecha */}
                <div className="flex items-center gap-1.5 pl-1.5 sm:pl-0 shrink-0 justify-end">
                  {!isCompleted && onChargeAppointment && (
                    <button
                      type="button"
                      onClick={() => onChargeAppointment(apt)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black font-black text-xs shadow-sm active:scale-95 transition-all"
                      title="Cobrar este turno en Caja"
                    >
                      <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Cobrar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleWhatsAppReminder(apt, staffObj)}
                    className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95"
                    title="Enviar recordatorio por WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  {onDeleteAppointment && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Eliminar el turno de ${apt.client_name}?`)) {
                          onDeleteAppointment(apt.id)
                        }
                      }}
                      className="p-2 rounded-xl bg-dark-850 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-dark-750 transition-all active:scale-95"
                      title="Cancelar / Eliminar turno"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-bold text-slate-300">Hora Estimada</label>
                  <span className="text-[10px] font-medium text-slate-400">
                    <span className="text-red-400 font-bold">Rojo</span> = Ocupada · <span className="text-amber-300 font-bold">Ámbar</span> = Bloqueo · <span className="text-slate-500 font-bold">Gris</span> = Pasó
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-2 max-h-32 overflow-y-auto p-1.5 bg-dark-950 rounded-2xl border border-dark-800">
                  {(() => {
                    const sched = getScheduleForDate(businessProfile, newDate)
                    const slotsList = (sched.enabled && sched.slots.length > 0)
                      ? sched.slots
                      : (businessProfile?.bookingSlots || ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '05:30 PM', '07:00 PM'])
                    const staffList = operativeStaff
                    const effectiveStaffObj = staffList.find(s => s.id === newStaff) || staffList[0] || null
                    const effectiveStaffId = effectiveStaffObj?.id || 'e1'
                    const isSingleChair = Boolean(businessProfile?.singleChairMode !== false || staffList.length <= 1)
                    const matchedService = (nicheData?.services || []).find(s => s.name === newService)
                    const curDur = matchedService?.duration_min || inferServiceDuration(newService) || 30

                    return slotsList.map(h => {
                      const hStart = timeToMinutes(h)
                      const hEnd = hStart + curDur
                      const isOccupied = (appointments || []).some(a => {
                        if (a.date !== newDate || a.status === 'cancelada' || a.status === 'completada') return false
                        const aStart = timeToMinutes(a.time)
                        const aDur = a.duration_min || inferServiceDuration(a.service)
                        const aEnd = aStart + aDur
                        const overlaps = Math.max(hStart, aStart) < Math.min(hEnd, aEnd)
                        if (!overlaps) return false
                        if (isSingleChair) return true
                        return !a.staff_id || a.staff_id === effectiveStaffId
                      })
                      const isBlockedHour = Boolean(
                        effectiveStaffObj &&
                        isStaffAvailableOnDate(effectiveStaffObj, newDate) &&
                        !isStaffAvailableForSlot(effectiveStaffObj, newDate, h, curDur)
                      )
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
                              : isBlockedHour
                              ? 'bg-amber-950/35 text-amber-300 border-amber-500/40'
                              : isPast
                              ? 'bg-dark-900/70 text-slate-500 border-dark-800/80 opacity-60'
                              : 'bg-dark-850 text-slate-300 border-dark-750 hover:text-white'
                          }`}
                          title={
                            isOccupied
                              ? 'Horario ocupado por otra cita'
                              : isBlockedHour
                              ? 'Tramo bloqueado en la disponibilidad del especialista'
                              : isPast
                              ? 'Hora ya transcurrida'
                              : 'Disponible'
                          }
                        >
                          {h}
                        </button>
                      )
                    })
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ej. 4:30 o 05:00 PM"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl bg-dark-850 border border-dark-750 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <div className="inline-flex bg-dark-950 p-1 rounded-2xl border border-dark-800 shrink-0">
                    {['AM', 'PM'].map(per => {
                      const active = getEffectivePeriod(newTime) === per
                      return (
                        <button
                          key={per}
                          type="button"
                          onClick={() => setNewTime(applyPeriodToTime(newTime, per))}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                            active
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {per}
                        </button>
                      )
                    })}
                  </div>
                </div>
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
                  {operativeStaff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{!isStaffAvailableOnDate(s, newDate) ? ' (Libre este día)' : ''}
                    </option>
                  ))}
                </select>
                {(() => {
                  const modalStaffObj = operativeStaff.find(s => s.id === newStaff)
                  if (!modalStaffObj) return null
                  if (!isStaffAvailableOnDate(modalStaffObj, newDate)) {
                    return (
                      <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 font-semibold">
                        ⚠️ {modalStaffObj.name} está marcado como libre el {newDate}.
                      </div>
                    )
                  }
                  const dayBlocks = (modalStaffObj.blocked_hours || []).filter(b => b && b.date === newDate)
                  if (dayBlocks.length === 0) return null
                  return (
                    <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-semibold">
                      ⏱️ {modalStaffObj.name} bloqueó horas ese día: {dayBlocks.map(b => `${b.start}–${b.end}`).join(', ')}.
                    </div>
                  )
                })()}
                {operativeStaff.length > 1 && businessProfile?.singleChairMode !== false && (
                  <div className="mt-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-[10px] text-amber-200 leading-snug">
                    <span>
                      <strong>Modo Silla Única activo:</strong> 1 cita bloquea todo el local. Si atienden varias a la vez, cambia a &quot;Equipo&quot;.
                    </span>
                    {onOpenSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false)
                          onOpenSettings()
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-black border border-amber-500/40 shrink-0"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                )}
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
