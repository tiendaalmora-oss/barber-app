import React, { useState } from 'react'
import { X, Lock, DollarSign, Users, ArrowDownRight, MessageSquare, Copy, Check, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'

export default function DailyCloseModal({
  isOpen,
  onClose,
  transactions,
  exchangeRate,
  businessProfile,
  staffList,
  onResetDay
}) {
  const [cashInDrawerCounted, setCashInDrawerCounted] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmedReset, setConfirmedReset] = useState(false)

  if (!isOpen) return null

  // 1. Incomes by Payment Method
  const incomeTx = transactions.filter(t => t.monto_usd > 0)
  const totalIncomeUSD = incomeTx.reduce((sum, t) => sum + t.monto_usd, 0)
  const totalIncomeBs = totalIncomeUSD * exchangeRate

  const efectivoUSD = incomeTx
    .filter(t => t.metodo_pago === 'efectivo')
    .reduce((sum, t) => sum + t.monto_usd, 0)

  const pagoMovilUSD = incomeTx
    .filter(t => t.metodo_pago === 'pago_movil')
    .reduce((sum, t) => sum + t.monto_usd, 0)
  const pagoMovilBs = pagoMovilUSD * exchangeRate

  const zelleUSD = incomeTx
    .filter(t => t.metodo_pago === 'zelle' || t.metodo_pago === 'binance')
    .reduce((sum, t) => sum + t.monto_usd, 0)

  const puntoUSD = incomeTx
    .filter(t => t.metodo_pago === 'punto')
    .reduce((sum, t) => sum + t.monto_usd, 0)

  const fiadoUSD = incomeTx
    .filter(t => t.metodo_pago === 'fiado')
    .reduce((sum, t) => sum + t.monto_usd, 0)

  // 2. Expenses
  const expenseTx = transactions.filter(t => t.monto_usd < 0)
  const totalExpensesUSD = Math.abs(expenseTx.reduce((sum, t) => sum + t.monto_usd, 0))
  const totalExpensesBs = totalExpensesUSD * exchangeRate

  // Cash expected in drawer (Cash in minus expenses paid in cash)
  const expectedCashInDrawer = Math.max(0, efectivoUSD - totalExpensesUSD)

  // 3. Commissions by Staff Member
  const commissionsByStaff = (staffList || []).map(staff => {
    const staffTx = incomeTx.filter(t => t.staff_id === staff.id || t.staff_name === staff.name)
    const count = staffTx.length
    const generatedUSD = staffTx.reduce((sum, t) => sum + t.monto_usd, 0)
    const commissionUSD = staffTx.reduce((sum, t) => sum + (t.comision_usd || 0), 0)
    return {
      id: staff.id,
      name: staff.name,
      percentage: staff.commission_percentage || 50,
      count,
      generatedUSD,
      commissionUSD,
      commissionBs: commissionUSD * exchangeRate
    }
  }).filter(s => s.count > 0 || s.commissionUSD > 0)

  const totalCommissionsUSD = commissionsByStaff.reduce((sum, s) => sum + s.commissionUSD, 0)

  // 4. Net Profit in Pocket
  const netProfitUSD = totalIncomeUSD - totalExpensesUSD - totalCommissionsUSD
  const netProfitBs = netProfitUSD * exchangeRate

  // 5. Drawer Cash Audit (Arqueo)
  const countedNum = parseFloat(cashInDrawerCounted)
  const hasCounted = cashInDrawerCounted !== '' && !isNaN(countedNum)
  const differenceUSD = hasCounted ? countedNum - expectedCashInDrawer : 0

  // Format WhatsApp Closing Message
  const generateWhatsAppClosingText = () => {
    const dateStr = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const bizName = businessProfile?.businessName || 'Mi Barbería'

    let msg = `💈 *ACTA DE CIERRE DE CAJA • ${bizName.toUpperCase()}*\n`
    msg += `📅 *Fecha:* ${dateStr}\n`
    msg += `💵 *Tasa BCV:* Bs. ${exchangeRate.toFixed(2)}\n`
    msg += `------------------------------------\n\n`

    msg += `💰 *1. PLATA QUE ENTRÓ (FACTURACIÓN):*\n`
    msg += `• Total Facturado: *$${totalIncomeUSD.toFixed(2)} USD* (Bs. ${totalIncomeBs.toFixed(2)})\n`
    msg += `  - 💵 Efectivo Gaveta: $${efectivoUSD.toFixed(2)}\n`
    msg += `  - 📲 Pago Móvil: Bs. ${pagoMovilBs.toFixed(2)} ($${pagoMovilUSD.toFixed(2)})\n`
    if (puntoUSD > 0) msg += `  - 💳 Punto de Venta: $${puntoUSD.toFixed(2)}\n`
    if (zelleUSD > 0) msg += `  - 🟡 Zelle / Binance: $${zelleUSD.toFixed(2)}\n`
    if (fiadoUSD > 0) msg += `  - 📝 Fiados del Día: $${fiadoUSD.toFixed(2)}\n`

    msg += `\n➖ *2. GASTOS DEL LOCAL:*\n`
    msg += `• Total Gastos: *-$${totalExpensesUSD.toFixed(2)} USD* (Bs. ${totalExpensesBs.toFixed(2)})\n`
    if (expenseTx.length > 0) {
      expenseTx.forEach(ex => {
        msg += `  - ${ex.item_name}: -$${Math.abs(ex.monto_usd).toFixed(2)}\n`
      })
    } else {
      msg += `  - Cero gastos hoy\n`
    }

    msg += `\n✂️ *3. A PAGAR A LOS MUCHACHOS (COMISIONES):*\n`
    if (commissionsByStaff.length > 0) {
      commissionsByStaff.forEach(st => {
        msg += `  - ${st.name} (${st.count} cortes): *$${st.commissionUSD.toFixed(2)} USD* (Bs. ${st.commissionBs.toFixed(2)})\n`
      })
      msg += `• Total Comisiones: *$${totalCommissionsUSD.toFixed(2)} USD*\n`
    } else {
      msg += `  - Sin comisiones registradas\n`
    }

    msg += `\n------------------------------------\n`
    msg += `🏆 *4. TU GANANCIA LIMPIA (EN EL BOLSILLO):*\n`
    msg += `👉 *$${netProfitUSD.toFixed(2)} USD* (Bs. ${netProfitBs.toFixed(2)})\n\n`

    if (hasCounted) {
      msg += `🔎 *ARQUEO DE GAVETA EN FÍSICO:*\n`
      msg += `• Esperado en Efectivo: $${expectedCashInDrawer.toFixed(2)}\n`
      msg += `• Contado en Gaveta: $${countedNum.toFixed(2)}\n`
      if (Math.abs(differenceUSD) < 0.01) {
        msg += `• Estado: ✅ *¡CUADRE PERFECTO! ($0.00 diferencia)*\n`
      } else if (differenceUSD > 0) {
        msg += `• Estado: 🟢 Sobrante de +$${differenceUSD.toFixed(2)}\n`
      } else {
        msg += `• Estado: 🔴 Faltante de -$${Math.abs(differenceUSD).toFixed(2)}\n`
      }
    }

    msg += `\nGenerado con BarberOS • Ingenio Digital`
    return msg
  }

  const handleSendWhatsApp = () => {
    const text = generateWhatsAppClosingText()
    const cleanPhone = (businessProfile?.whatsapp || '').replace(/[^0-9]/g, '')
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateWhatsAppClosingText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-2xl rounded-3xl shadow-2xl p-5 sm:p-6 my-auto space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                Cuadre y Cierre Diario de Caja
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  En Vivo
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Arqueo de gaveta en efectivo, pago móvil, gastos y liquidación de barberos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Pillars Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Entró</span>
            <div className="text-lg font-black text-white mt-0.5">${totalIncomeUSD.toFixed(2)}</div>
            <span className="text-[10px] text-blue-400 font-mono">Bs. {totalIncomeBs.toFixed(2)}</span>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-red-400 block">Gastos Local</span>
            <div className="text-lg font-black text-red-400 mt-0.5">-${totalExpensesUSD.toFixed(2)}</div>
            <span className="text-[10px] text-slate-500 font-mono">Bs. {totalExpensesBs.toFixed(2)}</span>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Comisiones</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">${totalCommissionsUSD.toFixed(2)}</div>
            <span className="text-[10px] text-slate-500 font-mono">A los muchachos</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-[10px] uppercase font-black text-emerald-400 block">Ganancia Limpia</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">${netProfitUSD.toFixed(2)}</div>
            <span className="text-[10px] text-slate-300 font-mono">En tu bolsillo</span>
          </div>
        </div>

        {/* Breakdown by Payment Method */}
        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Desglose de Facturación por Método:</span>
            <span className="text-gold-400 font-mono">Tasa BCV: Bs. {exchangeRate.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">💵 Efectivo Gaveta ($)</span>
              <strong className="text-white text-sm font-mono">${efectivoUSD.toFixed(2)}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">📲 Pago Móvil (Bs)</span>
              <strong className="text-emerald-400 text-sm font-mono">Bs. {pagoMovilBs.toFixed(2)}</strong>
              <span className="text-[10px] text-slate-400 block font-mono">(${pagoMovilUSD.toFixed(2)})</span>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">💳 Punto de Venta</span>
              <strong className="text-white text-sm font-mono">${puntoUSD.toFixed(2)}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">🟡 Zelle / Binance</span>
              <strong className="text-white text-sm font-mono">${zelleUSD.toFixed(2)}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-amber-400 block">📝 Fiados (Por Cobrar)</span>
              <strong className="text-amber-400 text-sm font-mono">${fiadoUSD.toFixed(2)}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">✂️ Total Atenciones</span>
              <strong className="text-white text-sm font-mono">{incomeTx.length} clientes</strong>
            </div>
          </div>
        </div>

        {/* Staff Payout List */}
        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 space-y-2">
          <span className="text-xs font-bold text-slate-300 block">
            Liquidación de Comisiones de Hoy (A Pagar al Personal):
          </span>

          {commissionsByStaff.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">
              No hay comisiones registradas el día de hoy.
            </p>
          ) : (
            <div className="divide-y divide-dark-800 text-xs">
              {commissionsByStaff.map(st => (
                <div key={st.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{st.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {st.count} {st.count === 1 ? 'servicio' : 'servicios'} • Facturó ${st.generatedUSD.toFixed(2)} ({st.percentage}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-amber-400 text-sm block">
                      ${st.commissionUSD.toFixed(2)} USD
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Bs. {st.commissionBs.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Physical Drawer Cash Audit (Arqueo de Gaveta) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 to-dark-850 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Arqueo Físico de Gaveta (¿Cuánto Efectivo $ tienes en mano?)</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Esperado: <strong className="text-white font-mono">${expectedCashInDrawer.toFixed(2)}</strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-center">
            <div className="relative w-full sm:w-60">
              <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="number"
                step="0.01"
                placeholder="Escribe lo que contaste..."
                value={cashInDrawerCounted}
                onChange={(e) => setCashInDrawerCounted(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-dark-900 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
              />
            </div>

            {hasCounted && (
              <div className="flex-1 w-full text-xs font-bold">
                {Math.abs(differenceUSD) < 0.01 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>¡Cuadre Perfecto! Coincide exactamente con el sistema.</span>
                  </span>
                ) : differenceUSD > 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Tienes un sobrante de +${differenceUSD.toFixed(2)} en gaveta.</span>
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Hay un faltante de -${Math.abs(differenceUSD).toFixed(2)} en gaveta.</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-dark-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-dark-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Acta'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <MessageSquare className="w-4 h-4 stroke-[2.5]" />
              <span>Enviar Cierre por WhatsApp</span>
            </button>
          </div>

          {onResetDay && (
            <div className="w-full sm:w-auto flex justify-end">
              {!confirmedReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmedReset(true)}
                  className="px-3 py-2 rounded-xl bg-dark-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-750 text-xs font-bold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cerrar Día y Reiniciar Caja</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-red-400 font-bold">¿Seguro?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetDay()
                      setConfirmedReset(false)
                      onClose()
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-black"
                  >
                    Sí, Dejar en Cero
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmedReset(false)}
                    className="px-2 py-1.5 rounded-lg bg-dark-800 text-slate-300 text-xs font-bold"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
