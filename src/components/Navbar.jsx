import React, { useState, useEffect } from 'react'
import { Scissors, Sparkles, Store, Plus, Minus, Calendar, TrendingUp, Users, Package, AlertCircle, BarChart3, MessageSquare, Globe, BellRing, LogOut, Fingerprint, Check } from 'lucide-react'
import { isBiometricSupported, registerBiometricCredential } from '../lib/biometrics'

export default function Navbar({ 
  currentNiche, 
  onSelectNiche, 
  exchangeRate, 
  onOpenRateModal, 
  onOpenCashModal, 
  onOpenExpenseModal,
  onOpenWhatsAppModal,
  onLogout,
  onUpdateTenant,
  activeTenant,
  activeTab,
  onSelectTab
}) {
  const [bioSupported, setBioSupported] = useState(false)
  const [bioLinked, setBioLinked] = useState(Boolean(activeTenant?.biometricEnabled))

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
    barberia: <Scissors className="w-5 h-5 text-gold-400" />,
    estetica: <Sparkles className="w-5 h-5 text-pink-400" />,
    mixto: <Store className="w-5 h-5 text-purple-400" />
  }

  const nicheNames = {
    barberia: activeTenant?.businessName || 'Mi Barbería',
    estetica: activeTenant?.businessName || 'Mi Peluquería & Salón',
    mixto: activeTenant?.businessName || 'Barbería & Salón (Mixto)'
  }

  return (
    <header className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-md border-b border-dark-700/60 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Brand & Niche Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 shadow-inner flex items-center justify-center">
              {nicheIcons[currentNiche] || <Scissors className="w-5 h-5 text-gold-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  {nicheNames[currentNiche] || 'Mi Negocio'}
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <span>🟢 ACTIVO ({activeTenant?.daysRemaining ?? 30}d)</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeTenant?.email ? `Sesión: ${activeTenant.email}` : 'Control de Caja & Cuentas Claras'}
              </p>
            </div>
          </div>

          {/* Quick Niche Switcher on Mobile (Only Beauty/Barber) */}
          <div className="md:hidden flex items-center gap-1.5 bg-dark-850 p-1 rounded-lg border border-dark-700">
            {[
              { id: 'barberia', icon: '💈', label: 'Barbería' },
              { id: 'estetica', icon: '💅', label: 'Salón' },
              { id: 'mixto', icon: '🏬', label: 'Mixto' }
            ].map((n) => (
              <button
                key={n.id}
                onClick={() => onSelectNiche(n.id)}
                className={`p-1.5 rounded-md text-xs transition-all ${
                  currentNiche === n.id 
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title={n.label}
              >
                {n.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Center / Desktop Niche Switcher (Removed Autolavado) */}
        <div className="hidden md:flex items-center gap-2 bg-dark-850 p-1 rounded-xl border border-dark-700">
          <button
            onClick={() => onSelectNiche('barberia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentNiche === 'barberia' 
                ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Solo Barbería
          </button>
          <button
            onClick={() => onSelectNiche('estetica')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentNiche === 'estetica' 
                ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Solo Salón & Uñas
          </button>
          <button
            onClick={() => onSelectNiche('mixto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentNiche === 'mixto' 
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Local Mixto (Ambos)
          </button>
        </div>

        {/* Right side: Tasa BCV + Action CTAs */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {/* Botón Vincular Huella Digital / FaceID */}
          {bioSupported && (
            <button
              onClick={handleLinkFingerprint}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                bioLinked
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-dark-800 hover:bg-emerald-500/15 text-gold-400 border-gold-500/30'
              }`}
              title="Vincular tu Huella Digital o FaceID en este teléfono para entrar en 1 toque"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>{bioLinked ? 'Huella Activa ✓' : 'Activar Huella'}</span>
            </button>
          )}

          {/* Botón Cerrar Sesión */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-red-500/15 text-slate-300 hover:text-red-400 border border-dark-700 hover:border-red-500/30 text-xs font-bold transition-all"
            title="Cerrar sesión de tu cuenta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>

          {/* Tasa BCV Pill */}
          <button 
            onClick={onOpenRateModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-dark-800 border border-dark-700 hover:border-gold-500/50 text-xs text-slate-300 transition-all hover:bg-dark-750 group"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Tasa BCV:</span>
            <span className="text-white font-bold group-hover:text-gold-400">Bs. {exchangeRate.toFixed(2)}</span>
            <span className="text-[10px] text-slate-500 underline ml-0.5">Editar</span>
          </button>

          {/* Botón WhatsApp Cierre */}
          <button
            onClick={onOpenWhatsAppModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 text-xs font-bold transition-all shadow-sm"
            title="Generar y enviar cierre diario por WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cierre WhatsApp</span>
          </button>

          {/* Botón Gasto Rápido */}
          <button
            onClick={onOpenExpenseModal}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 text-xs font-bold transition-all"
            title="Anotar gasto de caja"
          >
            <Minus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Gasto</span>
          </button>

          {/* Botón Cobro Rápido */}
          <button
            onClick={onOpenCashModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ANOTAR COBRO</span>
          </button>
        </div>

      </div>

      {/* Mobile Navigation Tabs */}
      <nav className="flex md:hidden items-center justify-around gap-1 mt-3 pt-2.5 border-t border-dark-800 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Caja', icon: TrendingUp },
          { id: 'catalogo', label: 'Mi Link', icon: Globe },
          { id: 'retargeting', label: 'Radar', icon: BellRing },
          { id: 'appointments', label: 'Turnos', icon: Calendar },
          { id: 'commissions', label: 'Equipo', icon: Users },
          { id: 'debts', label: 'Fiados', icon: AlertCircle },
          { id: 'inventory', label: 'Pomadas', icon: Package },
          { id: 'monthly', label: 'Mes', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'text-gold-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </header>
  )
}
