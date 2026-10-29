import React, { useState } from 'react'
import { ShieldCheck, Lock, Copy, Check, MessageSquare, CreditCard, ArrowLeft, Crown, CheckCircle2 } from 'lucide-react'
import { normalizeWhatsAppPhone } from '../lib/dateUtils'

export default function SubscriptionLockView({
  tenant,
  saasConfig,
  exchangeRate,
  onReportPaymentRef,
  onLogout
}) {
  const [paymentRef, setPaymentRef] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('Pago Móvil BDV')
  const [copiedField, setCopiedField] = useState('')
  const [reported, setReported] = useState(false)

  const priceUsd = saasConfig.monthlyPriceUsd || 6
  const priceBs = saasConfig.monthlyPriceBsFixed || '6.024'
  const isNewAccount = tenant?.status === 'pendiente_pago'

  const copyText = (label, text) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(''), 2000)
  }

  const handleSendPaymentWhatsApp = (e) => {
    e.preventDefault()
    const refText = paymentRef.trim() || 'Adjunto capture'
    if (onReportPaymentRef && tenant) {
      onReportPaymentRef(tenant.id, `${selectedMethod}: ${refText}`)
    }
    setReported(true)

    const cleanPhone = normalizeWhatsAppPhone(saasConfig?.ownerWhatsapp || '+5491164827875')
    const msg = isNewAccount
      ? `🚀 *¡Hola equipo de IngenioOS!* Acabo de registrar mi negocio y realicé el pago para activar mi cuenta (con la Garantía de ${saasConfig.guaranteeDays} días):\n\n` +
        `💈 *Negocio:* ${tenant?.businessName}\n` +
        `👤 *Dueño:* ${tenant?.ownerName}\n` +
        `📧 *Correo de Acceso:* ${tenant?.email}\n` +
        `💳 *Método:* ${selectedMethod} ($${priceUsd} USD / ${priceBs} Bs)\n` +
        `🧾 *Referencia:* ${refText}\n\n` +
        `Aquí envío mi capture para que me activen los 30 días de acceso. ¡Gracias!`
      : `⚡ *¡Hola equipo de IngenioOS!* Realicé el pago de renovación mensual (+30 días) de mi sistema:\n\n` +
        `💈 *Negocio:* ${tenant?.businessName}\n` +
        `📧 *Correo:* ${tenant?.email}\n` +
        `💳 *Método:* ${selectedMethod} ($${priceUsd} USD / ${priceBs} Bs)\n` +
        `🧾 *Referencia:* ${refText}\n\n` +
        `Adjunto el comprobante para reactivar mi acceso.`

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      
      {/* Top Bar */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between gap-2 pb-4 border-b border-dark-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-gold-400" />
          <span>Cuenta: <strong className="text-white">{tenant?.email}</strong></span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-bold text-gold-400 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cerrar Sesión / Cambiar Correo</span>
        </button>
      </div>

      {/* Center Lock / Activation Card */}
      <div className="max-w-3xl w-full mx-auto my-6 space-y-5 animate-fadeIn">
        
        {/* Hero Guarantee Card */}
        <div className="bg-gradient-to-b from-dark-900 to-dark-950 border-2 border-gold-500/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/15 border border-gold-500/40 text-gold-400 mx-auto flex items-center justify-center mb-3">
            {isNewAccount ? <ShieldCheck className="w-9 h-9" /> : <Lock className="w-8 h-8" />}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30 text-[11px] font-black uppercase tracking-wider">
            {isNewAccount
              ? `🛡️ Garantía Blindada de ${saasConfig.guaranteeDays} Días • Cero Riesgo`
              : '⚡ Membresía Mensual Vencida'}
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
            {isNewAccount
              ? `¡Cuenta creada para ${tenant?.businessName}!`
              : `Renueva el acceso de ${tenant?.businessName}`}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl mx-auto leading-relaxed">
            {isNewAccount ? (
              <>
                Tu correo <strong className="text-white">{tenant?.email}</strong> ya está registrado. Para activar tus <strong className="text-gold-400">30 días completos de sistema</strong> (Caja, Comisiones, Link de Citas y Retargeting), realiza tu pago inicial.{' '}
                <span className="text-emerald-400 font-bold">
                  Tienes {saasConfig.guaranteeDays} días de prueba con garantía total: si no te convence, te devolvemos el 100% de tu dinero sin preguntas.
                </span>
              </>
            ) : (
              <>
                Los 30 días de tu suscripción para <strong className="text-white">{tenant?.email}</strong> se cumplieron. Tus clientes, citas y cuentas están 100% guardados. Realiza tu pago mensual para desbloquear tu sistema al instante.
              </>
            )}
          </p>

          {/* Price Box */}
          <div className="mt-5 inline-flex flex-col sm:flex-row items-center gap-3 bg-dark-950 border border-dark-800 px-6 py-3.5 rounded-2xl">
            <div className="text-center sm:text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Inversión Mensual (30 Días Activos)
              </span>
              <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                <span className="text-3xl font-black text-emerald-400 font-mono">${priceUsd} USD</span>
                <span className="text-sm text-gold-400 font-mono font-black">
                  / {priceBs} Bs
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-dark-800 hidden sm:block"></div>
            <div className="text-left text-[11px] text-slate-300 space-y-0.5">
              <div>✓ Incluye Link Web de Reservas</div>
              <div>✓ Radar de Retargeting + WhatsApp</div>
              <div>✓ Garantía de Reembolso ({saasConfig.guaranteeDays} días)</div>
            </div>
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gold-400" />
            <span>1. Datos para Pagar (${priceUsd} USDT o {priceBs} Bs)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Pago Móvil / Cuenta BDV */}
            <div
              onClick={() => setSelectedMethod('Pago Móvil BDV')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                selectedMethod === 'Pago Móvil BDV'
                  ? 'bg-gold-500/10 border-gold-500'
                  : 'bg-dark-850 border-dark-750 hover:border-dark-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gold-400">📲 Pago Móvil ({priceBs} Bs)</span>
                  {selectedMethod === 'Pago Móvil BDV' && <Check className="w-4 h-4 text-gold-400" />}
                </div>
                <div className="mt-2.5 space-y-1 text-xs text-slate-300 font-mono">
                  <div>🏦 <strong className="text-white">{saasConfig.pagoMovilBank || 'Banco de Venezuela (0102)'}</strong></div>
                  <div>👤 Titular: <strong className="text-white">{saasConfig.pagoMovilHolder || 'Carlos Rojas'}</strong></div>
                  <div>🪪 Cédula: <strong className="text-emerald-400">{saasConfig.pagoMovilId || '17.907.078'}</strong></div>
                  <div>📱 Teléfono: <strong className="text-emerald-400">{saasConfig.pagoMovilPhone || '04242061590'}</strong></div>
                  <div className="pt-1 text-[10px] text-slate-400 break-all">
                    Cuenta: <span className="text-slate-200">{saasConfig.pagoMovilAccount || '01020213260000172378'}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyText('pm', `0102 | ${saasConfig.pagoMovilId || '17907078'} | ${saasConfig.pagoMovilPhone || '04242061590'}`)
                  }}
                  className="py-1.5 px-2 rounded-lg bg-dark-900 hover:bg-dark-800 text-[10px] font-bold text-slate-200 flex items-center justify-center gap-1 border border-dark-700"
                >
                  {copiedField === 'pm' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'pm' ? '¡Copiado!' : 'Pago Móvil'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyText('cta', saasConfig.pagoMovilAccount || '01020213260000172378')
                  }}
                  className="py-1.5 px-2 rounded-lg bg-dark-900 hover:bg-dark-800 text-[10px] font-bold text-slate-200 flex items-center justify-center gap-1 border border-dark-700"
                >
                  {copiedField === 'cta' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'cta' ? '¡Copiada!' : 'Nro Cuenta'}</span>
                </button>
              </div>
            </div>

            {/* Binance Pay ID */}
            <div
              onClick={() => setSelectedMethod('Binance Pay ID')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                selectedMethod === 'Binance Pay ID'
                  ? 'bg-gold-500/10 border-gold-500'
                  : 'bg-dark-850 border-dark-750 hover:border-dark-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400">🟡 Binance Pay (${priceUsd} USDT)</span>
                  {selectedMethod === 'Binance Pay ID' && <Check className="w-4 h-4 text-gold-400" />}
                </div>
                <div className="mt-2.5 space-y-1.5 text-xs text-slate-300 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Binance ID:</span>
                    <strong className="text-lg text-white">{saasConfig.binanceIdOnly || '92423494'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nombre de Usuario:</span>
                    <strong className="text-amber-400">IngenioOS</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  copyText('bin', saasConfig.binanceIdOnly || '92423494')
                }}
                className="mt-2 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1 border border-dark-700"
              >
                {copiedField === 'bin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'bin' ? '¡ID Copiado!' : 'Copiar ID: 92423494'}</span>
              </button>
            </div>

            {/* Red BNB Smart Chain (BEP20) */}
            <div
              onClick={() => setSelectedMethod('USDT Red BEP20')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                selectedMethod === 'USDT Red BEP20'
                  ? 'bg-gold-500/10 border-gold-500'
                  : 'bg-dark-850 border-dark-750 hover:border-dark-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400">⛓️ USDT BEP20 (${priceUsd})</span>
                  {selectedMethod === 'USDT Red BEP20' && <Check className="w-4 h-4 text-gold-400" />}
                </div>
                <div className="mt-2.5 space-y-1.5 text-xs text-slate-300 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Red de Depósito:</span>
                    <strong className="text-amber-400">BNB Smart Chain (BEP20)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dirección Wallet:</span>
                    <span className="text-[11px] text-white font-bold break-all block">
                      {saasConfig.bep20Address || '0xf34fe548272f23d363462ba2685f92932ddbd7aa'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  copyText('bep20', saasConfig.bep20Address || '0xf34fe548272f23d363462ba2685f92932ddbd7aa')
                }}
                className="mt-2 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1 border border-dark-700"
              >
                {copiedField === 'bep20' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'bep20' ? '¡Wallet Copiada!' : 'Copiar Wallet BEP20'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Report Reference & Send Capture */}
          <form onSubmit={handleSendPaymentWhatsApp} className="pt-3 border-t border-dark-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              2. Escribe los últimos dígitos de tu comprobante y envía el capture por WhatsApp para activarte de inmediato:
            </label>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="Ej. Referencia #8492 (Opcional)"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
              />

              <button
                type="submit"
                className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all"
              >
                <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                <span>Ya Pagué: Enviar Capture por WhatsApp</span>
              </button>
            </div>

            {reported && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  ¡Referencia registrada! En cuanto verifiquemos tu capture en WhatsApp, tu correo quedará activo por 30 días.
                </span>
              </div>
            )}
          </form>
        </div>

      </div>

      {/* Footer */}
      <div className="max-w-3xl w-full mx-auto text-center text-[11px] text-slate-500">
        Ingenio OS • Sistema de Gestión y Agenda para Barberías y Salones • Garantía de Satisfacción de {saasConfig.guaranteeDays} Días
      </div>
    </div>
  )
}
