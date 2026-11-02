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
