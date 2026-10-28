import React, { useState } from 'react'
import { Calendar as CalendarIcon, Clock, User, Plus, CheckCircle, Clock3, ChevronLeft, ChevronRight, Filter, MessageSquare } from 'lucide-react'

export default function AppointmentsView({ appointments, nicheData, onAddAppointment, onToggleAppointmentStatus, clients = [], businessProfile = {} }) {
  // Today's ISO date string (YYYY-MM-DD)
  const getTodayStr = () => new Date().toISOString().split('T')[0]

  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Form fields
  const [newClient, setNewClient] = useState('')
  const [newDate, setNewDate] = useState(getTodayStr())
  const [newTime, setNewTime] = useState('03:00 PM')
  const [newStaff, setNewStaff] = useState(nicheData.staff[0]?.id || '')
  const [newService, setNewService] = useState(nicheData.services[0]?.name || '')

  // Filter list by selected date
  const filteredList = appointments.filter(a => {
    if (!a.date) return true // legacy fallback
    return a.date === selectedDate
  })

  const toggleStatus = (id) => {
    if (onToggleAppointmentStatus) {
      onToggleAppointmentStatus(id)
    }
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newClient.trim()) return

    const newItem = {
      id: 'app_' + Date.now(),
      client_name: newClient.trim(),
      date: newDate,
      time: newTime,
      staff_id: newStaff,
      service: newService,
      status: 'pendiente'
    }

    if (onAddAppointment) onAddAppointment(newItem)
    
    // Reset form
    setNewClient('')
    setShowAddModal(false)
  }

  // Quick date change
  const changeDateByDays = (days) => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + days)
    setSelectedDate(current.toISOString().split('T')[0])
  }

  const formatDateLabel = (dateStr) => {
    const today = getTodayStr()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    if (dateStr === today) return 'Hoy'
    if (dateStr === tomorrowStr) return 'Mañana'

    const [year, month, day] = dateStr.split('-')
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${day} de ${months[parseInt(month) - 1]}`
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header with Date Navigator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Turnos y Agenda
            <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
              {formatDateLabel(selectedDate)}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organiza los turnos por día para que los clientes no esperen de pie
          </p>
        </div>

        {/* Date Selector & Add CTA */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Day switcher with arrows */}
          <div className="flex items-center bg-dark-850 border border-dark-750 rounded-xl p-1 text-xs">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-1.5 rounded-lg hover:bg-dark-750 text-slate-400 hover:text-white transition-all"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
              />
            </div>

            <button
              onClick={() => changeDateByDays(1)}
              className="p-1.5 rounded-lg hover:bg-dark-750 text-slate-400 hover:text-white transition-all"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick "Hoy" button */}
          {selectedDate !== getTodayStr() && (
            <button
              onClick={() => setSelectedDate(getTodayStr())}
              className="px-2.5 py-1.5 bg-dark-800 hover:bg-dark-750 text-slate-300 rounded-xl text-xs font-semibold border border-dark-700"
            >
              Ir a Hoy
            </button>
          )}

          {/* Button Apartar Turno */}
          <button
            onClick={() => {
              setNewDate(selectedDate)
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Apartar Turno</span>
          </button>
        </div>
      </div>

      {/* Appointments List for Selected Date */}
      {filteredList.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mx-auto flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">No hay turnos agendados para este día</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            El {formatDateLabel(selectedDate)} está completamente despejado. Puedes apartar un cliente con el botón morado.
          </p>
          <button
            onClick={() => {
              setNewDate(selectedDate)
              setShowAddModal(true)
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20"
          >
            + Agendar para este día
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredList.map((apt) => {
            const staffObj = nicheData.staff.find(s => s.id === apt.staff_id)
            return (
              <div 
                key={apt.id}
                className="bg-dark-900 border border-dark-800 hover:border-dark-700 p-4 rounded-2xl flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-dark-850 border border-dark-750 text-slate-300">
                    <Clock className="w-4 h-4 text-purple-400 mb-0.5" />
                    <span className="text-[11px] font-bold font-mono">{apt.time.split(' ')[0]}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{apt.time.split(' ')[1]}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-white text-sm">{apt.client_name}</h4>
                      {apt.source === 'web' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30 font-bold">
                          🌐 Link Web
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{apt.service}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                      <span>{staffObj?.avatar || '✂️'}</span>
                      <span>{staffObj?.name || 'Cualquiera'}</span>
                      {apt.date && (
                        <span className="text-[10px] text-purple-400/80 font-mono">
                          • {formatDateLabel(apt.date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Anti-No-Show WhatsApp + Status Toggle Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const foundClient = clients.find(c => c.name.toLowerCase() === apt.client_name.toLowerCase())
                      const rawPhone = apt.client_phone || foundClient?.phone || ''
                      const cleanPhone = rawPhone.replace(/[^0-9]/g, '')
                      const bizName = businessProfile?.businessName || 'nuestro local'
                      const msg = `👋 ¡Activo *${apt.client_name.split(' ')[0]}*! 💈✂️ Te escribimos de *${bizName}* para confirmar tu turno de *${formatDateLabel(apt.date || selectedDate)}* a las *${apt.time}* (${apt.service} con ${staffObj?.name || 'el equipo'}).\n\n¿Me confirmas tu asistencia? ¡Te esperamos puntual!`
                      const url = cleanPhone
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
                        : `https://wa.me/?text=${encodeURIComponent(msg)}`
                      window.open(url, '_blank')
                    }}
                    className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all"
                    title="Enviar recordatorio de cita por WhatsApp (Anti-Embarques)"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleStatus(apt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      apt.status === 'completada' 
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                        : apt.status === 'en_atencion' 
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse' 
                        : 'bg-dark-800 text-amber-400 border-dark-700 hover:border-amber-500/40'
                    }`}
                  >
                    {apt.status === 'completada' && '✓ Listo'}
                    {apt.status === 'en_atencion' && 'En la Silla'}
                    {apt.status === 'pendiente' && 'Esperando'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Apartar Turno con Fecha */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-2xl shadow-2xl p-5">
            <h3 className="font-bold text-white text-base mb-1">Apartar Nuevo Turno</h3>
            <p className="text-xs text-slate-400 mb-3">Programa la fecha y hora del cliente</p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Castillo"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>

              {/* Selector de FECHA */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold text-purple-400 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Fecha de la Cita
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Selector de HORA */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Hora Estimada</label>
                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                  {['10:00 AM', '02:00 PM', '04:30 PM'].map(h => (
                    <button
                      type="button"
                      key={h}
                      onClick={() => setNewTime(h)}
                      className={`py-1 text-[11px] rounded-lg border font-mono transition-all ${
                        newTime === h ? 'bg-purple-600 text-white border-purple-500' : 'bg-dark-800 text-slate-400 border-dark-700'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="O escribe la hora (ej. 05:00 PM)"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">¿Quién lo atiende? ({nicheData.roleName})</label>
                <select
                  value={newStaff}
                  onChange={(e) => setNewStaff(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white focus:outline-none"
                >
                  {nicheData.staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Servicio</label>
                <select
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white focus:outline-none"
                >
                  {nicheData.services.map(s => (
                    <option key={s.id} value={s.name}>{s.name} (${s.price_usd})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-dark-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/25"
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
