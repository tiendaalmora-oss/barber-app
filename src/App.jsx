import React, { useState, useEffect, useRef } from 'react'
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
import CopilotChatWidget from './components/CopilotChatWidget'
import RolePinModal from './components/RolePinModal'
import VoidTransactionModal from './components/VoidTransactionModal'
import AuditLogView from './components/AuditLogView'
import {
  NICHES,
  NICHES_AR,
  INITIAL_CLIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUSINESS_PROFILE,
  INITIAL_RETARGETING_CONFIG,
  INITIAL_SAAS_CONFIG,
  INITIAL_SAAS_TENANTS
} from './lib/mockData'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { TrendingUp, Users, Calendar, AlertCircle, Package, BarChart3, Globe, BellRing, Crown, Trash2, Sparkles, Settings, Calculator, WifiOff, ShieldCheck, MessageSquare } from 'lucide-react'
import { getLocalDateIso, isDateToday, getTxMethodCollectedUSD } from './lib/dateUtils'
import { isPureProductTx, isDebtSettlementTx } from './lib/bookingUtils'
import { getActiveBrand, isArgentina } from './lib/brandConfig'
import {
  getSecurityConfig,
  createAuditEntry,
  getDeviceForceCashier,
  getCashierLoginSession,
  setCashierLoginSession,
  clearCashierLoginSession,
  getAllCashiersFromStaffByNiche
} from './lib/securityUtils'
import {
  createEmptyDeletedIds,
  normalizeDeletedIds,
  mergeDeletedIds,
  addDeletedIds,
  removeDeletedIds,
  areDeletedIdsEqual,
  mergeEntityList,
  filterDeletedByNiche
} from './lib/workspaceSync'

export default function App() {
  // Check URL parameters (?reserva=1, ?registro=1, ?login=1) and Domain Isolation
  const searchParams = typeof window !== 'undefined' ? window.location.search : ''
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const isDirectClientLink = searchParams.includes('reserva=1')
  const publicTenantParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('b') : null
  const [publicTenantWs, setPublicTenantWs] = useState(null)
  const [publicTenantLoaded, setPublicTenantLoaded] = useState(() => !publicTenantParam)

  useEffect(() => {
    if (!publicTenantParam) return
    setPublicTenantLoaded(false)
    // 1. Try local cache
    try {
      const localScoped = localStorage.getItem(`barber_ws_${publicTenantParam}`)
      if (localScoped) {
        setPublicTenantWs(JSON.parse(localScoped))
        setPublicTenantLoaded(true)
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
        .finally(() => {
          setPublicTenantLoaded(true)
        })
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
  const [currentNiche, setCurrentNiche] = useState(() => {
    try {
      const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
      if (loggedId) {
        const scoped = localStorage.getItem(`barber_ws_${loggedId}`)
        if (scoped) {
          const parsed = JSON.parse(scoped)
          if (parsed && parsed.currentNiche) return parsed.currentNiche
        }
      }
      const savedNiche = typeof window !== 'undefined' ? localStorage.getItem('barber_current_niche') : null
      if (savedNiche) return savedNiche
    } catch (e) {}
    return initialBrand.code === 'glamos' ? 'estetica' : 'barberia'
  })
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

  // Security guard: If current logged tenant was deleted or tombstoned, purge session immediately
  useEffect(() => {
    if (!activeTenantId) return
    const activeEmail = (cachedActiveTenant?.email || activeTenant?.email || '').toLowerCase().trim()
    const isTombstoned = deletedTenantIds.includes(activeTenantId) || (activeEmail && deletedTenantEmails.includes(activeEmail))
    if (isTombstoned) {
      console.warn('[Session Guard] Active tenant is in deletion blacklist. Purging session.')
      const idToPurge = activeTenantId
      setActiveTenantId(null)
      setCachedActiveTenant(null)
      localStorage.removeItem('barber_logged_tenant_id')
      localStorage.removeItem('barber_logged_tenant')
      if (idToPurge) {
        try { localStorage.removeItem(`barber_ws_${idToPurge}`) } catch (e) {}
      }
    }
  }, [activeTenantId, deletedTenantIds, deletedTenantEmails, cachedActiveTenant?.email, activeTenant?.email])

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
  const initDeletedIds = normalizeDeletedIds(initWs)

  // Unified tombstone map for all collections so deleted items never resurrect across sync/polling
  const [deletedIds, setDeletedIds] = useState(initDeletedIds)
  const deletedIdsRef = useRef(deletedIds)
  useEffect(() => { deletedIdsRef.current = deletedIds }, [deletedIds])

  const configUpdatedAtRef = useRef(Number(initWs?.configUpdatedAt) || 0)

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
    if (initWs && initWs.staffByNiche) {
      return filterDeletedByNiche(initWs.staffByNiche, initDeletedIds.staff)
    }
    const saved = localStorage.getItem('barber_staff_by_niche')
    return saved ? JSON.parse(saved) : {
      barberia: NICHES.barberia.staff,
      estetica: NICHES.estetica.staff,
      mixto: NICHES.mixto.staff
    }
  })

  const [servicesByNiche, setServicesByNiche] = useState(() => {
    if (initWs && initWs.servicesByNiche) {
      return filterDeletedByNiche(initWs.servicesByNiche, initDeletedIds.services)
    }
    const saved = localStorage.getItem('barber_services_by_niche')
    return saved ? JSON.parse(saved) : {
      barberia: NICHES.barberia.services,
      estetica: NICHES.estetica.services,
      mixto: NICHES.mixto.services
    }
  })

  const [productsByNiche, setProductsByNiche] = useState(() => {
    if (initWs && initWs.productsByNiche) {
      return filterDeletedByNiche(initWs.productsByNiche, initDeletedIds.products)
    }
    const saved = localStorage.getItem('barber_products_by_niche')
    return saved ? JSON.parse(saved) : {
      barberia: NICHES.barberia.products,
      estetica: NICHES.estetica.products,
      mixto: NICHES.mixto.products
    }
  })

  // Guard: never POST workspace to server until initial GET /api/workspace/:id has completed for the active tenant
  const serverSyncReadyRef = useRef(false)
  const syncedTenantIdRef = useRef(null)

  const [transactions, setTransactions] = useState(() => {
    const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
    const isDemo = loggedId === 'ten_1'
    if (isDemo && (!initWs || !Array.isArray(initWs.transactions) || initWs.transactions.length < 15)) {
      return INITIAL_TRANSACTIONS
    }
    if (initWs && Array.isArray(initWs.transactions)) {
      const delSet = new Set(initDeletedIds.transactions)
      return initWs.transactions.filter(t => t && !delSet.has(t.id))
    }
    const saved = localStorage.getItem('barber_transactions')
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS
  })

  const [clients, setClients] = useState(() => {
    const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
    const isDemo = loggedId === 'ten_1'
    if (isDemo && (!initWs || !Array.isArray(initWs.clients) || initWs.clients.length === 0)) {
      return INITIAL_CLIENTS
    }
    if (initWs && Array.isArray(initWs.clients)) {
      const delSet = new Set(initDeletedIds.clients)
      return initWs.clients.filter(c => c && !delSet.has(c.id))
    }
    const saved = localStorage.getItem('barber_clients_v2')
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS
  })

  const [appointments, setAppointments] = useState(() => {
    const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
    const isDemo = loggedId === 'ten_1'
    if (isDemo && (!initWs || !Array.isArray(initWs.appointments) || initWs.appointments.length === 0)) {
      return INITIAL_APPOINTMENTS
    }
    if (initWs && Array.isArray(initWs.appointments)) {
      const delSet = new Set(initDeletedIds.appointments)
      return initWs.appointments.filter(a => a && !delSet.has(a.id))
    }
    const saved = localStorage.getItem('barber_appointments')
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS
  })

  const [businessProfile, setBusinessProfile] = useState(() => {
    try {
      if (initWs && initWs.businessProfile) return initWs.businessProfile
      const saved = localStorage.getItem('barber_profile')
      return saved ? JSON.parse(saved) : INITIAL_BUSINESS_PROFILE
    } catch (e) {
      return INITIAL_BUSINESS_PROFILE
    }
  })

  const [retargetingConfig, setRetargetingConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('barber_retargeting_config')
      return saved ? JSON.parse(saved) : INITIAL_RETARGETING_CONFIG
    } catch (e) {
      return INITIAL_RETARGETING_CONFIG
    }
  })

  // Daily cash drawer closures & audit history
  const [dailyClosings, setDailyClosings] = useState(() => {
    try {
      if (initWs && Array.isArray(initWs.dailyClosings)) return initWs.dailyClosings
      const saved = localStorage.getItem('barber_daily_closings')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      if (initWs && Array.isArray(initWs.auditLogs)) return initWs.auditLogs
      return []
    } catch (e) {
      return []
    }
  })

  // Owner vs. Cashier security mode state (hydrates direct cashier PIN login session + device lock)
  const ownerUnlockedThisSessionRef = useRef(false)
  const [isCashierMode, setIsCashierMode] = useState(() => {
    try {
      const sec = getSecurityConfig(initWs?.businessProfile || {})
      const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
      if (!loggedId) return false
      if (getCashierLoginSession(loggedId)) return true
      return Boolean(sec.enabled && getDeviceForceCashier(loggedId))
    } catch (e) {
      return false
    }
  })
  const [activeOperator, setActiveOperator] = useState(() => {
    try {
      const loggedId = typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : null
      return loggedId ? getCashierLoginSession(loggedId) : null
    } catch (e) {
      return null
    }
  })
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [voidingTx, setVoidingTx] = useState(null)
  const [fontScale, setFontScale] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('barber_font_scale') : null
      return saved === 'large' || saved === 'xlarge' ? saved : 'normal'
    } catch (e) {
      return 'normal'
    }
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (fontScale === 'normal') {
      delete document.documentElement.dataset.fontScale
    } else {
      document.documentElement.dataset.fontScale = fontScale
    }
    try {
      localStorage.setItem('barber_font_scale', fontScale)
    } catch (e) {}
  }, [fontScale])

  const handleCycleFontScale = () => {
    setFontScale(prev => (prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal'))
  }

  // Modals
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)
  const [cashModalPrefill, setCashModalPrefill] = useState(null)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isDailyCloseModalOpen, setIsDailyCloseModalOpen] = useState(false)
  const [dailyClosePeriod, setDailyClosePeriod] = useState('today')
  const handleOpenDailyCloseModal = (period = 'today') => {
    setDailyClosePeriod(typeof period === 'string' ? period : 'today')
    setIsDailyCloseModalOpen(true)
  }
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

  const rawSecurityConfig = getSecurityConfig(businessProfile)
  const hasCashierLoginLock = Boolean(activeTenantId && getCashierLoginSession(activeTenantId))
  const securityConfig = hasCashierLoginLock
    ? {
        ...rawSecurityConfig,
        enabled: true,
        ownerPin: String(rawSecurityConfig.ownerPin || activeTenant?.securityPin || '1234').trim()
      }
    : rawSecurityConfig
  const allCashiersAcrossNiches = getAllCashiersFromStaffByNiche(staffByNiche, currentNiche)
  const allCashiersWithCurrentStaff = [
    ...currentStaff,
    ...allCashiersAcrossNiches.filter(c => !currentStaff.some(cs => cs.id === c.id))
  ]
  const todayAuditAlertCount = (auditLogs || []).filter(l =>
    isDateToday(l.timestamp || l.fecha) && (l.type === 'TX_VOIDED' || l.type === 'PIN_FAILED')
  ).length

  const addAuditLog = (entryPayload) => {
    const entry = createAuditEntry({
      ...entryPayload,
      actorName: entryPayload.actorName || activeOperator?.name || (isCashierMode ? 'Cajero' : 'Dueño'),
      actorRole: entryPayload.actorRole || (isCashierMode ? 'cajero' : 'dueno')
    })
    setAuditLogs(prev => [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 2000))
  }

  // Enforce cashier login session or device cashier lock on startup
  useEffect(() => {
    if (!activeTenantId || ownerUnlockedThisSessionRef.current) return
    const loginCashierSession = getCashierLoginSession(activeTenantId)
    if (loginCashierSession) {
      setIsCashierMode(true)
      setActiveOperator(prev => prev || loginCashierSession)
      return
    }
    if (securityConfig.enabled && getDeviceForceCashier(activeTenantId)) {
      setIsCashierMode(true)
    } else if (!securityConfig.enabled) {
      setIsCashierMode(false)
    }
  }, [activeTenantId, securityConfig.enabled])

  // Redirect away from Owner-only tabs when in Cashier mode
  useEffect(() => {
    if (isCashierMode && ['commissions', 'monthly', 'audit'].includes(activeTab)) {
      setActiveTab('dashboard')
    }
  }, [isCashierMode, activeTab])

  // Auto-lock PC back to Cashier mode after inactivity if device is forced to Cashier mode
  useEffect(() => {
    if (!activeTenantId || !securityConfig.enabled || isCashierMode) return
    const autoMins = Number(securityConfig.autoLockMinutes) || 0
    if (autoMins <= 0 || !getDeviceForceCashier(activeTenantId)) return

    let timer = null
    const resetTimer = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        ownerUnlockedThisSessionRef.current = false
        setIsCashierMode(true)
        setActiveOperator(null)
        addAuditLog({
          type: 'ROLE_SWITCH',
          actorName: 'Sistema',
          actorRole: 'dueno',
          summary: `Auto-bloqueo a Modo Cajero tras ${autoMins} min de inactividad`
        })
      }, autoMins * 60 * 1000)
    }

    resetTimer()
    const events = ['click', 'keydown', 'touchstart']
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }))
    return () => {
      if (timer) clearTimeout(timer)
      events.forEach(ev => window.removeEventListener(ev, resetTimer))
    }
  }, [activeTenantId, securityConfig.enabled, securityConfig.autoLockMinutes, isCashierMode])

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
      currentNiche,
      transactions,
      deletedIds,
      deletedTxIds: deletedIds.transactions,
      deletedAppointmentIds: deletedIds.appointments,
      deletedStaffIds: deletedIds.staff,
      configUpdatedAt: configUpdatedAtRef.current,
      clients,
      appointments,
      businessProfile,
      staffByNiche,
      servicesByNiche,
      productsByNiche,
      exchangeRate,
      dailyClosings,
      auditLogs
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
      localStorage.setItem('barber_current_niche', currentNiche)
      localStorage.setItem('barber_daily_closings', JSON.stringify(dailyClosings))
    } catch (storageErr) {
      console.warn('Storage quota warning, continuing with in-memory state:', storageErr)
    }

    // 3. Debounced sync to VPS backend — strictly gated until initial GET /api/workspace/:id has completed!
    const timeout = setTimeout(async () => {
      if (!serverSyncReadyRef.current || syncedTenantIdRef.current !== activeTenantId) {
        return
      }
      try {
        await fetch(`/api/workspace/${encodeURIComponent(activeTenantId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ws)
        })
      } catch (err) {
        // Offline
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [activeTenantId, currentNiche, transactions, deletedIds, clients, appointments, businessProfile, staffByNiche, servicesByNiche, productsByNiche, exchangeRate, dailyClosings, auditLogs])

  // Legacy client-to-transaction auto-reconstruction (rec_c_*) removed:
  // Rebuilding transactions from client.last_visit created phantom duplicate tickets
  // whenever a client name was edited or crossed UTC midnight. All real sales live in ws.transactions.

  const isSameRefList = (merged, prevList) =>
    Array.isArray(prevList) &&
    merged.length === prevList.length &&
    merged.every((item, idx) => item === prevList[idx])

  // Real-time auto-sync for active barber: unified timestamp + tombstone merge without overwriting local changes
  useEffect(() => {
    if (!activeTenantId || isPublicPreview) return

    const syncFromServer = async () => {
      try {
        const res = await fetch(`/api/workspace/${encodeURIComponent(activeTenantId)}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data && data.workspace) {
            const ws = data.workspace
            const serverDeleted = normalizeDeletedIds(ws)
            const mergedDel = mergeDeletedIds(deletedIdsRef.current, serverDeleted)
            if (!areDeletedIdsEqual(deletedIdsRef.current, mergedDel)) {
              deletedIdsRef.current = mergedDel
              setDeletedIds(mergedDel)
            }

            if (Array.isArray(ws.appointments)) {
              setAppointments(prev => {
                const base = prev || []
                const merged = mergeEntityList(ws.appointments, base, mergedDel.appointments, { preferIncomingOnTie: false })
                return isSameRefList(merged, base) ? prev : merged
              })
            }
            if (Array.isArray(ws.clients)) {
              setClients(prev => {
                const base = prev || []
                const merged = mergeEntityList(ws.clients, base, mergedDel.clients, { preferIncomingOnTie: false })
                return isSameRefList(merged, base) ? prev : merged
              })
            }
            if (Array.isArray(ws.transactions)) {
              setTransactions(prev => {
                const base = prev || []
                const merged = mergeEntityList(ws.transactions, base, mergedDel.transactions, {
                  preferIncomingOnTie: false,
                  sortFn: (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)
                })
                return isSameRefList(merged, base) ? prev : merged
              })
            }
            if (Array.isArray(ws.dailyClosings)) {
              setDailyClosings(prev => {
                const base = prev || []
                const merged = mergeEntityList(ws.dailyClosings, base, [], { preferIncomingOnTie: false })
                return isSameRefList(merged, base) ? prev : merged
              })
            }
            if (Array.isArray(ws.auditLogs)) {
              setAuditLogs(prev => {
                const prevIds = new Set((prev || []).map(l => l.id))
                const newIncoming = ws.auditLogs.filter(l => l && l.id && !prevIds.has(l.id))
                if (newIncoming.length > 0) {
                  return [...newIncoming, ...(prev || [])].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                }
                return prev
              })
            }

            // Hydrate config on initial load OR when another device pushed newer settings/staff/catalog (via configUpdatedAt)
            const serverConfigTs = Number(ws.configUpdatedAt) || 0
            const localConfigTs = Number(configUpdatedAtRef.current) || 0
            const shouldHydrateConfig = syncedTenantIdRef.current !== activeTenantId || serverConfigTs > localConfigTs

            if (shouldHydrateConfig) {
              if (ws.businessProfile) setBusinessProfile(prev => ({ ...prev, ...ws.businessProfile }))
              if (ws.staffByNiche) setStaffByNiche(filterDeletedByNiche(ws.staffByNiche, mergedDel.staff))
              if (ws.servicesByNiche) setServicesByNiche(filterDeletedByNiche(ws.servicesByNiche, mergedDel.services))
              if (ws.productsByNiche) setProductsByNiche(filterDeletedByNiche(ws.productsByNiche, mergedDel.products))
              if (ws.exchangeRate && !isNaN(Number(ws.exchangeRate))) {
                setExchangeRate(Number(ws.exchangeRate))
              }
              if (ws.currentNiche && NICHES[ws.currentNiche]) {
                setCurrentNiche(ws.currentNiche)
              }
              if (serverConfigTs > localConfigTs) {
                configUpdatedAtRef.current = serverConfigTs
              }
            } else {
              if (mergedDel.staff.length > 0) {
                setStaffByNiche(prev => filterDeletedByNiche(prev, mergedDel.staff))
              }
              if (mergedDel.services.length > 0) {
                setServicesByNiche(prev => filterDeletedByNiche(prev, mergedDel.services))
              }
              if (mergedDel.products.length > 0) {
                setProductsByNiche(prev => filterDeletedByNiche(prev, mergedDel.products))
              }
            }
          }
          syncedTenantIdRef.current = activeTenantId
          serverSyncReadyRef.current = true
        }
      } catch (e) {}
    }

    syncFromServer()
    const pollTimer = setInterval(syncFromServer, 12000)

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

          // Multi-device session guard: ensure active tenant is still alive and status is synchronized
          const currentLoggedId = localStorage.getItem('barber_logged_tenant_id') || activeTenantId
          if (currentLoggedId) {
            const serverTenant = cleanTenants.find(t => t.id === currentLoggedId)
            const currentEmail = (cachedActiveTenant?.email || serverTenant?.email || '').toLowerCase().trim()
            const isGone = nextDelIds.includes(currentLoggedId) ||
              (currentEmail && nextDelEmails.includes(currentEmail)) ||
              (!serverTenant && currentLoggedId !== 'ten_1')

            if (isGone) {
              console.warn('[Multi-Device Guard] Tenant deleted on server. Logging out immediately.')
              setActiveTenantId(null)
              setCachedActiveTenant(null)
              localStorage.removeItem('barber_logged_tenant_id')
              localStorage.removeItem('barber_logged_tenant')
              try { localStorage.removeItem(`barber_ws_${currentLoggedId}`) } catch (e) {}
            } else if (serverTenant) {
              setCachedActiveTenant(serverTenant)
              localStorage.setItem('barber_logged_tenant', JSON.stringify(serverTenant))
            }
          }
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

  const LEGACY_DELETE_KEY_MAP = {
    transactions: 'deletedTxIds',
    appointments: 'deletedAppointmentIds',
    staff: 'deletedStaffIds'
  }

  // Atomic tombstone deletion across all 6 collections + immediate VPS sync
  const recordWorkspaceDeletion = (collection, ids, extraBody = {}) => {
    const idList = (Array.isArray(ids) ? ids : [ids]).filter(Boolean)
    if (idList.length === 0) return
    const nextDeleted = addDeletedIds(deletedIdsRef.current, collection, idList)
    deletedIdsRef.current = nextDeleted
    setDeletedIds(nextDeleted)
    if (activeTenantId) {
      const payload = {
        deletedIds: { [collection]: idList },
        ...extraBody
      }
      const legacyKey = LEGACY_DELETE_KEY_MAP[collection]
      if (legacyKey) payload[legacyKey] = idList
      fetch(`/api/workspace/${encodeURIComponent(activeTenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {})
    }
  }

  // Clean workspace vs Load Demo workspace
  const handleClearAllWorkspaceData = () => {
    const wipeAt = Date.now()
    const curTxIds = (transactions || []).map(t => t && t.id).filter(Boolean)
    const curAptIds = (appointments || []).map(a => a && a.id).filter(Boolean)
    const curClientIds = (clients || []).map(c => c && c.id).filter(Boolean)

    let nextDel = addDeletedIds(deletedIdsRef.current, 'transactions', curTxIds)
    nextDel = addDeletedIds(nextDel, 'appointments', curAptIds)
    nextDel = addDeletedIds(nextDel, 'clients', curClientIds)
    deletedIdsRef.current = nextDel
    setDeletedIds(nextDel)

    setTransactions([])
    setClients([])
    setAppointments([])

    addAuditLog({
      type: 'WORKSPACE_RESET',
      summary: 'Caja, clientes y turnos reiniciados a cero (Modo Dueño)',
      amountUsd: 0
    })

    if (activeTenantId) {
      fetch(`/api/workspace/${encodeURIComponent(activeTenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explicitReset: true,
          resetAt: wipeAt,
          deletedIds: nextDel,
          deletedTxIds: nextDel.transactions,
          deletedAppointmentIds: nextDel.appointments
        })
      }).catch(() => {})
    }
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

  const handleSaveBusinessProfile = (updater) => {
    configUpdatedAtRef.current = Date.now()
    setBusinessProfile(updater)
  }

  const handleSelectNiche = (nextNiche) => {
    if (!NICHES[nextNiche] || nextNiche === currentNiche) return
    configUpdatedAtRef.current = Date.now()
    setCurrentNiche(nextNiche)
    if (activeTenant && activeTenant.niche !== nextNiche) {
      handleUpdateTenant({ ...activeTenant, niche: nextNiche })
    }
  }

  // Staff CRUD
  const handleAddStaff = (newSt) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    if (newSt?.id && (deletedIdsRef.current?.staff || []).includes(newSt.id)) {
      const nextDel = removeDeletedIds(deletedIdsRef.current, 'staff', [newSt.id])
      deletedIdsRef.current = nextDel
      setDeletedIds(nextDel)
    }
    setStaffByNiche(prev => ({
      ...prev,
      [currentNiche]: [...(prev[currentNiche] || []), { ...newSt, updatedAt: nowTs }]
    }))
  }

  const handleUpdateStaff = (updatedSt) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    setStaffByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).map(s => s.id === updatedSt.id ? { ...updatedSt, updatedAt: nowTs } : s)
    }))
  }

  const handleDeleteStaff = (id) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    recordWorkspaceDeletion('staff', [id], { configUpdatedAt: nowTs })
    setStaffByNiche(prev => filterDeletedByNiche(prev, [id]))
  }

  // Services CRUD
  const handleAddService = (newSvc) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    if (newSvc?.id && (deletedIdsRef.current?.services || []).includes(newSvc.id)) {
      const nextDel = removeDeletedIds(deletedIdsRef.current, 'services', [newSvc.id])
      deletedIdsRef.current = nextDel
      setDeletedIds(nextDel)
    }
    setServicesByNiche(prev => ({
      ...prev,
      [currentNiche]: [{ ...newSvc, updatedAt: nowTs }, ...(prev[currentNiche] || [])]
    }))
  }

  const handleUpdateService = (updatedSvc) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    const existing = (servicesByNiche[currentNiche] || []).find(s => s.id === updatedSvc.id)
    if (existing && Number(existing.price_usd) !== Number(updatedSvc.price_usd)) {
      addAuditLog({
        type: 'PRICE_CHANGED',
        summary: `Precio de servicio modificado: ${updatedSvc.name}`,
        amountUsd: updatedSvc.price_usd,
        details: { oldPrice: existing.price_usd, newPrice: updatedSvc.price_usd }
      })
    }
    setServicesByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).map(s => s.id === updatedSvc.id ? { ...updatedSvc, updatedAt: nowTs } : s)
    }))
  }

  const handleDeleteService = (id) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    const existing = (servicesByNiche[currentNiche] || []).find(s => s.id === id)
    if (existing) {
      addAuditLog({
        type: 'SERVICE_DELETED',
        summary: `Servicio eliminado del catálogo: ${existing.name}`,
        amountUsd: existing.price_usd
      })
    }
    recordWorkspaceDeletion('services', [id], { configUpdatedAt: nowTs })
    setServicesByNiche(prev => filterDeletedByNiche(prev, [id]))
  }

  // Products CRUD
  const handleAddProduct = (newProd) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    if (newProd?.id && (deletedIdsRef.current?.products || []).includes(newProd.id)) {
      const nextDel = removeDeletedIds(deletedIdsRef.current, 'products', [newProd.id])
      deletedIdsRef.current = nextDel
      setDeletedIds(nextDel)
    }
    setProductsByNiche(prev => ({
      ...prev,
      [currentNiche]: [{ ...newProd, updatedAt: nowTs }, ...(prev[currentNiche] || [])]
    }))
  }

  const handleUpdateProduct = (updatedProd) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    const existing = (productsByNiche[currentNiche] || []).find(p => p.id === updatedProd.id)
    if (existing && Number(existing.price_usd) !== Number(updatedProd.price_usd)) {
      addAuditLog({
        type: 'PRICE_CHANGED',
        summary: `Precio de producto modificado: ${updatedProd.name}`,
        amountUsd: updatedProd.price_usd,
        details: { oldPrice: existing.price_usd, newPrice: updatedProd.price_usd }
      })
    }
    setProductsByNiche(prev => ({
      ...prev,
      [currentNiche]: (prev[currentNiche] || []).map(p => p.id === updatedProd.id ? { ...updatedProd, updatedAt: nowTs } : p)
    }))
  }

  const handleDeleteProduct = (id) => {
    const nowTs = Date.now()
    configUpdatedAtRef.current = nowTs
    const existing = (productsByNiche[currentNiche] || []).find(p => p.id === id)
    if (existing) {
      addAuditLog({
        type: 'PRODUCT_DELETED',
        summary: `Producto eliminado del inventario: ${existing.name}`,
        amountUsd: existing.price_usd
      })
    }
    recordWorkspaceDeletion('products', [id], { configUpdatedAt: nowTs })
    setProductsByNiche(prev => filterDeletedByNiche(prev, [id]))
  }

  const fetchTenantWorkspace = async (tid) => {
    if (!tid) return
    try {
      const res = await fetch(`/api/workspace/${encodeURIComponent(tid)}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.workspace) {
          const ws = data.workspace
          const serverDeleted = normalizeDeletedIds(ws)
          const mergedDel = mergeDeletedIds(deletedIdsRef.current, serverDeleted)
          if (!areDeletedIdsEqual(deletedIdsRef.current, mergedDel)) {
            deletedIdsRef.current = mergedDel
            setDeletedIds(mergedDel)
          }

          if (Array.isArray(ws.transactions)) {
            setTransactions(prev => mergeEntityList(ws.transactions, prev || [], mergedDel.transactions, {
              preferIncomingOnTie: false,
              sortFn: (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)
            }))
          }
          if (Array.isArray(ws.clients)) {
            setClients(prev => mergeEntityList(ws.clients, prev || [], mergedDel.clients, {
              preferIncomingOnTie: false
            }))
          }
          if (Array.isArray(ws.appointments)) {
            setAppointments(prev => mergeEntityList(ws.appointments, prev || [], mergedDel.appointments, {
              preferIncomingOnTie: false
            }))
          }
          if (Array.isArray(ws.dailyClosings)) {
            setDailyClosings(prev => mergeEntityList(ws.dailyClosings, prev || [], [], {
              preferIncomingOnTie: false
            }))
          }
          if (Array.isArray(ws.auditLogs)) {
            setAuditLogs(prev => {
              const localList = Array.isArray(prev) ? prev : []
              const serverIds = new Set(ws.auditLogs.map(l => l && l.id).filter(Boolean))
              const localOnly = localList.filter(l => l && l.id && !serverIds.has(l.id))
              return [...ws.auditLogs, ...localOnly].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
            })
          }
          if (ws.businessProfile) setBusinessProfile(prev => ({ ...prev, ...ws.businessProfile }))
          if (ws.staffByNiche) setStaffByNiche(filterDeletedByNiche(ws.staffByNiche, mergedDel.staff))
          if (ws.servicesByNiche) setServicesByNiche(filterDeletedByNiche(ws.servicesByNiche, mergedDel.services))
          if (ws.productsByNiche) setProductsByNiche(filterDeletedByNiche(ws.productsByNiche, mergedDel.products))
          if (ws.currentNiche && NICHES[ws.currentNiche] && !getCashierLoginSession(tid)) setCurrentNiche(ws.currentNiche)
          if (ws.exchangeRate && !isNaN(Number(ws.exchangeRate))) {
            setExchangeRate(Number(ws.exchangeRate))
            localStorage.setItem('barber_rate', String(ws.exchangeRate))
          }
          if (ws.configUpdatedAt) {
            configUpdatedAtRef.current = Math.max(Number(configUpdatedAtRef.current) || 0, Number(ws.configUpdatedAt) || 0)
          }
        }
        syncedTenantIdRef.current = tid
        serverSyncReadyRef.current = true
      } else {
        syncedTenantIdRef.current = tid
        serverSyncReadyRef.current = true
      }
    } catch (e) {
      console.warn('Workspace server load offline')
      syncedTenantIdRef.current = tid
      serverSyncReadyRef.current = true
    }
  }

  // Handlers for SaaS Tenants
  const handleSelectTenant = (tenant, options = {}) => {
    // Lock auto-POST until server workspace is fetched and merged for this tenant
    serverSyncReadyRef.current = false
    syncedTenantIdRef.current = null

    const cashierOp = options?.cashierOperator || null
    if (cashierOp) {
      setCashierLoginSession(tenant.id, cashierOp)
    }

    setActiveTenantId(tenant.id)
    setCachedActiveTenant(tenant)
    localStorage.setItem('barber_logged_tenant_id', tenant.id)
    localStorage.setItem('barber_logged_tenant', JSON.stringify(tenant))
    setIsAuthModalOpen(false)
    cleanUrlAuthParams()

    try {
      const params = new URLSearchParams(window.location.search)
      const hasParam = params.has('pais') || params.has('country')
      const host = window.location.hostname.toLowerCase()
      const isArHost = host.startsWith('ar.') || host.includes('-ar.') || host.includes('.ar.') || host.includes('argentina')
      if (!hasParam && !isArHost) {
        localStorage.setItem('barber_preferred_country', tenant.country === 'AR' ? 'AR' : 'VE')
      }
    } catch (e) {}
    if (options?.niche && NICHES[options.niche]) {
      setCurrentNiche(options.niche)
    } else if (tenant.niche && NICHES[tenant.niche]) {
      setCurrentNiche(tenant.niche)
    }

    const isDemo = tenant.email === 'demo@ingenioos.online' || tenant.id === 'ten_1'

    // Load tenant-scoped workspace from localStorage AND always sync with server (NEVER wipe or skip server!)
    try {
      const localScoped = localStorage.getItem(`barber_ws_${tenant.id}`)
      if (localScoped) {
        const parsed = JSON.parse(localScoped)
        if (isDemo && (!Array.isArray(parsed.transactions) || parsed.transactions.length < 15)) {
          handleLoadDemoWorkspaceData()
          syncedTenantIdRef.current = tenant.id
          serverSyncReadyRef.current = true
        } else {
          const localDeleted = normalizeDeletedIds(parsed)
          const delTxSet = new Set(localDeleted.transactions)
          const delClientSet = new Set(localDeleted.clients)
          const delAptSet = new Set(localDeleted.appointments)

          deletedIdsRef.current = localDeleted
          configUpdatedAtRef.current = Number(parsed.configUpdatedAt) || 0

          setDeletedIds(localDeleted)
          setTransactions(Array.isArray(parsed.transactions) ? parsed.transactions.filter(t => t && !delTxSet.has(t.id)) : [])
          setClients(Array.isArray(parsed.clients) ? parsed.clients.filter(c => c && !delClientSet.has(c.id)) : [])
          setAppointments(Array.isArray(parsed.appointments) ? parsed.appointments.filter(a => a && !delAptSet.has(a.id)) : [])
          setDailyClosings(Array.isArray(parsed.dailyClosings) ? parsed.dailyClosings : [])
          setAuditLogs(Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [])
          if (parsed.businessProfile) setBusinessProfile(parsed.businessProfile)
          ownerUnlockedThisSessionRef.current = false
          const parsedSec = getSecurityConfig(parsed.businessProfile || {})
          if (cashierOp) {
            setIsCashierMode(true)
            setActiveOperator(cashierOp)
          } else {
            setIsCashierMode(Boolean(parsedSec.enabled && getDeviceForceCashier(tenant.id)))
            setActiveOperator(null)
          }
          if (parsed.staffByNiche) setStaffByNiche(filterDeletedByNiche(parsed.staffByNiche, localDeleted.staff))
          if (parsed.servicesByNiche) setServicesByNiche(filterDeletedByNiche(parsed.servicesByNiche, localDeleted.services))
          if (parsed.productsByNiche) setProductsByNiche(filterDeletedByNiche(parsed.productsByNiche, localDeleted.products))
          if (parsed.exchangeRate && !isNaN(Number(parsed.exchangeRate))) {
            setExchangeRate(Number(parsed.exchangeRate))
          }
          // CRITICAL: Always fetch latest server workspace to merge any data from other devices or server restorations!
          if (!isDemo) {
            fetchTenantWorkspace(tenant.id)
          } else {
            syncedTenantIdRef.current = tenant.id
            serverSyncReadyRef.current = true
          }
        }
      } else {
        if (isDemo) {
          handleLoadDemoWorkspaceData()
          syncedTenantIdRef.current = tenant.id
          serverSyncReadyRef.current = true
        } else {
          // Clear previous tenant's in-memory arrays before pulling target tenant from server
          const emptyDel = createEmptyDeletedIds()
          deletedIdsRef.current = emptyDel
          configUpdatedAtRef.current = 0
          setDeletedIds(emptyDel)
          setTransactions([])
          setClients([])
          setAppointments([])
          setDailyClosings([])
          setAuditLogs([])
          ownerUnlockedThisSessionRef.current = false
          setIsCashierMode(Boolean(cashierOp))
          setActiveOperator(cashierOp || null)
          setBusinessProfile({
            ...INITIAL_BUSINESS_PROFILE,
            businessName: tenant.businessName,
            whatsapp: tenant.phone || ''
          })
          fetchTenantWorkspace(tenant.id)
        }
      }
    } catch (e) {
      if (isDemo) {
        handleLoadDemoWorkspaceData()
        syncedTenantIdRef.current = tenant.id
        serverSyncReadyRef.current = true
      } else {
        const emptyDel = createEmptyDeletedIds()
        deletedIdsRef.current = emptyDel
        configUpdatedAtRef.current = 0
        setDeletedIds(emptyDel)
        setTransactions([])
        setClients([])
        setAppointments([])
        setDailyClosings([])
        setAuditLogs([])
        setIsCashierMode(Boolean(cashierOp))
        setActiveOperator(cashierOp || null)
        fetchTenantWorkspace(tenant.id)
      }
    }
  }

  const handleLogout = () => {
    if (activeTenantId) clearCashierLoginSession(activeTenantId)
    serverSyncReadyRef.current = false
    syncedTenantIdRef.current = null
    setIsCashierMode(false)
    setActiveOperator(null)
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

    const cleanRegPhone = String(newTenant.phone || '').replace(/[\s()-]/g, '')
    const phoneLooksAr = cleanRegPhone.startsWith('+54') || cleanRegPhone.startsWith('549')
    const isArTenant = newTenant.country === 'AR' || phoneLooksAr || isArgentina(newTenant)
    const sourceNiches = isArTenant ? NICHES_AR : NICHES
    const resolvedNiche = (newTenant.niche && NICHES[newTenant.niche]) ? newTenant.niche : 'barberia'
    const normalizedTenant = { ...newTenant, country: isArTenant ? 'AR' : 'VE', niche: resolvedNiche }

    const nicheProfileDefaults = resolvedNiche === 'estetica'
      ? {
          slogan: 'Uñas, pestañas, cejas y estética con atención VIP sin esperas.',
          promoBanner: isArTenant ? '✨ Reservá tu turno online y asegurá tu horario' : '✨ Reserva tu cita online y asegura tu horario VIP'
        }
      : resolvedNiche === 'mixto'
      ? {
          slogan: 'Barbería, estética y cuidado personal en un solo lugar, sin hacer cola.',
          promoBanner: isArTenant ? '✨ Reservá tu turno online en segundos' : '✨ Reserva tu cita online en segundos'
        }
      : {
          slogan: 'Cortes clásicos y degradé de primera, barba con toalla caliente y atención VIP sin esperar.',
          promoBanner: isArTenant ? '🔥 Reservá tu turno online sin esperar' : INITIAL_BUSINESS_PROFILE.promoBanner
        }

    // Brand new account starts clean for this tenantId
    const freshConfigTs = Date.now()
    const freshWorkspace = {
      currentNiche: resolvedNiche,
      transactions: [],
      deletedIds: createEmptyDeletedIds(),
      deletedTxIds: [],
      deletedAppointmentIds: [],
      deletedStaffIds: [],
      configUpdatedAt: freshConfigTs,
      clients: [],
      appointments: [],
      businessProfile: {
        ...INITIAL_BUSINESS_PROFILE,
        country: isArTenant ? 'AR' : 'VE',
        businessName: newTenant.businessName,
        slogan: nicheProfileDefaults.slogan,
        instagram: '',
        whatsapp: newTenant.phone || '',
        paymentMethods: isArTenant ? ['Efectivo', 'Mercado Pago', 'Transferencia', 'Tarjeta / Point'] : INITIAL_BUSINESS_PROFILE.paymentMethods,
        promoBanner: nicheProfileDefaults.promoBanner
      },
      staffByNiche: {
        barberia: sourceNiches.barberia.staff,
        estetica: sourceNiches.estetica.staff,
        mixto: sourceNiches.mixto.staff
      },
      servicesByNiche: {
        barberia: sourceNiches.barberia.services,
        estetica: sourceNiches.estetica.services,
        mixto: sourceNiches.mixto.services
      },
      productsByNiche: {
        barberia: sourceNiches.barberia.products,
        estetica: sourceNiches.estetica.products,
        mixto: sourceNiches.mixto.products
      }
    }

    try {
      localStorage.setItem(`barber_ws_${newTenant.id}`, JSON.stringify(freshWorkspace))
    } catch (e) {}
    const emptyDel = createEmptyDeletedIds()
    deletedIdsRef.current = emptyDel
    configUpdatedAtRef.current = freshConfigTs
    setDeletedIds(emptyDel)
    setTransactions([])
    setClients([])
    setAppointments([])
    setDailyClosings([])
    setAuditLogs([])
    ownerUnlockedThisSessionRef.current = false
    setIsCashierMode(false)
    setActiveOperator(null)
    setBusinessProfile(freshWorkspace.businessProfile)
    if (newTenant.niche && NICHES[newTenant.niche]) {
      setCurrentNiche(newTenant.niche)
    }
    if (freshWorkspace.staffByNiche) setStaffByNiche(freshWorkspace.staffByNiche)
    if (freshWorkspace.servicesByNiche) setServicesByNiche(freshWorkspace.servicesByNiche)
    if (freshWorkspace.productsByNiche) setProductsByNiche(freshWorkspace.productsByNiche)

    syncedTenantIdRef.current = newTenant.id
    serverSyncReadyRef.current = true
    setTenants(prev => [normalizedTenant, ...prev.filter(t => t.id !== normalizedTenant.id && (t.email || '').toLowerCase().trim() !== cleanEmail)])
    setActiveTenantId(newTenant.id)
    setCachedActiveTenant(normalizedTenant)
    localStorage.setItem('barber_logged_tenant_id', newTenant.id)
    localStorage.setItem('barber_logged_tenant', JSON.stringify(normalizedTenant))
    try { localStorage.setItem('barber_preferred_country', normalizedTenant.country) } catch (e) {}
    setIsAuthModalOpen(false)
    cleanUrlAuthParams()

    await pushTenantUpsertToServer(normalizedTenant, true)
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
    if (!c.last_visit) return false
    const last = new Date(c.last_visit + 'T00:00:00')
    const days = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
    const cycle = c.cycle_days || retargetingConfig.defaultCycleDays || 15
    return days >= cycle
  }).length

  // Clients CRUD (timestamps + unified deletedIds.clients tombstones)
  const handleAddClient = (newClient) => {
    const nowTs = Date.now()
    if (newClient?.id && (deletedIdsRef.current?.clients || []).includes(newClient.id)) {
      const nextDel = removeDeletedIds(deletedIdsRef.current, 'clients', [newClient.id])
      deletedIdsRef.current = nextDel
      setDeletedIds(nextDel)
    }
    setClients(prev => [{ ...newClient, updatedAt: nowTs }, ...prev])
  }

  const handleUpdateClient = (updatedClient) => {
    const nowTs = Date.now()
    setClients(prev => prev.map(c => c.id === updatedClient.id ? { ...updatedClient, updatedAt: nowTs } : c))
  }

  const handleDeleteClient = (clientId) => {
    recordWorkspaceDeletion('clients', [clientId])
    setClients(prev => prev.filter(c => c.id !== clientId))
  }

  // Appointments CRUD
  const handleAddAppointment = async (newApt) => {
    const nowTs = Date.now()
    setAppointments(prev => [{ ...newApt, updatedAt: nowTs }, ...prev])

    if (newApt.client_name && newApt.client_name !== 'Cliente Mostrador') {
      setClients(prev => {
        const found = prev.find(c => c.name.toLowerCase() === newApt.client_name.toLowerCase())
        if (found) {
          return prev.map(c => c.id === found.id ? {
            ...c,
            phone: newApt.client_phone || c.phone,
            updatedAt: nowTs
          } : c)
        } else {
          return [{
            id: 'c_' + nowTs,
            name: newApt.client_name,
            phone: newApt.client_phone || '',
            debt_usd: 0,
            plan: 'Cliente Regular',
            last_visit: '',
            last_service: 'Cita Agendada',
            last_staff: newApt.staff_name || 'Agenda Web',
            cycle_days: retargetingConfig.defaultCycleDays || 15,
            visits_count: 0,
            updatedAt: nowTs
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
    const nowTs = Date.now()
    setAppointments(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = forcedStatus || (a.status === 'pendiente' ? 'en_atencion' : a.status === 'en_atencion' ? 'completada' : 'pendiente')
        return { ...a, status: nextStatus, updatedAt: nowTs }
      }
      return a
    }))
  }

  const isActiveIncomeTx = (tx) =>
    Boolean(tx && tx.type !== 'egreso' && tx.type !== 'vale' && tx.type !== 'liquidacion' && Number(tx.total_cobrado_usd ?? tx.monto_usd ?? 0) > 0)

  const handleChargeAppointment = (apt) => {
    if (apt?.id && (transactions || []).some(t => isActiveIncomeTx(t) && t.appointment_id === apt.id)) {
      alert('⚠️ Este turno ya fue cobrado en Caja. Si necesitas corregirlo, anula primero el cobro anterior desde Caja del Día.')
      return
    }
    setCashModalPrefill({
      appointmentId: apt.id,
      clientName: apt.client_name,
      clientPhone: apt.client_phone || '',
      staffId: apt.staff_id,
      serviceName: apt.service,
      servicesList: Array.isArray(apt.services_list) && apt.services_list.length > 0 ? apt.services_list : null,
      totalPriceUsd: apt.total_price_usd ?? null
    })
    setIsCashModalOpen(true)
  }

  const handleDeleteAppointment = (id) => {
    recordWorkspaceDeletion('appointments', [id])
    setAppointments(prev => prev.filter(a => a.id !== id))
  }

  // Transactions CRUD
  const handleRegisterTransaction = async (newTx) => {
    const nowTs = Date.now()
    const currentTxs = transactions || []

    // Candado 1: evitar doble cobro sobre la misma cita (multi-dispositivo / botones)
    if (newTx?.appointment_id && currentTxs.some(t => isActiveIncomeTx(t) && t.appointment_id === newTx.appointment_id)) {
      alert('⚠️ Este turno ya tiene un cobro registrado en Caja. Se bloqueó el cobro duplicado.')
      return false
    }

    // Candado 2: evitar doble envío idéntico accidental en menos de 60 segundos
    if (isActiveIncomeTx(newTx)) {
      const newAmt = Math.round(Number(newTx.total_cobrado_usd ?? newTx.monto_usd ?? 0) * 100)
      const newClient = String(newTx.client_name || '').trim().toLowerCase()
      const newItem = String(newTx.item_name || '').trim().toLowerCase()
      const recentDup = currentTxs.find(t => {
        if (!isActiveIncomeTx(t)) return false
        const tTs = new Date(t.fecha || 0).getTime()
        if (!Number.isFinite(tTs) || Math.abs(nowTs - tTs) >= 60000) return false
        return (
          String(t.client_name || '').trim().toLowerCase() === newClient &&
          (t.staff_id || null) === (newTx.staff_id || null) &&
          String(t.item_name || '').trim().toLowerCase() === newItem &&
          Math.round(Number(t.total_cobrado_usd ?? t.monto_usd ?? 0) * 100) === newAmt
        )
      })
      if (recentDup) {
        const diffMs = Math.abs(nowTs - new Date(recentDup.fecha || 0).getTime())
        if (diffMs < 8000) {
          return false
        }
        const confirmDup = window.confirm(
          `⚠️ Acabas de registrar un cobro idéntico hace menos de 1 minuto para ${newTx.client_name || 'este cliente'}. ¿Seguro deseas registrarlo otra vez?`
        )
        if (!confirmDup) {
          return false
        }
      }
    }

    const stampedTx = { ...newTx, updatedAt: nowTs }
    setTransactions(prev => [stampedTx, ...prev])

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
      const countsAsServiceVisit = !isPureProductTx(newTx) && !isDebtSettlementTx(newTx)
      setClients(prev => {
        const found = prev.find(c => c.name.toLowerCase() === newTx.client_name.toLowerCase())
        const addedDebt = getTxMethodCollectedUSD(newTx, 'fiado')
        if (found) {
          return prev.map(c => c.id === found.id ? {
            ...c,
            phone: newTx.client_phone || c.phone,
            debt_usd: (c.debt_usd || 0) + addedDebt,
            ...(countsAsServiceVisit ? {
              last_visit: todayStr,
              last_service: newTx.item_name,
              last_staff: newTx.staff_name,
              visits_count: (c.visits_count || 0) + 1
            } : {}),
            updatedAt: nowTs
          } : c)
        } else {
          return [{
            id: 'c_' + nowTs,
            name: newTx.client_name,
            phone: newTx.client_phone || '',
            debt_usd: addedDebt,
            plan: 'Cliente Regular',
            last_visit: countsAsServiceVisit ? todayStr : '',
            last_service: countsAsServiceVisit
              ? newTx.item_name
              : (isPureProductTx(newTx) ? 'Compra de Productos' : 'Registro Directo'),
            last_staff: countsAsServiceVisit ? newTx.staff_name : 'Mostrador',
            cycle_days: retargetingConfig.defaultCycleDays || 15,
            visits_count: countsAsServiceVisit ? 1 : 0,
            updatedAt: nowTs
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
    return true
  }

  const handleRegisterExpense = async (newExpense) => {
    const taggedExpense = {
      ...newExpense,
      registered_by_role: isCashierMode ? 'cajero' : 'dueno',
      registered_by_name: activeOperator?.name || (isCashierMode ? 'Cajero' : 'Dueño'),
      registered_by_id: activeOperator?.id || null,
      updatedAt: Date.now()
    }
    setTransactions(prev => [taggedExpense, ...prev])

    if (taggedExpense.type === 'vale' || taggedExpense.category === 'Vale Empleado') {
      addAuditLog({
        type: 'VALE_CREATED',
        summary: `Vale entregado a ${taggedExpense.staff_name || 'personal'}: ${taggedExpense.motivo || 'Adelanto'}`,
        amountUsd: Math.abs(Number(taggedExpense.monto_usd) || 0)
      })
    } else if (taggedExpense.category !== 'Comisiones') {
      addAuditLog({
        type: 'EXPENSE_CREATED',
        summary: `Gasto registrado: ${taggedExpense.item_name}`,
        amountUsd: Math.abs(Number(taggedExpense.monto_usd) || 0)
      })
    }

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
    const idsToDelete = []
    if (txId) idsToDelete.push(txId)
    const targetTx = (transactions || []).find(t => t && t.id === txId)
    if (targetTx && targetTx.client_name) {
      const txDateIso = getLocalDateIso(targetTx.fecha)
      ;(clients || []).forEach(c => {
        if (c && c.id && c.name === targetTx.client_name && txDateIso && c.last_visit === txDateIso) {
          idsToDelete.push('rec_' + c.id)
        }
      })
    }
    recordWorkspaceDeletion('transactions', idsToDelete)
    setTransactions(prev => prev.filter(t => t.id !== txId))
  }

  const handleConfirmVoidTransaction = (tx, reason, authorizedBy = null) => {
    if (!tx) return
    addAuditLog({
      type: 'TX_VOIDED',
      summary: `${Number(tx.monto_usd) < 0 ? 'Gasto/Vale anulado' : 'Venta anulada'}: ${tx.item_name}`,
      reason,
      amountUsd: Math.abs(Number(tx.monto_usd) || 0),
      details: {
        authorizedBy,
        snapshot: {
          id: tx.id,
          item_name: tx.item_name,
          staff_name: tx.staff_name,
          client_name: tx.client_name,
          metodo_pago: tx.metodo_pago,
          monto_usd: tx.monto_usd,
          hora: tx.hora,
          fecha: tx.fecha
        }
      }
    })
    handleDeleteTransaction(tx.id)
    setOfflineToast('🛡️ Movimiento anulado y registrado en Bitácora de Auditoría')
    setTimeout(() => setOfflineToast(null), 3500)
  }

  const handleSaveDailyClose = (closingRecord) => {
    setDailyClosings(prev => {
      const filtered = prev.filter(c => c.id !== closingRecord.id)
      return [closingRecord, ...filtered]
    })
    addAuditLog({
      type: 'DAILY_CLOSE',
      summary: `Cierre de caja (${closingRecord.periodLabel || 'Hoy'})`,
      amountUsd: closingRecord.totalIncomeUSD,
      details: {
        cashInDrawerCounted: closingRecord.cashInDrawerCounted,
        expectedCashInDrawer: closingRecord.expectedCashInDrawer,
        differenceUSD: closingRecord.differenceUSD,
        blindMode: Boolean(closingRecord.blindMode)
      }
    })
    setOfflineToast('🔒 Cierre de jornada guardado en el historial con éxito')
    setTimeout(() => setOfflineToast(null), 3500)
  }

  const handleLiquidateStaff = (payoutTx, settledTxIds = [], settledValeIds = [], meta = {}) => {
    const nowTs = Date.now()
    const nowIso = new Date(nowTs).toISOString()
    const isCashierSettle = Boolean(meta && meta.isCashier)
    const stampedPayout = { ...payoutTx, updatedAt: nowTs }
    setTransactions(prev => {
      const updated = prev.map(t => {
        if (settledTxIds.includes(t.id)) {
          return isCashierSettle
            ? { ...t, cajero_comision_pagada: true, cajero_liquidado_at: nowIso, cajero_liquidado_pago_id: payoutTx.id, updatedAt: nowTs }
            : { ...t, comision_pagada: true, liquidado_at: nowIso, liquidado_pago_id: payoutTx.id, updatedAt: nowTs }
        }
        if (settledValeIds.includes(t.id)) {
          return { ...t, status: 'liquidado', liquidado_at: nowIso, liquidado_pago_id: payoutTx.id, updatedAt: nowTs }
        }
        return t
      })
      return [stampedPayout, ...updated]
    })
    addAuditLog({
      type: 'STAFF_LIQUIDATED',
      summary: `Liquidación pagada a ${payoutTx.staff_name || 'personal'}${isCashierSettle ? ' (Caja)' : ''}`,
      amountUsd: Math.abs(Number(payoutTx.monto_usd) || 0)
    })
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
    if (isDirectClientLink && publicTenantParam && !publicTenantWs && !publicTenantLoaded) {
      return (
        <div className="min-h-screen bg-dark-950 text-slate-200 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-400">Cargando agenda de turnos...</p>
          </div>
        </div>
      )
    }

    const matchedPublicTenant = publicTenantParam
      ? (Array.isArray(tenants) ? tenants.find(t => t && t.id === publicTenantParam) : null)
      : activeTenant

    const bookingNiche =
      (publicTenantWs?.currentNiche && NICHES[publicTenantWs.currentNiche] ? publicTenantWs.currentNiche : null) ||
      (matchedPublicTenant?.niche && NICHES[matchedPublicTenant.niche] ? matchedPublicTenant.niche : null) ||
      currentNiche
    const rawBookingProfile = (publicTenantWs && publicTenantWs.businessProfile) || (isDirectClientLink && publicTenantParam ? INITIAL_BUSINESS_PROFILE : businessProfile)
    const resolvedBookingCountry = matchedPublicTenant?.country || rawBookingProfile?.country
    const bookingProfile = (resolvedBookingCountry && rawBookingProfile?.country !== resolvedBookingCountry)
      ? { ...rawBookingProfile, country: resolvedBookingCountry }
      : rawBookingProfile
    const countryNiches = bookingProfile?.country === 'AR' ? NICHES_AR : NICHES
    const baseNicheObj = countryNiches[bookingNiche] || NICHES[bookingNiche] || nicheData
    const isolateDirectPublic = Boolean(isDirectClientLink && publicTenantParam)
    const bookingServices =
      (publicTenantWs?.servicesByNiche && publicTenantWs.servicesByNiche[bookingNiche]) ||
      (isolateDirectPublic ? baseNicheObj.services : (servicesByNiche[bookingNiche] || currentServices))
    const bookingStaff =
      (publicTenantWs?.staffByNiche && publicTenantWs.staffByNiche[bookingNiche]) ||
      (isolateDirectPublic ? baseNicheObj.staff : (staffByNiche[bookingNiche] || currentStaff))
    const bookingProducts =
      (publicTenantWs?.productsByNiche && publicTenantWs.productsByNiche[bookingNiche]) ||
      (isolateDirectPublic ? baseNicheObj.products : (productsByNiche[bookingNiche] || currentProducts))
    const bookingAppointments =
      (publicTenantWs && publicTenantWs.appointments) ||
      (isolateDirectPublic ? [] : appointments)
    const bookingExchangeRate = (publicTenantWs && publicTenantWs.exchangeRate && !isNaN(Number(publicTenantWs.exchangeRate)))
      ? Number(publicTenantWs.exchangeRate)
      : exchangeRate

    const bookingNicheData = {
      ...baseNicheObj,
      nicheId: bookingNiche,
      staff: bookingStaff,
      services: bookingServices,
      products: bookingProducts
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
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans pb-safe-main overflow-x-clip">
      
      {/* Top Navigation */}
      <Navbar
        currentNiche={currentNiche}
        onSelectNiche={handleSelectNiche}
        exchangeRate={exchangeRate}
        onOpenRateModal={() => setIsRateModalOpen(true)}
        onOpenCashModal={() => setIsCashModalOpen(true)}
        onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        onOpenDailyCloseModal={handleOpenDailyCloseModal}
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
        securityConfig={securityConfig}
        isCashierMode={isCashierMode}
        activeOperator={activeOperator}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        onQuickLockCashier={() => {
          ownerUnlockedThisSessionRef.current = false
          setIsCashierMode(true)
          setIsRoleModalOpen(true)
        }}
        hasCashierStaff={allCashiersAcrossNiches.length > 0}
        todayAuditAlertCount={todayAuditAlertCount}
        fontScale={fontScale}
        onChangeFontScale={setFontScale}
        onCycleFontScale={handleCycleFontScale}
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
            ...(!isCashierMode ? [{ id: 'commissions', label: `Equipo y Comisiones`, icon: Users }] : []),
            { id: 'debts', label: 'Clientes, Fiados & VIP', icon: AlertCircle },
            { id: 'inventory', label: 'Pomadas & Insumos', icon: Package },
            ...(!isCashierMode ? [{ id: 'monthly', label: 'Cuentas Mes a Mes', icon: BarChart3 }] : []),
            ...(!isCashierMode && (securityConfig.enabled || auditLogs.length > 0) ? [{ id: 'audit', label: 'Auditoría (Caja Negra)', icon: ShieldCheck, alertCount: todayAuditAlertCount }] : []),
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
              onClick={() => handleOpenDailyCloseModal('today')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 text-xs font-bold transition-all text-left shadow-sm"
              title="Realizar el Cuadre y Arqueo Físico de Caja"
            >
              <Calculator className="w-4 h-4 shrink-0 text-purple-400" />
              <span>Cuadre Diario (Arqueo)</span>
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="lg:hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-bold transition-all text-left shadow-sm"
              title="Enviar Cierre Diario por WhatsApp"
            >
              <MessageSquare className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Cierre WhatsApp</span>
            </button>

            {!isCashierMode && (
              <>
                <button
                  onClick={() => handleOpenDailyCloseModal('this_week')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 text-xs font-bold transition-all text-left shadow-sm"
                  title="Realizar el Cuadre y Cierre Semanal de Caja"
                >
                  <Calendar className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>Cuadre Semanal</span>
                </button>

                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white border border-dark-750 text-xs font-semibold transition-all text-left"
                  title="Subir Logo, cambiar nombre, WhatsApp, seguridad y roles"
                >
                  <Settings className="w-4 h-4 shrink-0 text-gold-400" />
                  <span>Configuración & PIN</span>
                </button>
              </>
            )}
          </div>

          {/* Clean Workspace Button for Owner Only */}
          {!isCashierMode && (
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
          )}
        </aside>

        {/* Dynamic View Body */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              exchangeRate={exchangeRate}
              businessProfile={businessProfile}
              onOpenCashModal={() => setIsCashModalOpen(true)}
              onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
              onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
              onOpenDailyCloseModal={handleOpenDailyCloseModal}
              onDeleteTransaction={handleDeleteTransaction}
              onRequestVoidTransaction={(tx) => setVoidingTx(tx)}
              nicheData={nicheData}
              isCashierMode={isCashierMode}
              securityConfig={securityConfig}
            />
          )}

          {activeTab === 'catalogo' && (
            <CatalogConfigView
              tenantId={activeTenantId}
              businessProfile={businessProfile}
              onSaveProfile={handleSaveBusinessProfile}
              services={currentServices}
              onAddService={handleAddService}
              onUpdateService={handleUpdateService}
              onDeleteService={handleDeleteService}
              exchangeRate={exchangeRate}
              onOpenPublicPreview={() => setIsPublicPreview(true)}
              isCashierMode={isCashierMode}
            />
          )}

          {activeTab === 'retargeting' && (
            <RetargetingView
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={isCashierMode ? null : handleDeleteClient}
              retargetingConfig={retargetingConfig}
              onSaveRetargetingConfig={setRetargetingConfig}
              businessProfile={businessProfile}
            />
          )}

          {activeTab === 'commissions' && !isCashierMode && (
            <CommissionsView
              staffList={currentStaff}
              servicesList={nicheData.services || []}
              rolePlural={nicheData.rolePlural}
              roleName={nicheData.roleName}
              transactions={transactions}
              exchangeRate={exchangeRate}
              businessProfile={businessProfile}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onRegisterExpense={handleRegisterExpense}
              onLiquidateStaff={handleLiquidateStaff}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsView
              appointments={appointments}
              transactions={transactions}
              nicheData={nicheData}
              onAddAppointment={handleAddAppointment}
              onToggleAppointmentStatus={handleToggleAppointmentStatus}
              onDeleteAppointment={isCashierMode ? null : handleDeleteAppointment}
              clients={clients}
              businessProfile={businessProfile}
              onOpenSettings={isCashierMode ? null : () => setIsSettingsModalOpen(true)}
              onChargeAppointment={handleChargeAppointment}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsClientsView
              clients={clients}
              exchangeRate={exchangeRate}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={isCashierMode ? null : handleDeleteClient}
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
              isCashierMode={isCashierMode}
            />
          )}

          {activeTab === 'monthly' && !isCashierMode && (
            <MonthlyReportView
              transactions={transactions}
              exchangeRate={exchangeRate}
              dailyClosings={dailyClosings}
              businessProfile={businessProfile}
              staffList={currentStaff}
              onDeleteTransaction={handleDeleteTransaction}
              onRequestVoidTransaction={(tx) => setVoidingTx(tx)}
            />
          )}

          {activeTab === 'audit' && !isCashierMode && (
            <AuditLogView
              auditLogs={auditLogs}
              businessProfile={businessProfile}
              onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
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
        businessProfile={businessProfile}
        onRegisterTransaction={handleRegisterTransaction}
        clients={clients}
        onAddClient={handleAddClient}
        prefillData={cashModalPrefill}
        isCashierMode={isCashierMode}
        securityConfig={securityConfig}
        activeOperator={activeOperator}
      />

      <QuickExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        exchangeRate={exchangeRate}
        businessProfile={businessProfile}
        staffList={currentStaff}
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
        businessProfile={businessProfile}
      />

      <BusinessSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        businessProfile={businessProfile}
        onSaveProfile={handleSaveBusinessProfile}
        activeTenant={activeTenant}
        fontScale={fontScale}
        onChangeFontScale={setFontScale}
        currentNiche={currentNiche}
        onSelectNiche={handleSelectNiche}
      />

      <DailyCloseModal
        isOpen={isDailyCloseModalOpen}
        onClose={() => setIsDailyCloseModalOpen(false)}
        transactions={transactions}
        exchangeRate={exchangeRate}
        nicheData={nicheData}
        businessProfile={businessProfile}
        staffList={currentStaff}
        onSaveDailyClose={handleSaveDailyClose}
        onResetDay={handleSaveDailyClose}
        initialPeriod={dailyClosePeriod}
        isCashierMode={isCashierMode}
        securityConfig={securityConfig}
        auditLogs={auditLogs}
        activeOperator={activeOperator}
      />

      <RolePinModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        securityConfig={securityConfig}
        staffList={allCashiersWithCurrentStaff}
        isCashierMode={isCashierMode}
        activeOperator={activeOperator}
        isAr={isArgentina(activeTenant, businessProfile)}
        onSwitchToOwner={() => {
          if (activeTenantId) clearCashierLoginSession(activeTenantId)
          ownerUnlockedThisSessionRef.current = true
          setIsCashierMode(false)
          setActiveOperator(null)
          addAuditLog({
            type: 'ROLE_SWITCH',
            actorName: 'Dueño',
            actorRole: 'dueno',
            summary: 'Sesión desbloqueada en Modo Dueño'
          })
        }}
        onSwitchToCashier={(op) => {
          if (activeTenantId && op) setCashierLoginSession(activeTenantId, op)
          ownerUnlockedThisSessionRef.current = false
          setIsCashierMode(true)
          setActiveOperator(op)
          addAuditLog({
            type: 'ROLE_SWITCH',
            actorName: op?.name || 'Cajero',
            actorRole: 'cajero',
            summary: `Turno iniciado en Modo Cajero (${op?.name || 'Recepción'})`
          })
        }}
        onLogPinFailed={(detailSummary) => {
          addAuditLog({
            type: 'PIN_FAILED',
            summary: detailSummary
          })
        }}
      />

      <VoidTransactionModal
        isOpen={Boolean(voidingTx)}
        transaction={voidingTx}
        onClose={() => setVoidingTx(null)}
        onConfirmVoid={handleConfirmVoidTransaction}
        onLogPinFailed={(detailSummary) => {
          addAuditLog({
            type: 'PIN_FAILED',
            summary: detailSummary
          })
        }}
        isCashierMode={isCashierMode}
        securityConfig={securityConfig}
        businessProfile={businessProfile}
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

      {/* Floating Tactical AI Copilot Widget */}
      <CopilotChatWidget
        activeTenant={activeTenant}
        businessProfile={businessProfile}
        transactions={transactions}
        clients={clients}
        appointments={appointments}
        exchangeRate={exchangeRate}
        currentNiche={currentNiche}
        isCashierMode={isCashierMode}
        securityConfig={securityConfig}
      />

    </div>
  )
}
