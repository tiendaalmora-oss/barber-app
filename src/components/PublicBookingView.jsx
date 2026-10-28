import React, { useState, useRef } from 'react'
import { Scissors, Sparkles, MapPin, Clock, Phone, Calendar as CalendarIcon, CheckCircle2, ArrowLeft, MessageSquare, ShoppingBag, CreditCard, User, Check, Instagram } from 'lucide-react'

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:30 AM',
  '01:00 PM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:00 PM'
]

export default function PublicBookingView({
  businessProfile,
  nicheData,
  customServices,
  exchangeRate,
  appointments,
  onBookAppointment,
  isOwnerPreview,
  onExitPreview
}) {
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const getTomorrowStr = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  const allServices = [...(customServices || []), ...nicheData.services]
  const bookingRef = useRef(null)

  const [catalogTab, setCatalogTab] = useState('servicios')
  const [selectedService, setSelectedService] = useState(allServices[0]?.name || '')
  const [selectedStaff, setSelectedStaff] = useState(nicheData.staff[0]?.id || 'any')
  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [selectedTime, setSelectedTime] = useState('10:00 AM')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [bookedTicket, setBookedTicket] = useState(null)

  // Check if a slot is already booked in the owner's calendar
  const isSlotTaken = (timeStr) => {
    return appointments.some(apt => {
      const sameDate = apt.date === selectedDate
      const sameTime = apt.time === timeStr
      const sameStaff = selectedStaff === 'any' ? false : apt.staff_id === selectedStaff
      return sameDate && sameTime && sameStaff && apt.status !== 'completada'
    })
  }

  const handleSelectServiceFromCatalog = (serviceName) => {
    setSelectedService(serviceName)
    if (bookingRef.current) {
      bookingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const currentServiceObj = allServices.find(s => s.name === selectedService) || allServices[0]
  const currentStaffObj = nicheData.staff.find(s => s.id === selectedStaff)

  const handleConfirmBooking = (e) => {
    e.preventDefault()
    if (!clientName.trim()) return

    const newApt = {
      id: 'web_' + Date.now(),
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      date: selectedDate,
      time: selectedTime,
      staff_id: selectedStaff === 'any' ? (nicheData.staff[0]?.id || 'e1') : selectedStaff,
      service: selectedService,
      status: 'pendiente',
      source: 'web'
    }

    onBookAppointment(newApt)
    setBookedTicket({
      ...newApt,
      staffName: currentStaffObj ? currentStaffObj.name : 'Cualquiera Disponible',
      priceUsd: currentServiceObj?.price_usd || 0,
      priceBs: ((currentServiceObj?.price_usd || 0) * exchangeRate).toFixed(2)
    })
  }

  const handleSendWhatsAppConfirmation = () => {
    if (!bookedTicket) return
    const cleanPhone = (businessProfile.whatsapp || '').replace(/[^0-9]/g, '')
    const msg = `👋 ¡Hola *${businessProfile.businessName}*! Acabo de apartar mi turno por su página web:\n\n` +
      `👤 *Cliente:* ${bookedTicket.client_name}\n` +
      `✂️ *Servicio:* ${bookedTicket.service} ($${bookedTicket.priceUsd} / Bs. ${bookedTicket.priceBs})\n` +
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
    const cleanPhone = (businessProfile.whatsapp || '').replace(/[^0-9]/g, '')
    const bs = (prod.price_usd * exchangeRate).toFixed(2)
    const msg = `👋 ¡Hola *${businessProfile.businessName}*! Vi en su catálogo el producto *${prod.name}* ($${prod.price_usd} / Bs. ${bs}) y quiero encargarlo.`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 pb-16 font-sans">
      
      {/* Owner Preview Floating Top Bar */}
      {isOwnerPreview && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-gold-500 to-amber-500 text-black px-4 py-2.5 shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black">
              <span>👀 VISTA CLIENTE: Así ven las personas tu catálogo y agenda</span>
            </div>
            <button
              onClick={onExitPreview}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black text-gold-400 hover:bg-dark-900 text-xs font-bold transition-all shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Mi Panel</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Mobile-First Landing Container */}
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Hero Business Presentation Card */}
        <div className="bg-gradient-to-b from-dark-900 to-dark-950 border border-dark-800 rounded-3xl p-6 text-center relative overflow-hidden shadow-2xl">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-500/5 border border-gold-500/40 mx-auto flex items-center justify-center mb-3 shadow-inner overflow-hidden">
            {businessProfile?.logoUrl ? (
              <img src={businessProfile.logoUrl} alt={businessProfile.businessName} className="w-full h-full object-cover" />
            ) : (
              <Scissors className="w-9 h-9 text-gold-400" />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Agenda Online Abierta • Reserva sin Hacer Cola</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {businessProfile.businessName}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
            {businessProfile.slogan}
          </p>

          {/* Promo Banner if configured */}
          {businessProfile.promoBanner && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-400 text-xs font-bold">
              {businessProfile.promoBanner}
            </div>
          )}

          {/* Location & Schedule Pills */}
          <div className="mt-4 pt-4 border-t border-dark-800/80 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            {businessProfile.address && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-750">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{businessProfile.address}</span>
              </div>
            )}
            {businessProfile.schedule && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-750">
                <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>{businessProfile.schedule}</span>
              </div>
            )}
            {businessProfile.instagram && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-750">
                <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>{businessProfile.instagram}</span>
              </div>
            )}
          </div>

          {/* Accepted Payment Methods & BCV Rate */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-dark-800 text-slate-300 border border-dark-700 font-semibold">
              💵 Tasa BCV Hoy: <strong className="text-gold-400">Bs. {exchangeRate.toFixed(2)}</strong>
            </span>
            {(businessProfile.paymentMethods || []).map(pm => (
              <span
                key={pm}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
              >
                ✓ {pm}
              </span>
            ))}
          </div>
        </div>

        {/* Catalog Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-dark-900 p-1.5 rounded-2xl border border-dark-800">
          <button
            onClick={() => setCatalogTab('servicios')}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              catalogTab === 'servicios'
                ? 'bg-gold-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Catálogo de Servicios ({allServices.length})</span>
          </button>

          <button
            onClick={() => setCatalogTab('productos')}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              catalogTab === 'productos'
                ? 'bg-gold-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Productos en Venta ({nicheData.products.length})</span>
          </button>
        </div>

        {/* TAB 1: Catálogo de Servicios */}
        {catalogTab === 'servicios' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Nuestros Servicios y Precios
              </h2>
              <span className="text-[11px] text-slate-400">
                Toca uno para apartar turno
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {allServices.map(svc => {
                const isSelected = selectedService === svc.name
                const priceBs = (svc.price_usd * exchangeRate).toFixed(2)
                return (
                  <div
                    key={svc.id}
                    onClick={() => handleSelectServiceFromCatalog(svc.name)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-gold-500/10 border-gold-500 shadow-lg shadow-gold-500/10'
                        : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{svc.name}</span>
                        {svc.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-slate-400 border border-dark-700">
                            {svc.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Al cambio hoy: <span className="text-slate-200 font-semibold">Bs. {priceBs}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="block text-base font-black text-emerald-400 font-mono">
                          ${svc.price_usd}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                          isSelected
                            ? 'bg-gold-500 text-black'
                            : 'bg-dark-800 text-gold-400 border border-gold-500/30 hover:bg-gold-500 hover:text-black'
                        }`}
                      >
                        {isSelected ? '✓ Elegido' : 'Reservar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Catálogo de Productos */}
        {catalogTab === 'productos' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Productos Disponibles en el Local
              </h2>
              <span className="text-[11px] text-slate-400">
                Encárgalo o pídelo en tu cita
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nicheData.products.map(prod => {
                const priceBs = (prod.price_usd * exchangeRate).toFixed(2)
                return (
                  <div
                    key={prod.id}
                    className="bg-dark-900 border border-dark-800 rounded-2xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-white text-sm">{prod.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono font-black text-xs shrink-0">
                          ${prod.price_usd}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Bs. {priceBs} • Disponible en mostrador
                      </p>
                    </div>

                    <button
                      onClick={() => handleOrderProductWhatsApp(prod)}
                      className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Encargar por WhatsApp</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* BOOKING ENGINE: Apartar Turno Conectado al Calendario */}
        <div ref={bookingRef} className="bg-dark-900 border-2 border-gold-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl">
          {bookedTicket ? (
            /* Ticket de Confirmación */
            <div className="text-center space-y-4 py-3 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  ¡Reserva Registrada en el Calendario!
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  ¡Listo, {bookedTicket.client_name}!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tu turno ya quedó anotado en la agenda de {businessProfile.businessName}.
                </p>
              </div>

              {/* Resumen del Ticket */}
              <div className="bg-dark-950 border border-dark-800 rounded-2xl p-4 text-left space-y-2.5 max-w-md mx-auto text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Servicio:</span>
                  <span className="font-bold text-white">{bookedTicket.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profesional:</span>
                  <span className="font-bold text-gold-400">{bookedTicket.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha y Hora:</span>
                  <span className="font-bold text-emerald-400 font-mono">{bookedTicket.date} a las {bookedTicket.time}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dark-800">
                  <span className="text-slate-400">Monto Estimado:</span>
                  <span className="font-black text-white">
                    ${bookedTicket.priceUsd} <span className="text-slate-400 font-normal">(Bs. {bookedTicket.priceBs})</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 max-w-md mx-auto">
                <button
                  onClick={handleSendWhatsAppConfirmation}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                >
                  <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                  <span>Enviar mi Ticket por WhatsApp al Local</span>
                </button>

                <button
                  onClick={() => {
                    setBookedTicket(null)
                    setClientName('')
                  }}
                  className="w-full py-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-300 text-xs font-semibold"
                >
                  Apartar otro turno
                </button>
              </div>
            </div>
          ) : (
            /* Formulario Interactivo de Reserva */
            <form onSubmit={handleConfirmBooking} className="space-y-5">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gold-400">
                    Agenda Directa
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Aparta tu Turno en 3 Pasos
                  </h3>
                </div>
                <CalendarIcon className="w-6 h-6 text-gold-400" />
              </div>

              {/* Paso 1: Servicio Seleccionado */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  1. ¿Qué servicio te vas a realizar?
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-dark-850 border border-dark-700 text-xs font-bold text-white focus:outline-none focus:border-gold-500"
                >
                  {allServices.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} — ${s.price_usd} (Bs. {(s.price_usd * exchangeRate).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Paso 2: Elegir Profesional */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  2. ¿Con quién te quieres atender? ({nicheData.roleName})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {nicheData.staff.map(st => {
                    const active = selectedStaff === st.id
                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => setSelectedStaff(st.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          active
                            ? 'bg-gold-500/15 border-gold-500 text-white'
                            : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-base">{st.avatar}</span>
                        <span className="text-xs font-bold truncate">{st.name}</span>
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedStaff('any')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      selectedStaff === 'any'
                        ? 'bg-gold-500/15 border-gold-500 text-white'
                        : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">⚡</span>
                    <span className="text-xs font-bold truncate">El 1ro Libre</span>
                  </button>
                </div>
              </div>

              {/* Paso 3: Fecha y Hora */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  3. Elige el Día y la Hora Disponible
                </label>

                {/* Selector rápido Hoy / Mañana / Calendario */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getTodayStr())}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedDate === getTodayStr()
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-dark-850 text-slate-400 border-dark-750'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getTomorrowStr())}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedDate === getTomorrowStr()
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-dark-850 text-slate-400 border-dark-750'
                    }`}
                  >
                    Mañana
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    min={getTodayStr()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-dark-850 border border-dark-750 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Horas disponibles (sincronizadas con las citas ocupadas) */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {TIME_SLOTS.map(slot => {
                    const taken = isSlotTaken(slot)
                    const active = selectedTime === slot && !taken
                    return (
                      <button
                        type="button"
                        key={slot}
                        disabled={taken}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-mono font-bold border transition-all ${
                          taken
                            ? 'bg-dark-950 text-slate-600 border-dark-850 line-through cursor-not-allowed'
                            : active
                            ? 'bg-gold-500 text-black border-gold-400 shadow-md'
                            : 'bg-dark-850 text-slate-300 border-dark-750 hover:border-gold-500/40'
                        }`}
                      >
                        {taken ? 'Ocupado' : slot}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Paso 4: Datos del Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tu Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Rodríguez"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tu Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 0412-1234567"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              {/* Botón Confirmar */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-sm shadow-xl shadow-gold-500/20 active:scale-98 transition-all"
              >
                Confirmar Mi Turno Ahora
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
