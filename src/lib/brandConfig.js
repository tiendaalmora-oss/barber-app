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

/**
 * Detects active country ('VE' | 'AR').
 * Priority:
 * 1. Explicit URL query param (?pais=ar | ?country=ar | ?pais=ve | ?country=ve) -> persisted to localStorage
 * 2. Subdomain / hostname (ar.barber..., barber-ar..., ar.glamos..., glamos-ar..., .ar., argentina)
 * 3. Active Tenant or Business Profile country property
 * 4. Persisted localStorage preference ('barber_preferred_country')
 * 5. Fallback: 'VE' (zero disruption to existing Venezuelan tenants)
 */
export function getActiveCountry(activeTenant = null, businessProfile = null) {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search)
      const paramCountry = (params.get('pais') || params.get('country') || '').trim().toLowerCase()
      if (paramCountry === 'ar' || paramCountry === 'argentina') {
        localStorage.setItem('barber_preferred_country', 'AR')
        return 'AR'
      }
      if (paramCountry === 've' || paramCountry === 'venezuela') {
        localStorage.setItem('barber_preferred_country', 'VE')
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
    } catch (e) {}
  }

  const tenantCountry = (activeTenant?.country || businessProfile?.country || '').toUpperCase()
  if (tenantCountry === 'AR') return 'AR'
  if (tenantCountry === 'VE') return 'VE'

  if (typeof window !== 'undefined') {
    try {
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
