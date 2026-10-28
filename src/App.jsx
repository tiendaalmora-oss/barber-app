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
import { TrendingUp, Users, Calendar, AlertCircle, Package, BarChart3, Globe, BellRing, Crown } from 'lucide-react'

export default function App() {
  // Check URL parameters (?reserva=1 or ?admin=1)
  const isDirectClientLink = typeof window !== 'undefined' && window.location.search.includes('reserva=1')
  const isDirectAdminLink = typeof window !== 'undefined' && window.location.search.includes('admin=1')

  // Global state
  const [currentNiche, setCurrentNiche] = useState('barberia')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isPublicPreview, setIsPublicPreview] = useState(isDirectClientLink)
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(isDirectAdminLink)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // SaaS Multi-Tenant & Subscription State
  const [saasConfig, setSaasConfig] = useState(() => {
    const saved = localStorage.getItem('barber_saas_config')
    return saved ? JSON.parse(saved) : INITIAL_SAAS_CONFIG
  })

  const [tenants, setTenants] = useState(() => {
    const saved = localStorage.getItem('barber_saas_tenants')
    return saved ? JSON.parse(saved) : INITIAL_SAAS_TENANTS
  })

  const [activeTenantId, setActiveTenantId] = useState(() => {
    return localStorage.getItem('barber_active_tenant_id') || 'ten_1'
  })

  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0]

  // Local-first persistent state
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem('barber_rate')
    return saved ? parseFloat(saved) : 53.00
  })

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('barber_transactions')
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS
  })

  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('barber_clients_v2')
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS
  })

  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem('barber_appointments')
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS
  })

  const [businessProfile, setBusinessProfile] = useState(() => {
    const saved = localStorage.getItem('barber_profile')
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_PROFILE
  })

  const [customServices, setCustomServices] = useState(() => {
    const saved = localStorage.getItem('barber_custom_services')
    return saved ? JSON.parse(saved) : []
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
  const [syncStatus, setSyncStatus] = useState('local')

  // Current niche metadata
  const nicheData = NICHES[currentNiche]

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('barber_rate', exchangeRate.toString())
  }, [exchangeRate])

  useEffect(() => {
    localStorage.setItem('barber_transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem('barber_clients_v2', JSON.stringify(clients))
  }, [clients])

  useEffect(() => {
    localStorage.setItem('barber_appointments', JSON.stringify(appointments))
  }, [appointments])

  useEffect(() => {
    localStorage.setItem('barber_profile', JSON.stringify(businessProfile))
  }, [businessProfile])

  useEffect(() => {
    localStorage.setItem('barber_custom_services', JSON.stringify(customServices))
  }, [customServices])

  useEffect(() => {
    localStorage.setItem('barber_retargeting_config', JSON.stringify(retargetingConfig))
  }, [retargetingConfig])

  useEffect(() => {
    localStorage.setItem('barber_saas_config', JSON.stringify(saasConfig))
  }, [saasConfig])

  useEffect(() => {
    localStorage.setItem('barber_saas_tenants', JSON.stringify(tenants))
  }, [tenants])

  useEffect(() => {
    localStorage.setItem('barber_active_tenant_id', activeTenantId)
  }, [activeTenantId])

  // Handlers for SaaS Tenants
  const handleSelectTenant = (tenant) => {
    setActiveTenantId(tenant.id)
    if (tenant.niche && NICHES[tenant.niche]) {
      setCurrentNiche(tenant.niche)
    }
    setBusinessProfile(prev => ({
      ...prev,
      businessName: tenant.businessName,
      whatsapp: tenant.phone || prev.whatsapp
    }))
  }

  const handleRegisterNewTenant = async (newTenant) => {
    setTenants(prev => [newTenant, ...prev])
    handleSelectTenant(newTenant)

    // Sync new business to Supabase gestion_negocios.negocios
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('negocios').insert([{
          nombre: `${newTenant.businessName} (${newTenant.email})`,
          tipo_nicho: newTenant.niche || 'barberia',
          estado_suscripcion: newTenant.status === 'activo' ? 'activo' : 'vencido',
          tasa_bcv_actual: exchangeRate
        }])
      } catch (e) {
        console.warn('Tenant saved locally')
      }
    }
  }

  const handleUpdateTenant = (updated) => {
    setTenants(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const handleReportPaymentRef = (tenantId, refString) => {
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, lastPaymentRef: refString } : t))
  }

  // Calculate how many clients are due for retargeting (for sidebar badge)
  const overdueClientsCount = clients.filter(c => {
    if (!c.last_visit) return true
    const last = new Date(c.last_visit + 'T00:00:00')
    const days = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
    const cycle = c.cycle_days || retargetingConfig.defaultCycleDays || 15
    return days >= cycle
  }).length

  const handleUpdateClient = (updatedClient) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c))
  }

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

  const handleRegisterTransaction = async (newTx) => {
    setTransactions(prev => [newTx, ...prev])

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

  // 1. If in Super-Admin Mode (Owner SaaS Control Panel)
  if (isSuperAdminOpen) {
    return (
      <SuperAdminView
        tenants={tenants}
        onUpdateTenant={handleUpdateTenant}
        onAddTenant={handleRegisterNewTenant}
        saasConfig={saasConfig}
        onSaveSaasConfig={setSaasConfig}
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
        customServices={customServices}
        exchangeRate={exchangeRate}
        appointments={appointments}
        onBookAppointment={handleAddAppointment}
        isOwnerPreview={!isDirectClientLink}
        onExitPreview={() => setIsPublicPreview(false)}
      />
    )
  }

  // 3. If Active Tenant has NOT paid upfront ('pendiente_pago') or is expired ('vencido') -> Lock Screen with 7-Day Guarantee
  if (activeTenant && activeTenant.status !== 'activo') {
    return (
      <>
        <SubscriptionLockView
          tenant={activeTenant}
          saasConfig={saasConfig}
          exchangeRate={exchangeRate}
          onReportPaymentRef={handleReportPaymentRef}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSwitchToDemo={() => {
            const firstActive = tenants.find(t => t.status === 'activo') || tenants[0]
            handleSelectTenant(firstActive)
          }}
          onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
        />
        <AuthPortalModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          tenants={tenants}
          saasConfig={saasConfig}
          onLoginSuccess={handleSelectTenant}
          onRegisterTenant={handleRegisterNewTenant}
          onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
        />
      </>
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
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeTenant={activeTenant}
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
            { id: 'commissions', label: `Comisiones (${nicheData.rolePlural})`, icon: Users },
            { id: 'debts', label: 'Fiados & Membresías', icon: AlertCircle },
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

          {/* Owner SaaS Control Button */}
          <div className="pt-4 mt-auto space-y-2">
            <button
              onClick={() => setIsSuperAdminOpen(true)}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 border border-purple-500/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between text-xs font-black text-purple-300 group-hover:text-white">
                <span className="flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-gold-400" />
                  <span>Panel Super-Admin</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">
                  SaaS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Activar clientes (+30d), correos y control de pagos
              </p>
            </button>

            <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-[11px] text-slate-400 space-y-1 shadow-md">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Guarda sin Internet</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Respaldo automático en el teléfono y en la nube.
              </p>
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
              nicheData={nicheData}
            />
          )}

          {activeTab === 'catalogo' && (
            <CatalogConfigView
              businessProfile={businessProfile}
              onSaveProfile={setBusinessProfile}
              nicheData={nicheData}
              customServices={customServices}
              onAddCustomService={(svc) => setCustomServices(prev => [svc, ...prev])}
              onRemoveCustomService={(id) => setCustomServices(prev => prev.filter(s => s.id !== id))}
              exchangeRate={exchangeRate}
              onOpenPublicPreview={() => setIsPublicPreview(true)}
            />
          )}

          {activeTab === 'retargeting' && (
            <RetargetingView
              clients={clients}
              onUpdateClient={handleUpdateClient}
              retargetingConfig={retargetingConfig}
              onSaveRetargetingConfig={setRetargetingConfig}
              businessProfile={businessProfile}
            />
          )}

          {activeTab === 'commissions' && (
            <CommissionsView
              nicheData={nicheData}
              transactions={transactions}
              exchangeRate={exchangeRate}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsView
              appointments={appointments}
              nicheData={nicheData}
              onAddAppointment={handleAddAppointment}
              onToggleAppointmentStatus={handleToggleAppointmentStatus}
              clients={clients}
              businessProfile={businessProfile}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsClientsView
              clients={clients}
              exchangeRate={exchangeRate}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={nicheData.products}
              exchangeRate={exchangeRate}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyReportView
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

      <AuthPortalModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        tenants={tenants}
        saasConfig={saasConfig}
        onLoginSuccess={handleSelectTenant}
        onRegisterTenant={handleRegisterNewTenant}
        onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
      />

    </div>
  )
}
