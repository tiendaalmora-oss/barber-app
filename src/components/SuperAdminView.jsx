import React, { useState } from 'react'
import { Crown, CheckCircle2, MessageSquare, Plus, Settings2, ArrowLeft, Lock, Eye, Pencil, Trash2, Copy, Check, Share2, Sparkles, X } from 'lucide-react'

export default function SuperAdminView({
  tenants,
  onUpdateTenant,
  onAddTenant,
  onDeleteTenant,
  onClearDemoTenants,
  onRestoreDemoTenants,
  saasConfig,
  onSaveSaasConfig,
  exchangeRate,
  onSelectTenantAndExit,
  onExitSuperAdmin
}) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [filter, setFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [configForm, setConfigForm] = useState(saasConfig)
  const [savedToast, setSavedToast] = useState(false)
  const [copiedRegLink, setCopiedRegLink] = useState(false)
  const [copiedDemoCreds, setCopiedDemoCreds] = useState(false)

  // Manual tenant creation / edit form
  const [newBiz, setNewBiz] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPass, setNewPass] = useState('123456')
  const [newPhone, setNewPhone] = useState('+58412')
  const [newNiche, setNewNiche] = useState('barberia')
  const [newStatus, setNewStatus] = useState('activo')
  const [newDays, setNewDays] = useState('30')

  const registrationUrl = `${window.location.origin}/?registro=1`

  const handleCopyRegistrationLink = () => {
    navigator.clipboard.writeText(registrationUrl)
    setCopiedRegLink(true)
    setTimeout(() => setCopiedRegLink(false), 2500)
  }

  const handleShareRegLinkWhatsApp = () => {
    const price = saasConfig.monthlyPriceUsd || 10
    const text = `💈🚀 ¡Hola! Aquí tienes el enlace oficial para registrar tu Barbería / Salón en nuestro Sistema de Gestión, Caja y Agenda Online.\n\n🛡️ *Incluye ${saasConfig.guaranteeDays} días de Garantía Total de Reembolso* ($${price}/mes):\n👉 ${registrationUrl}\n\nCrea tu cuenta con tu correo y envíanos el comprobante para activarte de inmediato.`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const openCreateModal = () => {
    setEditingTenant(null)
    setNewBiz('')
    setNewOwner('')
    setNewEmail('')
    setNewPass('123456')
    setNewPhone('+58412')
    setNewNiche('barberia')
    setNewStatus('activo')
    setNewDays('30')
    setShowAddModal(true)
  }

  const openEditModal = (t) => {
    setEditingTenant(t)
    setNewBiz(t.businessName)
    setNewOwner(t.ownerName)
    setNewEmail(t.email)
    setNewPass(t.password || '123')
    setNewPhone(t.phone || '+58412')
    setNewNiche(t.niche || 'barberia')
    setNewStatus(t.status)
    setNewDays(String(t.daysRemaining ?? 30))
    setShowAddModal(true)
  }

  const getDaysSinceActivation = (dateStr) => {
    if (!dateStr) return 99
    const start = new Date(dateStr + 'T00:00:00')
    const diff = Date.now() - start.getTime()
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
  }

  const enrichedTenants = tenants.map(t => {
    const dayOfSub = getDaysSinceActivation(t.activatedAt)
    const inGuarantee = t.status === 'activo' && dayOfSub <= (saasConfig.guaranteeDays || 7)
    return {
      ...t,
      dayOfSub,
      inGuarantee
    }
  })

  const activeTenants = enrichedTenants.filter(t => t.status === 'activo')
  const pendingTenants = enrichedTenants.filter(t => t.status === 'pendiente_pago')
  const guaranteeTenants = enrichedTenants.filter(t => t.inGuarantee)
  const expiredTenants = enrichedTenants.filter(t => t.status === 'vencido')

  const mrrUsd = activeTenants.length * (saasConfig.monthlyPriceUsd || 10)
  const mrrBs = (mrrUsd * exchangeRate).toFixed(2)

  const filteredList = enrichedTenants.filter(t => {
    if (filter === 'pendiente_pago') return t.status === 'pendiente_pago'
    if (filter === 'guarantee') return t.inGuarantee
    if (filter === 'activo') return t.status === 'activo'
    if (filter === 'vencido') return t.status === 'vencido'
    return true
  })

  const handleActivate30Days = (tenant) => {
    const todayStr = new Date().toISOString().split('T')[0]
    onUpdateTenant({
      ...tenant,
      status: 'activo',
      activatedAt: todayStr,
      daysRemaining: saasConfig.subscriptionDays || 30,
      amountPaidUsd: saasConfig.monthlyPriceUsd || 10,
      lastPaymentRef: tenant.lastPaymentRef === 'Esperando Capture' ? 'Activado Manual' : tenant.lastPaymentRef
    })
  }

  const handleExpireTenant = (tenant) => {
    onUpdateTenant({
      ...tenant,
      status: 'vencido',
      daysRemaining: 0
    })
  }

  const handleWhatsAppOwner = (tenant) => {
    const cleanPhone = (tenant.phone || '').replace(/[^0-9]/g, '')
    const price = saasConfig.monthlyPriceUsd || 6
    const priceBs = saasConfig.monthlyPriceBsFixed || '6.024'
    let msg = ''

    if (tenant.status === 'pendiente_pago') {
      msg = `👋 ¡Hola *${tenant.ownerName}*! Vi que registraste tu cuenta de *${tenant.businessName}* con el correo *${tenant.email}*.\n\n` +
        `Para activarte tus *30 días completos* (con los *${saasConfig.guaranteeDays} días de Garantía de Reembolso*), el monto es de *$${price} USDT* (${priceBs} Bs).\n\n` +
        `🏦 *Banco:* ${saasConfig.pagoMovilBank || 'Banco de Venezuela (0102)'}\n` +
        `👤 *Titular:* ${saasConfig.pagoMovilHolder || 'Carlos Rojas'}\n` +
        `🪪 *Cédula:* ${saasConfig.pagoMovilId || '17.907.078'}\n` +
        `📱 *Teléfono:* ${saasConfig.pagoMovilPhone || '04242061590'}\n` +
        `💳 *Cuenta:* ${saasConfig.pagoMovilAccount || '01020213260000172378'}\n\n` +
        `🟡 *Binance ID:* ${saasConfig.binanceIdOnly || '92423494'} (IngenioOS)\n` +
        `⛓️ *BNB Smart Chain (BEP20):* ${saasConfig.bep20Address || '0xf34fe548272f23d363462ba2685f92932ddbd7aa'}\n\n` +
        `Apenas me pases el capture por aquí te activo el acceso de inmediato.`
    } else if (tenant.status === 'activo') {
      msg = `✅ ¡Listo *${tenant.ownerName}*! Ya verificamos tu pago y activamos los *30 días* de *${tenant.businessName}*.\n\n` +
        `👉 *Entra aquí:* ${window.location.origin}/?login=1\n` +
        `📧 *Correo:* ${tenant.email}\n` +
        `🔑 *Clave:* ${tenant.password || '123'}\n\n` +
        `🛡️ Recuerda que cuentas con tus *${saasConfig.guaranteeDays} días de garantía total* y soporte directo por este WhatsApp. ¡A sacarle provecho!`
    } else {
      msg = `👋 ¡Épale *${tenant.ownerName}*! Te escribo para avisarte que se cumplieron los 30 días de suscripción del sistema de *${tenant.businessName}*.\n\n` +
        `Todos tus clientes, turnos y cuentas están guardados. Para renovar tu mes (*$${price} USDT / ${priceBs} Bs*), puedes enviarme el comprobante por aquí y te reactivo en 1 minuto.`
    }

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const handleSaveConfig = (e) => {
    e.preventDefault()
    onSaveSaasConfig(configForm)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
    setShowSettings(false)
  }

  const handleSaveTenantForm = (e) => {
    e.preventDefault()
    if (!newBiz.trim() || !newEmail.trim()) return
    const todayStr = new Date().toISOString().split('T')[0]

    if (editingTenant) {
      onUpdateTenant({
        ...editingTenant,
        businessName: newBiz.trim(),
        ownerName: newOwner.trim() || 'Dueño',
        email: newEmail.trim().toLowerCase(),
        password: newPass.trim() || '123456',
        phone: newPhone.trim(),
        niche: newNiche,
        status: newStatus,
        daysRemaining: newStatus === 'activo' ? (parseInt(newDays) || 30) : 0
      })
    } else {
      const created = {
        id: 'ten_' + Date.now(),
        businessName: newBiz.trim(),
        ownerName: newOwner.trim() || 'Dueño',
        email: newEmail.trim().toLowerCase(),
        password: newPass.trim() || '123456',
        phone: newPhone.trim(),
        niche: newNiche,
        status: newStatus,
        isCleanAccount: true, // Starts 100% clean without demo data!
        activatedAt: newStatus === 'activo' ? todayStr : null,
        daysRemaining: newStatus === 'activo' ? (parseInt(newDays) || 30) : 0,
        lastPaymentRef: newStatus === 'activo' ? 'Pagado Directo' : 'Esperando Capture',
        amountPaidUsd: newStatus === 'activo' ? (saasConfig.monthlyPriceUsd || 10) : 0
      }
      onAddTenant(created)
    }
    setShowAddModal(false)
  }

  const handleUnlockPin = (e) => {
    e.preventDefault()
    if (pinInput.trim() === (saasConfig.adminPin || '2026')) {
      setIsUnlocked(true)
      setPinError('')
    } else {
      setPinError('Contraseña / PIN Maestro incorrecto.')
    }
  }

  const demoTenant = tenants.find(t => !t.isCleanAccount) || {
    email: 'demo@ingenioos.online',
    password: 'demo2026'
  }

  const handleCopyDemoCredentials = () => {
    const text = `💈 Acceso de Prueba (Ingenio OS):\n👉 Link: ${window.location.origin}/?login=1\n📧 Correo: ${demoTenant.email}\n🔑 Contraseña: ${demoTenant.password || 'demo2026'}`
    navigator.clipboard.writeText(text)
    setCopiedDemoCreds(true)
    setTimeout(() => setCopiedDemoCreds(false), 2500)
  }

  // Mandatory PIN Gate before entering Super-Admin
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-dark-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-dark-900 border-2 border-purple-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-purple-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Bóveda Super-Admin • Ingenio OS
              </h2>
              <p className="text-xs text-slate-400">
                Acceso exclusivo para el dueño del SaaS
              </p>
            </div>
          </div>

          {pinError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
              {pinError}
            </div>
          )}

          <form onSubmit={handleUnlockPin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Ingresa tu Contraseña / PIN Maestro:
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-850 border border-purple-500/40 text-center text-white font-mono text-base tracking-widest focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onExitSuperAdmin}
                className="flex-1 py-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold"
              >
                Salir
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-600/25"
              >
                Desbloquear Panel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 pb-16 font-sans">
      
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-md border-b border-purple-500/30 px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg text-white">
                  Panel Maestro Super-Admin (Ingenio OS)
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-gold-500 text-black text-[10px] font-black">
                  DUEÑO SAAS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Control de Suscripciones, Correos Registrados, Pagos por Adelantado y Garantía de {saasConfig.guaranteeDays} Días
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs font-bold text-gold-400"
            >
              <Settings2 className="w-4 h-4" />
              <span>Mis Datos de Cobro (${saasConfig.monthlyPriceUsd})</span>
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Crear Cuenta Limpia a Cliente</span>
            </button>

            <button
              onClick={onExitSuperAdmin}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs font-bold text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la App</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* Shareable Registration Link Banner for Real Clients */}
        <div className="bg-gradient-to-r from-purple-950/40 via-dark-900 to-dark-900 border border-purple-500/30 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
              🔗 Link de Venta y Registro Directo para Clientes Reales
            </span>
            <p className="text-xs text-slate-300 mt-0.5">
              Envía este link a los barberos que quieran comprar. Les abrirá directo el formulario para registrar su correo y pagar con la Garantía de {saasConfig.guaranteeDays} Días (y su cuenta nacerá 100% limpia en cero):
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <code className="px-3 py-2 rounded-xl bg-dark-950 border border-dark-800 text-xs text-emerald-400 font-mono">
              {registrationUrl}
            </code>
            <button
              onClick={handleCopyRegistrationLink}
              className="px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-white border border-dark-700 text-xs font-bold flex items-center gap-1.5"
            >
              {copiedRegLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gold-400" />}
              <span>{copiedRegLink ? '¡Link Copiado!' : 'Copiar Link'}</span>
            </button>
            <button
              onClick={handleShareRegLinkWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Private Registered Demo Credentials Banner (For Videos or High-Intent Prospects) */}
        <div className="bg-dark-900 border border-gold-500/30 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gold-400">
              🎬 Cuenta Demo Privada (Para tus Videos o Prospectos Muy Interesados)
            </span>
            <p className="text-xs text-slate-300 mt-0.5">
              El acceso público está 100% bloqueado. Si necesitas grabar publicidad o pasarle acceso temporal a un cliente muy interesado, usa esta cuenta:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-dark-950 border border-dark-800 text-xs font-mono text-slate-300">
              Correo: <strong className="text-gold-400">{demoTenant.email}</strong> • Clave: <strong className="text-emerald-400">{demoTenant.password || 'demo2026'}</strong>
            </div>
            <button
              onClick={handleCopyDemoCredentials}
              className="px-3.5 py-2 rounded-xl bg-gold-500/15 hover:bg-gold-500/25 text-gold-400 border border-gold-500/30 text-xs font-black flex items-center gap-1.5"
            >
              {copiedDemoCreds ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedDemoCreds ? '¡Credenciales Copiadas!' : 'Copiar Acceso Demo'}</span>
            </button>
          </div>
        </div>
        
        {/* Collapsible Owner Payment Settings */}
        {showSettings && (
          <form onSubmit={handleSaveConfig} className="bg-dark-900 border-2 border-gold-500/40 rounded-3xl p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base">
                  Configurar Precio Mensual, Garantía y Tus Cuentas Receptoras
                </h3>
                <p className="text-xs text-slate-400">
                  Estos son los datos que ven las barberías cuando pagan para activar su cuenta
                </p>
              </div>
              {savedToast && (
                <span className="text-xs font-bold text-emerald-400">✓ Guardado</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gold-400 mb-1">
                  Precio Mensual ($ USDT)
                </label>
                <input
                  type="number"
                  value={configForm.monthlyPriceUsd}
                  onChange={(e) => setConfigForm({ ...configForm, monthlyPriceUsd: parseFloat(e.target.value) || 6 })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-gold-500/40 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">
                  Monto Fijo en Bs (Ej. 6.024)
                </label>
                <input
                  type="text"
                  value={configForm.monthlyPriceBsFixed || '6.024'}
                  onChange={(e) => setConfigForm({ ...configForm, monthlyPriceBsFixed: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-emerald-500/40 text-xs text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tu WhatsApp (Recibir Captures)
                </label>
                <input
                  type="text"
                  value={configForm.ownerWhatsapp}
                  onChange={(e) => setConfigForm({ ...configForm, ownerWhatsapp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-400 mb-1">
                  Tu PIN Maestro Super-Admin
                </label>
                <input
                  type="text"
                  value={configForm.adminPin}
                  onChange={(e) => setConfigForm({ ...configForm, adminPin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-purple-500/40 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Banco Pago Móvil
                </label>
                <input
                  type="text"
                  value={configForm.pagoMovilBank}
                  onChange={(e) => setConfigForm({ ...configForm, pagoMovilBank: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Titular
                </label>
                <input
                  type="text"
                  value={configForm.pagoMovilHolder || 'Carlos Rojas'}
                  onChange={(e) => setConfigForm({ ...configForm, pagoMovilHolder: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Cédula / RIF
                </label>
                <input
                  type="text"
                  value={configForm.pagoMovilId}
                  onChange={(e) => setConfigForm({ ...configForm, pagoMovilId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Teléfono Pago Móvil
                </label>
                <input
                  type="text"
                  value={configForm.pagoMovilPhone}
                  onChange={(e) => setConfigForm({ ...configForm, pagoMovilPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nro de Cuenta (20 díg)
                </label>
                <input
                  type="text"
                  value={configForm.pagoMovilAccount || '01020213260000172378'}
                  onChange={(e) => setConfigForm({ ...configForm, pagoMovilAccount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  Binance Pay ID (IngenioOS)
                </label>
                <input
                  type="text"
                  value={configForm.binanceIdOnly || '92423494'}
                  onChange={(e) => setConfigForm({ ...configForm, binanceIdOnly: e.target.value, binanceEmail: `ID: ${e.target.value} (IngenioOS)` })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">
                  Wallet USDT — BNB Smart Chain (BEP20)
                </label>
                <input
                  type="text"
                  value={configForm.bep20Address || '0xf34fe548272f23d363462ba2685f92932ddbd7aa'}
                  onChange={(e) => setConfigForm({ ...configForm, bep20Address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl bg-dark-800 text-slate-400 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-xs"
              >
                Guardar Mis Datos de Cobro
              </button>
            </div>
          </form>
        )}

        {/* Top SaaS Revenue & Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-500/20 to-dark-900 border border-emerald-500/40 rounded-2xl p-4">
            <span className="text-[11px] font-black text-emerald-400 uppercase">💰 Tu Ingreso Mensual</span>
            <div className="text-2xl font-black text-white font-mono mt-1">${mrrUsd} USD</div>
            <span className="text-[11px] text-slate-300 font-mono">Bs. {mrrBs} ({activeTenants.length} activos)</span>
          </div>

          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === 'all' ? 'bg-dark-800 border-gold-500' : 'bg-dark-900 border-dark-800'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase">Todas las Cuentas</span>
            <div className="text-2xl font-black text-white mt-1">{enrichedTenants.length}</div>
            <span className="text-[10px] text-slate-400">Barberías en base</span>
          </button>

          <button
            onClick={() => setFilter('pendiente_pago')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === 'pendiente_pago' ? 'bg-amber-500/15 border-amber-500' : 'bg-dark-900 border-dark-800'
            }`}
          >
            <span className="text-[11px] font-bold text-amber-400 uppercase">⏳ Por Activar Pago</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{pendingTenants.length}</div>
            <span className="text-[10px] text-slate-400">Registraron su correo</span>
          </button>

          <button
            onClick={() => setFilter('guarantee')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === 'guarantee' ? 'bg-blue-500/15 border-blue-500' : 'bg-dark-900 border-dark-800'
            }`}
          >
            <span className="text-[11px] font-bold text-blue-400 uppercase">🛡️ En Garantía ({saasConfig.guaranteeDays}d)</span>
            <div className="text-2xl font-black text-blue-400 mt-1">{guaranteeTenants.length}</div>
            <span className="text-[10px] text-slate-400">Pagaron hace &lt; {saasConfig.guaranteeDays} días</span>
          </button>

          <button
            onClick={() => setFilter('vencido')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === 'vencido' ? 'bg-red-500/15 border-red-500' : 'bg-dark-900 border-dark-800'
            }`}
          >
            <span className="text-[11px] font-bold text-red-400 uppercase">🔴 Mes Vencido</span>
            <div className="text-2xl font-black text-red-400 mt-1">{expiredTenants.length}</div>
            <span className="text-[10px] text-slate-400">Toca cobrar renovación</span>
          </button>
        </div>

        {/* Clean Demo vs Restore Demo Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-dark-900 border border-dark-800 px-4 py-3 rounded-2xl">
          <span className="text-xs text-slate-400">
            Puedes editar o eliminar cualquier cuenta con los botones de cada fila, o limpiar las de ejemplo:
          </span>
          <div className="flex items-center gap-2">
            {onClearDemoTenants && (
              <button
                onClick={() => {
                  if (confirm('¿Quieres borrar las 4 cuentas ficticias de ejemplo para dejar tu panel limpio?')) {
                    onClearDemoTenants()
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar Cuentas de Ejemplo</span>
              </button>
            )}
            {onRestoreDemoTenants && (
              <button
                onClick={onRestoreDemoTenants}
                className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Restaurar Ejemplos (Modo Publicidad)</span>
              </button>
            )}
          </div>
        </div>

        {/* Tenants Control List */}
        {filteredList.length === 0 ? (
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-10 text-center space-y-3">
            <h3 className="font-bold text-white text-base">No hay cuentas en esta vista</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Usa el botón verde "+ Crear Cuenta Limpia a Cliente" arriba o envía tu link de registro ({registrationUrl}) a tus clientes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map(tenant => (
              <div
                key={tenant.id}
                className="bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all"
              >
                {/* Left info */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-white text-base">
                      {tenant.businessName}
                    </h3>

                    {tenant.isCleanAccount && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase">
                        ✨ Cuenta Limpia Real
                      </span>
                    )}

                    {tenant.status === 'activo' && tenant.inGuarantee && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase">
                        🛡️ Pagado • En Garantía (Día {tenant.dayOfSub} de {saasConfig.guaranteeDays})
                      </span>
                    )}

                    {tenant.status === 'activo' && !tenant.inGuarantee && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                        🟢 Activo Firme • Quedan {tenant.daysRemaining} días
                      </span>
                    )}

                    {tenant.status === 'pendiente_pago' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                        ⏳ Esperando Pago Inicial (Bloqueado)
                      </span>
                    )}

                    {tenant.status === 'vencido' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-black uppercase">
                        🔴 Mensualidad Vencida (Bloqueado)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>👤 Dueño: <strong className="text-slate-200">{tenant.ownerName}</strong></span>
                    <span className="font-mono">📧 Correo: <strong className="text-gold-400">{tenant.email}</strong></span>
                    <span className="font-mono">🔑 Clave: <strong className="text-slate-300">{tenant.password || '123'}</strong></span>
                    <span className="font-mono">📱 {tenant.phone}</span>
                    <span>🧾 Ref: <strong className="text-emerald-400">{tenant.lastPaymentRef}</strong></span>
                  </div>
                </div>

                {/* Right 1-Click Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {tenant.status !== 'activo' ? (
                    <button
                      onClick={() => handleActivate30Days(tenant)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Activar +30 Días</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExpireTenant(tenant)}
                      className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-bold text-xs flex items-center gap-1 transition-all"
                      title="Pausar acceso por vencimiento o reembolso"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pausar</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleWhatsAppOwner(tenant)}
                    className="px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {tenant.status === 'pendiente_pago'
                        ? 'Cobrar WA'
                        : tenant.status === 'activo'
                        ? 'Enviar Acceso WA'
                        : 'Renovar WA'}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectTenantAndExit(tenant)}
                    className="px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700 font-bold text-xs flex items-center gap-1"
                    title="Entrar a esta cuenta"
                  >
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span>Abrir</span>
                  </button>

                  <button
                    onClick={() => openEditModal(tenant)}
                    className="p-2 rounded-xl bg-dark-850 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750"
                    title="Editar correo, clave, nombre o días"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {onDeleteTenant && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Seguro que deseas eliminar la cuenta de "${tenant.businessName}" (${tenant.email})?`)) {
                          onDeleteTenant(tenant.id)
                        }
                      }}
                      className="p-2 rounded-xl bg-dark-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-750"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal: Crear o Editar Cuenta de Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base">
                  {editingTenant ? 'Editar Cuenta de Barbería' : 'Crear Nueva Cuenta Limpia a Cliente'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingTenant ? 'Modifica sus credenciales o días activos' : 'La cuenta nacerá en cero lista para el cliente real'}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenantForm} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Local</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Barbería King"
                  value={newBiz}
                  onChange={(e) => setNewBiz(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Dueño</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pedro Pérez"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Correo de Acceso</label>
                  <input
                    type="email"
                    required
                    placeholder="cliente@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Contraseña</label>
                  <input
                    type="text"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nicho</label>
                  <select
                    value={newNiche}
                    onChange={(e) => setNewNiche(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
                  >
                    <option value="barberia">Barbería</option>
                    <option value="estetica">Salón</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Estado</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white"
                  >
                    <option value="activo">✅ Activo</option>
                    <option value="pendiente_pago">⏳ Por Pagar</option>
                    <option value="vencido">🔴 Vencido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Días Activos</label>
                  <input
                    type="number"
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-dark-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black"
                >
                  {editingTenant ? 'Guardar Cambios' : 'Crear Cuenta Limpia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
