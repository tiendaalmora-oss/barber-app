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
import { TrendingUp, Users, Calendar, AlertCircle, Package, BarChart3, Globe, BellRing, Crown, Trash2, Sparkles, Settings, Calculator } from 'lucide-react'

export default function App() {
  // Check URL parameters (?reserva=1, ?registro=1, ?login=1) and Domain Isolation
  const searchParams = typeof window !== 'undefined' ? window.location.search : ''
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const isDirectClientLink = searchParams.includes('reserva=1')
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
  const [currentNiche, setCurrentNiche] = useState('barberia')
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

  const [tenants, setTenants] = useState(() => {
    const savedV2 = localStorage.getItem('barber_saas_tenants_v2')
    if (savedV2) return JSON.parse(savedV2)

    // Migrate any real accounts created by user in v1 while removing fake demo accounts
    const oldSaved = localStorage.getItem('barber_saas_tenants')
    if (oldSaved) {
      try {
        const parsed = JSON.parse(oldSaved)
        const realUserAccounts = parsed.filter(
          t => !['ten_1', 'ten_2', 'ten_3', 'ten_4'].includes(t.id)
        )
        return [...realUserAccounts, ...INITIAL_SAAS_TENANTS]
      } catch (e) {
        return INITIAL_SAAS_TENANTS
      }
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

  // Local-first persistent state
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem('barber_rate')
    return saved ? parseFloat(saved) : 53.00
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
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isDailyCloseModalOpen, setIsDailyCloseModalOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState('local')

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
      productsByNiche
    }
    // 1. Save in local browser storage isolated for this tenant
    localStorage.setItem(`barber_ws_${activeTenantId}`, JSON.stringify(ws))
    // 2. Backward compatibility with legacy global keys
    localStorage.setItem('barber_transactions', JSON.stringify(transactions))
    localStorage.setItem('barber_clients_v2', JSON.stringify(clients))
    localStorage.setItem('barber_appointments', JSON.stringify(appointments))
    localStorage.setItem('barber_profile', JSON.stringify(businessProfile))

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
  }, [activeTenantId, transactions, clients, appointments, businessProfile, staffByNiche, servicesByNiche, productsByNiche])

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

  // --- REAL-TIME MULTI-DEVICE SERVER SYNC (Phone <-> PC) ---
  const fetchServerBootstrap = async () => {
    try {
      const res = await fetch('/api/bootstrap', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.tenants)) {
          setTenants(data.tenants)
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
    // 1. Upload any existing local accounts from this browser (phone or PC) to server DB so nothing is lost
    const syncInitial = async () => {
      try {
        const res = await fetch('/api/tenants/sync-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenants })
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.tenants)) setTenants(data.tenants)
          if (data.saasConfig) setSaasConfig(data.saasConfig)
        }
      } catch (e) {
        fetchServerBootstrap()
      }
    }
    syncInitial()

    // 2. Poll every 3 seconds so PC Admin and Phone stay 100% synchronized in real time
    const interval = setInterval(fetchServerBootstrap, 3000)
    return () => clearInterval(interval)
  }, [])

  const pushTenantUpsertToServer = async (tenantObj) => {
    try {
      const res = await fetch('/api/tenants/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant: tenantObj })
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.tenants)) setTenants(data.tenants)
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

    setTenants(prev => [newTenant, ...prev])
    setActiveTenantId(newTenant.id)
    setCachedActiveTenant(newTenant)
    localStorage.setItem('barber_logged_tenant_id', newTenant.id)
    localStorage.setItem('barber_logged_tenant', JSON.stringify(newTenant))
    setIsAuthModalOpen(false)
    cleanUrlAuthParams()

    await pushTenantUpsertToServer(newTenant)
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
    setTenants(prev => prev.filter(t => t.id !== tenantId))
    try {
      const res = await fetch('/api/tenants/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tenantId })
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.tenants)) setTenants(data.tenants)
      }
    } catch (e) {
      console.warn('Offline delete')
    }
  }

  const handleClearDemoTenants = () => {
    const demoIds = ['ten_1', 'ten_2', 'ten_3', 'ten_4']
    setTenants(prev => prev.filter(t => !demoIds.includes(t.id)))
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

  const handleToggleAppointmentStatus = (id) => {
    setAppointments(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'pendiente' ? 'en_atencion' : a.status === 'en_atencion' ? 'completada' : 'pendiente'
        return { ...a, status: nextStatus }
      }
      return a
    }))
  }

  const handleDeleteAppointment = (id) => {
    setAppointments(prev => prev.filter(a => a.id !== id))
  }

  // Transactions CRUD
  const handleRegisterTransaction = async (newTx) => {
    setTransactions(prev => [newTx, ...prev])

    // If a product from inventory was sold, subtract 1 from stock
    if (newTx.product_id) {
      setProductsByNiche(prev => ({
        ...prev,
        [currentNiche]: (prev[currentNiche] || []).map(p =>
          p.id === newTx.product_id ? { ...p, stock: Math.max(0, (p.stock || 0) - 1) } : p
        )
      }))
    }

    const todayStr = new Date().toISOString().split('T')[0]

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

    if (isSupabaseConfigured()) {
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
    }
  }

  const handleRegisterExpense = async (newExpense) => {
    setTransactions(prev => [newExpense, ...prev])

    if (isSupabaseConfigured()) {
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
    return (
      <PublicBookingView
        businessProfile={businessProfile}
        nicheData={nicheData}
        customServices={[]}
        exchangeRate={exchangeRate}
        appointments={appointments}
        onBookAppointment={handleAddAppointment}
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
  if (activeTenant.status !== 'activo') {
    return (
      <SubscriptionLockView
        tenant={activeTenant}
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
        onLogout={handleLogout}
        onUpdateTenant={handleUpdateTenant}
        activeTenant={activeTenant}
        businessProfile={businessProfile}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

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
              onClearAllData={() => {
                if (confirm('¿Dejar toda la caja, clientes y turnos en CERO para empezar de verdad?')) {
                  handleClearAllWorkspaceData()
                }
              }}
              onLoadDemoData={handleLoadDemoWorkspaceData}
              isDemoAccount={activeTenant?.email === 'demo@ingenioos.online' || activeTenantId === 'ten_1'}
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
            />
          )}

          {activeTab === 'debts' && (
            <DebtsClientsView
              clients={clients}
              exchangeRate={exchangeRate}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
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
        onClose={() => setIsCashModalOpen(false)}
        nicheData={nicheData}
        exchangeRate={exchangeRate}
        onRegisterTransaction={handleRegisterTransaction}
        clients={clients}
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
        onResetDailyTransactions={() => {
          setTransactions([])
          localStorage.setItem('barber_transactions', JSON.stringify([]))
        }}
      />

    </div>
  )
}
