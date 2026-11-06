import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Scissors,
  Sparkles,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  ArrowLeft,
  MessageSquare,
  ShoppingBag,
  Check,
  Instagram,
  Package,
  ChevronRight,
  Star,
  ShieldCheck,
  User,
  Zap
} from 'lucide-react'
import {
  getLocalDateIso,
  normalizeWhatsAppPhone,
  normalizeTimeSlot,
  timeToMinutes,
  isTimeSlotInPast,
  inferServiceDuration,
  getScheduleForDate,
  getDayLabelFromDate
} from '../lib/dateUtils'
import { DEFAULT_BOOKING_SLOTS } from '../lib/mockData'
import PhoneCountryInput from './PhoneCountryInput'

const SHORT_DAY_NAMES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const SHORT_MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function PublicBookingView({
  businessProfile = {},
  nicheData = {},
  customServices = [],
  exchangeRate = 889.26,
  appointments = [],
  onBookAppointment,
  isOwnerPreview = false,
  onExitPreview
}) {
  const safeRate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 889.26
  const isSalonNiche = nicheData?.nicheId === 'estetica' || (nicheData?.roleName || '').toLowerCase().includes('estilista') || (nicheData?.roleName || '').toLowerCase().includes('especialista')

  const catalogProducts = (nicheData?.products || []).filter(p => p.showInCatalog !== false)

  const getTodayStr = () => getLocalDateIso()
  const getTomorrowStr = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return getLocalDateIso(d)
  }

  const allServices = useMemo(() => {
    return [...(customServices || []), ...(nicheData?.services || [])]
  }, [customServices, nicheData?.services])

  const bookingRef = useRef(null)
  const customDateInputRef = useRef(null)

  const [catalogTab, setCatalogTab] = useState('servicios')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [selectedService, setSelectedService] = useState(allServices[0]?.name || '')
  const [selectedStaff, setSelectedStaff] = useState(nicheData?.staff?.[0]?.id || 'any')
  const [selectedDate, setSelectedDate] = useState(getTodayStr())

  // Keep selectedService valid when allServices changes (e.g. when tenant workspace finishes loading)
  useEffect(() => {
    if (allServices.length > 0 && !allServices.some(s => s.name === selectedService)) {
      setSelectedService(allServices[0].name)
    }
  }, [allServices, selectedService])

  // Categories for horizontal filter
  const categories = useMemo(() => {
    const cats = new Set()
    allServices.forEach(s => {
      if (s.category && s.category.trim()) cats.add(s.category.trim())
    })
    return ['Todos', ...Array.from(cats)]
  }, [allServices])

  const filteredServices = useMemo(() => {
    if (selectedCategory === 'Todos') return allServices
    return allServices.filter(s => (s.category || '').trim() === selectedCategory)
  }, [allServices, selectedCategory])

  // Generate next 7 days for the iOS / Booksy horizontal date carousel
  const upcomingDays = useMemo(() => {
    const days = []
    const base = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      const iso = getLocalDateIso(d)
      const sched = getScheduleForDate(businessProfile, iso, DEFAULT_BOOKING_SLOTS)
      const isClosed = !sched.enabled || sched.slots.length === 0
      days.push({
        iso,
        dayName: i === 0 ? 'HOY' : i === 1 ? 'MAÑ' : SHORT_DAY_NAMES[d.getDay()],
        dayNumber: String(d.getDate()).padStart(2, '0'),
        monthShort: SHORT_MONTH_NAMES[d.getMonth()],
        isClosed
      })
    }
    return days
  }, [businessProfile])

  // Dynamic day-of-week schedule awareness
  const dateSchedule = getScheduleForDate(businessProfile, selectedDate, DEFAULT_BOOKING_SLOTS)
  const isDayClosed = !dateSchedule.enabled || dateSchedule.slots.length === 0
  const activeSlots = isDayClosed ? [] : dateSchedule.slots
  const selectedDayLabel = getDayLabelFromDate(selectedDate)

  const [selectedTime, setSelectedTime] = useState(activeSlots[0] || '10:00 AM')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [bookedTicket, setBookedTicket] = useState(null)
  const [timePeriodFilter, setTimePeriodFilter] = useState('all')

  const staffList = nicheData?.staff || []
  const isSingleChair = Boolean(businessProfile?.singleChairMode !== false || staffList.length <= 1)

  const currentServiceObj = allServices.find(s => s.name === selectedService) || allServices[0]
  const selectedDuration = currentServiceObj?.duration_min || inferServiceDuration(currentServiceObj)

  const isSlotInPast = (timeStr) => {
    return isTimeSlotInPast(timeStr, selectedDate, 10)
  }

  const isSlotBooked = (timeStr) => {
    if (!Array.isArray(appointments) || appointments.length === 0) return false
    const reqStart = timeToMinutes(timeStr)
    const reqEnd = reqStart + (selectedDuration || 30)
    const totalStaffCount = Math.max(1, staffList.length)

    const overlappingApts = appointments.filter(apt => {
      if (!apt || !apt.date || !apt.time) return false
      if (apt.date !== selectedDate) return false
      if (apt.status === 'cancelada' || apt.status === 'completada') return false

      const aptStart = timeToMinutes(apt.time)
      const aptDur = apt.duration_min || inferServiceDuration(apt.service)
      const aptEnd = aptStart + aptDur

      return Math.max(reqStart, aptStart) < Math.min(reqEnd, aptEnd)
    })

    if (overlappingApts.length === 0) return false

    if (isSingleChair) {
      return true
    }

    if (selectedStaff === 'any') {
      const busyStaffIds = new Set()
      let unassignedCount = 0
      for (const apt of overlappingApts) {
        if (!apt.staff_id && !apt.staff_name) {
          unassignedCount++
        } else {
          const directMatch = staffList.find(s => s.id === apt.staff_id || s.name === apt.staff_id || s.name === apt.staff_name)
          if (directMatch) {
            busyStaffIds.add(directMatch.id)
          } else {
            busyStaffIds.add(apt.staff_id || apt.staff_name)
          }
        }
      }
      return (busyStaffIds.size + unassignedCount) >= totalStaffCount
    }

    return overlappingApts.some(apt => {
      if (apt.staff_id === selectedStaff) return true
      const staffObj = staffList.find(s => s.id === selectedStaff)
      if (staffObj && (apt.staff_name === staffObj.name || apt.staff_id === staffObj.name)) return true
      if (!apt.staff_id && !apt.staff_name) return true
      return false
    })
  }

  const isSlotUnavailable = (timeStr) => {
    return isSlotInPast(timeStr) || isSlotBooked(timeStr)
  }

  useEffect(() => {
    if (activeSlots.length === 0) return
    if (!activeSlots.includes(selectedTime) || isSlotUnavailable(selectedTime)) {
      const firstFree = activeSlots.find(s => !isSlotUnavailable(s))
      if (firstFree) setSelectedTime(firstFree)
    }
  }, [selectedDate, selectedStaff, appointments, selectedService, activeSlots])

  const morningSlots = activeSlots.filter(s => timeToMinutes(s) < 720)
  const afternoonSlots = activeSlots.filter(s => timeToMinutes(s) >= 720 && timeToMinutes(s) < 1020)
  const eveningSlots = activeSlots.filter(s => timeToMinutes(s) >= 1020)

  const morningFree = morningSlots.filter(s => !isSlotUnavailable(s)).length
  const afternoonFree = afternoonSlots.filter(s => !isSlotUnavailable(s)).length
  const eveningFree = eveningSlots.filter(s => !isSlotUnavailable(s)).length
  const totalFreeToday = activeSlots.filter(s => !isSlotUnavailable(s)).length
  const allTodayUnavailable = activeSlots.length > 0 && totalFreeToday === 0

  const displayedSlots = activeSlots.filter(slot => {
    if (timePeriodFilter === 'all') return true
    const mins = timeToMinutes(slot)
    if (timePeriodFilter === 'morning') return mins < 720
    if (timePeriodFilter === 'afternoon') return mins >= 720 && mins < 1020
    if (timePeriodFilter === 'evening') return mins >= 1020
    return true
  })

  const handleSelectServiceFromCatalog = (serviceName) => {
    setSelectedService(serviceName)
    if (bookingRef.current) {
      bookingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleConfirmBooking = (e) => {
    e.preventDefault()
    if (!clientName.trim()) return

    if (isDayClosed || activeSlots.length === 0) {
      alert(`⚠️ El local no labora los ${selectedDayLabel}s. Por favor selecciona otra fecha disponible.`)
      return
    }

    const normTime = normalizeTimeSlot(selectedTime)
    if (isSlotInPast(selectedTime)) {
      alert('⚠️ Este turno ya ha transcurrido. Por favor selecciona una hora disponible más tarde o para mañana.')
      return
    }
    if (isSlotBooked(selectedTime)) {
      alert('⚠️ Este turno acaba de ser reservado por otro cliente. Por favor selecciona otra hora disponible.')
      return
    }

    let assignedStaffId = selectedStaff
    if (isSingleChair) {
      assignedStaffId = staffList[0]?.id || 'e1'
    } else if (selectedStaff === 'any') {
      const reqStart = timeToMinutes(normTime)
      const reqEnd = reqStart + (selectedDuration || 30)

      const busyStaffIds = (appointments || [])
        .filter(apt => {
          if (!apt || apt.date !== selectedDate) return false
          if (apt.status === 'cancelada' || apt.status === 'completada') return false
          const aStart = timeToMinutes(apt.time)
          const aDur = apt.duration_min || inferServiceDuration(apt.service)
          const aEnd = aStart + aDur
          return Math.max(reqStart, aStart) < Math.min(reqEnd, aEnd)
        })
        .map(apt => {
          const directMatch = staffList.find(s => s.id === apt.staff_id || s.name === apt.staff_id || s.name === apt.staff_name)
          return directMatch ? directMatch.id : apt.staff_id
        })

      const freeStaff = staffList.find(st => !busyStaffIds.includes(st.id))
      assignedStaffId = freeStaff ? freeStaff.id : (staffList[0]?.id || 'e1')
    }

    const assignedStaffObj = staffList.find(s => s.id === assignedStaffId)

    const newApt = {
      id: 'web_' + Date.now(),
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      date: selectedDate,
      time: normTime,
      staff_id: assignedStaffId,
      service: selectedService,
      duration_min: selectedDuration,
      status: 'pendiente',
      source: 'web'
    }

    onBookAppointment(newApt)
    setBookedTicket({
      ...newApt,
      code: 'VIP-' + String(Date.now()).slice(-4),
      staffName: assignedStaffObj ? assignedStaffObj.name : (businessProfile?.businessName || 'Especialista Asignado'),
      priceUsd: currentServiceObj?.price_usd || 0,
      priceBs: ((currentServiceObj?.price_usd || 0) * safeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      durationMin: selectedDuration
    })
  }

  const handleSendWhatsAppConfirmation = () => {
    if (!bookedTicket) return
    const cleanPhone = normalizeWhatsAppPhone(businessProfile?.whatsapp || '')
    const msg = `👋 ¡Hola *${businessProfile?.businessName}*! Acabo de apartar mi turno desde su Ventana Digital:\n\n` +
      `🎫 *Pase:* #${bookedTicket.code}\n` +
      `👤 *Cliente:* ${bookedTicket.client_name}\n` +
      `✨ *Servicio:* ${bookedTicket.service} ($${bookedTicket.priceUsd} / Bs. ${bookedTicket.priceBs})\n` +
      `⏱️ *Duración:* ~${bookedTicket.durationMin || 30} min\n` +
      `💈 *Atiende:* ${bookedTicket.staffName}\n` +
      `📅 *Fecha:* ${bookedTicket.date}\n` +
      `⏰ *Hora:* ${bookedTicket.time}\n\n` +
      `¡Nos vemos allá!`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const handleOrderProductWhatsApp = (prod) => {
    const cleanPhone = normalizeWhatsAppPhone(businessProfile?.whatsapp || '')
    const bs = (prod.price_usd * safeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const msg = `👋 ¡Hola *${businessProfile?.businessName}*! Vi en su catálogo el producto *${prod.name}* ($${prod.price_usd} / Bs. ${bs}) y quiero encargarlo.`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const handleDirectWhatsAppContact = () => {
    const cleanPhone = normalizeWhatsAppPhone(businessProfile?.whatsapp || '')
    const msg = `👋 ¡Hola *${businessProfile?.businessName}*! Estoy viendo su catálogo online y quisiera hacer una consulta.`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const handleOpenInstagram = () => {
    if (!businessProfile?.instagram) return
    const handle = businessProfile.instagram.replace('@', '').trim()
    window.open(`https://instagram.com/${handle}`, '_blank')
  }

  const isCustomDateSelected = !upcomingDays.some(d => d.iso === selectedDate)

  return (
    <div className="min-h-screen bg-[#07080b] text-slate-100 pb-24 font-sans selection:bg-gold-500 selection:text-black relative overflow-x-hidden">
      
      {/* Ambient Luxury Top Spotlight */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[520px] h-[320px] rounded-full blur-[130px] opacity-25 z-0"
        style={{
          background: isSalonNiche
            ? 'radial-gradient(circle, rgba(244,114,182,0.45) 0%, rgba(212,175,55,0.25) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(212,175,55,0.45) 0%, rgba(180,83,9,0.2) 55%, transparent 80%)'
        }}
      />

      {/* Owner Preview Floating Top Bar */}
      {isOwnerPreview && (
        <div className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-xl border-b border-gold-500/30 text-white px-4 py-2.5 shadow-2xl">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping" />
              <span className="text-gold-400 uppercase tracking-wider text-[10px] font-black">Vista Previa VIP</span>
              <span className="text-slate-300 hidden sm:inline">• Así ven tus clientes tu Ventana Digital</span>
            </div>
            <button
              onClick={onExitPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-black hover:opacity-95 text-xs font-black transition-all shrink-0 shadow-md"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Volver al Panel</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Boutique Container */}
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-5 space-y-6">
        
        {/* =====================================================================
            1. PORTADA EDITORIAL DE LUJO (HERO STOREFRONT)
           ===================================================================== */}
        <section className="relative rounded-[28px] bg-gradient-to-b from-[#11131a] to-[#0a0c10] border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.75)] overflow-hidden">
          
          {/* Top Subtle Gold Hairline */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

          <div className="p-6 sm:p-7 text-center">
            
            {/* Brand Avatar / Logo with Luxury Ring */}
            <div className="relative inline-block mb-3.5">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-[22px] bg-gradient-to-br from-dark-800 to-dark-950 p-0.5 ring-1 ring-gold-500/35 shadow-[0_10px_30px_rgba(212,175,55,0.15)] mx-auto overflow-hidden flex items-center justify-center">
                {businessProfile?.logoUrl ? (
                  <img
                    src={businessProfile.logoUrl}
                    alt={businessProfile.businessName}
                    className="w-full h-full object-cover rounded-[20px]"
                  />
                ) : isSalonNiche ? (
                  <Sparkles className="w-9 h-9 text-gold-400" />
                ) : (
                  <Scissors className="w-9 h-9 text-gold-400" />
                )}
              </div>
              {/* Live Verified Dot */}
              <span
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a0c10] flex items-center justify-center border border-white/10 shadow"
                title="Reserva Online Activa"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            </div>

            {/* Minimal Status Eyebrow */}
            <div className=" flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gold-400/90 mb-1.5">
              <span>Agenda Digital Abierta</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400">Cero Colas</span>
            </div>

            {/* Business Name */}
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              {businessProfile?.businessName || 'Estudio & Barbería VIP'}
            </h1>

            {/* Slogan */}
            {businessProfile?.slogan && (
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed font-normal">
                {businessProfile.slogan}
              </p>
            )}

            {/* Editorial Location & Schedule Line (Clean & Uncluttered) */}
            {(businessProfile?.address || businessProfile?.schedule) && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-xs text-slate-300/90">
                {businessProfile?.address && (
                  <div className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                    <span>{businessProfile.address}</span>
                  </div>
                )}
                {businessProfile?.address && businessProfile?.schedule && (
                  <span className="hidden sm:inline text-slate-600">•</span>
                )}
                {businessProfile?.schedule && (
                  <div className="inline-flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-gold-400/80 shrink-0" />
                    <span>{businessProfile.schedule}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Interactive Social / Contact Dock */}
            {(businessProfile?.instagram || businessProfile?.whatsapp) && (
              <div className="mt-4 flex items-center justify-center gap-2.5">
                {businessProfile?.instagram && (
                  <button
                    type="button"
                    onClick={handleOpenInstagram}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-all active:scale-95"
                  >
                    <Instagram className="w-3.5 h-3.5 text-gold-400" />
                    <span>{businessProfile.instagram}</span>
                  </button>
                )}
                {businessProfile?.whatsapp && (
                  <button
                    type="button"
                    onClick={handleDirectWhatsAppContact}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 transition-all active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Directo</span>
                  </button>
                )}
              </div>
            )}

            {/* Exclusive VIP Promo Card (if configured) */}
            {businessProfile?.promoBanner && (
              <div className="mt-5 relative rounded-2xl bg-gradient-to-r from-gold-500/[0.12] via-amber-500/[0.08] to-gold-500/[0.12] border border-gold-500/30 px-4 py-3 text-left flex items-center gap-3 shadow-inner">
                <div className="w-8 h-8 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-gold-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[0.15em] text-gold-400">
                    Beneficio Destacado
                  </span>
                  <p className="text-xs font-bold text-white leading-snug mt-0.5">
                    {businessProfile.promoBanner.replace(/^🔥\s*/, '')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Unified Glass Footer Strip: BCV & Accepted Payment Methods */}
          <div className="bg-white/[0.02] border-t border-white/[0.06] px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <div className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              <span>Tasa BCV:</span>
              <strong className="text-white font-mono">Bs. {safeRate.toFixed(2)}</strong>
            </div>
            {(businessProfile?.paymentMethods || []).length > 0 && (
              <>
                <span className="text-slate-700">|</span>
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-slate-300">
                  {(businessProfile.paymentMethods || []).map((pm, idx) => (
                    <React.Fragment key={pm}>
                      {idx > 0 && <span className="text-slate-600">·</span>}
                      <span>{pm}</span>
                    </React.Fragment>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* =====================================================================
            2. CONMUTADOR DE SECCIÓN (SERVICIOS VS BOUTIQUE DE PRODUCTOS)
           ===================================================================== */}
        {catalogProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 bg-[#0e1017] p-1.5 rounded-2xl border border-white/[0.07]">
            <button
              type="button"
              onClick={() => setCatalogTab('servicios')}
              className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                catalogTab === 'servicios'
                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isSalonNiche ? <Sparkles className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
              <span>Menú de Servicios ({allServices.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCatalogTab('productos')}
              className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                catalogTab === 'productos'
                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tienda & Productos ({catalogProducts.length})</span>
            </button>
          </div>
        )}

        {/* =====================================================================
            3. MENÚ DE SERVICIOS ESTILO "CARTA VIP" (CERO SATURACIÓN DE COLORES)
           ===================================================================== */}
        {catalogTab === 'servicios' && (
          <section className="space-y-3.5">
            <div className="flex items-end justify-between px-1">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gold-400 block">
                  Experiencia & Precios
                </span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Selecciona tu Servicio
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                {allServices.length} opciones disponibles
              </span>
            </div>

            {/* Category Filter Pills (if multiple categories exist) */}
            {categories.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map(cat => {
                  const active = selectedCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border ${
                        active
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-[#10121a] text-slate-400 border-white/[0.07] hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Luxury Service List */}
            <div className="space-y-2.5">
              {filteredServices.map(svc => {
                const isSelected = selectedService === svc.name
                const dur = svc.duration_min || inferServiceDuration(svc)
                const priceBs = (svc.price_usd * safeRate).toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })

                return (
                  <div
                    key={svc.id}
                    onClick={() => handleSelectServiceFromCatalog(svc.name)}
                    className={`group cursor-pointer rounded-2xl p-4 transition-all duration-200 border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-r from-gold-500/[0.12] via-[#13151f] to-[#10121a] border-gold-500/70 shadow-[0_8px_25px_rgba(212,175,55,0.12)]'
                        : 'bg-[#0f1118] border-white/[0.07] hover:border-white/20 hover:bg-[#131620]'
                    }`}
                  >
                    {/* Left: Service Name & Clean Monochromatic Metadata */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-sm sm:text-base leading-snug transition-colors ${
                          isSelected ? 'text-gold-400' : 'text-white group-hover:text-gold-300'
                        }`}>
                          {svc.name}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-300">
                          <Clock className="w-3 h-3 text-gold-400/80" />
                          <span>{dur} min</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          Bs. <strong className="text-slate-300 font-mono font-semibold">{priceBs}</strong>
                        </span>
                        {svc.category && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-500">{svc.category}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Price & Action Pill */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`block text-lg sm:text-xl font-black font-mono tracking-tight ${
                          isSelected ? 'text-gold-400' : 'text-white'
                        }`}>
                          ${svc.price_usd}
                        </span>
                      </div>

                      <div
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-black shadow-md shadow-gold-500/20'
                            : 'bg-white/[0.05] text-slate-200 border border-white/[0.09] group-hover:border-gold-500/40 group-hover:text-gold-400'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Elegido</span>
                          </>
                        ) : (
                          <span>Reservar</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* =====================================================================
            3B. BOUTIQUE DE PRODUCTOS
           ===================================================================== */}
        {catalogTab === 'productos' && (
          <section className="space-y-3.5 animate-fadeIn">
            <div className="flex items-end justify-between px-1">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gold-400 block">
                  Boutique del Local
                </span>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Productos Disponibles
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                Pídelo en tu cita o por WhatsApp
              </span>
            </div>

            {catalogProducts.length === 0 ? (
              <div className="bg-[#0f1118] border border-white/[0.07] rounded-2xl p-8 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-white">No hay productos publicados</p>
                <p className="text-xs text-slate-400">Consulta directamente en el local por productos de cuidado personal.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catalogProducts.map(prod => {
                  const priceBs = (prod.price_usd * safeRate).toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                  return (
                    <div
                      key={prod.id}
                      className="bg-[#0f1118] border border-white/[0.08] hover:border-gold-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-all"
                    >
                      <div className="flex gap-3.5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-dark-900 border border-white/[0.06] shrink-0 overflow-hidden flex items-center justify-center">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Package className="w-7 h-7 text-gold-400/60" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-white text-sm leading-snug">
                              {prod.name}
                            </h3>
                            <span className="text-base font-black text-gold-400 font-mono shrink-0">
                              ${prod.price_usd}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 font-mono">
                            Bs. {priceBs}
                          </p>
                          <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                            ● Disponible en tienda
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOrderProductWhatsApp(prod)}
                        className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-gold-500 hover:text-black text-white border border-white/[0.08] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Encargar por WhatsApp</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            4. MOTOR DE RESERVA VIP (ESTILO BOOKSY / APPLE WALLET)
           ===================================================================== */}
        <section
          ref={bookingRef}
          className="relative rounded-[28px] bg-gradient-to-b from-[#12151f] to-[#0b0d13] border border-gold-500/35 p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)]"
        >
          {bookedTicket ? (
            /* ===============================================================
               PASE VIP DE CONFIRMACIÓN (BOARDING PASS / APPLE WALLET STYLE)
               =============================================================== */
            <div className="py-2 animate-fadeIn space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  Turno Confirmado en Agenda
                </span>
                <h3 className="text-2xl font-black text-white">
                  ¡Te esperamos, {bookedTicket.client_name}!
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Presenta o envía tu pase digital al llegar a <strong className="text-slate-200">{businessProfile?.businessName}</strong>.
                </p>
              </div>

              {/* Boarding Pass Ticket Card */}
              <div className="relative bg-[#08090d] border border-white/10 rounded-3xl overflow-hidden max-w-md mx-auto shadow-2xl">
                {/* Top Ticket Header */}
                <div className="bg-gradient-to-r from-gold-500/20 via-amber-500/10 to-transparent px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gold-400 block">
                      PASE DE RESERVA VIP
                    </span>
                    <span className="text-xs font-bold text-white">
                      {businessProfile?.businessName}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-gold-500/30 font-mono text-[11px] font-black text-gold-400">
                    #{bookedTicket.code}
                  </span>
                </div>

                {/* Ticket Body */}
                <div className="p-5 space-y-3.5 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-400">Servicio elegido</span>
                    <span className="font-bold text-white text-right">{bookedTicket.service}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Especialista</span>
                    <span className="font-bold text-gold-400">{bookedTicket.staffName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Duración estimada</span>
                    <span className="font-semibold text-slate-200 font-mono">⏱ ~{bookedTicket.durationMin || 30} min</span>
                  </div>

                  {/* Perforated Divider Line */}
                  <div className="relative py-2 flex items-center">
                    <div className="w-4 h-4 rounded-full bg-[#10121b] border border-white/10 -ml-7 shrink-0" />
                    <div className="w-full border-t border-dashed border-white/15 mx-2" />
                    <div className="w-4 h-4 rounded-full bg-[#10121b] border border-white/10 -mr-7 shrink-0" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.05]">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Fecha</span>
                      <span className="font-black text-white font-mono text-sm">{bookedTicket.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Hora Exacta</span>
                      <span className="font-black text-emerald-400 font-mono text-sm">{bookedTicket.time}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400 font-medium">Valor del Servicio</span>
                    <div className="text-right">
                      <span className="text-base font-black text-white font-mono">${bookedTicket.priceUsd}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">Bs. {bookedTicket.priceBs}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmation Actions */}
              <div className="space-y-2.5 max-w-md mx-auto pt-1">
                <button
                  type="button"
                  onClick={handleSendWhatsAppConfirmation}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-98"
                >
                  <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                  <span>Enviar mi Pase por WhatsApp al Local</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBookedTicket(null)
                    setClientName('')
                    const nextFree = activeSlots.find(s => !isSlotUnavailable(s))
                    if (nextFree) setSelectedTime(nextFree)
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-bold transition-all"
                >
                  Agendar otro turno adicional
                </button>
              </div>
            </div>
          ) : (
            /* ===============================================================
               FLUJO INTERACTIVO DE RESERVA VIP
               =============================================================== */
            <form onSubmit={handleConfirmBooking} className="space-y-6">
              
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-400 block">
                    Reserva Instantánea
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Personaliza tu Cita
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-gold-400" />
                </div>
              </div>

              {/* PASO 1: Servicio Activo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gold-500 text-black font-black text-[11px] inline-flex items-center justify-center">1</span>
                    <span>Servicio Seleccionado</span>
                  </label>
                  <span className="text-[11px] font-mono text-gold-400 font-bold">
                    ⏱ {selectedDuration} min
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-[#090b10] border border-white/10 hover:border-gold-500/40 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-gold-500 transition-colors"
                  >
                    {allServices.map(s => {
                      const dur = s.duration_min || inferServiceDuration(s)
                      const bs = (s.price_usd * safeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      return (
                        <option key={s.id} value={s.name}>
                          {s.name} ({dur} min) — ${s.price_usd} / Bs. {bs}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* PASO 2: Especialista (Solo en modo multi-profesional) */}
              {!isSingleChair && staffList.length > 1 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gold-500 text-black font-black text-[11px] inline-flex items-center justify-center">2</span>
                    <span>Elige a tu {nicheData?.roleName || 'Especialista'}</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {staffList.map(st => {
                      const active = selectedStaff === st.id
                      return (
                        <button
                          type="button"
                          key={st.id}
                          onClick={() => setSelectedStaff(st.id)}
                          className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                            active
                              ? 'bg-gradient-to-br from-gold-500/20 to-amber-500/5 border-gold-500 text-white shadow-md shadow-gold-500/10'
                              : 'bg-[#090b10] border-white/[0.07] text-slate-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                            active ? 'bg-gold-500 text-black' : 'bg-white/[0.05]'
                          }`}>
                            {st.avatar || '✂️'}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-white truncate">{st.name}</span>
                            <span className="block text-[10px] text-emerald-400">Disponible</span>
                          </div>
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      onClick={() => setSelectedStaff('any')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        selectedStaff === 'any'
                          ? 'bg-gradient-to-br from-gold-500/20 to-amber-500/5 border-gold-500 text-white shadow-md shadow-gold-500/10'
                          : 'bg-[#090b10] border-white/[0.07] text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                        selectedStaff === 'any' ? 'bg-gold-500 text-black' : 'bg-white/[0.05]'
                      }`}>
                        ⚡
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-white truncate">Primero Libre</span>
                        <span className="block text-[10px] text-gold-400">Más rápido</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 3: Carrusel de Días Estilo iOS + Grilla de Horas */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gold-500 text-black font-black text-[11px] inline-flex items-center justify-center">
                      {isSingleChair ? '2' : '3'}
                    </span>
                    <span>Selecciona Día y Hora</span>
                  </label>

                  {/* Botón discreto para elegir otra fecha del calendario */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (customDateInputRef.current?.showPicker) {
                          customDateInputRef.current.showPicker()
                        } else if (customDateInputRef.current) {
                          customDateInputRef.current.focus()
                        }
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                        isCustomDateSelected
                          ? 'bg-gold-500 text-black border-gold-400'
                          : 'bg-white/[0.04] text-slate-300 border-white/10 hover:text-white'
                      }`}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      <span>{isCustomDateSelected ? selectedDate : 'Otra fecha'}</span>
                    </button>
                    <input
                      ref={customDateInputRef}
                      type="date"
                      value={selectedDate}
                      min={getTodayStr()}
                      onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                      className="sr-only"
                    />
                  </div>
                </div>

                {/* Carrusel Horizontal de 7 Días (Estilo App Nativa) */}
                <div className="grid grid-cols-7 gap-1.5">
                  {upcomingDays.map((d) => {
                    const isSelected = selectedDate === d.iso
                    return (
                      <button
                        type="button"
                        key={d.iso}
                        onClick={() => setSelectedDate(d.iso)}
                        className={`py-2.5 px-1 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-gradient-to-b from-gold-500 to-amber-500 text-black border-gold-400 shadow-lg shadow-gold-500/20 scale-[1.03]'
                            : d.isClosed
                            ? 'bg-[#090a0f]/60 border-white/[0.04] text-slate-600 opacity-60'
                            : 'bg-[#090b10] border-white/[0.07] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <span className={`text-[9px] font-black uppercase tracking-wider ${
                          isSelected ? 'text-black/80' : 'text-slate-400'
                        }`}>
                          {d.dayName}
                        </span>
                        <span className={`text-sm sm:text-base font-black font-mono leading-tight my-0.5 ${
                          isSelected ? 'text-black' : 'text-white'
                        }`}>
                          {d.dayNumber}
                        </span>
                        <span className={`text-[9px] font-semibold ${
                          isSelected
                            ? 'text-black/80'
                            : d.isClosed
                            ? 'text-red-400/70'
                            : 'text-slate-500'
                        }`}>
                          {d.isClosed ? 'Cerrado' : d.monthShort}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Horarios del Día Seleccionado */}
                {isDayClosed ? (
                  <div className="p-5 rounded-2xl bg-[#090b10] border border-white/[0.07] text-center space-y-1.5">
                    <p className="text-xs font-bold text-slate-200">
                      El local permanece cerrado los {selectedDayLabel}s
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Toca otro día en la barra superior para ver los turnos libres.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Alerta si ya pasaron o se llenaron los turnos de hoy */}
                    {allTodayUnavailable && selectedDate === getTodayStr() && (
                      <div className="p-4 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-center space-y-2">
                        <p className="text-xs font-bold text-gold-300">
                          ⚡ Agenda completada por el día de hoy
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Todos los turnos de hoy ya transcurrieron o fueron reservados.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedDate(getTomorrowStr())}
                          className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-black shadow-md transition-all inline-flex items-center gap-1.5"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>Ver horarios de Mañana</span>
                        </button>
                      </div>
                    )}

                    {/* Filtros de Franja Horaria (Mañana / Tarde / Noche en paleta Obsidiana + Blanco) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {[
                        { id: 'all', label: 'Todos', count: totalFreeToday },
                        { id: 'morning', label: '☀️ Mañana', count: morningFree },
                        { id: 'afternoon', label: '⛅ Tarde', count: afternoonFree },
                        { id: 'evening', label: '🌙 Noche', count: eveningFree }
                      ].map(tab => {
                        const active = timePeriodFilter === tab.id
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setTimePeriodFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 border transition-all flex items-center gap-1.5 ${
                              active
                                ? 'bg-white text-black border-white shadow-sm'
                                : 'bg-[#090b10] text-slate-400 border-white/[0.07] hover:text-white'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                              active ? 'bg-black/15 text-black' : 'bg-white/[0.05] text-slate-400'
                            }`}>
                              {tab.count}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Grilla de Horas */}
                    {displayedSlots.length === 0 ? (
                      <div className="text-center py-5 text-xs text-slate-500 bg-[#090b10] rounded-2xl border border-white/[0.06]">
                        No hay turnos configurados en esta franja horaria
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {displayedSlots.map(slot => {
                          const isPast = isSlotInPast(slot)
                          const isBooked = isSlotBooked(slot)
                          const unavailable = isPast || isBooked
                          const active = selectedTime === slot && !unavailable

                          return (
                            <button
                              type="button"
                              key={slot}
                              disabled={unavailable}
                              onClick={() => setSelectedTime(slot)}
                              className={`py-2.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all text-center ${
                                isPast
                                  ? 'bg-[#08090d] text-slate-700 border-white/[0.03] line-through cursor-not-allowed opacity-45'
                                  : isBooked
                                  ? 'bg-[#08090d] text-slate-600 border-white/[0.04] line-through cursor-not-allowed opacity-60'
                                  : active
                                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-black border-gold-400 shadow-lg shadow-gold-500/20 font-black scale-[1.02]'
                                  : 'bg-[#090b10] text-slate-200 border-white/[0.08] hover:border-gold-500/50 hover:text-white'
                              }`}
                            >
                              {isBooked ? 'Ocupado' : slot}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* PASO 4: Datos del Cliente */}
              <div className="space-y-3 pt-2 border-t border-white/[0.07]">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold-500 text-black font-black text-[11px] inline-flex items-center justify-center">
                    {isSingleChair ? '3' : '4'}
                  </span>
                  <span>Tus Datos para el Pase VIP</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos Rodríguez"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#090b10] border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      WhatsApp de Contacto *
                    </label>
                    <PhoneCountryInput
                      value={clientPhone}
                      onChange={setClientPhone}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Resumen Previo a Confirmar */}
              {!isDayClosed && !isSlotUnavailable(selectedTime) && currentServiceObj && (
                <div className="rounded-2xl bg-[#090b10] border border-white/[0.07] px-4 py-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Resumen de tu Cita
                    </span>
                    <p className="font-bold text-white truncate">
                      {currentServiceObj.name} • <span className="text-gold-400 font-mono">{selectedTime}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-white font-mono">
                      ${currentServiceObj.price_usd}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      Bs. {(currentServiceObj.price_usd * safeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* CTA Final */}
              <button
                type="submit"
                disabled={isDayClosed || activeSlots.length === 0 || isSlotUnavailable(selectedTime)}
                className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide shadow-2xl transition-all flex items-center justify-center gap-2 ${
                  isDayClosed || activeSlots.length === 0 || isSlotUnavailable(selectedTime)
                    ? 'bg-dark-850 text-slate-500 border border-white/[0.05] cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-gold-500 via-amber-500 to-gold-500 hover:opacity-95 text-black shadow-gold-500/20 active:scale-98'
                }`}
              >
                {isDayClosed ? (
                  <span>Cerrado los {selectedDayLabel}s</span>
                ) : isSlotUnavailable(selectedTime) ? (
                  <span>Selecciona una hora libre arriba</span>
                ) : (
                  <>
                    <span>Confirmar Mi Reserva VIP</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        {/* Minimal Luxury Brand Signature Footer */}
        <footer className="pt-2 pb-6 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-400/70" />
            <span>Reserva Oficial garantizada por <strong className="text-slate-400">{businessProfile?.businessName}</strong></span>
          </div>
        </footer>

      </div>
    </div>
  )
}
