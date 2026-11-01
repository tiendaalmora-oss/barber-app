// Utility functions for Venezuelan timezones, local dates and WhatsApp formatting

/**
 * Returns YYYY-MM-DD formatted strictly in the user's local timezone.
 * Solves the critical 8:00 PM UTC rollover in Venezuela (GMT-4).
 */
export function getLocalDateIso(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return ''
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localTime.toISOString().split('T')[0]
}

/**
 * Checks if a given date string (ISO or YYYY-MM-DD) matches today in local time.
 */
export function isDateToday(dateString) {
  if (!dateString) return false
  const targetIso = dateString.includes('T') ? dateString.split('T')[0] : dateString
  return targetIso === getLocalDateIso()
}

/**
 * Normalizes phone numbers for wa.me links.
 * Handles standard Venezuelan numbers (0412, 0414, 0424, 0416, 0426)
 * transforming them automatically to 584...
 */
export function normalizeWhatsAppPhone(rawPhone) {
  if (!rawPhone) return ''
  let clean = rawPhone.toString().replace(/[^0-9]/g, '')
  if (clean.startsWith('00')) clean = clean.slice(2)
  // Venezuelan mobile numbers: 0412, 0414, 0424, 0416, 0426
  if (clean.startsWith('04') && clean.length === 11) {
    clean = '58' + clean.slice(1)
  } else if (clean.startsWith('4') && clean.length === 10) {
    clean = '58' + clean
  }
  return clean
}

/**
 * Unified Payment Method normalization across modals and views.
 * Matches: 'efectivo' <-> 'efectivo_usd', 'punto' <-> 'punto_de_venta'
 */
export function isEfectivoMethod(method) {
  return method === 'efectivo' || method === 'efectivo_usd'
}

export function isPuntoMethod(method) {
  return method === 'punto' || method === 'punto_de_venta'
}

export function isPagoMovilMethod(method) {
  return method === 'pago_movil'
}

export function isDigitalMethod(method) {
  return method === 'zelle' || method === 'binance'
}

export function isFiadoMethod(method) {
  return method === 'fiado'
}

/**
 * Normalizes time strings to canonical "HH:MM AM/PM" format.
 * Examples:
 *  "9:00 AM" -> "09:00 AM"
 *  "09:00 am" -> "09:00 AM"
 *  "10:30pm" -> "10:30 PM"
 *  "14:00" -> "02:00 PM"
 */
export function normalizeTimeSlot(rawTime) {
  if (!rawTime || typeof rawTime !== 'string') return ''
  let clean = rawTime.trim().toUpperCase()

  // Match 12-hour: H:MM or HH:MM followed optionally by AM/PM
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = match12[2]
    const ampm = match12[3]

    if (ampm) {
      return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`
    } else {
      // 24-hour format: e.g. 14:00 or 09:00 without AM/PM
      const period = hours >= 12 ? 'PM' : 'AM'
      if (hours > 12) hours -= 12
      if (hours === 0) hours = 12
      return `${hours.toString().padStart(2, '0')}:${minutes} ${period}`
    }
  }

  return clean
}

/**
 * Converts a 12-hour or 24-hour time string (e.g. "09:30 AM", "02:00 PM") to minutes from midnight (0..1439).
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const norm = normalizeTimeSlot(timeStr)
  const match = norm.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)
  if (!match) return 0
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const ampm = match[3]
  if (ampm === 'PM' && hours < 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

/**
 * Infers service duration in minutes (30, 45, or 60 min)
 * Respects explicit duration_min if present, or deduces by service name.
 */
export function inferServiceDuration(service) {
  if (!service) return 30
  if (typeof service === 'object' && service.duration_min && !isNaN(Number(service.duration_min))) {
    return Number(service.duration_min)
  }
  const name = (typeof service === 'string' ? service : service.name || '').toLowerCase()
  if (name.includes('combo') || name.includes('completo') || name.includes('alisado') || name.includes('quimic') || name.includes('spa')) {
    return 60
  }
  if (name.includes('degradé') || name.includes('degrade') || name.includes('fade') || name.includes('pigmentaci') || name.includes('tinte')) {
    return 45
  }
  if (name.includes('ceja') || name.includes('cejas') || name.includes('masaje') || name.includes('perfilado') || name.includes('express') || name.includes('rapido') || name.includes('rápido')) {
    return 15
  }
  return 30
}
