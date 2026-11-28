import React, { useState, useEffect } from 'react'
import { 
  Scissors, Sparkles, Store, Plus, Minus, Calendar, TrendingUp, Users, Package, 
  AlertCircle, BarChart3, MessageSquare, Globe, BellRing, LogOut, Fingerprint, 
  Check, Settings, Calculator, Wifi, WifiOff, Zap, Menu, X, MoreHorizontal, 
  ChevronRight, ShieldCheck, DollarSign, Lock
} from 'lucide-react'
import { isBiometricSupported, registerBiometricCredential } from '../lib/biometrics'
import { isArgentina } from '../lib/brandConfig'

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
  showReconnectedBanner = false,
  securityConfig = {},
  isCashierMode = false,
  activeOperator = null,
  onOpenRoleModal,
  onQuickLockCashier,
  hasCashierStaff = false,
  todayAuditAlertCount = 0,
  fontScale = 'normal',
  onChangeFontScale,
  onCycleFontScale
}) {
  const [bioSupported, setBioSupported] = useState(false)
  const isAr = isArgentina(activeTenant, businessProfile)
  const allowCashierExpenses = !isCashierMode || !securityConfig?.enabled || securityConfig?.allowCashierExpenses !== false
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
      {/* HEADER SUPERIOR ÚNICO (Elegante, Responsive & Safe-Area iOS/Android) */}
      <header className="sticky top-0 z-30 bg-dark-900/95 backdrop-blur-xl border-b border-dark-800/80 px-2.5 sm:px-4 lg:px-6 pt-safe-header pb-2.5 transition-all">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 lg:gap-3 min-w-0">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 xl:flex-none xl:max-w-[230px]">
            <button
              onClick={() => { if (!isCashierMode) onOpenSettingsModal() }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-dark-800/80 border border-dark-700/70 hover:border-gold-500/50 shadow-inner flex items-center justify-center overflow-hidden shrink-0 transition-all group"
              title={isCashierMode ? 'Modo Cajero activo' : 'Cambiar Logo y datos del negocio'}
            >
              {businessProfile?.logoUrl ? (
                <img src={businessProfile.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform" />
              ) : (
                nicheIcons[currentNiche] || <Scissors className="w-4 h-4 text-gold-400" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => { if (!isCashierMode) onOpenSettingsModal() }}
                  className="font-black text-xs sm:text-sm lg:text-base text-white hover:text-gold-400 tracking-tight truncate text-left transition-colors min-w-0"
                >
                  {businessProfile?.businessName || nicheNames[currentNiche] || 'Mi Negocio'}
                </button>
                {activeTenant?.isTrial24h ? (
                  <button
                    onClick={onOpenPaymentModal}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-0.5 shrink-0 whitespace-nowrap"
                  >
                    <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span className="hidden sm:inline">Prueba 24h</span>
                    <span className="sm:hidden">24h</span>
                  </button>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Cuenta Activa" />
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {businessProfile?.slogan || 'Control de Caja & Cuentas Claras'}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
            {/* Owner / Cashier Role Switch Pill */}
            {(securityConfig?.enabled || isCashierMode || hasCashierStaff) && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onOpenRoleModal}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-black whitespace-nowrap shrink-0 transition-all ${
                    isCashierMode
                      ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/40 text-sky-300'
                      : 'bg-gold-500/15 hover:bg-gold-500/25 border-gold-500/40 text-gold-300'
                  }`}
                  title={isCashierMode ? 'Toca para desbloquear Modo Dueño con PIN' : 'Modo Dueño activo • Toca para cambiar'}
                >
                  <span className="sm:hidden">{isCashierMode ? '🧾' : '👑'}</span>
                  <span className="hidden sm:inline">{isCashierMode ? `🧾 ${(activeOperator?.name || 'Cajero').split(' ')[0]}` : '👑 Dueño'}</span>
                </button>
                {!isCashierMode && onQuickLockCashier && (
                  <button
                    type="button"
                    onClick={onQuickLockCashier}
                    className="hidden sm:inline-flex p-1.5 rounded-xl bg-dark-800 hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 border border-dark-700 transition-colors shrink-0"
                    title="Bloquear y pasar rápido a Modo Cajero"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Font Scale Toggle Pill (Normal → Grande → Extra Grande) */}
            {onCycleFontScale && (
              <button
                type="button"
                onClick={onCycleFontScale}
                className={`flex items-center justify-center px-2 py-1.5 rounded-xl border text-xs font-black whitespace-nowrap shrink-0 transition-all ${
                  fontScale !== 'normal'
                    ? 'bg-gold-500/20 border-gold-500/40 text-gold-300'
                    : 'bg-dark-800/80 hover:bg-dark-750 border-dark-700/80 text-slate-300 hover:text-white'
                }`}
                title="Cambiar tamaño de letra (Normal → Grande → Extra Grande)"
              >
                {fontScale === 'xlarge' ? 'A++' : fontScale === 'large' ? 'A+' : 'Aa'}
              </button>
            )}

            {/* Currency / Tasa BCV Pill */}
            {isAr ? (
              <div
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 font-bold whitespace-nowrap shrink-0"
                title="Modo Argentina: Precios y caja en Pesos Argentinos ($ ARS)"
              >
                <span>🇦🇷</span>
                <span className="font-mono text-xs">ARS ($)</span>
              </div>
            ) : (
              <button 
                onClick={onOpenRateModal}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-dark-800/80 hover:bg-dark-750 border border-dark-700/80 text-xs text-slate-300 transition-all group whitespace-nowrap shrink-0"
                title="Click para ajustar la Tasa BCV oficial"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[11px] text-slate-400 hidden lg:inline">BCV:</span>
                <span className="text-white font-mono font-bold group-hover:text-gold-400 text-xs">
                  Bs. {exchangeRate.toFixed(2)}
                </span>
              </button>
            )}

            {/* Desktop Only CTAs */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onOpenDailyCloseModal && onOpenDailyCloseModal('today')}
                className="hidden lg:flex px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 text-xs font-bold transition-all items-center gap-1.5 whitespace-nowrap"
                title="Cuadre y Arqueo Diario de Caja"
              >
                <Calculator className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Cuadre</span>
              </button>

              {!isCashierMode && (
                <button
                  onClick={() => onOpenDailyCloseModal && onOpenDailyCloseModal('this_week')}
                  className="hidden 2xl:flex px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all items-center gap-1.5 whitespace-nowrap"
                  title="Cuadre y Cierre Semanal de Caja (Lunes a Domingo)"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Semanal</span>
                </button>
              )}

              <button
                onClick={onOpenWhatsAppModal}
                className="hidden lg:flex px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-emerald-400 border border-dark-700 text-xs font-bold transition-all items-center gap-1.5 whitespace-nowrap"
                title="Cierre por WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Cierre WA</span>
              </button>

              {allowCashierExpenses && (
                <button
                  onClick={onOpenExpenseModal}
                  className="flex px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-xs font-bold transition-all items-center gap-1 whitespace-nowrap"
                  title="Anotar gasto de caja"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                  <span>Gasto</span>
                </button>
              )}
            </div>

            {/* Principal CTA: ANOTAR COBRO (El rey de la interfaz) */}
            <button
              onClick={onOpenCashModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3] shrink-0" />
              <span className="hidden 2xl:inline">ANOTAR COBRO</span>
              <span className="2xl:hidden">Cobro</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-slate-300 hover:text-white transition-colors shrink-0"
              title="Más opciones"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Desktop Settings & Logout */}
            <div className="hidden md:flex items-center gap-1 border-l border-dark-800 pl-2 shrink-0">
              {!isCashierMode && (
                <button
                  onClick={onOpenSettingsModal}
                  className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700 transition-colors"
                  title="Configuración"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-2xl border-t border-dark-800/90 px-2 pt-1.5 pb-safe-nav flex items-center justify-around shadow-2xl">
        {[
          { id: 'dashboard', label: 'Caja', icon: TrendingUp },
          { id: 'appointments', label: 'Turnos', icon: Calendar },
          isCashierMode
            ? { id: 'catalogo', label: 'Catálogo', icon: Globe }
            : { id: 'commissions', label: 'Equipo', icon: Users },
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
          <div className="bg-dark-900 border-t border-dark-750 rounded-t-3xl px-5 pt-5 pb-safe-sheet shadow-2xl space-y-4 animate-slideUp max-h-[80vh] overflow-y-auto">
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
                { id: 'catalogo', label: 'Mi Link Web', desc: 'Catálogo y agenda', icon: Globe, color: 'text-blue-400' },
                { id: 'retargeting', label: 'Radar Clientes', desc: 'Retención y avisos', icon: BellRing, color: 'text-amber-400' },
                { id: 'inventory', label: 'Pomadas & Stock', desc: 'Productos y precios', icon: Package, color: 'text-emerald-400' },
                ...(!isCashierMode ? [
                  { id: 'monthly', label: 'Mes a Mes', desc: 'Balance mensual', icon: BarChart3, color: 'text-purple-400' },
                  ...(securityConfig?.enabled || todayAuditAlertCount > 0 ? [
                    { id: 'audit', label: 'Auditoría', desc: todayAuditAlertCount > 0 ? `${todayAuditAlertCount} alertas hoy` : 'Caja Negra Dueño', icon: ShieldCheck, color: 'text-red-400' }
                  ] : [])
                ] : [])
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

              {allowCashierExpenses && (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* MENÚ LATERAL DRAWER (Opciones y Configuración) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="w-full max-w-xs bg-dark-900 border-l border-dark-800 h-full px-5 pt-safe-drawer flex flex-col justify-between shadow-2xl animate-slideLeft overflow-y-auto">
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

              {/* Tamaño de Letra en este Dispositivo (Dueño y Cajero) */}
              {onChangeFontScale && (
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                    Tamaño de Letra
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-dark-850 p-1 rounded-xl border border-dark-750 text-xs">
                    {[
                      { id: 'normal', short: 'A', label: 'Normal' },
                      { id: 'large', short: 'A+', label: 'Grande' },
                      { id: 'xlarge', short: 'A++', label: 'Extra' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeFontScale(opt.id)}
                        className={`py-1.5 rounded-lg text-center font-bold transition-all ${
                          fontScale === opt.id
                            ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-black">{opt.short}</div>
                        <div className="text-[10px]">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Opciones del Local */}
              <div className="space-y-1.5 pt-2 border-t border-dark-800">
                {(securityConfig?.enabled || isCashierMode || hasCashierStaff) && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      onOpenRoleModal && onOpenRoleModal()
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                      isCashierMode
                        ? 'bg-gold-500/15 border-gold-500/40 text-gold-300'
                        : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isCashierMode ? '👑 Desbloquear Modo Dueño' : '🧾 Cambiar a Modo Cajero'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {!isCashierMode && (
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
                )}

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    onOpenDailyCloseModal && onOpenDailyCloseModal('today')
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Calculator className="w-4 h-4 text-purple-400" />
                    <span>Cuadre Diario (Arqueo de Gaveta)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {!isCashierMode && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      onOpenDailyCloseModal && onOpenDailyCloseModal('this_week')
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs text-purple-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span>Cuadre Semanal (Lunes a Domingo)</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                )}

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
