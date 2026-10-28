import React, { useState, useEffect } from 'react'
import { X, Mail, Lock, Scissors, ShieldCheck, Crown, LogIn, UserPlus, AlertCircle } from 'lucide-react'

export default function AuthPortalModal({
  isOpen,
  isFullScreenGate = false,
  onClose,
  tenants,
  saasConfig,
  onLoginSuccess,
  onRegisterTenant,
  onOpenSuperAdmin,
  initialTab = 'login'
}) {
  const [tab, setTab] = useState(initialTab) // 'login' | 'register'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if ((isOpen || isFullScreenGate) && initialTab) {
      setTab(initialTab)
    }
  }, [isOpen, isFullScreenGate, initialTab])

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

  if (!isOpen && !isFullScreenGate) return null

  const priceUsd = saasConfig?.monthlyPriceUsd || 6
  const priceBs = saasConfig?.monthlyPriceBsFixed || '6.024'

  const handleLogin = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const cleanEmail = loginEmail.trim().toLowerCase()
    const cleanPass = loginPass.trim()

    const found = tenants.find(
      t => t.email.toLowerCase() === cleanEmail
    )
    if (!found) {
      setErrorMsg('No encontramos ese correo registrado. Si eres nuevo, toca la pestaña "Crear Cuenta".')
      return
    }

    // Strict password validation
    if ((found.password || '') !== cleanPass) {
      setErrorMsg('Contraseña incorrecta. Verifica tu clave e intenta de nuevo.')
      return
    }

    onLoginSuccess(found)
    if (onClose) onClose()
  }

  const handleRegister = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const cleanEmail = regEmail.trim().toLowerCase()

    const exists = tenants.find(
      t => t.email.toLowerCase() === cleanEmail
    )
    if (exists) {
      setErrorMsg('Ese correo electrónico ya está registrado. Usa la pestaña "Iniciar Sesión".')
      return
    }

    if (regPass.trim().length < 4) {
      setErrorMsg('La contraseña debe tener al menos 4 caracteres.')
      return
    }

    const newTenant = {
      id: 'ten_' + Date.now(),
      businessName: regBusiness.trim(),
      ownerName: regOwner.trim(),
      email: cleanEmail,
      password: regPass.trim(),
      phone: regPhone.trim(),
      niche: regNiche,
      isCleanAccount: true, // Starts 100% clean in $0.00 for real customers
      status: 'pendiente_pago', // Must pay upfront to activate (7-day guarantee)
      activatedAt: null,
      daysRemaining: 0,
      lastPaymentRef: 'Esperando Pago Inicial',
      amountPaidUsd: 0
    }

    onRegisterTenant(newTenant)
    if (onClose) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-dark-950/95 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-3xl shadow-2xl p-6 my-auto">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-tight">
                Ingenio OS • Barberías & Salones
              </h3>
              <p className="text-[11px] text-slate-400">
                Caja Dual (USD/Bs), Agenda Web y Retargeting
              </p>
            </div>
          </div>
          {!isFullScreenGate && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode Switcher Tabs (Only Login & Register for Customers) */}
        <div className="grid grid-cols-2 gap-1.5 bg-dark-950 p-1.5 rounded-2xl border border-dark-800 mt-4">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg('') }}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              tab === 'login' ? 'bg-gold-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg('') }}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              tab === 'register' ? 'bg-gold-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta Nueva</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: INICIAR SESIÓN CON CORREO Y CONTRASEÑA */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Correo Electrónico Registrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="tucorreo@ejemplo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Contraseña de tu Cuenta
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
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-xs shadow-lg shadow-gold-500/20 transition-all"
            >
              Entrar a Mi Sistema
            </button>

            <div className="pt-3 border-t border-dark-800 text-center">
              <p className="text-[11px] text-slate-400">
                ¿Aún no tienes cuenta para tu Barbería o Salón?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('register'); setErrorMsg('') }}
                  className="text-gold-400 font-bold underline hover:text-gold-300"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTRO NUEVO CLIENTE (PAGO ADELANTADO + 7 DÍAS DE GARANTÍA) */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="mt-4 space-y-3">
            <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/30 text-[11px] text-gold-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <span>
                <strong>Garantía de {saasConfig.guaranteeDays} Días:</strong> Registra tu negocio, activa tu mes (<strong>${priceUsd} USD / {priceBs} Bs</strong>) y pruébalo por {saasConfig.guaranteeDays} días con devolución 100% garantizada.
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
                  Crea tu Contraseña
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
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              Crear Mi Cuenta y Ver Datos de Pago (${priceUsd} / {priceBs} Bs)
            </button>
          </form>
        )}

        {/* Clean Footer */}
        <div className="mt-5 pt-3 border-t border-dark-850 flex items-center justify-between text-[10px] text-slate-600">
          <span>Ingenio OS © 2026 • Todos los derechos reservados</span>
          <span>Garantía {saasConfig?.guaranteeDays || 7} Días</span>
        </div>

      </div>
    </div>
  )
}
