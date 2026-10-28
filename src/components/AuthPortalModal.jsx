import React, { useState, useEffect } from 'react'
import { X, Mail, Lock, Store, Phone, User, ShieldCheck, Crown, LogIn, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AuthPortalModal({
  isOpen,
  onClose,
  tenants,
  saasConfig,
  onLoginSuccess,
  onRegisterTenant,
  onOpenSuperAdmin,
  initialTab = 'login'
}) {
  const [tab, setTab] = useState(initialTab) // 'login' | 'register' | 'admin'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen && initialTab) {
      setTab(initialTab)
    }
  }, [isOpen, initialTab])

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')

  // Register form
  const [regBusiness, setRegBusiness] = useState('')
  const [regOwner, setRegOwner] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regNiche, setRegNiche] = useState('barberia')

  // Admin form
  const [adminPin, setAdminPin] = useState('')

  if (!isOpen) return null

  const handleLogin = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const found = tenants.find(
      t => t.email.toLowerCase() === loginEmail.trim().toLowerCase()
    )
    if (!found) {
      setErrorMsg('No encontramos ese correo registrado. Regístrate en la pestaña "Crear Cuenta".')
      return
    }
    onLoginSuccess(found)
    onClose()
  }

  const handleRegister = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const exists = tenants.find(
      t => t.email.toLowerCase() === regEmail.trim().toLowerCase()
    )
    if (exists) {
      setErrorMsg('Ese correo electrónico ya está registrado. Usa "Entrar con Correo".')
      return
    }

    const newTenant = {
      id: 'ten_' + Date.now(),
      businessName: regBusiness.trim(),
      ownerName: regOwner.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPass.trim(),
      phone: regPhone.trim(),
      niche: regNiche,
      isCleanAccount: true, // Starts 100% clean for real customers
      status: 'pendiente_pago', // Must pay upfront to activate (7-day guarantee)
      activatedAt: null,
      daysRemaining: 0,
      lastPaymentRef: 'Esperando Pago Inicial',
      amountPaidUsd: 0
    }

    onRegisterTenant(newTenant)
    onClose()
  }

  const handleAdminAccess = (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (adminPin.trim() === (saasConfig.adminPin || '2026')) {
      onOpenSuperAdmin()
      onClose()
    } else {
      setErrorMsg('PIN Maestro incorrecto (Por defecto es: 2026)')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-3xl shadow-2xl p-5 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div>
            <h3 className="font-black text-white text-base">
              Acceso por Correo Electrónico
            </h3>
            <p className="text-xs text-slate-400">
              Sistema de Suscripciones • Garantía de {saasConfig.guaranteeDays} Días
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-dark-950 p-1.5 rounded-2xl border border-dark-800 mt-4">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg('') }}
            className={`py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all ${
              tab === 'login' ? 'bg-gold-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg('') }}
            className={`py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all ${
              tab === 'register' ? 'bg-gold-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('admin'); setErrorMsg('') }}
            className={`py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all ${
              tab === 'admin' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Super-Admin</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: LOGIN CON CORREO */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Correo Electrónico de tu Barbería / Salón
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@tubarberia.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-xs shadow-lg shadow-gold-500/20"
            >
              Entrar a Mi Negocio
            </button>

            {/* Quick Test Accounts for Owner Demo */}
            <div className="pt-3 border-t border-dark-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Prueba rápida de estados (Toca uno para ver cómo funciona):
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {tenants.slice(0, 3).map(t => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      onLoginSuccess(t)
                      onClose()
                    }}
                    className="p-2 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 flex items-center justify-between text-left text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-white block">{t.businessName}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{t.email}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      t.status === 'activo'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : t.status === 'pendiente_pago'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {t.status === 'activo' ? `🟢 Activo (${t.daysRemaining}d)` : t.status === 'pendiente_pago' ? '⏳ Por Pagar' : '🔴 Vencido'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTRO NUEVO CLIENTE (PAGO ADELANTADO + 7 DÍAS DE GARANTÍA) */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="mt-4 space-y-3">
            <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/30 text-[11px] text-gold-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <span>
                <strong>Garantía de {saasConfig.guaranteeDays} Días:</strong> Creas tu correo, activas tu mes (${saasConfig.monthlyPriceUsd}) y tienes {saasConfig.guaranteeDays} días de prueba con devolución garantizada si no te convence.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nombre de tu Barbería / Salón
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Barbería Imperio"
                  value={regBusiness}
                  onChange={(e) => setRegBusiness(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Tu Nombre y Apellido
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Luis Martínez"
                  value={regOwner}
                  onChange={(e) => setRegOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Tu Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="correo@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Crea una Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Tu WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. +584121234567"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Tipo de Negocio
                </label>
                <select
                  value={regNiche}
                  onChange={(e) => setRegNiche(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="barberia">💈 Solo Barbería</option>
                  <option value="estetica">💅 Salón & Uñas</option>
                  <option value="mixto">🏬 Mixto (Ambos)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/20"
            >
              Crear Mi Cuenta y Ver Datos de Pago (${saasConfig.monthlyPriceUsd})
            </button>
          </form>
        )}

        {/* TAB 3: SUPER-ADMIN (DUEÑO DEL SAAS) */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminAccess} className="mt-4 space-y-4">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 space-y-1">
              <div className="font-black text-purple-400 flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                <span>Panel Maestro de Suscripciones (Dueño SaaS)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Desde aquí controlas todas las barberías registradas, activas +30 días al recibir el pago, controlas los 7 días de garantía y configuras tu Pago Móvil / Binance.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                PIN Maestro de Administrador (Por defecto: <code className="text-gold-400">2026</code>)
              </label>
              <input
                type="password"
                required
                placeholder="Escribe tu PIN (ej. 2026)"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-850 border border-purple-500/40 text-sm text-white font-mono text-center tracking-widest focus:outline-none focus:border-purple-400"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-600/25"
            >
              Entrar al Panel Maestro Super-Admin
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
