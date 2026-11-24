// Security, Role Management, Cashier Payroll & Audit Trail helpers
import { getLocalDateIso } from './dateUtils'

export const DEFAULT_SECURITY_CONFIG = {
  enabled: false,
  ownerPin: '1234',
  allowCashierExpenses: true,
  allowCashierVoid: 'pin_required', // 'pin_required' | 'reason_required'
  hideOwnerProfits: true,
  blindCashCount: true,
  autoLockMinutes: 5
}

export function getSecurityConfig(businessProfile = {}) {
  return {
    ...DEFAULT_SECURITY_CONFIG,
    ...(businessProfile?.securityConfig || {})
  }
}

export function isCashierStaff(staff) {
  return Boolean(staff && staff.staff_role === 'cajero')
}

export function getOperativeStaff(staffList = []) {
  return (Array.isArray(staffList) ? staffList : []).filter(s => s && !isCashierStaff(s))
}

export function getCashierStaff(staffList = []) {
  return (Array.isArray(staffList) ? staffList : []).filter(s => s && isCashierStaff(s))
}

export function getSalaryPeriodLabel(period) {
  switch (period) {
    case 'diario': return 'Diario'
    case 'quincenal': return 'Quincenal'
    case 'mensual': return 'Mensual'
    case 'semanal':
    default: return 'Semanal'
  }
}

export function getCommissionScopeLabel(scope) {
  switch (scope) {
    case 'productos': return 'Solo Productos'
    case 'ambos': return 'Servicios + Productos'
    case 'servicios':
    default: return 'Ventas de Barberos / Servicios'
  }
}

export function getCashierCommissionType(staff) {
  return staff?.commission_type === 'fixed' ? 'fixed' : 'percent'
}

export function formatCashierBonusBadge(staff, fmtFn, currTag) {
  if (getCashierCommissionType(staff) === 'fixed') {
    const val = Number(staff?.commission_fixed_usd) || 0
    return val > 0 ? `$${fmtFn ? fmtFn(val) : val.toFixed(2)}/corte` : 'Sin bono'
  }
  const pct = Number(staff?.commission_pct) || 0
  return pct > 0 ? `${pct}% extra` : 'Sin bono'
}

/**
 * Calculates the additional bonus earned by a Cashier/Receptionist
 * on a sale (cart items array or saved transaction object).
 * Supports both fixed bonus per eligible ticket/client ('fixed') and percentage ('percent').
 * Strictly does NOT reduce the barber's commission.
 */
export function calculateCashierCommissionForTx(txOrItems, cashierStaff) {
  if (!cashierStaff) return 0

  const scope = cashierStaff.commission_scope || 'servicios'
  let eligibleBase = 0

  if (Array.isArray(txOrItems)) {
    eligibleBase = txOrItems.reduce((sum, item) => {
      const lineTotal = (Number(item.price_usd) || 0) * (Number(item.qty) || 1)
      if (scope === 'servicios') return item.isProduct ? sum : sum + lineTotal
      if (scope === 'productos') return item.isProduct ? sum + lineTotal : sum
      return sum + lineTotal
    }, 0)
  } else if (txOrItems && typeof txOrItems === 'object') {
    const tx = txOrItems
    if (Number(tx.monto_usd) <= 0) return 0
    if (Array.isArray(tx.items) && tx.items.length > 0) {
      eligibleBase = tx.items.reduce((sum, item) => {
        const lineTotal = (Number(item.price_usd) || 0) * (Number(item.qty) || 1)
        if (scope === 'servicios') return item.isProduct ? sum : sum + lineTotal
        if (scope === 'productos') return item.isProduct ? sum + lineTotal : sum
        return sum + lineTotal
      }, 0)
    } else {
      const isPureProduct = tx.category === 'Venta Productos'
      if (scope === 'servicios') eligibleBase = isPureProduct ? 0 : (Number(tx.monto_usd) || 0)
      else if (scope === 'productos') eligibleBase = isPureProduct ? (Number(tx.monto_usd) || 0) : 0
      else eligibleBase = Number(tx.monto_usd) || 0
    }
  }

  if (eligibleBase <= 0) return 0

  if (getCashierCommissionType(cashierStaff) === 'fixed') {
    const fixedAmt = Number(cashierStaff.commission_fixed_usd) || 0
    if (fixedAmt <= 0) return 0
    return Math.round(fixedAmt * 100) / 100
  }

  const pct = Number(cashierStaff.commission_pct) || 0
  if (pct <= 0) return 0
  return Math.round(eligibleBase * (pct / 100) * 100) / 100
}

export function createAuditEntry({
  type = 'INFO',
  actorName = 'Dueño',
  actorRole = 'dueno',
  summary = '',
  reason = '',
  amountUsd = null,
  details = {}
}) {
  return {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    timestamp: new Date().toISOString(),
    fecha: getLocalDateIso(),
    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actorName,
    actorRole,
    summary,
    reason: reason || '',
    amountUsd: amountUsd !== undefined && amountUsd !== null ? Number(amountUsd) : null,
    details: details || {}
  }
}

export function getDeviceForceCashier(tenantId) {
  if (typeof window === 'undefined' || !tenantId) return false
  try {
    return localStorage.getItem(`barber_device_cashier_mode_${tenantId}`) === '1'
  } catch (e) {
    return false
  }
}

export function setDeviceForceCashier(tenantId, enabled) {
  if (typeof window === 'undefined' || !tenantId) return
  try {
    if (enabled) {
      localStorage.setItem(`barber_device_cashier_mode_${tenantId}`, '1')
    } else {
      localStorage.removeItem(`barber_device_cashier_mode_${tenantId}`)
    }
  } catch (e) {}
}

export function getCashierLoginSession(tenantId) {
  if (typeof window === 'undefined' || !tenantId) return null
  try {
    const raw = localStorage.getItem(`barber_cashier_login_session_${tenantId}`)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function setCashierLoginSession(tenantId, operator) {
  if (typeof window === 'undefined' || !tenantId) return
  try {
    if (operator) {
      localStorage.setItem(`barber_cashier_login_session_${tenantId}`, JSON.stringify(operator))
    } else {
      localStorage.removeItem(`barber_cashier_login_session_${tenantId}`)
    }
  } catch (e) {}
}

export function clearCashierLoginSession(tenantId) {
  if (typeof window === 'undefined' || !tenantId) return
  try {
    localStorage.removeItem(`barber_cashier_login_session_${tenantId}`)
  } catch (e) {}
}

export function getAllCashiersFromStaffByNiche(staffByNiche = {}, preferredNiche = 'barberia') {
  if (!staffByNiche || typeof staffByNiche !== 'object') return []
  const order = [preferredNiche, 'barberia', 'estetica', 'mixto']
  const seenKeys = new Set()
  const orderedKeys = []
  order.forEach(k => {
    if (k && !seenKeys.has(k)) {
      seenKeys.add(k)
      orderedKeys.push(k)
    }
  })
  Object.keys(staffByNiche).forEach(k => {
    if (!seenKeys.has(k)) {
      seenKeys.add(k)
      orderedKeys.push(k)
    }
  })

  const seenIds = new Set()
  const cashiers = []
  orderedKeys.forEach(k => {
    const list = Array.isArray(staffByNiche[k]) ? staffByNiche[k] : []
    list.forEach(s => {
      if (isCashierStaff(s) && s.id && !seenIds.has(s.id)) {
        seenIds.add(s.id)
        cashiers.push(s)
      }
    })
  })
  return cashiers
}

export function filterDeletedStaffByNiche(staffByNiche, deletedIds = []) {
  if (!staffByNiche || typeof staffByNiche !== 'object') return staffByNiche
  const delSet = new Set(Array.isArray(deletedIds) ? deletedIds : [])
  if (delSet.size === 0) return staffByNiche
  let changed = false
  const next = {}
  Object.keys(staffByNiche).forEach(k => {
    const arr = staffByNiche[k]
    if (Array.isArray(arr)) {
      const filtered = arr.filter(s => s && !delSet.has(s.id))
      if (filtered.length !== arr.length) changed = true
      next[k] = filtered
    } else {
      next[k] = arr
    }
  })
  return changed ? next : staffByNiche
}
