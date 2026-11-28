// Dynamic Brand Multi-Tenant Engine for BarberOS and GlamOS
export const BRAND_CONFIGS = {
  barber: {
    id: 'barberia_saas',
    code: 'barber',
    name: 'BarberOS',
    heroTitle: 'BarberOS',
    heroSubtitle: 'Sistema de Gestión, Caja y Agenda para Barberías & Salones',
    domain: 'barber.ingenioos.online',
    defaultNiche: 'barberia',
    accentColor: 'gold', // Tailwind gold palette
    primaryHex: '#f59e0b',
    primaryTextColor: 'text-gold-400',
    primaryBgColor: 'bg-gold-500',
    primaryHoverColor: 'hover:bg-gold-400',
    primaryBorderColor: 'border-gold-500',
    bannerGradient: 'from-amber-950/70 via-dark-900 to-purple-950/70',
    bannerBorder: 'border-amber-500/30',
    brandBadge: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
    iconType: 'Scissors',
    terms: {
      businessLabel: 'Nombre de tu Barbería / Salón',
      businessPlaceholder: 'Ej. Barbería Imperio',
      roleLabel: 'Barbero',
      rolePlural: 'Barberos',
      serviceUnit: 'Corte',
      demoBusiness: 'Barbería & Studio Imperial'
    },
    waSignature: 'BarberOS • Ingenio Digital',
    trialBannerText: '⚡ Acceso de Prueba BarberOS (24h)'
  },
  glamos: {
    id: 'glamos_saas',
    code: 'glamos',
    name: 'GlamOS',
    heroTitle: 'GlamOS',
    heroSubtitle: 'Sistema de Citas, Caja y Comisiones para Salones de Belleza, Uñas & Spas',
    domain: 'glamos.ingenioos.online',
    defaultNiche: 'estetica',
    accentColor: 'pink', // Tailwind pink/rose luxury palette
    primaryHex: '#ec4899',
    primaryTextColor: 'text-pink-400',
    primaryBgColor: 'bg-gradient-to-r from-pink-500 to-rose-500',
    primaryHoverColor: 'hover:from-pink-400 hover:to-rose-400',
    primaryBorderColor: 'border-pink-500',
    bannerGradient: 'from-pink-950/70 via-dark-900 to-purple-950/70',
    bannerBorder: 'border-pink-500/30',
    brandBadge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    iconType: 'Sparkles',
    terms: {
      businessLabel: 'Nombre de tu Salón / Estudio de Uñas / Spa',
      businessPlaceholder: 'Ej. Glamour Studio & Spa',
      roleLabel: 'Especialista',
      rolePlural: 'Especialistas',
      serviceUnit: 'Atención',
      demoBusiness: 'Glamour Salon & Nail Spa'
    },
    waSignature: 'GlamOS • Belleza & Estética',
    trialBannerText: '✨ Acceso de Prueba GlamOS (24h)'
  }
}

/**
 * Detects whether the current session is GlamOS or BarberOS.
 * Priority:
 * 1. Explicit query parameter (?brand=glamos or ?app=glamos)
 * 2. Active Tenant saasProduct or niche (if tenant belongs to glamos/estetica)
 * 3. Subdomain / Hostname detection (e.g. glamos.ingenioos.online, glam.ingenioos.online)
 * 4. Fallback: 'barber'
 */
export function getActiveBrand(activeTenant = null) {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const brandParam = params.get('brand') || params.get('app')
    if (brandParam) {
      const lower = brandParam.toLowerCase()
      if (lower.includes('glam')) return BRAND_CONFIGS.glamos
      if (lower.includes('barber')) return BRAND_CONFIGS.barber
    }

    const host = window.location.hostname.toLowerCase()
    if (host.includes('glam')) {
      return BRAND_CONFIGS.glamos
    }
  }

  if (activeTenant) {
    if (activeTenant.saasProduct === 'glamos_saas' || activeTenant.niche === 'estetica') {
      return BRAND_CONFIGS.glamos
    }
  }

  return BRAND_CONFIGS.barber
}

// Multi-Country Engine: Venezuela (VE) & Argentina (AR)
export const COUNTRY_CONFIGS = {
  VE: {
    code: 'VE',
    name: 'Venezuela',
    flag: '🇻🇪',
    currencyCode: 'USD',
    currencySymbol: '$',
    secondaryCurrency: 'Bs',
    hasExchangeRate: true,
    phonePrefix: '58',
    locale: 'es-VE'
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    currencyCode: 'ARS',
    currencySymbol: '$',
    secondaryCurrency: null,
    hasExchangeRate: false,
    phonePrefix: '54',
    locale: 'es-AR'
  }
}

export function normalizeCountryCode(raw) {
  if (!raw || typeof raw !== 'string') return null
  const upper = raw.trim().toUpperCase()
  if (upper === 'AR' || upper === 'ARGENTINA') return 'AR'
  if (upper === 'VE' || upper === 'VENEZUELA') return 'VE'
  return null
}

/**
 * Authoritative country resolution for an authenticated tenant or business profile.
 * Never reads URL query params or localStorage so accounts never cross-contaminate.
 */
export function resolveTenantCountry(activeTenant = null, businessProfile = null) {
  return (
    normalizeCountryCode(activeTenant?.country) ||
    normalizeCountryCode(businessProfile?.country) ||
    'VE'
  )
}

/**
 * Detects active country ('VE' | 'AR').
 * Strictly separates Context A (authenticated tenant / businessProfile) from Context B (pre-auth landing/login/register):
 * - Context A: Tenant/businessProfile always wins and falls back to 'VE' (never poisoned by URL ?pais=ar or localStorage).
 * - Context B (no tenant or businessProfile): Reads URL (?pais=ar), hostname (ar.), and localStorage ('barber_preferred_country').
 */
export function getActiveCountry(activeTenant = null, businessProfile = null) {
  // 1. Authoritative explicit country on activeTenant or businessProfile
  const explicitTenantCountry = normalizeCountryCode(activeTenant?.country)
  if (explicitTenantCountry) return explicitTenantCountry

  const explicitProfileCountry = normalizeCountryCode(businessProfile?.country)
  if (explicitProfileCountry) return explicitProfileCountry

  // 2. Context A guard: authenticated tenant or loaded business profile without explicit country
  //    MUST default strictly to legacy 'VE' and never read URL params or localStorage.
  const hasTenantContext = Boolean(
    (activeTenant && (activeTenant.id || activeTenant.email || activeTenant.businessName)) ||
    (businessProfile && (businessProfile.businessName || businessProfile.whatsapp || Array.isArray(businessProfile.paymentMethods)))
  )
  if (hasTenantContext) {
    return 'VE'
  }

  // 3. Context B (pre-auth Landing / Register / Login or standalone helper call without tenant context)
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search)
      const isPublicBookingUrl = params.get('reserva') === '1'
      const paramCountry = (params.get('pais') || params.get('country') || '').trim().toLowerCase()
      if (paramCountry === 'ar' || paramCountry === 'argentina') {
        if (!isPublicBookingUrl) {
          localStorage.setItem('barber_preferred_country', 'AR')
        }
        return 'AR'
      }
      if (paramCountry === 've' || paramCountry === 'venezuela') {
        if (!isPublicBookingUrl) {
          localStorage.setItem('barber_preferred_country', 'VE')
        }
        return 'VE'
      }

      const host = window.location.hostname.toLowerCase()
      if (
        host.startsWith('ar.') ||
        host.includes('-ar.') ||
        host.includes('.ar.') ||
        host.includes('argentina')
      ) {
        return 'AR'
      }

      const saved = localStorage.getItem('barber_preferred_country')
      if (saved === 'AR') return 'AR'
    } catch (e) {}
  }

  return 'VE'
}

export function isArgentina(activeTenant = null, businessProfile = null) {
  return getActiveCountry(activeTenant, businessProfile) === 'AR'
}

export function formatCurrency(amount, isAr = false) {
  const num = Number(amount || 0)
  if (isNaN(num)) return isAr ? '0' : '0.00'
  if (isAr) {
    return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  return num.toFixed(2)
}
