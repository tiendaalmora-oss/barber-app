import React, { useState, useEffect } from 'react'
import { Globe, Copy, Check, ExternalLink, Share2, Store, MapPin, Phone, Clock, Sparkles, Plus, Trash2, CreditCard, Instagram, Pencil, X } from 'lucide-react'
import { MASTER_BOOKING_SLOTS, DEFAULT_BOOKING_SLOTS, SLOTS_PRESET_15_MIN, SLOTS_PRESET_30_MIN, SLOTS_PRESET_45_MIN, SLOTS_PRESET_60_MIN, DEFAULT_WEEKLY_SCHEDULE } from '../lib/mockData'
import { inferServiceDuration, DAYS_OF_WEEK } from '../lib/dateUtils'

export default function CatalogConfigView({
  businessProfile,
  onSaveProfile,
  services,
  onAddService,
  onUpdateService,
  onDeleteService,
  exchangeRate,
  onOpenPublicPreview
}) {
  const [form, setForm] = useState(businessProfile)
  const [copied, setCopied] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  // Sync when businessProfile changes (e.g. switching tenant)
  useEffect(() => {
    setForm(businessProfile)
  }, [businessProfile])

  // New / Edit service state
  const [newSvcName, setNewSvcName] = useState('')
  const [newSvcPrice, setNewSvcPrice] = useState('')
  const [newSvcDuration, setNewSvcDuration] = useState(30)
  const [newSvcCategory, setNewSvcCategory] = useState('Servicios')
  const [newSvcCommission, setNewSvcCommission] = useState('')
  const [editingSvcId, setEditingSvcId] = useState(null)

  const tenantSlug = (typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : '') || ''
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?reserva=1${tenantSlug ? `&b=${encodeURIComponent(tenantSlug)}` : ''}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShareWhatsApp = () => {
    const text = `✂️💈 ¡Hola! Aquí te dejo el catálogo de precios y horarios de *${form.businessName}*.\n\nEntra en este link para ver nuestros servicios y apartar tu turno sin hacer cola:\n👉 ${publicUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleSave = (e) => {
    e.preventDefault()
    onSaveProfile(form)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
  }

  const togglePaymentMethod = (method) => {
    const exists = (form.paymentMethods || []).includes(method)
    if (exists) {
      setForm({ ...form, paymentMethods: form.paymentMethods.filter(m => m !== method) })
    } else {
      setForm({ ...form, paymentMethods: [...(form.paymentMethods || []), method] })
    }
  }

  const handleSaveService = (e) => {
    e.preventDefault()
    if (!newSvcName.trim() || !newSvcPrice) return

    const finalDur = Number(newSvcDuration) || 30
    const finalComm = newSvcCommission !== '' && !isNaN(Number(newSvcCommission)) ? Number(newSvcCommission) : null

    if (editingSvcId) {
      onUpdateService({
        id: editingSvcId,
        name: newSvcName.trim(),
        price_usd: parseFloat(newSvcPrice) || 5,
        category: newSvcCategory,
        duration_min: finalDur,
        commission_pct: finalComm
      })
      setEditingSvcId(null)
    } else {
      onAddService({
        id: 'svc_' + Date.now(),
        name: newSvcName.trim(),
        price_usd: parseFloat(newSvcPrice) || 5,
        category: newSvcCategory,
        duration_min: finalDur,
        commission_pct: finalComm
      })
    }
    setNewSvcName('')
    setNewSvcPrice('')
    setNewSvcDuration(30)
    setNewSvcCommission('')
  }

  const [selectedDay, setSelectedDay] = useState('lunes')

  const getWeeklySchedule = () => {
    if (form.weeklySchedule && typeof form.weeklySchedule === 'object' && Object.keys(form.weeklySchedule).length > 0) {
      return form.weeklySchedule
    }
    const baseSlots = form.bookingSlots || DEFAULT_BOOKING_SLOTS
    return {
      lunes: { enabled: true, slots: baseSlots },
      martes: { enabled: true, slots: baseSlots },
      miercoles: { enabled: true, slots: baseSlots },
      jueves: { enabled: true, slots: baseSlots },
      viernes: { enabled: true, slots: baseSlots },
      sabado: { enabled: true, slots: baseSlots },
      domingo: { enabled: false, slots: [] }
    }
  }

  const currentWeekly = getWeeklySchedule()
  const currentDayConfig = currentWeekly[selectedDay] || { enabled: true, slots: form.bookingSlots || DEFAULT_BOOKING_SLOTS }
  const currentDayLabel = DAYS_OF_WEEK.find(d => d.id === selectedDay)?.label || 'Lunes'

  const toggleDayEnabled = () => {
    const nextEnabled = !currentDayConfig.enabled
    const updatedWeekly = {
      ...currentWeekly,
      [selectedDay]: {
        ...currentDayConfig,
        enabled: nextEnabled,
        slots: nextEnabled && (!currentDayConfig.slots || currentDayConfig.slots.length === 0)
          ? (form.bookingSlots || DEFAULT_BOOKING_SLOTS)
          : (currentDayConfig.slots || [])
      }
    }
    setForm({ ...form, weeklySchedule: updatedWeekly })
  }

  const toggleDaySlot = (slot) => {
    const currentSlots = currentDayConfig.slots || []
    let nextSlots
    if (currentSlots.includes(slot)) {
      nextSlots = currentSlots.filter(s => s !== slot)
    } else {
      nextSlots = [...currentSlots, slot].sort((a, b) => {
        return MASTER_BOOKING_SLOTS.indexOf(a) - MASTER_BOOKING_SLOTS.indexOf(b)
      })
    }
    const updatedWeekly = {
      ...currentWeekly,
      [selectedDay]: {
        ...currentDayConfig,
        enabled: true,
        slots: nextSlots
      }
    }
    setForm({
      ...form,
      weeklySchedule: updatedWeekly,
      bookingSlots: nextSlots.length > 0 ? nextSlots : form.bookingSlots
    })
  }

  const setDaySlotsPreset = (slotsArray) => {
    const updatedWeekly = {
      ...currentWeekly,
      [selectedDay]: {
        ...currentDayConfig,
        enabled: true,
        slots: slotsArray
      }
    }
    setForm({
      ...form,
      weeklySchedule: updatedWeekly,
      bookingSlots: slotsArray
    })
  }

  const copyScheduleToAllDays = () => {
    const newWeekly = {}
    DAYS_OF_WEEK.forEach(day => {
      newWeekly[day.id] = {
        enabled: currentDayConfig.enabled,
        slots: [...(currentDayConfig.slots || [])]
      }
    })
    setForm({ ...form, weeklySchedule: newWeekly })
    alert(`✓ Horario de ${currentDayLabel} copiado con éxito a todos los días de la semana.`)
  }

  const startEditService = (svc) => {
    setEditingSvcId(svc.id)
    setNewSvcName(svc.name)
    setNewSvcPrice(String(svc.price_usd))
    setNewSvcCategory(svc.category || 'Servicios')
    setNewSvcDuration(svc.duration_min || inferServiceDuration(svc))
    setNewSvcCommission(svc.commission_pct ? String(svc.commission_pct) : '')
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner: Tu Link Público */}
      <div className="bg-gradient-to-br from-dark-900 via-dark-900 to-gold-500/10 border border-gold-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30 text-[10px] font-black uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              <span>Tu Propia Página Web & Agenda Online</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Mi Catálogo y Link de Turnos
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Pon este link en tu biografía de Instagram o mándaselo por WhatsApp a tus clientes. Ellos verán tu presentación, precios en <span className="text-gold-400 font-bold">$ y Bs.</span> y podrán apartar su turno directo en tu calendario.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenPublicPreview}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
            >
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              <span>Ver Cómo lo Ven mis Clientes</span>
            </button>
          </div>
        </div>

        {/* Shareable URL Bar */}
        <div className="mt-4 pt-4 border-t border-dark-700/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2 bg-dark-950 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-400 overflow-x-auto">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{publicUrl}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-dark-800 hover:bg-dark-750 text-white border-dark-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gold-400" />}
              <span>{copied ? '¡Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Datos de Presentación | Right = Catálogo de Servicios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Configuración de la Landing */}
        <div className="lg:col-span-7 bg-dark-900 border border-dark-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Store className="w-4 h-4 text-gold-400" />
                <span>Presentación de tu Negocio</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Personaliza lo que verán tus clientes al abrir tu link
              </p>
            </div>
            {savedToast && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-fadeIn">
                ✓ Cambios Guardados
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de tu Barbería / Salón
                </label>
                <input
                  type="text"
                  required
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Ej. Barbería El Fino"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp para Recibir Citas</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="Ej. +584121234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mensaje de Bienvenida / Eslogan
              </label>
              <textarea
                rows={2}
                value={form.slogan}
                onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                placeholder="Describe el estilo de tu local..."
                className="w-full px-3.5 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gold-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aviso de Promo Destacada (Opcional)</span>
              </label>
              <input
                type="text"
                value={form.promoBanner}
                onChange={(e) => setForm({ ...form, promoBanner: e.target.value })}
                placeholder="Ej. 🔥 Promo de la Semana: Corte + Barba por $10"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-gold-500/30 text-xs text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>Dirección / Punto de Referencia</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ej. Av. Principal, al lado del banco..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Horario de Trabajo (Texto)</span>
                </label>
                <input
                  type="text"
                  value={form.schedule || ''}
                  onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  placeholder="Ej. Lun a Sáb: 9:00 AM a 7:00 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {/* Selector de Horas de Agenda y Turnos Disponibles por Día */}
            <div className="pt-3 border-t border-dark-800 space-y-2.5">
              {/* Header limpio: Título + Badge de activas */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Horarios por Día (Lunes a Domingo)</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Ajusta las horas de atención de cada día de forma independiente
                  </p>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                  currentDayConfig.enabled 
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  {currentDayConfig.enabled ? `${(currentDayConfig.slots || []).length} horas activas` : 'Cerrado'}
                </span>
              </div>

              {/* Selector de Días de la Semana (7 Pestañas compactas para teléfono) */}
              <div className="grid grid-cols-7 gap-1 p-1 bg-dark-950 rounded-xl border border-dark-800">
                {DAYS_OF_WEEK.map(d => {
                  const dayData = currentWeekly[d.id] || { enabled: true, slots: [] }
                  const isSelected = selectedDay === d.id
                  const isClosed = !dayData.enabled || (dayData.slots || []).length === 0
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDay(d.id)}
                      className={`py-1.5 px-0.5 rounded-lg text-center transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-sm font-bold scale-[1.03]'
                          : isClosed
                          ? 'bg-dark-900/50 text-slate-600 hover:text-slate-400'
                          : 'bg-dark-850 text-slate-300 hover:bg-dark-800 hover:text-white'
                      }`}
                    >
                      <span className="text-[11px] font-bold">{d.short}</span>
                      <span className={`text-[8px] font-mono leading-none mt-0.5 ${
                        isSelected ? 'text-purple-200' : isClosed ? 'text-rose-500/70' : 'text-slate-500'
                      }`}>
                        {isClosed ? 'Cerr' : `${(dayData.slots || []).length}h`}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Controles del Día Seleccionado: Toggle Abierto/Cerrado + Copiar */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-dark-850/80 border border-dark-750">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white capitalize">{currentDayLabel}:</span>
                  <button
                    type="button"
                    onClick={toggleDayEnabled}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                      currentDayConfig.enabled
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {currentDayConfig.enabled ? '● Abierto (Laborable)' : '○ Cerrado (Descanso)'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={copyScheduleToAllDays}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-dark-900 hover:bg-dark-750 text-slate-300 border border-dark-700 flex items-center gap-1 font-semibold transition-all active:scale-95"
                  title="Copiar las horas de este día a toda la semana"
                >
                  <Copy className="w-3 h-3 text-gold-400" />
                  <span className="hidden sm:inline">Copiar a toda la semana</span>
                  <span className="sm:hidden">Copiar todo</span>
                </button>
              </div>

              {/* Si el día está marcado como CERRADO */}
              {!currentDayConfig.enabled ? (
                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-300">
                    😴 El local no labora los {currentDayLabel}s
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tus clientes verán que este día no está disponible en el enlace de reserva.
                  </p>
                </div>
              ) : (
                <>
                  {/* Barra de Plantillas Rápidas para este día */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">Plantillas:</span>
                    <button
                      type="button"
                      onClick={() => setDaySlotsPreset(SLOTS_PRESET_15_MIN)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1"
                      title="Turnos dinámicos cada 15 min"
                    >
                      ⚡ Cada 15m
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaySlotsPreset(SLOTS_PRESET_30_MIN)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-700 font-semibold shrink-0 transition-all active:scale-95"
                      title="Turnos cada 30 min"
                    >
                      ⏱️ 30m
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaySlotsPreset(SLOTS_PRESET_45_MIN)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold shrink-0 transition-all active:scale-95"
                      title="Turnos cada 45 min"
                    >
                      ⏱️ 45m
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaySlotsPreset(SLOTS_PRESET_60_MIN)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-700 font-semibold shrink-0 transition-all active:scale-95"
                      title="Turnos cada 1 hora"
                    >
                      ⏱️ 1 hora
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaySlotsPreset(MASTER_BOOKING_SLOTS)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold shrink-0 transition-all active:scale-95"
                      title="Activar todas las horas"
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaySlotsPreset([])}
                      className="text-[10px] px-2 py-1 rounded-lg bg-dark-850 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-dark-750 shrink-0 transition-all active:scale-95 ml-auto"
                      title="Desmarcar todas las horas de este día"
                    >
                      Limpiar
                    </button>
                  </div>

                  {/* Cuadrícula de Horas del Día */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-44 overflow-y-auto p-2 bg-dark-950 rounded-xl border border-dark-800">
                    {MASTER_BOOKING_SLOTS.map(slot => {
                      const active = (currentDayConfig.slots || []).includes(slot)
                      return (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => toggleDaySlot(slot)}
                          className={`py-2 px-1 rounded-lg text-[10px] font-mono font-bold transition-all text-center ${
                            active
                              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30 border border-purple-500 font-black'
                              : 'bg-dark-900 text-slate-500 border border-dark-800/80 hover:border-dark-700 hover:text-slate-400'
                          }`}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  <span>Usuario de Instagram / TikTok</span>
                </label>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="Ej. @barberiaelfino"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>Métodos de Pago Aceptados</span>
                </label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {['Pago Móvil BCV', 'Efectivo ($)', 'Zelle', 'Punto de Venta'].map(method => {
                    const active = (form.paymentMethods || []).includes(method)
                    return (
                      <button
                        type="button"
                        key={method}
                        onClick={() => togglePaymentMethod(method)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-dark-850 text-slate-500 border-dark-750'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{method}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-xs shadow-lg shadow-gold-500/20 transition-all"
              >
                Guardar Datos de Mi Página
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Catálogo de Servicios Editable Completo */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
            <h3 className="font-bold text-white text-base mb-1">
              Tus Servicios y Precios ({services.length})
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Agrega, edita o elimina cualquier servicio. Se actualiza en tu Caja y en tu Link Web (<span className="text-gold-400 font-bold">Bs. {exchangeRate.toFixed(2)}</span>).
            </p>

            {/* Form to Add or Edit a Service */}
            <form onSubmit={handleSaveService} className="bg-dark-850 border border-gold-500/30 rounded-xl p-3 mb-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-gold-400 flex items-center gap-1">
                  {editingSvcId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{editingSvcId ? 'Editando Servicio y Precio' : 'Agregar Servicio o Promo'}</span>
                </div>
                {editingSvcId && (
                  <button
                    type="button"
                    onClick={() => { setEditingSvcId(null); setNewSvcName(''); setNewSvcPrice('') }}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ej. Corte Degradé"
                  value={newSvcName}
                  onChange={(e) => setNewSvcName(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-lg bg-dark-900 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="Precio $"
                  value={newSvcPrice}
                  onChange={(e) => setNewSvcPrice(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-dark-900 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                />
              </div>

              {/* Selector de Duración del Servicio */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">⏱️ Tiempo:</span>
                {[15, 30, 45, 60].map(dur => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setNewSvcDuration(dur)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                      newSvcDuration === dur
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-dark-900 text-slate-400 border-dark-700 hover:text-white'
                    }`}
                  >
                    {dur === 60 ? '1h' : `${dur}m`}
                  </button>
                ))}
              </div>

              {/* Comisión especial para este servicio (Opcional, ej. 40% o 60%) */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-amber-400 font-semibold shrink-0">🏷️ % Comisión (Opcional):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Ej. 40"
                  value={newSvcCommission}
                  onChange={(e) => setNewSvcCommission(e.target.value)}
                  className="w-20 px-2.5 py-1 rounded-lg bg-dark-900 border border-dark-700 text-[11px] text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500">
                  {newSvcCommission ? `${newSvcCommission}% a quien lo haga` : 'Usa el % del especialista'}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-black text-xs font-black transition-all"
              >
                {editingSvcId ? '✓ Guardar Cambios del Servicio' : '+ Agregar a Mis Servicios'}
              </button>
            </form>

            {/* Active Catalog List with Edit & Delete on ALL items */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {services.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No tienes servicios registrados. Agrega el primero arriba.
                </div>
              ) : (
                services.map(svc => (
                  <div
                    key={svc.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-850 border border-dark-750 hover:border-dark-700 transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs truncate">{svc.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 font-bold shrink-0">
                          ⏱️ {svc.duration_min || inferServiceDuration(svc)}m
                        </span>
                        {Number(svc.commission_pct) > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                            🏷️ {svc.commission_pct}% com.
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Bs. {(svc.price_usd * exchangeRate).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-xs">
                        ${svc.price_usd}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditService(svc)}
                        className="p-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 text-slate-400 hover:text-white border border-dark-750"
                        title="Editar nombre o precio"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar el servicio "${svc.name}"?`)) {
                            onDeleteService(svc.id)
                          }
                        }}
                        className="p-1.5 rounded-lg bg-dark-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-750"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
