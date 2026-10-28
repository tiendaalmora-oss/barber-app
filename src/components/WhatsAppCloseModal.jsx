import React, { useState } from 'react'
import { X, MessageSquare, Copy, Check, ExternalLink, Send, Smartphone, ShieldCheck, Share2 } from 'lucide-react'

export default function WhatsAppCloseModal({
  isOpen,
  onClose,
  transactions,
  exchangeRate,
  nicheData
}) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // Date formatted in Venezuelan style
  const today = new Date()
  const dateStr = today.toLocaleDateString('es-VE', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
  const timeStr = today.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })

  // Calculations
  const incomeTx = transactions.filter(t => t.monto_usd > 0)
  const expenseTx = transactions.filter(t => t.monto_usd < 0)

  const totalIncomeUSD = incomeTx.reduce((sum, t) => sum + t.monto_usd, 0)
  const totalIncomeBs = totalIncomeUSD * exchangeRate

  const totalExpensesUSD = Math.abs(expenseTx.reduce((sum, t) => sum + t.monto_usd, 0))
  const totalExpensesBs = totalExpensesUSD * exchangeRate

  const totalCommissionsUSD = incomeTx.reduce((sum, t) => sum + (t.comision_usd || 0), 0)
  const totalCommissionsBs = totalCommissionsUSD * exchangeRate

  const netProfitUSD = totalIncomeUSD - totalExpensesUSD - totalCommissionsUSD
  const netProfitBs = netProfitUSD * exchangeRate

  // Breakdown by payment method
  const pagoMovilUSD = incomeTx.filter(t => t.metodo_pago === 'pago_movil').reduce((s, t) => s + t.monto_usd, 0)
  const efectivoUSD = incomeTx.filter(t => t.metodo_pago === 'efectivo_usd').reduce((s, t) => s + t.monto_usd, 0)
  const digitalUSD = incomeTx.filter(t => ['zelle', 'binance'].includes(t.metodo_pago)).reduce((s, t) => s + t.monto_usd, 0)
  const fiadoUSD = incomeTx.filter(t => t.metodo_pago === 'fiado').reduce((s, t) => s + t.monto_usd, 0)

  // Breakdown by staff
  const staffSummary = {}
  incomeTx.forEach(t => {
    const name = t.staff_name || 'Venta Local'
    if (!staffSummary[name]) {
      staffSummary[name] = { count: 0, commission: 0, total: 0 }
    }
    staffSummary[name].count += 1
    staffSummary[name].commission += (t.comision_usd || 0)
    staffSummary[name].total += t.monto_usd
  })

  // Build the formatted WhatsApp message text
  let messageLines = [
    `💈 *CIERRE DE CAJA - ${nicheData.appTitle.toUpperCase()}*`,
    `📅 ${dateStr.toUpperCase()} · 🕒 ${timeStr}`,
    `💵 *Tasa del Día:* Bs. ${exchangeRate.toFixed(2)} / USD`,
    `────────────────────────`,
    `💰 *TOTAL FACTURADO:* $${totalIncomeUSD.toFixed(2)} USD (~Bs. ${totalIncomeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
    `✂️ *COMISIONES EQUIPO:* -$${totalCommissionsUSD.toFixed(2)} USD`,
    `📉 *GASTOS DEL LOCAL:* -$${totalExpensesUSD.toFixed(2)} USD`,
    `────────────────────────`,
    `🚀 *GANANCIA LIMPIA DUEÑO:* $${netProfitUSD.toFixed(2)} USD`,
    `👉 *(En Bolívares: Bs. ${netProfitBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})*`,
    `────────────────────────`,
    `📊 *MÉTODOS DE PAGO:*`,
    `• Pago Móvil: $${pagoMovilUSD.toFixed(2)} USD (~Bs. ${(pagoMovilUSD * exchangeRate).toFixed(2)})`,
    `• Efectivo $ (Gaveta): $${efectivoUSD.toFixed(2)} USD`,
    digitalUSD > 0 ? `• Zelle / Binance: $${digitalUSD.toFixed(2)} USD` : null,
    fiadoUSD > 0 ? `• Fiados Registrados: $${fiadoUSD.toFixed(2)} USD` : null,
    `────────────────────────`,
    `👥 *LIQUIDACIÓN POR ${nicheData.rolePlural.toUpperCase()}:*`
  ].filter(Boolean)

  Object.entries(staffSummary).forEach(([name, data]) => {
    messageLines.push(`• *${name}*: ${data.count} servicios → Comisión: $${data.commission.toFixed(2)} USD`)
  })

  messageLines.push(`────────────────────────`)
  messageLines.push(`⚡ *Total Atenciones:* ${incomeTx.length} clientes`)
  messageLines.push(`📲 *Reporte generado automáticamente con BarberOS*`)

  const fullMessage = messageLines.join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(fullMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSendWhatsApp = () => {
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
    let url = ''
    if (cleanPhone) {
      if (!cleanPhone.startsWith('58') && cleanPhone.length === 10) {
        cleanPhone = '58' + cleanPhone
      }
      url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`
    }
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-dark-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-dark-900 border-b border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base flex items-center gap-2">
                Cierre de Caja por WhatsApp
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Listo para enviar
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Envía el resumen diario al dueño o al grupo del equipo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Optional phone input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Número de WhatsApp (Opcional):</span>
              <span className="text-[11px] text-slate-500">Dejar en blanco para elegir el chat</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej: +58 412 1234567 o teléfono del dueño"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-dark-950 border border-dark-750 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 transition-all font-mono"
              />
              <Smartphone className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* WhatsApp Preview Bubble */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Vista Previa del Mensaje:
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {fullMessage.length} caracteres
              </span>
            </div>

            <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 text-xs font-mono text-slate-200 leading-relaxed shadow-inner max-h-64 overflow-y-auto whitespace-pre-wrap selection:bg-emerald-500/30 selection:text-white">
              {fullMessage}
            </div>
          </div>

          {/* Quick Highlight of Totals */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-dark-950 p-2.5 rounded-xl border border-dark-800">
              <span className="text-[10px] text-slate-400 block font-sans">Facturado Hoy:</span>
              <span className="text-sm font-black text-white font-mono">${totalIncomeUSD.toFixed(2)} USD</span>
            </div>
            <div className="bg-dark-950 p-2.5 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 block font-sans">Ganancia Limpia:</span>
              <span className="text-sm font-black text-emerald-400 font-mono">${netProfitUSD.toFixed(2)} USD</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-dark-950 border-t border-dark-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              copied 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-dark-850 hover:bg-dark-800 text-slate-300 border-dark-750'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Copiado con Éxito!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Texto</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
            <span>Abrir en WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  )
}
