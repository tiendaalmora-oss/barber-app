import React, { useState, useEffect } from 'react'
import { X, Mail, Lock, Scissors, ShieldCheck, LogIn, UserPlus, AlertCircle, Fingerprint, KeyRound, CheckCircle2, MessageSquare } from 'lucide-react'
import { isBiometricSupported, registerBiometricCredential, verifyBiometricCredential } from '../lib/biometrics'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { normalizeWhatsAppPhone } from '../lib/dateUtils'

export default function AuthPortalModal({
  isOpen,
  isFullScreenGate = false,
  onClose,
  tenants,
  saasConfig,
  onLoginSuccess,
  onRegisterTenant,
  onUpdateTenant,
  initialTab = 'login'
}) {
  const [tab, setTab] = useState(initialTab) // 'login' | 'register' | 'recover'
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [bioSupported, setBioSupported] = useState(false)
  const [enrollBiometricOnLogin, setEnrollBiometricOnLogin] = useState(false)
  const [savedBioBinding, setSavedBioBinding] = useState(() => {
    try {
      const raw = localStorage.getItem('barber_biometric_binding')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  })

  useEffect(() => {
    isBiometricSupported().then(setBioSupported)
  }, [])

  useEffect(() => {
    if ((isOpen || isFullScreenGate) && initialTab) {
      setTab(initialTab)
    }
  }, [isOpen, isFullScreenGate, initialTab])

  // Login form
  const [loginEmail, setLoginEmail] = useState(savedBioBinding?.email || '')
  const [loginPass, setLoginPass] = useState('')

  // Register form
  const [regBusiness, setRegBusiness] = useState('')
  const [regOwner, setRegOwner] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPin, setRegPin] = useState('')
  const [regNiche, setRegNiche] = useState('barberia')
  const [enrollBioOnRegister, setEnrollBioOnRegister] = useState(true)

  // Recover password form
  const [recEmail, setRecEmail] = useState('')
  const [recPinOrPhone, setRecPinOrPhone] = useState('')
  const [recNewPass, setRecNewPass] = useState('')

  if (!isOpen && !isFullScreenGate) return null

  const priceUsd = saasConfig?.monthlyPriceUsd || 6
  const priceBs = saasConfig?.monthlyPriceBsFixed || '6.024'

  // 1. Login with Fingerprint / FaceID (WebAuthn)
  const handleBiometricLogin = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    try {
      // Find target account by saved binding on this phone or typed email
      const targetEmail = (loginEmail.trim() || savedBioBinding?.email || '').toLowerCase()
      const targetTenant = tenants.find(t =>
        (targetEmail && t.email.toLowerCase() === targetEmail) ||
        (savedBioBinding?.tenantId && t.id === savedBioBinding.tenantId) ||
        (savedBioBinding?.credentialId && t.biometricCredentialId === savedBioBinding.credentialId)
      )

      const credToVerify = savedBioBinding?.credentialId || targetTenant?.biometricCredentialId || null
      if (!credToVerify && !targetTenant) {
        setErrorMsg('Primero inicia sesión una vez con tu correo y contraseña y activa la casilla "Vincular mi Huella en este teléfono".')
        return
      }

      const verifiedCredId = await verifyBiometricCredential(credToVerify)
      const matchedTenant = targetTenant || tenants.find(t => t.biometricCredentialId === verifiedCredId)

      if (!matchedTenant) {
        setErrorMsg('Huella verificada, pero no encontramos la cuenta asociada. Entra con tu correo y clave para revincularla.')
        return
      }

      onLoginSuccess(matchedTenant)
      if (onClose) onClose()
    } catch (err) {
      setErrorMsg('No se pudo verificar la huella o cancelaste el lector. Puedes entrar con tu contraseña.')
    }
  }

  // 2. Standard Login with Email + Password (+ optional Fingerprint enrollment)
  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    const cleanEmail = loginEmail.trim().toLowerCase()
    const cleanPass = loginPass.trim()

    const found = tenants.find(
      t => t.email.toLowerCase() === cleanEmail
    )
    if (!found) {
      setErrorMsg('No encontramos ese correo registrado. Si eres nuevo, toca la pestaña "Crear Cuenta Nueva".')
      return
    }

    if ((found.password || '') !== cleanPass) {
      setErrorMsg('Contraseña incorrecta. Verifica tu clave o toca "¿Olvidaste tu contraseña?".')
      return
    }

    let updatedTenant = found

    // If user checked "Vincular mi Huella en este teléfono", register WebAuthn credential now
    if (enrollBiometricOnLogin && bioSupported) {
      try {
        const credId = await registerBiometricCredential({
          userId: found.id,
          email: found.email,
          displayName: found.businessName
        })
        const binding = {
          tenantId: found.id,
          email: found.email,
          businessName: found.businessName,
          credentialId: credId
        }
        localStorage.setItem('barber_biometric_binding', JSON.stringify(binding))
        setSavedBioBinding(binding)
        updatedTenant = { ...found, biometricCredentialId: credId, biometricEnabled: true }
        if (onUpdateTenant) {
          await onUpdateTenant(updatedTenant)
        }
      } catch (bioErr) {
        console.warn('Biometric enrollment skipped:', bioErr)
      }
    }

    onLoginSuccess(updatedTenant)
    if (onClose) onClose()
  }

  // 3. Register New Account (+ Security PIN + Optional Fingerprint + Supabase Auth Mirror)
  const handleRegister = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
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

    const cleanPin = regPin.replace(/[^0-9]/g, '').slice(0, 4) || '0000'
    const tenantId = 'ten_' + Date.now()
    let bioCredId = null

    if (enrollBioOnRegister && bioSupported) {
      try {
        bioCredId = await registerBiometricCredential({
          userId: tenantId,
          email: cleanEmail,
          displayName: regBusiness.trim()
        })
        const binding = {
          tenantId,
          email: cleanEmail,
          businessName: regBusiness.trim(),
          credentialId: bioCredId
        }
        localStorage.setItem('barber_biometric_binding', JSON.stringify(binding))
        setSavedBioBinding(binding)
      } catch (e) {
        console.warn('Biometric registration skipped by user')
      }
    }

    const newTenant = {
      id: tenantId,
      saasProduct: 'barberia_saas',
      businessName: regBusiness.trim(),
      ownerName: regOwner.trim(),
      email: cleanEmail,
      password: regPass.trim(),
      securityPin: cleanPin,
      biometricCredentialId: bioCredId,
      biometricEnabled: Boolean(bioCredId),
      phone: regPhone.trim(),
      niche: regNiche,
      isCleanAccount: true,
      status: 'pendiente_pago',
      activatedAt: null,
      daysRemaining: 0,
      lastPaymentRef: 'Esperando Pago Inicial',
      amountPaidUsd: 0
    }

    onRegisterTenant(newTenant)
    if (onClose) onClose()
  }

  // 4. Password Recovery via Security PIN or WhatsApp digits (+ WhatsApp support fallback)
  const handleRecoverPassword = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const cleanEmail = recEmail.trim().toLowerCase()
    const found = tenants.find(t => t.email.toLowerCase() === cleanEmail)
    if (!found) {
      setErrorMsg('No encontramos ninguna cuenta con ese correo. Si eres nuevo, toca "Crear Cuenta Nueva".')
      return
    }

    const inputDigits = recPinOrPhone.replace(/[^0-9]/g, '')
    const phoneDigits = (found.phone || '').replace(/[^0-9]/g, '')
    const last4Phone = phoneDigits.slice(-4)
    const last3Phone = phoneDigits.slice(-3)
    const savedPin = (found.securityPin || '').replace(/[^0-9]/g, '')

    const isMatch =
      (savedPin && inputDigits === savedPin) ||
      (last4Phone && inputDigits === last4Phone) ||
      (last3Phone && inputDigits === last3Phone) ||
      (inputDigits.length >= 3 && phoneDigits.endsWith(inputDigits)) ||
      (inputDigits.length >= 3 && savedPin.endsWith(inputDigits))

    if (!isMatch) {
      setErrorMsg('El PIN o dígitos no coinciden. Escribe los 4 números de tu PIN o los últimos dígitos de tu WhatsApp, o toca el botón verde abajo para pedir tu clave por WhatsApp.')
      return
    }

    if (recNewPass.trim().length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.')
      return
    }

    const updated = {
      ...found,
      password: recNewPass.trim()
    }

    if (onUpdateTenant) {
      await onUpdateTenant(updated)
    }

    setSuccessMsg('¡Contraseña actualizada con éxito! Entrando a tu cuenta...')
    setTimeout(() => {
      onLoginSuccess(updated)
      if (onClose) onClose()
    }, 800)
  }

  const handleWhatsAppRecoveryHelp = () => {
    const cleanPhone = normalizeWhatsAppPhone(saasConfig?.ownerWhatsapp || '+5491164827875')
    const targetEmail = recEmail.trim() || loginEmail.trim() || 'No especificado'
    const msg = `👋 ¡Hola soporte de Ingenio OS! Se me olvidó la clave de mi cuenta de BarberOS.\n\n` +
      `📧 *Mi Correo Registrado:* ${targetEmail}\n` +
      `🔑 ¿Me podrían indicar o restablecer mi contraseña para poder ingresar? ¡Gracias!`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
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
                Acceso Seguro con Correo o Huella Digital
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

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-dark-950 p-1.5 rounded-2xl border border-dark-800 mt-4">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg('') }}
            className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              tab === 'login' || tab === 'recover' ? 'bg-gold-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg('') }}
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

        {successMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: INICIAR SESIÓN (HUELLA DIGITAL O CORREO + CLAVE) */}
        {tab === 'login' && (
          <div className="mt-4 space-y-4">
            {/* Instant Fingerprint / FaceID Button if supported */}
            {bioSupported && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-dark-850 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4" />
                    <span>Acceso Biométrico Rápido</span>
                  </span>
                  {savedBioBinding?.businessName && (
                    <span className="text-[10px] text-slate-300 font-bold truncate max-w-[160px]">
                      {savedBioBinding.businessName}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Fingerprint className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    {savedBioBinding?.email
                      ? `Entrar con Huella / FaceID (${savedBioBinding.email})`
                      : 'Entrar con Huella del Teléfono / FaceID'}
                  </span>
                </button>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Contraseña de tu Cuenta
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecEmail(loginEmail)
                      setErrorMsg('')
                      setTab('recover')
                    }}
                    className="text-[11px] font-bold text-gold-400 hover:underline"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                </div>
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

              {bioSupported && (
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-dark-850 border border-dark-750 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={enrollBiometricOnLogin}
                    onChange={(e) => setEnrollBiometricOnLogin(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4"
                  />
                  <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px]">
                    Vincular mi <strong>Huella / FaceID</strong> en este teléfono al entrar
                  </span>
                </label>
              )}

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
          </div>
        )}

        {/* TAB 2: REGISTRO NUEVO CLIENTE (+ PIN DE SEGURIDAD + HUELLA) */}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Tu WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+584121234567"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gold-400 mb-1" title="Para recuperar tu clave si la olvidas">
                  PIN Seguridad (4 díg)
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="Ej. 1990"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-gold-500/40 text-xs text-white font-mono text-center focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Tipo de Local
                </label>
                <select
                  value={regNiche}
                  onChange={(e) => setRegNiche(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="barberia">💈 Barbería</option>
                  <option value="estetica">💅 Salón</option>
                  <option value="mixto">🏬 Mixto</option>
                </select>
              </div>
            </div>

            {bioSupported && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer text-xs text-emerald-300">
                <input
                  type="checkbox"
                  checked={enrollBioOnRegister}
                  onChange={(e) => setEnrollBioOnRegister(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px]">
                  Activar ingreso con <strong>Huella del Teléfono / FaceID</strong>
                </span>
              </label>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              Crear Mi Cuenta y Ver Datos de Pago (${priceUsd} / {priceBs} Bs)
            </button>
          </form>
        )}

        {/* TAB 3: RECUPERAR CONTRASEÑA CON PIN O ÚLTIMOS 4 DÍGITOS DE WHATSAPP */}
        {tab === 'recover' && (
          <form onSubmit={handleRecoverPassword} className="mt-4 space-y-3.5">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-200 flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>Recuperación Rápida:</strong> Verifica tu correo junto con tu <strong>PIN de Seguridad de 4 dígitos</strong> (o los últimos 4 números de tu WhatsApp registrado) para crear una clave nueva.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tu Correo Electrónico Registrado
              </label>
              <input
                type="email"
                required
                placeholder="tucorreo@gmail.com"
                value={recEmail}
                onChange={(e) => setRecEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gold-400 mb-1">
                Tu PIN de Seguridad (4 dígitos) o Últimos 4 números de tu WhatsApp
              </label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="Ej. 1990"
                value={recPinOrPhone}
                onChange={(e) => setRecPinOrPhone(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-gold-500/40 text-xs text-white font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-400 mb-1">
                Escribe tu Nueva Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Nueva contraseña (mín. 4 caracteres)"
                value={recNewPass}
                onChange={(e) => setRecNewPass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-emerald-500/40 text-xs text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setTab('login'); setErrorMsg('') }}
                className="flex-1 py-3 rounded-xl bg-dark-800 text-slate-300 text-xs font-bold"
              >
                Volver
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-md shadow-emerald-500/20"
              >
                Guardar Nueva Clave
              </button>
            </div>

            <div className="pt-2 border-t border-dark-800 text-center">
              <button
                type="button"
                onClick={handleWhatsAppRecoveryHelp}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                title="Escribir a Soporte Técnico por WhatsApp para recuperar tu contraseña"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>¿No recuerdas tu PIN? Recuperar por WhatsApp</span>
              </button>
            </div>
          </form>
        )}

        {/* Clean Footer */}
        <div className="mt-5 pt-3 border-t border-dark-850 flex items-center justify-between text-[10px] text-slate-600">
          <span>Ingenio OS © 2026 • Seguridad Biométrica WebAuthn</span>
          <span>Garantía {saasConfig?.guaranteeDays || 7} Días</span>
        </div>

      </div>
    </div>
  )
}
