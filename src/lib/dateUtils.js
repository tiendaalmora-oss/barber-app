// Utility functions for Venezuelan & Argentine timezones, local dates and WhatsApp formatting
import { isArgentina, formatCurrency } from './brandConfig'

/**
 * Returns YYYY-MM-DD formatted strictly in the user's local timezone.
 * Solves the critical 8:00 PM UTC rollover in Venezuela (GMT-4).
 */
export function getLocalDateIso(d = new Date()) {
  if (!d) return ''
  // If already a pure YYYY-MM-DD string (without time component), return directly
  if (typeof d === 'string') {
    const trimmed = d.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed
    }
  }
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
  return getLocalDateIso(dateString) === getLocalDateIso()
}

/**
 * Returns the Monday-to-Sunday bounds in local timezone for a given weekOffset
 * (0 = current week "Esta Semana", -1 = previous week "Semana Pasada").
 * Returns { startIso: 'YYYY-MM-DD', endIso: 'YYYY-MM-DD', rangeLabel: 'DD/MM al DD/MM' }
 */
export function getWeekBoundsLocal(weekOffset = 0) {
  const now = new Date()
  const day = now.getDay() // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day) + (weekOffset * 7)
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const startIso = getLocalDateIso(monday)
  const endIso = getLocalDateIso(sunday)
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return {
    startIso,
    endIso,
    rangeLabel: `${fmt(monday)} al ${fmt(sunday)}`
  }
}

/**
 * Checks if a given date string (ISO or YYYY-MM-DD) falls within the target week (Monday-Sunday in local time).
 */
export function isDateInWeek(dateString, weekOffset = 0) {
  if (!dateString) return false
  const targetIso = getLocalDateIso(dateString)
  if (!targetIso) return false
  const { startIso, endIso } = getWeekBoundsLocal(weekOffset)
  return targetIso >= startIso && targetIso <= endIso
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

  // Fix common mistake in Venezuela: +5804... -> strip the redundant 0
  if (clean.startsWith('5804') && clean.length === 13) {
    clean = '58' + clean.slice(3)
  }

  // Venezuelan mobile numbers: 0412, 0414, 0424, 0416, 0426
  if (clean.startsWith('04') && clean.length === 11) {
    clean = '58' + clean.slice(1)
  } else if (clean.startsWith('4') && clean.length === 10) {
    clean = '58' + clean
  }

  // Argentine mobile numbers for WhatsApp (requires +54 9):
  if (clean.startsWith('54') && !clean.startsWith('549') && clean.length === 12) {
    clean = '549' + clean.slice(2)
  } else if (clean.startsWith('11') && clean.length === 10) {
    clean = '549' + clean
  } else if (clean.startsWith('011') && clean.length === 11) {
    clean = '549' + clean.slice(1)
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
  return method === 'punto' || method === 'punto_de_venta' || method === 'tarjeta_credito'
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

export function isMixtoMethod(method) {
  return method === 'mixto'
}

function matchesMethodGroup(method, targetGroup) {
  if (!method) return false
  if (targetGroup === 'efectivo') return isEfectivoMethod(method)
  if (targetGroup === 'pago_movil') return isPagoMovilMethod(method)
  if (targetGroup === 'punto') return isPuntoMethod(method)
  if (targetGroup === 'digital' || targetGroup === 'zelle') return isDigitalMethod(method)
  if (targetGroup === 'fiado') return isFiadoMethod(method)
  return method === targetGroup
}

/**
 * Returns the exact USD net revenue portion of a transaction that belongs to a given payment method group.
 * Supports both standard single-method transactions and split payments (`payment_splits`).
 */
export function getTxMethodAmountUSD(tx, targetGroup) {
  if (!tx || (tx.monto_usd || 0) <= 0) return 0
  if (Array.isArray(tx.payment_splits) && tx.payment_splits.length > 0) {
    return tx.payment_splits.reduce((sum, split) => {
      if (split && matchesMethodGroup(split.method, targetGroup)) {
        const val = split.net_income_usd !== undefined ? Number(split.net_income_usd) : Number(split.amount_usd || 0)
        return sum + (isNaN(val) ? 0 : val)
      }
      return sum
    }, 0)
  }
  return matchesMethodGroup(tx.metodo_pago, targetGroup) ? Number(tx.monto_usd || 0) : 0
}

/**
 * Returns the total collected USD (including tip if any) for a given payment method group.
 */
export function getTxMethodCollectedUSD(tx, targetGroup) {
  if (!tx || (tx.monto_usd || 0) <= 0) return 0
  if (Array.isArray(tx.payment_splits) && tx.payment_splits.length > 0) {
    return tx.payment_splits.reduce((sum, split) => {
      if (split && matchesMethodGroup(split.method, targetGroup)) {
        const val = Number(split.amount_usd || 0)
        return sum + (isNaN(val) ? 0 : val)
      }
      return sum
    }, 0)
  }
  const total = Number(tx.total_cobrado_usd ?? tx.monto_usd ?? 0)
  return matchesMethodGroup(tx.metodo_pago, targetGroup) ? total : 0
}

/**
 * Checks whether a transaction includes a specific payment method (either as primary method or inside payment_splits).
 */
export function txMatchesPaymentFilter(tx, filterGroup) {
  if (!tx) return false
  if (!filterGroup || filterGroup === 'all') return true
  if (filterGroup === 'mixto') {
    return tx.metodo_pago === 'mixto' || (Array.isArray(tx.payment_splits) && tx.payment_splits.length > 1)
  }
  if (Array.isArray(tx.payment_splits) && tx.payment_splits.length > 0) {
    return tx.payment_splits.some(s => s && matchesMethodGroup(s.method, filterGroup))
  }
  return matchesMethodGroup(tx.metodo_pago, filterGroup)
}

export function formatMethodName(method, isAr = isArgentina()) {
  if (!method) return isAr ? 'Mercado Pago / Transf.' : 'Pago Móvil'
  if (isEfectivoMethod(method)) return isAr ? 'Efectivo' : 'Efectivo $'
  if (isPagoMovilMethod(method)) return isAr ? 'Mercado Pago / Transf.' : 'Pago Móvil'
  if (method === 'tarjeta_credito') return 'Tarjeta Crédito'
  if (isPuntoMethod(method)) return isAr ? 'Tarjeta / Point' : 'Punto de Venta'
  if (isDigitalMethod(method)) return isAr ? 'Digital / USDT' : 'Zelle / Binance'
  if (isFiadoMethod(method)) return 'Fiado'
  if (isMixtoMethod(method)) return 'Pago Mixto'
  return String(method).replace(/_/g, ' ')
}

export function formatTxPaymentSummary(tx, isAr = isArgentina()) {
  if (!tx) return ''
  if (Array.isArray(tx.payment_splits) && tx.payment_splits.length > 0) {
    const parts = tx.payment_splits
      .filter(s => s && Number(s.amount_usd) > 0)
      .map(s => `${formatMethodName(s.method, isAr)} ${formatCurrency(s.amount_usd, isAr)}`)
    if (parts.length > 0) return `Mixto (${parts.join(' + ')})`
  }
  if (tx.metodo_pago === 'tarjeta_credito' || (isAr && tx.card_type === 'credito')) {
    return Number(tx.card_surcharge_pct) > 0
      ? `Tarjeta Crédito (+${tx.card_surcharge_pct}%)`
      : 'Tarjeta Crédito'
  }
  if (isAr && isPuntoMethod(tx.metodo_pago) && tx.card_type === 'debito') {
    return 'Tarjeta Débito'
  }
  return formatMethodName(tx.metodo_pago, isAr)
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

  // Match 12-hour or 24-hour: H:MM or HH:MM followed optionally by AM/PM
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = match12[2]
    const ampm = match12[3]

    if (ampm) {
      return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`
    }
    if (hours === 0) {
      return `12:${minutes} AM`
    }
    // Business-hours heuristic when AM/PM is omitted: 1:00..6:59 means afternoon (PM)
    if (hours >= 1 && hours <= 6) {
      return `${hours.toString().padStart(2, '0')}:${minutes} PM`
    }
    if (hours >= 7 && hours <= 11) {
      return `${hours.toString().padStart(2, '0')}:${minutes} AM`
    }
    if (hours === 12) {
      return `12:${minutes} PM`
    }
    if (hours >= 13 && hours <= 23) {
      return `${(hours - 12).toString().padStart(2, '0')}:${minutes} PM`
    }
    return `${hours.toString().padStart(2, '0')}:${minutes} AM`
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
 * Checks if a given time slot (e.g. "10:00 AM") has already passed for a specific date (defaults to today).
 * Includes an optional buffer in minutes (default: 10 min) so clients cannot book a slot
 * starting in the immediate minutes without giving the barber time to prepare.
 */
export function isTimeSlotInPast(timeStr, targetDateStr, bufferMinutes = 10) {
  if (!timeStr) return false
  const todayIso = getLocalDateIso()
  const dateToCheck = targetDateStr ? (targetDateStr.includes('T') ? targetDateStr.split('T')[0] : targetDateStr) : todayIso
  if (dateToCheck !== todayIso) return false

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const slotMinutes = timeToMinutes(timeStr)
  return slotMinutes <= (currentMinutes + bufferMinutes)
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
  if (name.includes('acrilic') || name.includes('acrílic') || name.includes('esculpid') || name.includes('polygel') || name.includes('keratina') || name.includes('cirugia capilar') || name.includes('cirugía capilar') || name.includes('balayage') || name.includes('mechas')) {
    return 120
  }
  if (name.includes('pestaña') || name.includes('extension') || name.includes('extensión') || name.includes('ruso') || name.includes('soft gel') || name.includes('kapping') || name.includes('nivelacion') || name.includes('nivelación')) {
    return 90
  }
  if (name.includes('combo') || name.includes('completo') || name.includes('alisado') || name.includes('quimic') || name.includes('spa') || name.includes('semipermanente') || name.includes('pedicure')) {
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

/**
 * Formats a duration in minutes into a compact, readable label:
 *  45 -> "45 min" (or "45m" when compact=true)
 *  60 -> "1h"
 *  90 -> "1h 30m"
 *  120 -> "2h"
 *  150 -> "2h 30m"
 */
export function formatDurationLabel(mins, compact = false) {
  const m = Number(mins) || 30
  if (m < 60) return compact ? `${m}m` : `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}

/**
 * Days of the week configuration for Venezuela / Latin America (Monday-first)
 */
export const DAYS_OF_WEEK = [
  { id: 'lunes', label: 'Lunes', short: 'Lun', dayIndex: 1 },
  { id: 'martes', label: 'Martes', short: 'Mar', dayIndex: 2 },
  { id: 'miercoles', label: 'Miércoles', short: 'Mié', dayIndex: 3 },
  { id: 'jueves', label: 'Jueves', short: 'Jue', dayIndex: 4 },
  { id: 'viernes', label: 'Viernes', short: 'Vie', dayIndex: 5 },
  { id: 'sabado', label: 'Sábado', short: 'Sáb', dayIndex: 6 },
  { id: 'domingo', label: 'Domingo', short: 'Dom', dayIndex: 0 },
]

/**
 * Returns the day key ('lunes', 'martes', etc.) for a given date string or Date object.
 */
export function getDayKeyFromDate(dateStr) {
  if (!dateStr) return 'lunes'
  const clean = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const d = new Date(`${clean}T12:00:00`)
  const dayIdx = isNaN(d.getTime()) ? 1 : d.getDay()
  const found = DAYS_OF_WEEK.find(day => day.dayIndex === dayIdx)
  return found ? found.id : 'lunes'
}

/**
 * Returns human-readable day label (e.g. 'Lunes', 'Domingo')
 */
export function getDayLabelFromDate(dateStr) {
  if (!dateStr) return 'Lunes'
  const key = getDayKeyFromDate(dateStr)
  const found = DAYS_OF_WEEK.find(d => d.id === key)
  return found ? found.label : 'Lunes'
}

/**
 * Retrieves the day schedule { enabled: boolean, slots: string[] } for a given date.
 * Fully backward-compatible with legacy businessProfile.bookingSlots.
 */
export function getScheduleForDate(businessProfile, dateStr, fallbackSlots = []) {
  const dayKey = getDayKeyFromDate(dateStr)
  const weekly = businessProfile?.weeklySchedule
  if (weekly && weekly[dayKey]) {
    const dayConfig = weekly[dayKey]
    return {
      enabled: dayConfig.enabled !== false,
      slots: Array.isArray(dayConfig.slots) ? dayConfig.slots : []
    }
  }

  // Backward compatibility fallback to global bookingSlots
  const defaultSlots = (businessProfile?.bookingSlots && businessProfile.bookingSlots.length > 0)
    ? businessProfile.bookingSlots
    : fallbackSlots

  return {
    enabled: true,
    slots: defaultSlots
  }
}

/**
 * Checks whether a staff member (barber/stylist) is scheduled to work on a given YYYY-MM-DD date.
 * Backward-compatible: if days_off and blocked_dates are empty/missing, returns true.
 */
export function isStaffAvailableOnDate(staff, dateStr) {
  if (!staff || !dateStr) return true
  const cleanDate = typeof dateStr === 'string' && dateStr.includes('T')
    ? dateStr.split('T')[0]
    : String(dateStr).trim()

  if (Array.isArray(staff.blocked_dates) && staff.blocked_dates.includes(cleanDate)) {
    return false
  }

  if (Array.isArray(staff.days_off) && staff.days_off.length > 0) {
    const dayKey = getDayKeyFromDate(cleanDate)
    if (staff.days_off.includes(dayKey)) {
      return false
    }
  }

  return true
}

/**
 * Filters a list of staff members to those available on the given YYYY-MM-DD date.
 */
export function getAvailableStaffForDate(staffList = [], dateStr) {
  return (Array.isArray(staffList) ? staffList : []).filter(st => st && isStaffAvailableOnDate(st, dateStr))
}
