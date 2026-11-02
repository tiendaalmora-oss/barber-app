import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import DashboardView from './components/DashboardView'
import CommissionsView from './components/CommissionsView'
import AppointmentsView from './components/AppointmentsView'
import DebtsClientsView from './components/DebtsClientsView'
import InventoryView from './components/InventoryView'
import MonthlyReportView from './components/MonthlyReportView'
import CatalogConfigView from './components/CatalogConfigView'
import PublicBookingView from './components/PublicBookingView'
import RetargetingView from './components/RetargetingView'
import SubscriptionLockView from './components/SubscriptionLockView'
import AuthPortalModal from './components/AuthPortalModal'
import SuperAdminView from './components/SuperAdminView'
import QuickCashModal from './components/QuickCashModal'
import QuickExpenseModal from './components/QuickExpenseModal'
import ExchangeRateModal from './components/ExchangeRateModal'
import WhatsAppCloseModal from './components/WhatsAppCloseModal'
import BusinessSettingsModal from './components/BusinessSettingsModal'
import DailyCloseModal from './components/DailyCloseModal'
import {
  NICHES,
  INITIAL_CLIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUSINESS_PROFILE,
  INITIAL_RETARGETING_CONFIG,
  INITIAL_SAAS_CONFIG,
  INITIAL_SAAS_TENANTS
} from './lib/mockData'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { TrendingUp, Users, Calendar, AlertCircle, Package, BarChart3, Globe, BellRing, Crown, Trash2, Sparkles, Settings, Calculator, WifiOff, ShieldCheck } from 'lucide-react'
import { getLocalDateIso, isDateToday } from './lib/dateUtils'
import { getActiveBrand } from './lib/brandConfig'

export default function App() {
  // Check URL parameters (?reserva=1, ?registro=1, ?login=1) and Domain Isolation
  const searchParams = typeof window !== 'undefined' ? window.location.search : ''
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const isDirectClientLink = searchParams.includes('reserva=1')
  const publicTenantParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('b') : null
  const [publicTenantWs, setPublicTenantWs] = useState(null)

  useEffect(() => {
    if (!publicTenantParam) return
    // 1. Try local cache
    try {
      const localScoped = localStorage.getItem(`barber_ws_${publicTenantParam}`)
      if (localScoped) {
        setPublicTenantWs(JSON.parse(localScoped))
      }
    } catch (e) {}

    // 2. Fetch from VPS server and keep fresh with auto-poll
    const fetchPublicWs = () => {
      fetch(`/api/workspace/${encodeURIComponent(publicTenantParam)}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data && data.workspace) {
            setPublicTenantWs(data.workspace)
          }
        })
        .catch(() => {})
    }

    fetchPublicWs()
    // Check every 10 seconds so slots & BCV rate update in live time
    const pollInterval = setInterval(fetchPublicWs, 10000)
    return () => clearInterval(pollInterval)
  }, [publicTenantParam])
  // Admin ONLY allowed on ingeniodigital.shop domain (or localhost during dev) — completely blocked on barber.ingenioos.online!
  const isAdminDomain = hostname.includes('ingeniodigital.shop') || ((hostname === 'localhost' || hostname === '127.0.0.1') && searchParams.includes('admin=1'))
  const isDirectRegisterLink = searchParams.includes('registro=1')
  const isDirectLoginLink = searchParams.includes('login=1')

  // Clean URL query parameters (?registro=1, ?login=1) so refreshes don't re-trigger registration
  const cleanUrlAuthParams = () => {
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      try {
        const url = new URL(window.location.href)
        if (url.searchParams.has('registro') || url.searchParams.has('login')) {
          url.searchParams.delete('registro')
          url.searchParams.delete('login')
          const cleanSearch = url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''
          window.history.replaceState({}, document.title, url.pathname + cleanSearch)
        }
      } catch (e) {}
    }
  }

  // Global state
  const initialBrand = getActiveBrand()
  const [currentNiche, setCurrentNiche] = useState(initialBrand.code === 'glamos' ? 'estetica' : 'barberia')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isPublicPreview, setIsPublicPreview] = useState(isDirectClientLink)
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(isAdminDomain)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('barber_logged_tenant_id')) {
      return false
    }
    return Boolean(isDirectRegisterLink || isDirectLoginLink)
  })
  const [authInitialTab, setAuthInitialTab] = useState(isDirectRegisterLink ? 'register' : 'login')

  // SaaS Multi-Tenant & Subscription State
  const [saasConfig, setSaasConfig] = useState(() => {
    const saved = localStorage.getItem('barber_saas_config_v3')
    return saved ? JSON.parse(saved) : INITIAL_SAAS_CONFIG
  })

  // Tombstones / Blacklist for permanently deleted accounts (guarantees they never resurrect across devices or deploys)
  const [deletedTenantIds, setDeletedTenantIds] = useState(() => {
    try {
      const saved = localStorage.getItem('barber_deleted_tenant_ids')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  const [deletedTenantEmails, setDeletedTenantEmails] = useState(() => {
    try {
      const saved = localStorage.getItem('barber_deleted_tenant_emails')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  const isTenantTombstoned = (t, delIds = deletedTenantIds, delEmails = deletedTenantEmails) => {
    if (!t) return false
    if (delIds.includes(t.id)) return true
    if (t.email && delEmails.includes((t.email || '').toLowerCase().trim())) return true
    return false
  }

  const [tenants, setTenants] = useState(() => {
    // Purge legacy storage key to eliminate ancient ghost accounts
    try {
      localStorage.removeItem('barber_saas_tenants')
    } catch (e) {}

    const savedDelIds = (() => {
      try {
        const raw = localStorage.getItem('barber_deleted_tenant_ids')
        return raw ? JSON.parse(raw) : []
      } catch (e) { return [] }
    })()
    const savedDelEmails = (() => {
      try {
        const raw = localStorage.getItem('barber_deleted_tenant_emails')
        return raw ? JSON.parse(raw) : []
      } catch (e) { return [] }
    })()

    const savedV2 = localStorage.getItem('barber_saas_tenants_v2')
    if (savedV2) {
      try {
        const parsed = JSON.parse(savedV2)
        if (Array.isArray(parsed)) {
          return parsed.filter(
            t => !savedDelIds.includes(t.id) && (!t.email || !savedDelEmails.includes((t.email || '').toLowerCase().trim()))
          )
        }
      } catch (e) {}
    }

    return INITIAL_SAAS_TENANTS
  })

  // Strictly persistent active tenant: never loses session on reload!
  const [activeTenantId, setActiveTenantId] = useState(() => {
    return localStorage.getItem('barber_logged_tenant_id') || null
  })

  const [cachedActiveTenant, setCachedActiveTenant] = useState(() => {
    try {
      const raw = localStorage.getItem('barber_logged_tenant')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  })

  const activeTenant = tenants.find(t => t.id === activeTenantId) || (cachedActiveTenant && cachedActiveTenant.id === activeTenantId ? cachedActiveTenant : null)

  // Scoped workspace helper: reads isolated data for active tenant if available
  const getInitialWorkspace = () => {
    try {
      const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
      if (loggedId) {
        const scoped = localStorage.getItem(`barber_ws_${loggedId}`)
        if (scoped) return JSON.parse(scoped)
      }
    } catch (e) {}
    return null
  }
  const initWs = getInitialWorkspace()

  // Local-first persistent state (reads from scoped tenant workspace if present)
  const [exchangeRate, setExchangeRate] = useState(() => {
    if (initWs && initWs.exchangeRate && !isNaN(Number(initWs.exchangeRate))) {
      return Number(initWs.exchangeRate)
    }
    const saved = localStorage.getItem('barber_rate')
    return saved ? parseFloat(saved) : 889.26
  })

  // Editable Staff, Services, and Products per Niche
  const [staffByNiche, setStaffByNiche] = useState(() => {
    const saved = localStorage.getItem('barber_staff_by_niche')
    return saved ? JSON.parse(saved) : {
      barberia: NICHES.barberia.staff,
      estetica: NICHES.estetica.staff,
      mixto: NICHES.mixto.staff
    }
  })

  const [servicesByNiche, setServicesByNiche] = useState(() => {
    const saved = localStorage.getItem('barber_services_by_niche')
    return saved ? JSON.parse(saved) : {
      barberia: NICHES.barberia.services,
      estetica: NICHES.estetica.services,
      mixto: NICHES.mixto.services
    }
  })

  const [productsByNiche, setProductsByNiche] = useState(() => {
    const saved = localStorage.getItem('barber_products_by_niche')
    return saved ? JSON.parse(saved) : {
      barberia: NICHES.barberia.products,
      estetica: NICHES.estetica.products,
      mixto: NICHES.mixto.products
    }
  })

  const [transactions, setTransactions] = useState(() => {
    const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
    const isDemo = loggedId === 'ten_1'
    if (isDemo && (!initWs || !Array.isArray(initWs.transactions) || initWs.transactions.length < 15)) {
      return INITIAL_TRANSACTIONS
    }
    if (initWs && Array.isArray(initWs.transactions)) return initWs.transactions
    const saved = localStorage.getItem('barber_transactions')
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS
  })

  const [clients, setClients] = useState(() => {
    const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
    const isDemo = loggedId === 'ten_1'
    if (isDemo && (!initWs || !Array.isArray(initWs.clients) || initWs.clients.length === 0)) {
      return INITIAL_CLIENTS
    }
    if (initWs && Array.isArray(initWs.clients)) return initWs.clients
    const saved = localStorage.getItem('barber_clients_v2')
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS
  })

  const [appointments, setAppointments] = useState(() => {
    const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
    const isDemo = loggedId === 'ten_1'
    if (isDemo && (!initWs || !Array.isArray(initWs.appointments) || initWs.appointments.length === 0)) {
      return INITIAL_APPOINTMENTS
    }
    if (initWs && Array.isArray(initWs.appointments)) return initWs.appointments
    const saved = localStorage.getItem('barber_appointments')
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS
  })

  const [businessProfile, setBusinessProfile] = useState(() => {
    if (initWs && initWs.businessProfile) return initWs.businessProfile
    const saved = localStorage.getItem('barber_profile')
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_PROFILE
  })

  const [retargetingConfig, setRetargetingConfig] = useState(() => {
    const saved = localStorage.getItem('barber_retargeting_config')
    return saved ? JSON.parse(saved) : INITIAL_RETARGETING_CONFIG
  })

  // Modals
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)
  const [cashModalPrefill, setCashModalPrefill] = useState(null)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isDailyCloseModalOpen, setIsDailyCloseModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState('local')
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false)
  const [offlineToast, setOfflineToast] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())

  // Heartbeat timer to monitor 24-hour trial expiration in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now())
    }, 20000)
    return () => clearInterval(timer)
  }, [])

  // Listen for Network Status (Online / Offline)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnectedBanner(true)
      setTimeout(() => setShowReconnectedBanner(false), 4500)
      fetchServerBootstrap()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnectedBanner(false)
      setOfflineToast('📴 Pasaste a Modo Sin Internet. Todo se seguirá guardando en tu teléfono.')
      setTimeout(() => setOfflineToast(null), 4000)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Current dynamic niche data combining metadata + editable staff/services/products
  const baseNiche = NICHES[currentNiche] || NICHES.barberia
  const currentStaff = staffByNiche[currentNiche] || []
  const currentServices = servicesByNiche[currentNiche] || []
  const currentProducts = productsByNiche[currentNiche] || []

  const nicheData = {
    ...baseNiche,
    staff: currentStaff,
    services: currentServices,
    products: currentProducts
  }

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('barber_rate', exchangeRate.toString())
  }, [exchangeRate])

  useEffect(() => {
    localStorage.setItem('barber_staff_by_niche', JSON.stringify(staffByNiche))
  }, [staffByNiche])

  useEffect(() => {
    localStorage.setItem('barber_services_by_niche', JSON.stringify(servicesByNiche))
  }, [servicesByNiche])

  useEffect(() => {
    localStorage.setItem('barber_products_by_niche', JSON.stringify(productsByNiche))
  }, [productsByNiche])

  // Automatic Scoped Workspace Persistence (LocalStorage + VPS Server)
  useEffect(() => {
    if (!activeTenantId) return
    const ws = {
      transactions,
      clients,
      appointments,
      businessProfile,
      staffByNiche,
      servicesByNiche,
      productsByNiche,
      exchangeRate
    }
    // 1. Save in local browser storage isolated for this tenant
    try {
      localStorage.setItem(`barber_ws_${activeTenantId}`, JSON.stringify(ws))
      // 2. Backward compatibility with legacy global keys
      localStorage.setItem('barber_transactions', JSON.stringify(transactions))
      localStorage.setItem('barber_clients_v2', JSON.stringify(clients))
      localStorage.setItem('barber_appointments', JSON.stringify(appointments))
      localStorage.setItem('barber_profile', JSON.stringify(businessProfile))
      localStorage.setItem('barber_rate', exchangeRate.toString())
    } catch (storageErr) {
      console.warn('Storage quota warning, continuing with in-memory state:', storageErr)
    }

    // 3. Debounced sync to VPS backend
    const timeout = setTimeout(async () => {
      try {
        await fetch(`/api/workspace/${encodeURIComponent(activeTenantId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ws)
        })
      } catch (err) {
        // Offline
      }
    }, 1200)

    return () => clearTimeout(timeout)
  }, [activeTenantId, transactions, clients, appointments, businessProfile, staffByNiche, servicesByNiche, productsByNiche, exchangeRate])

  // Real-time auto-sync for active barber: polls for new web bookings without overwriting local changes
  useEffect(() => {
    if (!activeTenantId || isPublicPreview) return
    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/workspace/${encodeURIComponent(activeTenantId)}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data && data.workspace && Array.isArray(data.workspace.appointments)) {
            const serverApts = data.workspace.appointments
            setAppointments(prev => {
              const prevIds = new Set((prev || []).map(a => a.id))
              const newIncoming = serverApts.filter(a => !prevIds.has(a.id))
              if (newIncoming.length > 0) {
                return [...newIncoming, ...prev]
              }
              return prev
            })
          }
        }
      } catch (e) {}
    }, 12000)

    return () => clearInterval(pollTimer)
  }, [activeTenantId, isPublicPreview])

  useEffect(() => {
    localStorage.setItem('barber_retargeting_config', JSON.stringify(retargetingConfig))
  }, [retargetingConfig])

  useEffect(() => {
    localStorage.setItem('barber_saas_config_v3', JSON.stringify(saasConfig))
  }, [saasConfig])

  useEffect(() => {
    localStorage.setItem('barber_saas_tenants_v2', JSON.stringify(tenants))
  }, [tenants])

  useEffect(() => {
    localStorage.setItem('barber_deleted_tenant_ids', JSON.stringify(deletedTenantIds))
  }, [deletedTenantIds])

  useEffect(() => {
    localStorage.setItem('barber_deleted_tenant_emails', JSON.stringify(deletedTenantEmails))
  }, [deletedTenantEmails])

  useEffect(() => {
    if (activeTenantId) {
      localStorage.setItem('barber_logged_tenant_id', activeTenantId)
      cleanUrlAuthParams()
    } else {
      localStorage.removeItem('barber_logged_tenant_id')
      localStorage.removeItem('barber_logged_tenant')
    }
  }, [activeTenantId])

  useEffect(() => {
    if (activeTenant) {
      localStorage.setItem('barber_logged_tenant', JSON.stringify(activeTenant))
    }
  }, [activeTenant])

  // Dynamic Page Title & PWA App Name based on active brand (GlamOS vs BarberOS)
  useEffect(() => {
    const brand = getActiveBrand(activeTenant)
    document.title = `${brand.name} · ${brand.code === 'glamos' ? 'Salones de Belleza, Uñas & Spas' : 'Control Financiero & Caja'}`

    const appNameMeta = document.querySelector('meta[name="application-name"]')
    if (appNameMeta) appNameMeta.setAttribute('content', brand.name)
    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (appleTitleMeta) appleTitleMeta.setAttribute('content', brand.name)
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) themeColorMeta.setAttribute('content', brand.code === 'glamos' ? '#ec4899' : '#090a0d')
  }, [activeTenant])

  // Handle auto-expiration of 24h trial cleanly via effect
  useEffect(() => {
    if (activeTenant && activeTenant.isTrial24h && activeTenant.trialExpiresAt && activeTenant.status === 'activo') {
      const isExpired = new Date(activeTenant.trialExpiresAt).getTime() <= Date.now()
      if (isExpired) {
        const expiredTenant = {
          ...activeTenant,
          status: 'vencido',
          isTrial24h: false,
          daysRemaining: 0,
          wasTrial: true
        }
        setTenants(prev => prev.map(t => t.id === activeTenant.id ? expiredTenant : t))
        setCachedActiveTenant(expiredTenant)
        pushTenantUpsertToServer(expiredTenant)
      }
    }
  }, [nowTick, activeTenant?.id, activeTenant?.status, activeTenant?.trialExpiresAt])

  // --- REAL-TIME MULTI-DEVICE SERVER SYNC (Phone <-> PC) WITH TOMBSTONE PROTECTION ---
  const fetchServerBootstrap = async () => {
    try {
      const res = await fetch('/api/bootstrap', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()

        let nextDelIds = deletedTenantIds
        let nextDelEmails = deletedTenantEmails

        if (Array.isArray(data.deletedTenantIds) && data.deletedTenantIds.length > 0) {
          const merged = Array.from(new Set([...deletedTenantIds, ...data.deletedTenantIds]))
          if (merged.length !== deletedTenantIds.length) {
            nextDelIds = merged
            setDeletedTenantIds(merged)
            localStorage.setItem('barber_deleted_tenant_ids', JSON.stringify(merged))
          }
        }

        if (Array.isArray(data.deletedTenantEmails) && data.deletedTenantEmails.length > 0) {
          const mergedEmails = Array.from(
            new Set([...deletedTenantEmails, ...data.deletedTenantEmails.map(e => (e || '').toLowerCase().trim())])
          )
          if (mergedEmails.length !== deletedTenantEmails.length) {
            nextDelEmails = mergedEmails
            setDeletedTenantEmails(mergedEmails)
            localStorage.setItem('barber_deleted_tenant_emails', JSON.stringify(mergedEmails))
          }
        }

        if (Array.isArray(data.tenants)) {
          // Strictly prune against all server & local tombstones
          const cleanTenants = data.tenants.filter(
            t => !nextDelIds.includes(t.id) && (!t.email || !nextDelEmails.includes((t.email || '').toLowerCase().trim()))
          )
          setTenants(cleanTenants)
          localStorage.setItem('barber_saas_tenants_v2', JSON.stringify(cleanTenants))

          // Clean scoped local workspace storage for any tombstoned accounts
          nextDelIds.forEach(id => {
            try { localStorage.removeItem(`barber_ws_${id}`) } catch (e) {}
          })
        }
        if (data.saasConfig) {
          setSaasConfig(data.saasConfig)
        }
      }
    } catch (e) {
      // Offline fallback uses local state
    }
  }

  useEffect(() => {
    // 1. Upload any existing local accounts from this browser (phone or PC) to server DB so nothing is lost,
    // exchanging tombstones so deleted accounts NEVER resurrect across devices or deploys.
    const syncInitial = async () => {
      try {
        const cleanLocalTenants = tenants.filter(t => !isTenantTombstoned(t))
        const res = await fetch('/api/tenants/sync-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenants: cleanLocalTenants,
            deletedTenantIds,
            deletedTenantEmails
          })
        })
        if (res.ok) {
          const data = await res.json()
          let nextDelIds = deletedTenantIds
          let nextDelEmails = deletedTenantEmails

          if (Array.isArray(data.deletedTenantIds)) {
            nextDelIds = Array.from(new Set([...deletedTenantIds, ...data.deletedTenantIds]))
            setDeletedTenantIds(nextDelIds)
            localStorage.setItem('barber_deleted_tenant_ids', JSON.stringify(nextDelIds))
          }
          if (Array.isArray(data.deletedTenantEmails)) {
            nextDelEmails = Array.from(
              new Set([...deletedTenantEmails, ...data.deletedTenantEmails.map(e => (e || '').toLowerCase().trim())])
            )
            setDeletedTenantEmails(nextDelEmails)
            localStorage.setItem('barber_deleted_tenant_emails', JSON.stringify(nextDelEmails))
          }

          if (Array.isArray(data.tenants)) {
            const cleanServerTenants = data.tenants.filter(
              t => !nextDelIds.includes(t.id) && (!t.email || !nextDelEmails.includes((t.email || '').toLowerCase().trim()))
            )
            setTenants(cleanServerTenants)
            localStorage.setItem('barber_saas_tenants_v2', JSON.stringify(cleanServerTenants))
          }
          if (data.saasConfig) setSaasConfig(data.saasConfig)
        }
      } catch (e) {
        fetchServerBootstrap()
      }
    }
    syncInitial()

    // 2. Poll every 3 seconds only if device is online
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      fetchServerBootstrap()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const pushTenantUpsertToServer = async (tenantObj, isNew = false) => {
    try {
      const res = await fetch('/api/tenants/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant: tenantObj, isNewRegistration: isNew })
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.tenants)) {
          const cleanTenants = data.tenants.filter(t => !isTenantTombstoned(t))
          setTenants(cleanTenants)
          localStorage.setItem('barber_saas_tenants_v2', JSON.stringify(cleanTenants))
        }
      }
    } catch (e) {
      console.warn('Offline tenant upsert')
    }
  }

  const pushConfigToServer = async (newCfg) => {
    setSaasConfig(newCfg)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg)
      })
    } catch (e) {
      console.warn('Offline config save')
    }
  }

  // Clean workspace vs Load Demo workspace
  const handleClearAllWorkspaceData = () => {
    setTransactions([])
    setClients([])
    setAppointments([])
  }

  const handleLoadDemoWorkspaceData = () => {
    setTransactions(INITIAL_TRANSACTIONS)
    setClients(INITIAL_CLIENTS)
    setAppointments(INITIAL_APPOINTMENTS)
    setBusinessProfile(INITIAL_BUSINESS_PROFILE)
    setStaffByNiche({
      barberia: NICHES.barberia.staff,
      estetica: NICHES.estetica.staff,
      mixto: NICHES.mixto.staff
    })
    setServicesByNiche({
      barberia: NICHES.barberia.services,
      estetica: NICHES.estetica.services,
      mixto: NICHES.mixto.services
    })
    setProductsByNiche({
      barberia: NICHES.barberia.products,
      estetica: NICHES.estetica.products,
      mixto: NICHES.mixto.products
    })
    const ws = {
      transactions: INITIAL_TRANSACTIONS,
      clients: INITIAL_CLIENTS,
      appointments: INITIAL_APPOINTMENTS,
      businessProfile: INITIAL_BUSINESS_PROFILE,
      staffByNiche: {
        barberia: NICHES.barberia.staff,
        estetica: NICHES.estetica.staff,
        mixto: NICHES.mixto.staff
      },
      servicesByNiche: {
        barberia: NICHES.barberia.services,
        estetica: NICHES.estetica.services,
        mixto: NICHES.mixto.services
      },
      productsByNiche: {
        barberia: NICHES.barberia.products,
        estetica: NICHES.estetica.products,
        mixto: NICHES.mixto.products
      }
    }
    try {
      localStorage.setItem('barber_ws_ten_1', JSON.stringify(ws))
      localStorage.setItem('barber_transactions', JSON.stringify(INITIAL_TRANSACTIONS))
      localStorage.setItem('barber_clients_v2', JSON.stringify(INITIAL_CLIENTS))
      localStorage.setItem('barber_appointments', JSON.stringify(INITIAL_APPOINTMENTS))
      localStorage.setItem('barber_profile', JSON.stringify(INITIAL_BUSINESS_PROFILE))
    } catch (e) {}
  }

  // Staff CRUD
  const handleAddStaff = (newSt) => {
    setStaffByNiche(prev => ({
      ...prev,
      [currentNiche]: [...(prev[currentNiche] || []), newSt]
    }))
  }

  const handleUpdateStaff = (updatedSt) => {
    setStaffByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).map(s => s.id === updatedSt.id ? updatedSt : s)
    }))
  }

  const handleDeleteStaff = (id) => {
    setStaffByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).filter(s => s.id !== id)
    }))
  }

  // Services CRUD
  const handleAddService = (newSvc) => {
    setServicesByNiche(prev => ({
      ...prev,
      [currentNiche]: [newSvc, ...(prev[currentNiche] || [])]
    }))
  }

  const handleUpdateService = (updatedSvc) => {
    setServicesByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).map(s => s.id === updatedSvc.id ? updatedSvc : s)
    }))
  }

  const handleDeleteService = (id) => {
    setServicesByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).filter(s => s.id !== id)
    }))
  }

  // Products CRUD
  const handleAddProduct = (newProd) => {
    setProductsByNiche(prev => ({
      ...prev,
      [currentNiche]: [newProd, ...(prev[currentNiche] || [])]
    }))
  }

  const handleUpdateProduct = (updatedProd) => {
    setProductsByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).map(p => p.id === updatedProd.id ? updatedProd : p)
    }))
  }

  const handleDeleteProduct = (id) => {
    setProductsByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).filter(p => p.id !== id)
    }))
  }

  const fetchTenantWorkspace = async (tid) => {
    if (!tid) return
    try {
      const res = await fetch(`/api/workspace/${encodeURIComponent(tid)}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.workspace) {
          const ws = data.workspace
          if (Array.isArray(ws.transactions)) setTransactions(ws.transactions)
          if (Array.isArray(ws.clients)) setClients(ws.clients)
          if (Array.isArray(ws.appointments)) setAppointments(ws.appointments)
          if (ws.businessProfile) setBusinessProfile(prev => ({ ...prev, ...ws.businessProfile }))
          if (ws.staffByNiche) setStaffByNiche(ws.staffByNiche)
          if (ws.servicesByNiche) setServicesByNiche(ws.servicesByNiche)
          if (ws.productsByNiche) setProductsByNiche(ws.productsByNiche)
          if (ws.exchangeRate && !isNaN(Number(ws.exchangeRate))) {
            setExchangeRate(Number(ws.exchangeRate))
            localStorage.setItem('barber_rate', String(ws.exchangeRate))
          }
          try {
            localStorage.setItem(`barber_ws_${tid}`, JSON.stringify(ws))
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Workspace server load offline')
    }
  }

  // Handlers for SaaS Tenants
  const handleSelectTenant = (tenant) => {
    setActiveTenantId(tenant.id)
    setCachedActiveTenant(tenant)
    localStorage.setItem('barber_logged_tenant_id', tenant.id)
    localStorage.setItem('barber_logged_tenant', JSON.stringify(tenant))
    setIsAuthModalOpen(false)
    cleanUrlAuthParams()

    if (tenant.niche && NICHES[tenant.niche]) {
      setCurrentNiche(tenant.niche)
    }

    const isDemo = tenant.email === 'demo@ingenioos.online' || tenant.id === 'ten_1'

    // Load tenant-scoped workspace from localStorage or server (NEVER wipe it!)
    try {
      const localScoped = localStorage.getItem(`barber_ws_${tenant.id}`)
      if (localScoped) {
        const parsed = JSON.parse(localScoped)
        if (isDemo && (!Array.isArray(parsed.transactions) || parsed.transactions.length < 15)) {
          handleLoadDemoWorkspaceData()
        } else {
          if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions)
          if (Array.isArray(parsed.clients)) setClients(parsed.clients)
          if (Array.isArray(parsed.appointments)) setAppointments(parsed.appointments)
          if (parsed.businessProfile) setBusinessProfile(parsed.businessProfile)
          if (parsed.staffByNiche) setStaffByNiche(parsed.staffByNiche)
          if (parsed.servicesByNiche) setServicesByNiche(parsed.servicesByNiche)
          if (parsed.productsByNiche) setProductsByNiche(parsed.productsByNiche)
        }
      } else {
        if (isDemo) {
          handleLoadDemoWorkspaceData()
        } else {
          fetchTenantWorkspace(tenant.id)
          setBusinessProfile(prev => ({
            ...prev,
            businessName: tenant.businessName,
            whatsapp: tenant.phone || prev.whatsapp
          }))
        }
      }
    } catch (e) {
      if (isDemo) {
        handleLoadDemoWorkspaceData()
      } else {
        fetchTenantWorkspace(tenant.id)
      }
    }
  }

  const handleLogout = () => {
    setActiveTenantId(null)
    setCachedActiveTenant(null)
    localStorage.removeItem('barber_logged_tenant_id')
    localStorage.removeItem('barber_logged_tenant')
    setAuthInitialTab('login')
    setIsAuthModalOpen(true)
    cleanUrlAuthParams()
  }

  const handleRegisterNewTenant = async (newTenant) => {
    const cleanEmail = (newTenant.email || '').toLowerCase().trim()

    // Un-blacklist if previously deleted so user can legitimately register again
    const nextDelIds = deletedTenantIds.filter(id => id !== newTenant.id)
    const nextDelEmails = deletedTenantEmails.filter(e => e !== cleanEmail)
    setDeletedTenantIds(nextDelIds)
    setDeletedTenantEmails(nextDelEmails)
    localStorage.setItem('barber_deleted_tenant_ids', JSON.stringify(nextDelIds))
    localStorage.setItem('barber_deleted_tenant_emails', JSON.stringify(nextDelEmails))

    // Brand new account starts clean for this tenantId
    const freshWorkspace = {
      transactions: [],
      clients: [],
      appointments: [],
      businessProfile: {
        ...INITIAL_BUSINESS_PROFILE,
        businessName: newTenant.businessName,
        whatsapp: newTenant.phone || ''
      },
      staffByNiche: {
        barberia: NICHES.barberia.staff,
        estetica: NICHES.estetica.staff,
        mixto: NICHES.mixto.staff
      },
      servicesByNiche: {
        barberia: NICHES.barberia.services,
        estetica: NICHES.estetica.services,
        mixto: NICHES.mixto.services
      },
      productsByNiche: {
        barberia: NICHES.barberia.products,
        estetica: NICHES.estetica.products,
        mixto: NICHES.mixto.products
      }
    }

    try {
      localStorage.setItem(`barber_ws_${newTenant.id}`, JSON.stringify(freshWorkspace))
    } catch (e) {}
    setTransactions([])
    setClients([])
    setAppointments([])
    setBusinessProfile(freshWorkspace.businessProfile)
    if (newTenant.niche && NICHES[newTenant.niche]) {
      setCurrentNiche(newTenant.niche)
    }
    if (freshWorkspace.staffByNiche) setStaffByNiche(freshWorkspace.staffByNiche)
    if (freshWorkspace.servicesByNiche) setServicesByNiche(freshWorkspace.servicesByNiche)
    if (freshWorkspace.productsByNiche) setProductsByNiche(freshWorkspace.productsByNiche)

    setTenants(prev => [newTenant, ...prev.filter(t => t.id !== newTenant.id && (t.email || '').toLowerCase().trim() !== cleanEmail)])
    setActiveTenantId(newTenant.id)
    setCachedActiveTenant(newTenant)
    localStorage.setItem('barber_logged_tenant_id', newTenant.id)
    localStorage.setItem('barber_logged_tenant', JSON.stringify(newTenant))
    setIsAuthModalOpen(false)
    cleanUrlAuthParams()

    await pushTenantUpsertToServer(newTenant, true)
    try {
      await fetch(`/api/workspace/${encodeURIComponent(newTenant.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freshWorkspace)
      })
    } catch (e) {}

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('negocios').insert([{
          nombre: `${newTenant.businessName} (${newTenant.email})`,
          tipo_nicho: newTenant.niche || 'barberia',
          estado_suscripcion: newTenant.status === 'activo' ? 'activo' : 'vencido',
          tasa_bcv_actual: exchangeRate
        }])
      } catch (e) {
        console.warn('Tenant saved on VPS server')
      }
    }
  }

  const handleUpdateTenant = async (updated) => {
    setTenants(prev => prev.map(t => t.id === updated.id ? updated : t))
    await pushTenantUpsertToServer(updated)
  }

  const handleDeleteTenant = async (tenantId) => {
    const targetTenant = tenants.find(t => t.id === tenantId)
    const targetEmail = (targetTenant?.email || '').toLowerCase().trim()

    // Add to tombstones immediately in state and localStorage to prevent any resurrection
    const nextDelIds = Array.from(new Set([...deletedTenantIds, tenantId]))
    const nextDelEmails = targetEmail
      ? Array.from(new Set([...deletedTenantEmails, targetEmail]))
      : deletedTenantEmails
    setDeletedTenantIds(nextDelIds)
    setDeletedTenantEmails(nextDelEmails)
    localStorage.setItem('barber_deleted_tenant_ids', JSON.stringify(nextDelIds))
    localStorage.setItem('barber_deleted_tenant_emails', JSON.stringify(nextDelEmails))

    // Remove from local tenants
    const remaining = tenants.filter(
      t => t.id !== tenantId && (!targetEmail || (t.email || '').toLowerCase().trim() !== targetEmail)
    )
    setTenants(remaining)
    localStorage.setItem('barber_saas_tenants_v2', JSON.stringify(remaining))

    // Remove isolated workspace from localStorage
    try { localStorage.removeItem(`barber_ws_${tenantId}`) } catch (e) {}

    // If currently logged into this tenant, log out cleanly
    if (activeTenantId === tenantId) {
      setActiveTenantId(null)
      setCachedActiveTenant(null)
      localStorage.removeItem('barber_logged_tenant_id')
      localStorage.removeItem('barber_logged_tenant')
    }

    try {
      const res = await fetch('/api/tenants/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tenantId, email: targetEmail })
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.tenants)) {
          const cleanTenants = data.tenants.filter(
            t => !nextDelIds.includes(t.id) && (!t.email || !nextDelEmails.includes((t.email || '').toLowerCase().trim()))
          )
          setTenants(cleanTenants)
          localStorage.setItem('barber_saas_tenants_v2', JSON.stringify(cleanTenants))
        }
      }
    } catch (e) {
      console.warn('Offline delete registered in local blacklist')
    }
  }

  const handlePurgeTestAccounts = async (specificIds = null) => {
    try {
      const res = await fetch('/api/tenants/purge-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPin: saasConfig?.adminPin || '2026',
          tenantIds: specificIds
        })
      })
      if (res.ok) {
        const data = await res.json()
        let nextDelIds = deletedTenantIds
        let nextDelEmails = deletedTenantEmails

        if (Array.isArray(data.deletedTenantIds)) {
          nextDelIds = Array.from(new Set([...deletedTenantIds, ...data.deletedTenantIds]))
          setDeletedTenantIds(nextDelIds)
          localStorage.setItem('barber_deleted_tenant_ids', JSON.stringify(nextDelIds))
        }
        if (Array.isArray(data.deletedTenantEmails)) {
          nextDelEmails = Array.from(
            new Set([...deletedTenantEmails, ...data.deletedTenantEmails.map(e => (e || '').toLowerCase().trim())])
          )
          setDeletedTenantEmails(nextDelEmails)
          localStorage.setItem('barber_deleted_tenant_emails', JSON.stringify(nextDelEmails))
        }
        if (Array.isArray(data.tenants)) {
          const cleanTenants = data.tenants.filter(
            t => !nextDelIds.includes(t.id) && (!t.email || !nextDelEmails.includes((t.email || '').toLowerCase().trim()))
          )
          setTenants(cleanTenants)
          localStorage.setItem('barber_saas_tenants_v2', JSON.stringify(cleanTenants))
        }

        // Clean workspaces
        nextDelIds.forEach(id => {
          try { localStorage.removeItem(`barber_ws_${id}`) } catch (e) {}
        })

        return { ok: true, count: data.purgedCount || 0 }
      }
    } catch (e) {
      console.warn('Purge test accounts offline fallback', e)
    }

    // Local fallback
    const unshielded = tenants.filter(t => !t.isShielded && t.id !== 'ten_1' && (!specificIds || specificIds.includes(t.id)))
    const idsToPurge = unshielded.map(t => t.id)
    const emailsToPurge = unshielded.map(t => (t.email || '').toLowerCase().trim()).filter(Boolean)

    const nextDelIds = Array.from(new Set([...deletedTenantIds, ...idsToPurge]))
    const nextDelEmails = Array.from(new Set([...deletedTenantEmails, ...emailsToPurge]))

    setDeletedTenantIds(nextDelIds)
    setDeletedTenantEmails(nextDelEmails)
    localStorage.setItem('barber_deleted_tenant_ids', JSON.stringify(nextDelIds))
    localStorage.setItem('barber_deleted_tenant_emails', JSON.stringify(nextDelEmails))

    const remaining = tenants.filter(t => !idsToPurge.includes(t.id))
    setTenants(remaining)
    localStorage.setItem('barber_saas_tenants_v2', JSON.stringify(remaining))

    idsToPurge.forEach(id => {
      try { localStorage.removeItem(`barber_ws_${id}`) } catch (e) {}
    })

    return { ok: true, count: idsToPurge.length }
  }

  const handleClearDemoTenants = () => {
    const demoIds = ['ten_1', 'ten_2', 'ten_3', 'ten_4']
    setTenants(prev => prev.filter(t => !demoIds.includes(t.id) || t.isShielded))
  }

  const handleRestoreDemoTenants = () => {
    setTenants(INITIAL_SAAS_TENANTS)
    setActiveTenantId('ten_1')
  }

  const handleReportPaymentRef = async (tenantId, refString) => {
    const target = tenants.find(t => t.id === tenantId)
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, lastPaymentRef: refString } : t))
    if (target) {
      await pushTenantUpsertToServer({ ...target, lastPaymentRef: refString })
    }
  }

  // Calculate how many clients are due for retargeting (for sidebar badge)
  const overdueClientsCount = clients.filter(c => {
    if (!c.last_visit) return true
    const last = new Date(c.last_visit + 'T00:00:00')
    const days = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
    const cycle = c.cycle_days || retargetingConfig.defaultCycleDays || 15
    return days >= cycle
  }).length

  // Clients CRUD
  const handleAddClient = (newClient) => {
    setClients(prev => [newClient, ...prev])
  }

  const handleUpdateClient = (updatedClient) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c))
  }

  const handleDeleteClient = (clientId) => {
    setClients(prev => prev.filter(c => c.id !== clientId))
  }

  // Appointments CRUD
  const handleAddAppointment = async (newApt) => {
    setAppointments(prev => [newApt, ...prev])

    if (newApt.client_name && newApt.client_name !== 'Cliente Mostrador') {
      setClients(prev => {
        const found = prev.find(c => c.name.toLowerCase() === newApt.client_name.toLowerCase())
        if (found) {
          return prev.map(c => c.id === found.id ? {
            ...c,
            phone: newApt.client_phone || c.phone
          } : c)
        } else {
          return [{
            id: 'c_' + Date.now(),
            name: newApt.client_name,
            phone: newApt.client_phone || '+584120000000',
            debt_usd: 0,
            plan: 'Cliente Regular',
            last_visit: new Date().toISOString().split('T')[0],
            last_service: newApt.service,
            last_staff: 'Agenda Web',
            cycle_days: retargetingConfig.defaultCycleDays || 15,
            visits_count: 1
          }, ...prev]
        }
      })
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('citas').insert([{
          cliente_nombre: newApt.client_name,
          servicio_nombre: newApt.service,
          fecha_hora: `${newApt.date}T12:00:00Z`,
          estado: newApt.status || 'pendiente'
        }])
      } catch (e) {
        console.warn('Appointment saved locally')
      }
    }
  }

  const handleToggleAppointmentStatus = (id, forcedStatus = null) => {
    setAppointments(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = forcedStatus || (a.status === 'pendiente' ? 'en_atencion' : a.status === 'en_atencion' ? 'completada' : 'pendiente')
        return { ...a, status: nextStatus }
      }
      return a
    }))
  }

  const handleChargeAppointment = (apt) => {
    setCashModalPrefill({
      appointmentId: apt.id,
      clientName: apt.client_name,
      clientPhone: apt.client_phone || '',
      staffId: apt.staff_id,
      serviceName: apt.service
    })
    setIsCashModalOpen(true)
  }

  const handleDeleteAppointment = (id) => {
    setAppointments(prev => prev.filter(a => a.id !== id))
  }

  // Transactions CRUD
  const handleRegisterTransaction = async (newTx) => {
    setTransactions(prev => [newTx, ...prev])

    // If this transaction came directly from an appointment, mark that appointment completed!
    if (newTx.appointment_id) {
      handleToggleAppointmentStatus(newTx.appointment_id, 'completada')
    }
    setCashModalPrefill(null)

    // If products from inventory were sold, subtract exact quantities from stock
    if (Array.isArray(newTx.product_items) && newTx.product_items.length > 0) {
      setProductsByNiche(prev => ({
        ...prev,
        [currentNiche]: (prev[currentNiche] || []).map(p => {
          const matchedItem = newTx.product_items.find(pi => pi.id === p.id)
          if (matchedItem) {
            const qtySold = Number(matchedItem.qty) || 1
            return { ...p, stock: Math.max(0, (p.stock || 0) - qtySold) }
          }
          return p
        })
      }))
    } else if (newTx.product_id) {
      setProductsByNiche(prev => ({
        ...prev,
        [currentNiche]: (prev[currentNiche] || []).map(p =>
          p.id === newTx.product_id ? { ...p, stock: Math.max(0, (p.stock || 0) - 1) } : p
        )
      }))
    }

    const todayStr = getLocalDateIso()

    if (newTx.client_name && newTx.client_name !== 'Cliente Mostrador') {
      setClients(prev => {
        const found = prev.find(c => c.name.toLowerCase() === newTx.client_name.toLowerCase())
        const addedDebt = newTx.metodo_pago === 'fiado' ? newTx.monto_usd : 0
        if (found) {
          return prev.map(c => c.id === found.id ? {
            ...c,
            phone: newTx.client_phone || c.phone,
            debt_usd: (c.debt_usd || 0) + addedDebt,
            last_visit: todayStr,
            last_service: newTx.item_name,
            last_staff: newTx.staff_name,
            visits_count: (c.visits_count || 0) + 1
          } : c)
        } else {
          return [{
            id: 'c_' + Date.now(),
            name: newTx.client_name,
            phone: newTx.client_phone || '+584120000000',
            debt_usd: addedDebt,
            plan: 'Cliente Regular',
            last_visit: todayStr,
            last_service: newTx.item_name,
            last_staff: newTx.staff_name,
            cycle_days: retargetingConfig.defaultCycleDays || 15,
            visits_count: 1
          }, ...prev]
        }
      })
    }

    // If offline, display reassuring feedback on screen for video / user
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOfflineToast(`✅ Cobro de $${newTx.monto_usd} guardado en el teléfono (Modo Local).`)
      setTimeout(() => setOfflineToast(null), 4000)
    }

    if (typeof navigator !== 'undefined' && navigator.onLine && isSupabaseConfigured()) {
      try {
        setSyncStatus('syncing')
        await supabase.from('transacciones').insert([{
          item_name: newTx.item_name,
          monto_usd: newTx.monto_usd,
          monto_bs: newTx.monto_bs,
          tasa_bcv: newTx.tasa_bcv,
          metodo_pago: newTx.metodo_pago,
          comision_empleado_usd: newTx.comision_usd,
          ganancia_negocio_usd: newTx.ganancia_negocio_usd,
        }])
        setSyncStatus('synced')
      } catch (e) {
        setSyncStatus('local')
      }
    } else {
      setSyncStatus('local')
    }
  }

  const handleRegisterExpense = async (newExpense) => {
    setTransactions(prev => [newExpense, ...prev])

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOfflineToast(`📉 Gasto de $${Math.abs(newExpense.monto_usd)} guardado en el teléfono (Modo Local).`)
      setTimeout(() => setOfflineToast(null), 4000)
    }

    if (typeof navigator !== 'undefined' && navigator.onLine && isSupabaseConfigured()) {
      try {
        await supabase.from('transacciones').insert([{
          item_name: newExpense.item_name,
          monto_usd: newExpense.monto_usd,
          monto_bs: newExpense.monto_bs,
          tasa_bcv: newExpense.tasa_bcv,
          metodo_pago: newExpense.metodo_pago,
          comision_empleado_usd: 0,
          ganancia_negocio_usd: newExpense.ganancia_negocio_usd,
        }])
      } catch (e) {
        console.warn('Expense offline fallback')
      }
    }
  }

  const handleDeleteTransaction = (txId) => {
    setTransactions(prev => prev.filter(t => t.id !== txId))
  }

  // 1. If in Super-Admin Mode (Owner SaaS Control Panel)
  if (isSuperAdminOpen) {
    return (
      <SuperAdminView
        tenants={tenants}
        onUpdateTenant={handleUpdateTenant}
        onAddTenant={handleRegisterNewTenant}
        onDeleteTenant={handleDeleteTenant}
        onClearDemoTenants={handleClearDemoTenants}
        onRestoreDemoTenants={handleRestoreDemoTenants}
        onPurgeTestAccounts={handlePurgeTestAccounts}
        saasConfig={saasConfig}
        onSaveSaasConfig={pushConfigToServer}
        onRefreshServer={fetchServerBootstrap}
        exchangeRate={exchangeRate}
        onSelectTenantAndExit={(t) => {
          handleSelectTenant(t)
          setIsSuperAdminOpen(false)
        }}
        onExitSuperAdmin={() => setIsSuperAdminOpen(false)}
      />
    )
  }

  // 2. If in Public Client Landing Mode (?reserva=1 or Owner Preview)
  if (isPublicPreview) {
    const bookingProfile = (publicTenantWs && publicTenantWs.businessProfile) || businessProfile
    const bookingServices = (publicTenantWs && publicTenantWs.servicesByNiche && publicTenantWs.servicesByNiche[currentNiche]) || currentServices
    const bookingStaff = (publicTenantWs && publicTenantWs.staffByNiche && publicTenantWs.staffByNiche[currentNiche]) || currentStaff
    const bookingAppointments = (publicTenantWs && publicTenantWs.appointments) || appointments
    const bookingExchangeRate = (publicTenantWs && publicTenantWs.exchangeRate && !isNaN(Number(publicTenantWs.exchangeRate)))
      ? Number(publicTenantWs.exchangeRate)
      : exchangeRate

    const bookingNicheData = {
      ...nicheData,
      staff: bookingStaff,
      services: bookingServices
    }

    const handlePublicBookAppointment = async (newApt) => {
      if (publicTenantParam) {
        const nextAppointments = [newApt, ...(bookingAppointments || [])]
        try {
          await fetch(`/api/workspace/${encodeURIComponent(publicTenantParam)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newAppointment: newApt,
              appointments: nextAppointments
            })
          })
          setPublicTenantWs(prev => ({
            ...(prev || {}),
            appointments: nextAppointments
          }))
          const localKey = `barber_ws_${publicTenantParam}`
          const localWs = localStorage.getItem(localKey)
          if (localWs) {
            const parsed = JSON.parse(localWs)
            parsed.appointments = nextAppointments
            localStorage.setItem(localKey, JSON.stringify(parsed))
          }
        } catch (e) {}
      }
      handleAddAppointment(newApt)
    }

    return (
      <PublicBookingView
        businessProfile={bookingProfile}
        nicheData={bookingNicheData}
        customServices={[]}
        exchangeRate={bookingExchangeRate}
        appointments={bookingAppointments}
        onBookAppointment={handlePublicBookAppointment}
        isOwnerPreview={!isDirectClientLink}
        onExitPreview={() => setIsPublicPreview(false)}
      />
    )
  }

  // 3. If NOT Logged In (!activeTenant) -> Mandatory Full-Screen Login / Register Gate (NO public demo!)
  if (!activeTenant) {
    return (
      <AuthPortalModal
        isOpen={true}
        isFullScreenGate={true}
        onClose={null}
        tenants={tenants}
        saasConfig={saasConfig}
        onLoginSuccess={handleSelectTenant}
        onRegisterTenant={handleRegisterNewTenant}
        onUpdateTenant={handleUpdateTenant}
        onOpenSuperAdmin={null}
        initialTab={isDirectRegisterLink ? 'register' : authInitialTab}
      />
    )
  }

  // 4. If Active Tenant has NOT paid upfront ('pendiente_pago') or is expired ('vencido') -> Lock Screen with 7-Day Guarantee
  const now = nowTick
  const isTrial = Boolean(activeTenant?.isTrial24h || activeTenant?.subscriptionType === 'trial_24h')
  const isTrialExpired = isTrial && activeTenant?.trialExpiresAt && new Date(activeTenant.trialExpiresAt).getTime() <= now

  let trialCountdownStr = ''
  if (isTrial && activeTenant?.trialExpiresAt && !isTrialExpired) {
    const diffMs = Math.max(0, new Date(activeTenant.trialExpiresAt).getTime() - now)
    const totalMins = Math.floor(diffMs / (1000 * 60))
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    trialCountdownStr = `${h}h ${m.toString().padStart(2, '0')}m`
  }

  if (activeTenant?.status !== 'activo' || isTrialExpired) {
    return (
      <SubscriptionLockView
        tenant={isTrialExpired ? { ...activeTenant, status: 'vencido', wasTrial: true } : activeTenant}
        saasConfig={saasConfig}
        exchangeRate={exchangeRate}
        onReportPaymentRef={handleReportPaymentRef}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans pb-16 md:pb-6">
      
      {/* Top Navigation */}
      <Navbar
        currentNiche={currentNiche}
        onSelectNiche={setCurrentNiche}
        exchangeRate={exchangeRate}
        onOpenRateModal={() => setIsRateModalOpen(true)}
        onOpenCashModal={() => setIsCashModalOpen(true)}
        onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        onOpenDailyCloseModal={() => setIsDailyCloseModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        onLogout={handleLogout}
        onUpdateTenant={handleUpdateTenant}
        activeTenant={activeTenant}
        businessProfile={businessProfile}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOnline={isOnline}
        syncStatus={syncStatus}
        overdueClientsCount={overdueClientsCount}
        showReconnectedBanner={showReconnectedBanner}
      />

      {/* Top Banner: Período de Prueba de 24 Horas Activo */}
      {isTrial && !isTrialExpired && (() => {
        const brand = getActiveBrand(activeTenant)
        const isGlamBrand = brand.code === 'glamos'
        return (
          <div className={`bg-gradient-to-r ${isGlamBrand ? 'from-pink-950/70 via-dark-900 to-purple-950/70 border-pink-500/30' : 'from-amber-950/70 via-dark-900 to-purple-950/70 border-amber-500/30'} border-b px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isGlamBrand ? 'bg-pink-400' : 'bg-amber-400'} animate-ping`} />
              <span className={isGlamBrand ? 'text-pink-200' : 'text-amber-200'}>
                {isGlamBrand ? '✨' : '⚡'} <strong>Acceso de Prueba {brand.name} (24h)</strong> • Tiempo restante: <strong className={`text-white font-mono bg-dark-950 px-2 py-0.5 rounded border ${isGlamBrand ? 'border-pink-500/30' : 'border-amber-500/30'}`}>{trialCountdownStr}</strong>
              </span>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className={`px-3 py-1 rounded-xl font-black text-[11px] shadow-md active:scale-95 transition-all flex items-center gap-1.5 ml-auto sm:ml-0 cursor-pointer ${
                isGlamBrand
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white shadow-pink-500/20'
                  : 'bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black shadow-gold-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Activar Mes Completo ($6)</span>
            </button>
          </div>
        )
      })()}

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Desktop Sidebar Tabs */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 pb-1">
            Módulos de Tu Negocio
          </div>

          {[
            { id: 'dashboard', label: 'Caja del Día', icon: TrendingUp },
            { id: 'catalogo', label: 'Mi Link & Catálogo', icon: Globe, badge: 'WEB' },
            { id: 'retargeting', label: 'Radar Clientes (Retoque)', icon: BellRing, alertCount: overdueClientsCount },
            { id: 'appointments', label: 'Turnos y Citas', icon: Calendar },
            { id: 'commissions', label: `Equipo y Comisiones`, icon: Users },
            { id: 'debts', label: 'Clientes, Fiados & VIP', icon: AlertCircle },
            { id: 'inventory', label: 'Pomadas & Insumos', icon: Package },
            { id: 'monthly', label: 'Cuentas Mes a Mes', icon: BarChart3 },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-dark-850'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-500 text-black font-black shrink-0">
                    {item.badge}
                  </span>
                )}
                {item.alertCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-black shrink-0">
                    {item.alertCount}
                  </span>
                )}
              </button>
            )
          })}

          {/* Quick Access to Cuadre and Settings */}
          <div className="pt-3 border-t border-dark-800 space-y-1.5">
            <button
              onClick={() => setIsDailyCloseModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 text-xs font-bold transition-all text-left shadow-sm"
              title="Realizar el Cuadre y Arqueo Físico de Caja"
            >
              <Calculator className="w-4 h-4 shrink-0 text-purple-400" />
              <span>Cuadre Diario (Arqueo)</span>
            </button>

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white border border-dark-750 text-xs font-semibold transition-all text-left"
              title="Subir Logo, cambiar nombre, WhatsApp y redes"
            >
              <Settings className="w-4 h-4 shrink-0 text-gold-400" />
              <span>Configurar Mi Logo</span>
            </button>
          </div>

          {/* Clean Workspace Button for Barber */}
          <div className="pt-2 mt-auto">
            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase px-1">
                Limpieza de Datos:
              </div>
              <button
                onClick={() => {
                  if (confirm('¿Quieres dejar Caja, Clientes y Turnos en CERO?')) {
                    handleClearAllWorkspaceData()
                  }
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-dark-850 hover:bg-red-500/20 text-[10px] font-bold text-slate-300 hover:text-red-400 border border-dark-750 flex items-center justify-center gap-1"
                title="Reiniciar caja y turnos a cero"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reiniciar Caja a 0</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Dynamic View Body */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              exchangeRate={exchangeRate}
              onOpenCashModal={() => setIsCashModalOpen(true)}
              onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
              onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
              onOpenDailyCloseModal={() => setIsDailyCloseModalOpen(true)}
              onDeleteTransaction={handleDeleteTransaction}
              nicheData={nicheData}
            />
          )}

          {activeTab === 'catalogo' && (
            <CatalogConfigView
              businessProfile={businessProfile}
              onSaveProfile={setBusinessProfile}
              services={currentServices}
              onAddService={handleAddService}
              onUpdateService={handleUpdateService}
              onDeleteService={handleDeleteService}
              exchangeRate={exchangeRate}
              onOpenPublicPreview={() => setIsPublicPreview(true)}
            />
          )}

          {activeTab === 'retargeting' && (
            <RetargetingView
              clients={clients}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              retargetingConfig={retargetingConfig}
              onSaveRetargetingConfig={setRetargetingConfig}
              businessProfile={businessProfile}
            />
          )}

          {activeTab === 'commissions' && (
            <CommissionsView
              staffList={currentStaff}
              rolePlural={nicheData.rolePlural}
              roleName={nicheData.roleName}
              transactions={transactions}
              exchangeRate={exchangeRate}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onRegisterExpense={handleRegisterExpense}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsView
              appointments={appointments}
              nicheData={nicheData}
              onAddAppointment={handleAddAppointment}
              onToggleAppointmentStatus={handleToggleAppointmentStatus}
              onDeleteAppointment={handleDeleteAppointment}
              clients={clients}
              businessProfile={businessProfile}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onChargeAppointment={handleChargeAppointment}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsClientsView
              clients={clients}
              exchangeRate={exchangeRate}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onRegisterTransaction={handleRegisterTransaction}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={currentProducts}
              exchangeRate={exchangeRate}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyReportView
              transactions={transactions}
              exchangeRate={exchangeRate}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <QuickCashModal
        isOpen={isCashModalOpen}
        onClose={() => {
          setIsCashModalOpen(false)
          setCashModalPrefill(null)
        }}
        nicheData={nicheData}
        exchangeRate={exchangeRate}
        onRegisterTransaction={handleRegisterTransaction}
        clients={clients}
        prefillData={cashModalPrefill}
      />

      <QuickExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        exchangeRate={exchangeRate}
        onRegisterExpense={handleRegisterExpense}
      />

      <ExchangeRateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        currentRate={exchangeRate}
        onSaveRate={setExchangeRate}
      />

      <WhatsAppCloseModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        transactions={transactions}
        exchangeRate={exchangeRate}
        nicheData={nicheData}
      />

      <BusinessSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        businessProfile={businessProfile}
        onSaveProfile={setBusinessProfile}
        activeTenant={activeTenant}
      />

      <DailyCloseModal
        isOpen={isDailyCloseModalOpen}
        onClose={() => setIsDailyCloseModalOpen(false)}
        transactions={transactions}
        exchangeRate={exchangeRate}
        nicheData={nicheData}
        businessProfile={businessProfile}
        staffList={currentStaff}
        onResetDay={() => {
          // Clear only today's closed transactions, keeping previous days intact for historical monthly reports!
          setTransactions(prev => prev.filter(t => !isDateToday(t.fecha)))
        }}
        onResetDailyTransactions={() => {
          setTransactions(prev => prev.filter(t => !isDateToday(t.fecha)))
        }}
      />

      {/* Payment / Subscription Modal (When in 24h trial and clicking "Activar mes completo") */}
      {isPaymentModalOpen && (
        <SubscriptionLockView
          isModal={true}
          onClose={() => setIsPaymentModalOpen(false)}
          tenant={activeTenant}
          saasConfig={saasConfig}
          exchangeRate={exchangeRate}
          onReportPaymentRef={handleReportPaymentRef}
          onLogout={handleLogout}
        />
      )}

      {/* Floating Offline Toast Notification for Camera / User Reassurance */}
      {offlineToast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-dark-900/95 border border-amber-500/50 text-amber-200 text-xs font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-fadeIn">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{offlineToast}</span>
        </div>
      )}

    </div>
  )
}
