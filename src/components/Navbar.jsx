import React, { useState, useEffect } from 'react'
import { 
  Scissors, Sparkles, Store, Plus, Minus, Calendar, TrendingUp, Users, Package, 
  AlertCircle, BarChart3, MessageSquare, Globe, BellRing, LogOut, Fingerprint, 
  Check, Settings, Calculator, Wifi, WifiOff, Zap, Menu, X, MoreHorizontal, 
  ChevronRight, ShieldCheck, DollarSign
} from 'lucide-react'
import { isBiometricSupported, registerBiometricCredential } from '../lib/biometrics'

export default function Navbar({ 
  currentNiche, 
  onSelectNiche, 
  exchangeRate, 
  onOpenRateModal, 
  onOpenCashModal, 
  onOpenExpenseModal,
  onOpenWhatsAppModal,
  onOpenDailyCloseModal,
  onOpenSettingsModal,
  onOpenPaymentModal,
  onLogout,
  onUpdateTenant,
  activeTenant,
  businessProfile,
  activeTab,
  onSelectTab,
  isOnline = true,
  syncStatus,
  overdueClientsCount = 0,
  showReconnectedBanner = false
}) {
  const [bioSupported, setBioSupported] = useState(false)
  const [bioLinked, setBioLinked] = useState(Boolean(activeTenant?.biometricEnabled))
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false)

  useEffect(() => {
    isBiometricSupported().then(setBioSupported)
    try {
      const saved = localStorage.getItem('barber_biometric_binding')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.tenantId === activeTenant?.id) setBioLinked(true)
      }
    } catch (e) {}
  }, [activeTenant])

  const handleLinkFingerprint = async () => {
    if (!activeTenant) return
    try {
      const credId = await registerBiometricCredential({
        userId: activeTenant.id,
        email: activeTenant.email,
        displayName: activeTenant.businessName
      })
      const binding = {
        tenantId: activeTenant.id,
        email: activeTenant.email,
        businessName: activeTenant.businessName,
        credentialId: credId
      }
      localStorage.setItem('barber_biometric_binding', JSON.stringify(binding))
      setBioLinked(true)
      if (onUpdateTenant) {
        onUpdateTenant({ ...activeTenant, biometricCredentialId: credId, biometricEnabled: true })
      }
      alert('✅ ¡Huella / FaceID vinculada con éxito en este teléfono! La próxima vez podrás entrar tocando el botón de Huella.')
    } catch (e) {
      alert('No se completó el registro de huella en este dispositivo.')
    }
  }

  const nicheIcons = {
    barberia: <Scissors className="w-4 h-4 text-gold-400" />,
    estetica: <Sparkles className="w-4 h-4 text-pink-400" />,
    mixto: <Store className="w-4 h-4 text-purple-400" />
  }

  const nicheNames = {
    barberia: activeTenant?.businessName || 'Mi Barbería',
    estetica: activeTenant?.businessName || 'Mi Peluquería & Salón',
    mixto: activeTenant?.businessName || 'Barbería & Salón (Mixto)'
  }

  return (
    <>
      {/* HEADER SUPERIOR ÚNICO (Elegante y Limpio) */}
      <header className="sticky top-0 z-30 bg-dark-900/90 backdrop-blur-xl border-b border-dark-800/80 px-3 sm:px-6 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onOpenSettingsModal}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-dark-800/80 border border-dark-700/70 hover:border-gold-500/50 shadow-inner flex items-center justify-center overflow-hidden shrink-0 transition-all group"
              title="Cambiar Logo y datos del negocio"
            >
              {businessProfile?.logoUrl ? (
                <img src={businessProfile.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform" />
              ) : (
                nicheIcons[currentNiche] || <Scissors className="w-4 h-4 text-gold-400" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSettingsModal}
                  className="font-black text-sm sm:text-base text-white hover:text-gold-400 tracking-tight truncate text-left transition-colors"
                >
                  {businessProfile?.businessName || nicheNames[currentNiche] || 'Mi Negocio'}
                </button>
                {activeTenant?.isTrial24h ? (
                  <button
                    onClick={onOpenPaymentModal}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-0.5 shrink-0"
                  >
                    <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>Prueba 24h</span>
                  </button>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Cuenta Activa" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-xs">
                {businessProfile?.slogan || 'Control de Caja & Cuentas Claras'}
              </p>
            </div>
          </div>

          {/* Center: Desktop Niche Switcher (Only visible on tablet/desktop) */}
          <div className="hidden md:flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750">
            {[
              { id: 'barberia', icon: Scissors, label: 'Barbería' },
              { id: 'estetica', icon: Sparkles, label: 'Salón & Uñas' },
              { id: 'mixto', icon: Store, label: 'Mixto' }
            ].map(n => {
              const NIcon = n.icon
              const isSel = currentNiche === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => onSelectNiche(n.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isSel 
                      ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <NIcon className="w-3.5 h-3.5" />
                  <span>{n.label}</span>
                </button>
              )
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Tasa BCV Pill (Compacta y Minimalista) */}
            <button 
              onClick={onOpenRateModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-dark-800/80 hover:bg-dark-750 border border-dark-700/80 text-xs text-slate-300 transition-all group"
              title="Click para ajustar la Tasa BCV oficial"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-400 hidden sm:inline">BCV:</span>
              <span className="text-white font-mono font-bold group-hover:text-gold-400 text-xs">
                Bs. {exchangeRate.toFixed(2)}
              </span>
            </button>

            {/* Desktop Only CTAs */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={onOpenDailyCloseModal}
                className="px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Cuadre y Arqueo Diario de Caja"
              >
                <Calculator className="w-3.5 h-3.5 text-purple-400" />
                <span>Cuadre</span>
              </button>

              <button
                onClick={onOpenWhatsAppModal}
                className="px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-emerald-400 border border-dark-700 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Cierre por WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cierre WA</span>
              </button>

              <button
                onClick={onOpenExpenseModal}
                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-xs font-bold transition-all flex items-center gap-1"
                title="Anotar gasto de caja"
              >
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Gasto</span>
              </button>
            </div>

            {/* Principal CTA: ANOTAR COBRO (El rey de la interfaz) */}
            <button
              onClick={onOpenCashModal}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden sm:inline">ANOTAR COBRO</span>
              <span className="sm:hidden">Cobro</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-300 hover:text-white transition-colors"
              title="Más opciones"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Desktop Settings & Logout */}
            <div className="hidden md:flex items-center gap-1 border-l border-dark-800 pl-2">
              <button
                onClick={onOpenSettingsModal}
                className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700 transition-colors"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-dark-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-700 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* BARRA DE NAVEGACIÓN INFERIOR MÓVIL (Estilo iOS / Nubank / Linear) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-2xl border-t border-dark-800/90 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {[
          { id: 'dashboard', label: 'Caja', icon: TrendingUp },
          { id: 'appointments', label: 'Turnos', icon: Calendar },
          { id: 'commissions', label: 'Equipo', icon: Users },
          { id: 'debts', label: 'Fiados', icon: AlertCircle, badgeCount: overdueClientsCount },
          { id: 'more', label: 'Más', icon: MoreHorizontal, isAction: true },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.isAction) {
                  setIsMoreSheetOpen(true)
                } else {
                  onSelectTab(tab.id)
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative ${
                isActive && !tab.isAction
                  ? 'text-gold-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" />
                {tab.badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border-2 border-dark-900" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* HOJA INFERIOR: MÁS MÓDULOS (Estilo Bottom Sheet) */}
      {isMoreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-fadeIn">
          <div 
            className="flex-1"
            onClick={() => setIsMoreSheetOpen(false)} 
          />
          <div className="bg-dark-900 border-t border-dark-750 rounded-t-3xl p-5 shadow-2xl space-y-4 animate-slideUp max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-dark-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-1 bg-dark-700 rounded-full mx-auto block mb-1" />
                <h3 className="font-bold text-white text-sm">Más Módulos de Tu Negocio</h3>
              </div>
              <button 
                onClick={() => setIsMoreSheetOpen(false)}
                className="p-1 rounded-full bg-dark-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'catalogo', label: 'Mi Link Web', desc: 'Catálogo de servicios', icon: Globe, color: 'text-blue-400' },
                { id: 'retargeting', label: 'Radar Clientes', desc: 'Retención y avisos', icon: BellRing, color: 'text-amber-400' },
                { id: 'inventory', label: 'Pomadas & Stock', desc: 'Productos de reventa', icon: Package, color: 'text-emerald-400' },
                { id: 'monthly', label: 'Mes a Mes', desc: 'Balance mensual', icon: BarChart3, color: 'text-purple-400' },
              ].map(m => {
                const MIcon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectTab(m.id)
                      setIsMoreSheetOpen(false)
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                      activeTab === m.id 
                        ? 'bg-gold-500/15 border-gold-500/50' 
                        : 'bg-dark-850 border-dark-750/70 hover:bg-dark-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <MIcon className={`w-5 h-5 ${m.color}`} />
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{m.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{m.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Accesos Rápidos de Operación Diaria */}
            <div className="pt-2 border-t border-dark-800 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  onOpenDailyCloseModal()
                }}
                className="p-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4 text-purple-400" />
                <span>Cuadre Diario</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  onOpenExpenseModal()
                }}
                className="p-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Minus className="w-4 h-4" />
                <span>Anotar Gasto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MENÚ LATERAL DRAWER (Opciones y Configuración) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="w-full max-w-xs bg-dark-900 border-l border-dark-800 h-full p-5 flex flex-col justify-between shadow-2xl animate-slideLeft overflow-y-auto">
            <div className="space-y-4">
              {/* Header Drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-dark-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center overflow-hidden">
                    {businessProfile?.logoUrl ? (
                      <img src={businessProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Scissors className="w-4 h-4 text-gold-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm truncate max-w-[170px]">
                      {businessProfile?.businessName || activeTenant?.businessName || 'Mi Negocio'}
                    </h4>
                    <span className="text-[10px] text-slate-400">Panel de Control</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-full hover:bg-dark-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selector de Nicho */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                  Tipo de Negocio
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-dark-850 p-1 rounded-xl border border-dark-750 text-xs">
                  {[
                    { id: 'barberia', icon: '💈', label: 'Barber' },
                    { id: 'estetica', icon: '💅', label: 'Salón' },
                    { id: 'mixto', icon: '🏬', label: 'Mixto' }
                  ].map(n => (
                    <button
                      key={n.id}
                      onClick={() => {
                        onSelectNiche(n.id)
                        setIsMobileMenuOpen(false)
                      }}
                      className={`py-1.5 rounded-lg text-center font-bold transition-all ${
                        currentNiche === n.id
                          ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-base">{n.icon}</div>
                      <div className="text-[10px]">{n.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Opciones del Local */}
              <div className="space-y-1.5 pt-2 border-t border-dark-800">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    onOpenSettingsModal()
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-gold-400" />
                    <span>Configuración del Negocio</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    onOpenDailyCloseModal()
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Calculator className="w-4 h-4 text-purple-400" />
                    <span>Cuadre Diario (Arqueo)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    onOpenWhatsAppModal()
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Cierre Diario por WhatsApp</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {bioSupported && (
                  <button
                    onClick={handleLinkFingerprint}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Fingerprint className="w-4 h-4 text-emerald-400" />
                      <span>{bioLinked ? 'Huella Digital Activa ✓' : 'Vincular Huella / FaceID'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Logout CTA */}
            <div className="pt-4 border-t border-dark-800 space-y-2">
              <button
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
              <p className="text-[10px] text-slate-500 text-center">
                GlamOS • Versión Premium 2.0
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
