import React, { useState, useRef, useEffect } from 'react'
import { X, Store, Upload, Image as ImageIcon, Phone, MapPin, Clock, Instagram, Sparkles, Check, Trash2, CreditCard, ShieldCheck, Copy } from 'lucide-react'
import { MASTER_BOOKING_SLOTS, DEFAULT_BOOKING_SLOTS, SLOTS_PRESET_15_MIN, SLOTS_PRESET_30_MIN, SLOTS_PRESET_45_MIN, SLOTS_PRESET_60_MIN, DEFAULT_WEEKLY_SCHEDULE } from '../lib/mockData'
import { DAYS_OF_WEEK } from '../lib/dateUtils'
import { getActiveBrand } from '../lib/brandConfig'
import PhoneCountryInput from './PhoneCountryInput'

const LOGO_PRESETS = [
  { id: 'p1', label: '💈 Navaja Dorada', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&h=200&fit=crop&crop=faces&q=80' },
  { id: 'p2', label: '✂️ Tijeras Royal', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&h=200&fit=crop&crop=faces&q=80' },
  { id: 'p3', label: '👑 Corona VIP', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=200&h=200&fit=crop&crop=faces&q=80' },
  { id: 'p4', label: '💅 Salón Glamour', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop&crop=faces&q=80' },
  { id: 'p5', label: '🏬 Studio Urbano', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=200&h=200&fit=crop&crop=faces&q=80' }
]

export default function BusinessSettingsModal({
  isOpen,
  onClose,
  businessProfile,
  onSaveProfile,
  activeTenant
}) {
  const brand = getActiveBrand(activeTenant)
  const isGlam = brand?.code === 'glamos'

  // ALL hooks declared at top level before any conditional return
  const [form, setForm] = useState(businessProfile || {})
  const [activeTab, setActiveTab] = useState('perfil') // 'perfil' | 'logo' | 'pagos'
  const [savedToast, setSavedToast] = useState(false)
  const [selectedDay, setSelectedDay] = useState('lunes')
  const fileInputRef = useRef(null)

  // Keep form synchronized when businessProfile is updated or modal opens
  useEffect(() => {
    if (businessProfile) {
      setForm(businessProfile)
    }
  }, [businessProfile, isOpen])

  if (!isOpen) return null

  // Handle local image upload with automatic Canvas downscaling (prevents LocalStorage QuotaExceededError)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 256
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        setForm(prev => ({ ...prev, logoUrl: compressedBase64 }))
      }
      img.src = event.target?.result
    }
    reader.readAsDataURL(file)
  }

  const handleSelectPreset = (url) => {
    setForm(prev => ({ ...prev, logoUrl: url }))
  }

  const handleRemoveLogo = () => {
    setForm(prev => ({ ...prev, logoUrl: '' }))
  }

  const togglePaymentMethod = (method) => {
    const current = form.paymentMethods || []
    if (current.includes(method)) {
      setForm({ ...form, paymentMethods: current.filter(m => m !== method) })
    } else {
      setForm({ ...form, paymentMethods: [...current, method] })
    }
  }

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

  const handleSubmit = (e) => {
    e.preventDefault()
    onSaveProfile(form)
    setSavedToast(true)
    setTimeout(() => {
      setSavedToast(false)
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-xl rounded-3xl shadow-2xl p-5 sm:p-6 my-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${isGlam ? 'bg-pink-500/15 border-pink-500/30 text-pink-400' : 'bg-gold-500/15 border-gold-500/30 text-gold-400'} border flex items-center justify-center`}>
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">
                Configuración de tu Negocio
              </h3>
              <p className="text-xs text-slate-400">
                Logo, datos del local y lo que ven tus clientes en tu Link Web
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1.5 bg-dark-950 p-1.5 rounded-2xl border border-dark-800">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'perfil' 
                ? (isGlam ? 'bg-pink-500 text-white shadow-md' : 'bg-gold-500 text-black shadow-md') 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Datos del Local
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'logo' 
                ? (isGlam ? 'bg-pink-500 text-white shadow-md' : 'bg-gold-500 text-black shadow-md') 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Logo / Foto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pagos')}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'pagos' 
                ? (isGlam ? 'bg-pink-500 text-white shadow-md' : 'bg-gold-500 text-black shadow-md') 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pagos & Promos
          </button>
        </div>

        {savedToast && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>¡Datos y logo guardados con éxito! Se reflejan de inmediato en tu link público.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* TAB 1: DATOS DEL LOCAL */}
          {activeTab === 'perfil' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre de tu Barbería / Salón
                </label>
                <input
                  type="text"
                  required
                  value={form.businessName || ''}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Ej. Barbería Imperio VIP"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Eslogan / Descripción Breve
                </label>
                <input
                  type="text"
                  value={form.slogan || ''}
                  onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                  placeholder="Ej. Cortes degradé, barba con toalla caliente y atención de primera"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp de Atención del Local</span>
                  </label>
                  <PhoneCountryInput
                    value={form.whatsapp || ''}
                    onChange={(val) => setForm({ ...form, whatsapp: val })}
                    isGlam={isGlam}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-400" />
                    <span>Instagram / Red Social</span>
                  </label>
                  <input
                    type="text"
                    value={form.instagram || ''}
                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    placeholder="@tubarberia"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gold-400" />
                    <span>Dirección del Local</span>
                  </label>
                  <input
                    type="text"
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Ej. Av. Principal, C.C. Nivel 1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Horario de Atención (Texto)</span>
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

              {/* Capacidad de Atención de Citas */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <span>💺 Capacidad de Citas del Local</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, singleChairMode: true })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      form.singleChairMode !== false
                        ? 'bg-gold-500/15 border-gold-500 text-white shadow-sm'
                        : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>👤 1 Cliente a la vez (Silla Única)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Ideal si atiendes solo. 1 cita bloquea la hora y su duración para todo el local.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, singleChairMode: false })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      form.singleChairMode === false
                        ? 'bg-gold-500/15 border-gold-500 text-white shadow-sm'
                        : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>👥 Varios Clientes a la vez (Equipo)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Varios barberos simultáneos. Cada profesional tiene su propia agenda.
                    </div>
                  </button>
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
            </div>
          )}

          {/* TAB 2: LOGO / FOTO DEL LOCAL */}
          {activeTab === 'logo' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview */}
                <div className={`w-24 h-24 rounded-2xl bg-dark-900 border-2 border-dashed ${isGlam ? 'border-pink-500/40' : 'border-gold-500/40'} flex items-center justify-center overflow-hidden shrink-0 relative group`}>
                  {form.logoUrl ? (
                    <img
                      src={form.logoUrl}
                      alt="Logo de tu negocio"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-600" />
                      <span className="text-[10px]">Sin Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Action */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="text-xs font-bold text-white block">
                    Sube el Logo o Foto de tu Fachada
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Este logo aparecerá en la parte superior de tu página web de reservas y en el ticket que reciben tus clientes por WhatsApp.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-3.5 py-1.5 rounded-xl ${
                        isGlam 
                          ? 'bg-pink-500 hover:bg-pink-400 text-white shadow-pink-500/20' 
                          : 'bg-gold-500 hover:bg-gold-400 text-black shadow-gold-500/20'
                      } text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir desde mi Teléfono / PC</span>
                    </button>

                    {form.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset Logos */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  O elige uno de estos logos listos:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {LOGO_PRESETS.map(preset => {
                    const isSelected = form.logoUrl === preset.url
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? (isGlam ? 'bg-pink-500/20 border-pink-500 text-pink-300 shadow-md' : 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-md')
                            : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white hover:border-dark-700'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-12 h-12 rounded-xl object-cover border border-dark-700"
                        />
                        <span className="text-[10px] font-bold truncate max-w-[80px]">
                          {preset.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAGOS & PROMOS */}
          {activeTab === 'pagos' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold ${isGlam ? 'text-pink-400' : 'text-gold-400'} mb-1 flex items-center gap-1`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Banner de Promoción Destacada (Aparece arriba en tu link)</span>
                </label>
                <input
                  type="text"
                  value={form.promoBanner || ''}
                  onChange={(e) => setForm({ ...form, promoBanner: e.target.value })}
                  placeholder="Ej. 🔥 Promo de la Semana: Combo Corte + Barba + Cejas por solo $10"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border ${isGlam ? 'border-pink-500/30 text-pink-300 focus:border-pink-500' : 'border-gold-500/30 text-gold-300 focus:border-gold-500'} text-xs focus:outline-none`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>Métodos de Pago que Acepta tu Local:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Pago Móvil BCV',
                    'Efectivo ($)',
                    'Punto de Venta',
                    'Zelle',
                    'Binance Pay',
                    'Biopago'
                  ].map(method => {
                    const isChecked = (form.paymentMethods || []).includes(method)
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => togglePaymentMethod(method)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{method}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-2 pt-3 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 rounded-xl ${
                isGlam
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-500/20'
                  : 'bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black shadow-gold-500/20'
              } text-xs font-black shadow-lg cursor-pointer transition-all active:scale-[0.99]`}
            >
              Guardar Configuración
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
