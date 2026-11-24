// Unified synchronization & deletion tombstones across browser & VPS server

export const DELETED_COLLECTIONS = [
  'transactions',
  'appointments',
  'clients',
  'staff',
  'services',
  'products'
]

export function createEmptyDeletedIds() {
  return {
    transactions: [],
    appointments: [],
    clients: [],
    staff: [],
    services: [],
    products: []
  }
}

function dedupeStrings(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return []
  const out = []
  const seen = new Set()
  for (const v of arr) {
    if (typeof v === 'string' && v && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out
}

export function normalizeDeletedIds(source = {}) {
  const src = source && typeof source === 'object' ? source : {}
  const nested = src.deletedIds && typeof src.deletedIds === 'object' ? src.deletedIds : {}
  const isWorkspaceObj =
    'deletedIds' in src ||
    'deletedTxIds' in src ||
    'deletedAppointmentIds' in src ||
    'deletedStaffIds' in src ||
    'businessProfile' in src ||
    'staffByNiche' in src ||
    'servicesByNiche' in src ||
    'productsByNiche' in src ||
    'dailyClosings' in src

  const readDirect = (col) => (
    !isWorkspaceObj && Array.isArray(src[col]) ? src[col] : []
  )

  return {
    transactions: dedupeStrings([...(nested.transactions || []), ...readDirect('transactions'), ...(src.deletedTxIds || [])]),
    appointments: dedupeStrings([...(nested.appointments || []), ...readDirect('appointments'), ...(src.deletedAppointmentIds || [])]),
    clients: dedupeStrings([...(nested.clients || []), ...readDirect('clients'), ...(src.deletedClientIds || [])]),
    staff: dedupeStrings([...(nested.staff || []), ...readDirect('staff'), ...(src.deletedStaffIds || [])]),
    services: dedupeStrings([...(nested.services || []), ...readDirect('services'), ...(src.deletedServiceIds || [])]),
    products: dedupeStrings([...(nested.products || []), ...readDirect('products'), ...(src.deletedProductIds || [])])
  }
}

export function mergeDeletedIds(a = {}, b = {}) {
  const normA = normalizeDeletedIds(a)
  const normB = normalizeDeletedIds(b)
  const merged = createEmptyDeletedIds()
  for (const col of DELETED_COLLECTIONS) {
    merged[col] = dedupeStrings([...normA[col], ...normB[col]])
  }
  return merged
}

export function addDeletedIds(current = {}, collection, ids = []) {
  const norm = normalizeDeletedIds({ deletedIds: current })
  if (!DELETED_COLLECTIONS.includes(collection)) return norm
  const additions = Array.isArray(ids) ? ids : [ids]
  norm[collection] = dedupeStrings([...norm[collection], ...additions])
  return norm
}

export function removeDeletedIds(current = {}, collection, ids = []) {
  const norm = normalizeDeletedIds({ deletedIds: current })
  if (!DELETED_COLLECTIONS.includes(collection)) return norm
  const remSet = new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean))
  if (remSet.size === 0) return norm
  norm[collection] = norm[collection].filter(id => !remSet.has(id))
  return norm
}

export function areDeletedIdsEqual(a = {}, b = {}) {
  const normA = normalizeDeletedIds({ deletedIds: a })
  const normB = normalizeDeletedIds({ deletedIds: b })
  for (const col of DELETED_COLLECTIONS) {
    if (normA[col].length !== normB[col].length) return false
    const setB = new Set(normB[col])
    for (const id of normA[col]) {
      if (!setB.has(id)) return false
    }
  }
  return true
}

/**
 * Merges two entity arrays (incoming vs existing) while strictly enforcing
 * deletedIds tombstones and resolving edits using updatedAt timestamps.
 */
export function mergeEntityList(
  incomingList = [],
  existingList = [],
  deletedIdsList = [],
  options = {}
) {
  const { preferIncomingOnTie = true, sortFn = null } = options
  const delSet = new Set(Array.isArray(deletedIdsList) ? deletedIdsList : [])
  const safeIncoming = Array.isArray(incomingList) ? incomingList : []
  const safeExisting = Array.isArray(existingList) ? existingList : []

  const existingById = new Map()
  for (const item of safeExisting) {
    if (item && item.id && !delSet.has(item.id)) {
      existingById.set(item.id, item)
    }
  }

  const incomingById = new Map()
  for (const item of safeIncoming) {
    if (item && item.id && !delSet.has(item.id)) {
      incomingById.set(item.id, item)
    }
  }

  const result = []
  const seenIds = new Set()

  // First preserve incoming order (resolving conflicts against existing by updatedAt)
  for (const inc of safeIncoming) {
    if (!inc || !inc.id || delSet.has(inc.id) || seenIds.has(inc.id)) continue
    seenIds.add(inc.id)
    const ext = existingById.get(inc.id)
    if (!ext) {
      result.push(inc)
      continue
    }
    const incTs = Number(inc.updatedAt) || 0
    const extTs = Number(ext.updatedAt) || 0
    if (incTs > extTs) {
      result.push(inc)
    } else if (extTs > incTs) {
      result.push(ext)
    } else {
      result.push(preferIncomingOnTie ? inc : ext)
    }
  }

  // Append any non-deleted items that only existed in existingList
  for (const ext of safeExisting) {
    if (!ext || !ext.id || delSet.has(ext.id) || seenIds.has(ext.id)) continue
    seenIds.add(ext.id)
    result.push(ext)
  }

  if (typeof sortFn === 'function') {
    result.sort(sortFn)
  }
  return result
}

export function filterDeletedByNiche(byNiche, deletedIdsList = []) {
  if (!byNiche || typeof byNiche !== 'object') return byNiche
  const delSet = new Set(Array.isArray(deletedIdsList) ? deletedIdsList : [])
  if (delSet.size === 0) return byNiche
  let changed = false
  const next = {}
  for (const k of Object.keys(byNiche)) {
    const arr = byNiche[k]
    if (Array.isArray(arr)) {
      const filtered = arr.filter(item => item && !delSet.has(item.id))
      if (filtered.length !== arr.length) changed = true
      next[k] = filtered
    } else {
      next[k] = arr
    }
  }
  return changed ? next : byNiche
}
