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
import QuickCashModal from './components/QuickCashModal'
import QuickExpenseModal from './components/QuickExpenseModal'
import ExchangeRateModal from './components/ExchangeRateModal'
import WhatsAppCloseModal from './components/WhatsAppCloseModal'
import { NICHES, INITIAL_CLIENTS, INITIAL_APPOINTMENTS, INITIAL_TRANSACTIONS, INITIAL_BUSINESS_PROFILE } from './lib/mockData'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { TrendingUp, Users, Calendar, AlertCircle, Package, BarChart3, Globe } from 'lucide-react'

export default function App() {
  // Check if opened via public booking link (?reserva=1)
  const isDirectClientLink = typeof window !== 'undefined' && window.location.search.includes('reserva=1')

  // Global state
  const [currentNiche, setCurrentNiche] = useState('barberia')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isPublicPreview, setIsPublicPreview] = useState(isDirectClientLink)
  
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
    const saved = localStorage.getItem('barber_clients')
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
    localStorage.setItem('barber_appointments', JSON.stringify(appointments))
  }, [appointments])

  useEffect(() => {
    localStorage.setItem('barber_profile', JSON.stringify(businessProfile))
  }, [businessProfile])

  useEffect(() => {
    localStorage.setItem('barber_custom_services', JSON.stringify(customServices))
  }, [customServices])

  const handleAddAppointment = async (newApt) => {
    setAppointments(prev => [newApt, ...prev])

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

    // If fiado, update client debt
    if (newTx.metodo_pago === 'fiado') {
      setClients(prev => {
        const found = prev.find(c => c.name.toLowerCase() === newTx.client_name.toLowerCase())
        if (found) {
          return prev.map(c => c.id === found.id ? { ...c, debt_usd: c.debt_usd + newTx.monto_usd } : c)
        } else {
          return [...prev, {
            id: 'c_' + Date.now(),
            name: newTx.client_name,
            phone: '+584120000000',
            debt_usd: newTx.monto_usd,
            plan: 'Cliente Regular'
          }]
        }
      })
    }

    // Try Supabase sync
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

  // If in Public Landing Mode (either via ?reserva=1 or Owner Preview)
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
            { id: 'catalogo', label: 'Mi Link & Catálogo', icon: Globe, badge: 'NUEVO' },
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
              </button>
            )
          })}

          {/* Sync indicator footer in sidebar */}
          <div className="pt-6 mt-auto">
            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 text-[11px] text-slate-400 space-y-1.5 shadow-md">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Guarda sin Internet</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Si se va la luz o los datos en el local, todo se guarda en la memoria del teléfono y se sincroniza después.
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

    </div>
  )
}
