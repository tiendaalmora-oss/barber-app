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
