import { inferServiceDuration } from './dateUtils'

function matchesService(a, b) {
  if (!a || !b) return false
  if (a.id && b.id && a.id === b.id) return true
  const nameA = (a.name || '').trim().toLowerCase()
  const nameB = (b.name || '').trim().toLowerCase()
  return Boolean(nameA && nameB && nameA === nameB)
}

/**
 * Returns up to `maxFallback` suggested complementary services (order bumps)
 * for the public booking flow, excluding the selected main service.
 * If the owner marked specific services with `is_addon === true`, returns all of those.
 * Otherwise, auto-suggests up to `maxFallback` shortest/lowest-priced catalog services.
 */
export function getSuggestedAddons(allServices = [], mainServiceObj = null, maxFallback = 4) {
  if (!Array.isArray(allServices) || allServices.length === 0) return []

  const candidates = allServices.filter(s => {
    if (!s || !s.name || !String(s.name).trim()) return false
    if (mainServiceObj && matchesService(s, mainServiceObj)) return false
    return true
  })

  const explicitAddons = candidates.filter(s => Boolean(s.is_addon))
  if (explicitAddons.length > 0) {
    return explicitAddons
  }

  return [...candidates]
    .sort((a, b) => {
      const durA = Number(a.duration_min) || inferServiceDuration(a)
      const durB = Number(b.duration_min) || inferServiceDuration(b)
      if (durA !== durB) return durA - durB
      return (Number(a.price_usd) || 0) - (Number(b.price_usd) || 0)
    })
    .slice(0, maxFallback)
}

/**
 * Combines the main selected service and selected add-on services into a deduplicated list,
 * summing total duration (minutes) and total price.
 */
export function computeBookingTotals(mainServiceObj = null, selectedAddonObjs = []) {
  const rawList = [mainServiceObj, ...(Array.isArray(selectedAddonObjs) ? selectedAddonObjs : [])].filter(Boolean)
  const items = []
  const seenKeys = new Set()

  for (const s of rawList) {
    if (!s || !s.name) continue
    const keyId = s.id ? `id:${s.id}` : ''
    const keyName = `name:${String(s.name).trim().toLowerCase()}`
    if ((keyId && seenKeys.has(keyId)) || seenKeys.has(keyName)) continue
    if (keyId) seenKeys.add(keyId)
    seenKeys.add(keyName)

    items.push({
      id: s.id || s.name,
      name: s.name,
      price_usd: Number(s.price_usd) || 0,
      duration_min: Number(s.duration_min) || inferServiceDuration(s)
    })
  }

  const combinedServiceName = items.map(i => i.name).join(' + ')
  const totalDuration = items.length > 0 ? items.reduce((sum, i) => sum + i.duration_min, 0) : 30
  const totalPriceUsd = Math.round(items.reduce((sum, i) => sum + i.price_usd, 0) * 100) / 100

  return {
    items,
    combinedServiceName,
    totalDuration,
    totalPriceUsd
  }
}

/**
 * Calculates Argentina-only credit card percentage surcharge without inflating
 * barber or cashier commissions (which remain based on baseSubtotalUSD).
 */
export function calculateCreditCardSurcharge({
  isAr = false,
  creditSurchargePct = 0,
  paymentMethod = '',
  cardType = 'debito',
  baseSubtotalUSD = 0,
  tipUSD = 0,
  splitMethod1 = '',
  splitMethod2 = '',
  split1BaseUSD = 0
} = {}) {
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
  const pct = isAr ? Math.max(0, Number(creditSurchargePct) || 0) : 0
  const cleanSub = Math.max(0, Number(baseSubtotalUSD) || 0)
  const cleanTip = Math.max(0, Number(tipUSD) || 0)
  const baseGrandTotalUSD = round2(cleanSub + cleanTip)

  let cardSurchargeUSD = 0
  let effectiveMethod = paymentMethod
  let cardTypeSaved = null
  let split1ChargedUSD = 0
  let split2BaseUSD = 0
  let split2ChargedUSD = 0

  if (paymentMethod === 'punto_de_venta') {
    if (isAr && cardType === 'credito') {
      cardSurchargeUSD = pct > 0 ? round2(cleanSub * (pct / 100)) : 0
      effectiveMethod = 'tarjeta_credito'
      cardTypeSaved = 'credito'
    } else {
      effectiveMethod = 'punto_de_venta'
      cardTypeSaved = isAr ? 'debito' : null
    }
  } else if (paymentMethod === 'mixto') {
    const s1Base = Math.max(0, Number(split1BaseUSD) || 0)
    const s2Base = Math.max(0, round2(baseGrandTotalUSD - s1Base))
    split2BaseUSD = s2Base
    effectiveMethod = 'mixto'

    if (isAr && splitMethod1 === 'tarjeta_credito' && splitMethod2 !== 'tarjeta_credito') {
      cardSurchargeUSD = (pct > 0 && s1Base > 0) ? round2(s1Base * (pct / 100)) : 0
      split1ChargedUSD = round2(s1Base + cardSurchargeUSD)
      split2ChargedUSD = s2Base
      cardTypeSaved = 'credito'
    } else if (isAr && splitMethod2 === 'tarjeta_credito' && splitMethod1 !== 'tarjeta_credito') {
      cardSurchargeUSD = (pct > 0 && s2Base > 0) ? round2(s2Base * (pct / 100)) : 0
      split1ChargedUSD = round2(s1Base)
      split2ChargedUSD = round2(s2Base + cardSurchargeUSD)
      cardTypeSaved = 'credito'
    } else {
      split1ChargedUSD = round2(s1Base)
      split2ChargedUSD = s2Base
    }
  }

  const totalUSD = round2(cleanSub + cardSurchargeUSD)
  const grandTotalUSD = round2(totalUSD + cleanTip)

  return {
    cardSurchargeUSD,
    cardSurchargePct: cardSurchargeUSD > 0 ? pct : 0,
    baseSubtotalUSD: round2(cleanSub),
    baseGrandTotalUSD,
    totalUSD,
    grandTotalUSD,
    effectiveMethod,
    cardTypeSaved,
    split1ChargedUSD,
    split2BaseUSD,
    split2ChargedUSD
  }
}
