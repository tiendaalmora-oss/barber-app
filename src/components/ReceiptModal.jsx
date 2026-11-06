import React from 'react'
import { X, Receipt, Smartphone } from 'lucide-react'
import { normalizeWhatsAppPhone, formatMethodName } from '../lib/dateUtils'

export default function ReceiptModal({ isOpen, onClose, transaction, exchangeRate = 889.26, businessProfile }) {
  if (!isOpen || !transaction) return null

  const tx = transaction
  const cleanPhone = normalizeWhatsAppPhone(tx.client_phone || '')
  const bizName = businessProfile?.businessName || 'Mi Negocio'
  const totalUSD = tx.total_cobrado_usd || (tx.monto_usd + (tx.propina_usd || 0))
  const totalBs = tx.total_cobrado_bs || (totalUSD * exchangeRate)

  const handleSendWhatsApp = () => {
    let msg = `🧾 *FACTURA / RECIBO DE PAGO • ${bizName.toUpperCase()}*\n`
    msg += `👤 *Cliente:* ${tx.client_name || 'Cliente'}\n`
    msg += `💈 *Atendido por:* ${tx.staff_name || 'Personal'}\n`
    msg += `📅 *Fecha:* ${tx.fecha ? tx.fecha.split('T')[0] : 'Hoy'} - ${tx.hora || ''}\n`
    msg += `------------------------------------\n`
    msg += `✂️ *DETALLE DE SU CUENTA:*\n`
    if (tx.items && tx.items.length > 0) {
      tx.items.forEach(it => {
        msg += `• ${it.qty > 1 ? `${it.qty}x ` : ''}${it.name}: $${(it.price_usd * (it.qty || 1)).toFixed(2)}\n`
      })
    } else {
      msg += `• ${tx.item_name}: $${tx.monto_usd.toFixed(2)}\n`
    }
    if (tx.propina_usd > 0) {
      msg += `🪙 *Propina:* $${tx.propina_usd.toFixed(2)} USD (Bs. ${(tx.propina_bs || (tx.propina_usd * exchangeRate)).toFixed(2)})\n`
    }
    msg += `------------------------------------\n`
    msg += `💰 *TOTAL PAGADO: $${totalUSD.toFixed(2)} USD*\n`
    msg += `👉 *Al cambio BCV: Bs. ${totalBs.toFixed(2)}*\n`
    if (Array.isArray(tx.payment_splits) && tx.payment_splits.length > 0) {
      msg += `💳 *Método de pago:* PAGO MIXTO\n`
      tx.payment_splits.forEach(sp => {
        msg += `  • ${formatMethodName(sp.method)}: $${Number(sp.amount_usd).toFixed(2)} USD (Bs. ${Number(sp.amount_bs || (sp.amount_usd * exchangeRate)).toFixed(2)})\n`
      })
      msg += `\n`
    } else {
      msg += `💳 *Método de pago:* ${formatMethodName(tx.metodo_pago).toUpperCase()}\n\n`
    }
    msg += `¡Gracias por visitarnos, te esperamos pronto! ✨`

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-900 border-2 border-emerald-500/50 w-full max-w-md rounded-3xl p-6 shadow-2xl text-center space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-dark-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
          <Receipt className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            ✓ Comprobante Digital de Caja
          </span>
          <h3 className="text-xl font-black text-white mt-1">
            Factura de Pago
          </h3>
          <p className="text-xs text-slate-400">
            {bizName} • {tx.fecha ? tx.fecha.split('T')[0] : 'Hoy'} ({tx.hora || ''})
          </p>
        </div>

        {/* Ticket Body */}
        <div className="bg-dark-950 p-4 rounded-2xl border border-dark-800 text-left space-y-2 text-xs font-mono">
          <div className="flex justify-between font-sans">
            <span className="text-slate-400">Cliente:</span>
            <span className="font-bold text-white">{tx.client_name || 'Cliente Mostrador'}</span>
          </div>
          <div className="flex justify-between font-sans">
            <span className="text-slate-400">Atendió:</span>
            <span className="font-bold text-gold-400">{tx.staff_name || 'Personal'}</span>
          </div>
          {tx.client_phone && (
            <div className="flex justify-between font-sans">
              <span className="text-slate-400">WhatsApp:</span>
              <span className="font-bold text-slate-300">{tx.client_phone}</span>
            </div>
          )}
          <div className="pt-2 border-t border-dark-800 space-y-1">
            {tx.items && tx.items.length > 0 ? (
              tx.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-slate-300">
                  <span className="truncate pr-2">{it.qty > 1 ? `${it.qty}x ` : ''}{it.name}</span>
                  <span className="font-bold">${(it.price_usd * (it.qty || 1)).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-slate-300">
                <span className="truncate pr-2">{tx.item_name}</span>
                <span className="font-bold">${tx.monto_usd.toFixed(2)}</span>
              </div>
            )}

            {tx.propina_usd > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>🪙 Propina:</span>
                <span className="font-bold">+${tx.propina_usd.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-dark-800 flex justify-between font-sans text-sm font-black">
            <span className="text-white">TOTAL PAGADO:</span>
            <span className="text-emerald-400 font-mono text-base">${totalUSD.toFixed(2)}</span>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            Bs. {totalBs.toFixed(2)} (Método: {formatMethodName(tx.metodo_pago).toUpperCase()})
          </div>
          {Array.isArray(tx.payment_splits) && tx.payment_splits.length > 0 && (
            <div className="pt-2 border-t border-dark-800/80 space-y-1 text-[11px]">
              <div className="text-purple-400 font-sans font-bold uppercase tracking-wider text-[10px]">
                🔀 Desglose de Pago Mixto:
              </div>
              {tx.payment_splits.map((sp, i) => (
                <div key={i} className="flex justify-between text-slate-300">
                  <span>• {formatMethodName(sp.method)}:</span>
                  <span className="font-bold text-white">
                    ${Number(sp.amount_usd).toFixed(2)} <span className="text-slate-500">(Bs. {Number(sp.amount_bs || (sp.amount_usd * exchangeRate)).toFixed(0)})</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleSendWhatsApp}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>Reenviar Factura por WhatsApp</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
