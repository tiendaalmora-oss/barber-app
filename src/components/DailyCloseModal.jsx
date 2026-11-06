import React, { useState } from 'react'
import { X, Lock, DollarSign, Users, ArrowDownRight, MessageSquare, Copy, Check, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'
import { isDateToday, getLocalDateIso, normalizeWhatsAppPhone, isEfectivoMethod, isPuntoMethod, isPagoMovilMethod, isDigitalMethod, isFiadoMethod } from '../lib/dateUtils'
import { getActiveBrand } from '../lib/brandConfig'

export default function DailyCloseModal({
  isOpen,
  onClose,
  transactions,
  exchangeRate,
  businessProfile,
  staffList,
  onResetDay,
  onResetDailyTransactions,
  onSaveDailyClose
}) {
  const [cashInDrawerCounted, setCashInDrawerCounted] = useState('')
  const [copied, setCopied] = useState(false)
  const [closingSaved, setClosingSaved] = useState(false)
  const [tipDeliveryMode, setTipDeliveryMode] = useState('individual') // 'individual' | 'grupal'

  const handleResetAction = onResetDay || onResetDailyTransactions

  if (!isOpen) return null

  // 1. Filter transactions for TODAY in local time
  const todayTx = (transactions || []).filter(t => isDateToday(t.fecha))
  const incomeTx = todayTx.filter(t => t.monto_usd > 0)
  const totalIncomeUSD = incomeTx.reduce((sum, t) => sum + t.monto_usd, 0)
  const totalIncomeBs = totalIncomeUSD * exchangeRate

  // Propinas del día (separadas de la facturación del local)
  const totalTipsUSD = incomeTx.reduce((sum, t) => sum + (t.propina_usd || 0), 0)
  const totalTipsBs = totalTipsUSD * exchangeRate

  const tipsByStaff = (staffList || []).map(staff => {
    const staffTipsTx = incomeTx.filter(t => t.propina_staff_id === staff.id || (t.propina_staff_name && t.propina_staff_name === staff.name))
    const tipsUSD = staffTipsTx.reduce((sum, t) => sum + (t.propina_usd || 0), 0)
    return {
      id: staff.id,
      name: staff.name,
      tipsUSD,
      tipsBs: tipsUSD * exchangeRate
    }
  }).filter(s => s.tipsUSD > 0)

  const activeStaffCount = Math.max(1, (staffList || []).length)
  const tipPoolPerStaffUSD = totalTipsUSD / activeStaffCount
  const tipPoolPerStaffBs = tipPoolPerStaffUSD * exchangeRate

  const efectivoUSD = incomeTx
    .filter(t => isEfectivoMethod(t.metodo_pago))
    .reduce((sum, t) => sum + t.monto_usd, 0)

  const pagoMovilUSD = incomeTx
    .filter(t => isPagoMovilMethod(t.metodo_pago))
    .reduce((sum, t) => sum + t.monto_usd, 0)
  const pagoMovilBs = pagoMovilUSD * exchangeRate

  const zelleUSD = incomeTx
    .filter(t => isDigitalMethod(t.metodo_pago))
    .reduce((sum, t) => sum + t.monto_usd, 0)

  const puntoUSD = incomeTx
    .filter(t => isPuntoMethod(t.metodo_pago))
    .reduce((sum, t) => sum + t.monto_usd, 0)

  const fiadoUSD = incomeTx
    .filter(t => isFiadoMethod(t.metodo_pago))
    .reduce((sum, t) => sum + t.monto_usd, 0)

  // 2. Expenses & Vales of today
  const allNegativeTx = todayTx.filter(t => t.monto_usd < 0)
  const valesTx = todayTx.filter(t => t.type === 'vale' || t.category === 'Vale Empleado')
  const totalValesUSD = Math.abs(valesTx.reduce((sum, t) => sum + (t.monto_usd || 0), 0))
  const totalValesBs = totalValesUSD * exchangeRate

  // Local operating expenses (insumos, alquiler, luz, comida, etc. - excluding vales and payouts)
  const operatingExpenseTx = allNegativeTx.filter(t => t.category !== 'Vale Empleado' && t.category !== 'Comisiones' && t.type !== 'vale')
  const totalExpensesUSD = Math.abs(operatingExpenseTx.reduce((sum, t) => sum + t.monto_usd, 0))
  const totalExpensesBs = totalExpensesUSD * exchangeRate

  // Cash expected in drawer (Efectivo cobrado menos todas las salidas en efectivo: gastos y vales)
  const cashExpensesUSD = Math.abs(
    allNegativeTx
      .filter(t => isEfectivoMethod(t.metodo_pago) || !t.metodo_pago)
      .reduce((sum, t) => sum + t.monto_usd, 0)
  )
  const expectedCashInDrawer = Math.max(0, efectivoUSD - cashExpensesUSD)

  // 3. Commissions by Staff Member (with Vales of today deducted!)
  const commissionsByStaff = (staffList || []).map(staff => {
    const staffTx = incomeTx.filter(t => t.staff_id === staff.id || t.staff_name === staff.name)
    const count = staffTx.length
    const generatedUSD = staffTx.reduce((sum, t) => sum + t.monto_usd, 0)
    const commissionUSD = staffTx.reduce((sum, t) => sum + (t.comision_usd || 0), 0)

    // Vales of this staff member today
    const staffValesToday = valesTx.filter(t => t.staff_id === staff.id || t.staff_name === staff.name)
    const staffValesUSD = Math.abs(staffValesToday.reduce((sum, t) => sum + (t.monto_usd || 0), 0))
    const netCommissionUSD = commissionUSD - staffValesUSD

    return {
      id: staff.id,
      name: staff.name,
      percentage: staff.commission_percentage || 50,
      count,
      generatedUSD,
      commissionUSD,
      valesUSD: staffValesUSD,
      netCommissionUSD,
      commissionBs: commissionUSD * exchangeRate,
      netCommissionBs: netCommissionUSD * exchangeRate
    }
  }).filter(s => s.count > 0 || s.commissionUSD > 0 || s.valesUSD > 0)

  const totalCommissionsUSD = commissionsByStaff.reduce((sum, s) => sum + s.commissionUSD, 0)
  const totalNetCommissionsUSD = commissionsByStaff.reduce((sum, s) => sum + s.netCommissionUSD, 0)

  // 4. Net Profit in Pocket for Business (Income - Operating Expenses - Raw Commissions)
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

    msg += `\n➖ *2. GASTOS OPERATIVOS DEL LOCAL:*\n`
    msg += `• Total Gastos: *-$${totalExpensesUSD.toFixed(2)} USD* (Bs. ${totalExpensesBs.toFixed(2)})\n`
    if (operatingExpenseTx.length > 0) {
      operatingExpenseTx.forEach(ex => {
        msg += `  - ${ex.item_name}: -$${Math.abs(ex.monto_usd).toFixed(2)}\n`
      })
    } else {
      msg += `  - Cero gastos hoy\n`
    }

    if (totalValesUSD > 0) {
      msg += `\n🧾 *3. VALES Y ADELANTOS ENTREGADOS HOY:*\n`
      msg += `• Total Vales: *-$${totalValesUSD.toFixed(2)} USD* (Bs. ${totalValesBs.toFixed(2)})\n`
      valesTx.forEach(v => {
        msg += `  - ${v.staff_name || 'Empleado'} (${v.motivo || 'Vale'}): -$${Math.abs(v.monto_usd).toFixed(2)} (${v.metodo_pago === 'efectivo_usd' ? 'Efectivo' : 'Banco'})\n`
      })
    }

    msg += `\n✂️ *${totalValesUSD > 0 ? '4' : '3'}. A PAGAR A LOS MUCHACHOS (LIQUIDACIÓN):*\n`
    if (commissionsByStaff.length > 0) {
      commissionsByStaff.forEach(st => {
        if (st.valesUSD > 0) {
          msg += `  - ${st.name} (${st.count} cortes): Comisiones $${st.commissionUSD.toFixed(2)} - Vales $${st.valesUSD.toFixed(2)} = *Neto $${st.netCommissionUSD.toFixed(2)} USD* (Bs. ${st.netCommissionBs.toFixed(2)})\n`
        } else {
          msg += `  - ${st.name} (${st.count} cortes): *$${st.commissionUSD.toFixed(2)} USD* (Bs. ${st.commissionBs.toFixed(2)})\n`
        }
      })
      msg += `• Total Comisiones Netas: *$${totalNetCommissionsUSD.toFixed(2)} USD*\n`
    } else {
      msg += `  - Sin comisiones registradas\n`
    }

    if (totalTipsUSD > 0) {
      msg += `\n🪙 *${totalValesUSD > 0 ? '5' : '4'}. PROPINAS DEL DÍA (APARTE):*\n`
      msg += `• Total Propinas Recaudadas: *$${totalTipsUSD.toFixed(2)} USD* (Bs. ${totalTipsBs.toFixed(2)})\n`
      if (tipDeliveryMode === 'grupal') {
        msg += `  - Modalidad: 👥 *Pote Grupal Equitativo*\n`
        msg += `  - Corresponde a cada profesional (${activeStaffCount}): *$${tipPoolPerStaffUSD.toFixed(2)} USD* (Bs. ${tipPoolPerStaffBs.toFixed(2)})\n`
      } else {
        msg += `  - Modalidad: 👤 *Entrega Individual Separada*\n`
        tipsByStaff.forEach(st => {
          msg += `  - ${st.name}: *$${st.tipsUSD.toFixed(2)} USD* (Bs. ${st.tipsBs.toFixed(2)})\n`
        })
      }
    }

    msg += `\n------------------------------------\n`
    msg += `🏆 *${totalValesUSD > 0 ? '6' : '5'}. TU GANANCIA LIMPIA (EN EL BOLSILLO):*\n`
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

    msg += `\nGenerado con ${getActiveBrand().name} • Ingenio Digital`
    return msg
  }

  const handleSendWhatsApp = () => {
    const text = generateWhatsAppClosingText()
    const cleanPhone = normalizeWhatsAppPhone(businessProfile?.whatsapp || '')
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
            <span className="text-[10px] text-slate-500 font-mono">
              {totalValesUSD > 0 ? `+ $${totalValesUSD.toFixed(2)} en vales` : `Bs. ${totalExpensesBs.toFixed(2)}`}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Comisiones</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">${totalCommissionsUSD.toFixed(2)}</div>
            <span className="text-[10px] text-slate-500 font-mono">
              {totalValesUSD > 0 ? `Neto hoy: $${totalNetCommissionsUSD.toFixed(2)}` : 'A los muchachos'}
            </span>
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
                <div key={st.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{st.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {st.count} {st.count === 1 ? 'servicio' : 'servicios'} • Facturó ${st.generatedUSD.toFixed(2)} ({st.percentage}%)
                    </span>
                    {st.valesUSD > 0 && (
                      <span className="inline-block mt-0.5 text-[10px] text-amber-400 font-bold">
                        🧾 Vales hoy: -${st.valesUSD.toFixed(2)} USD
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-amber-400 text-sm block">
                      ${st.netCommissionUSD.toFixed(2)} {st.valesUSD > 0 ? 'Neto' : 'USD'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {st.valesUSD > 0 ? `(Comisión: $${st.commissionUSD.toFixed(2)})` : `Bs. ${st.commissionBs.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Propinas del Día (Aparte) */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>🪙 Propinas del Día (Aparte):</span>
              <span className="font-mono font-black text-amber-400">${totalTipsUSD.toFixed(2)} USD</span>
            </span>
            <div className="flex items-center gap-1 bg-dark-900 p-0.5 rounded-lg border border-dark-750">
              <button
                type="button"
                onClick={() => setTipDeliveryMode('individual')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  tipDeliveryMode === 'individual'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setTipDeliveryMode('grupal')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  tipDeliveryMode === 'grupal'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pote Grupal
              </button>
            </div>
          </div>

          {totalTipsUSD === 0 ? (
            <p className="text-xs text-slate-500 py-0.5">
              No se registraron propinas el día de hoy.
            </p>
          ) : tipDeliveryMode === 'grupal' ? (
            <div className="p-2.5 rounded-xl bg-dark-900/80 border border-dark-800 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Fondo Común Compartido</span>
                <span className="text-[10px] text-slate-400">
                  Dividido equitativamente entre {activeStaffCount} profesionales
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-amber-400 text-sm block">
                  ${tipPoolPerStaffUSD.toFixed(2)} c/u
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Bs. {tipPoolPerStaffBs.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-dark-800 text-xs">
              {tipsByStaff.map(st => (
                <div key={st.id} className="py-1.5 flex items-center justify-between">
                  <span className="font-bold text-white">{st.name}</span>
                  <div className="text-right">
                    <span className="font-mono font-black text-amber-400 text-xs block">
                      +${st.tipsUSD.toFixed(2)} USD
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Bs. {st.tipsBs.toFixed(2)}
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

          <div className="w-full sm:w-auto flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={closingSaved}
              onClick={() => {
                const closingRecord = {
                  id: `close_${Date.now()}`,
                  fecha: getLocalDateIso(),
                  timestamp: new Date().toISOString(),
                  totalIncomeUSD,
                  totalIncomeBs,
                  totalExpensesUSD,
                  totalValesUSD,
                  totalTipsUSD,
                  efectivoUSD,
                  pagoMovilUSD,
                  pagoMovilBs,
                  zelleUSD,
                  puntoUSD,
                  fiadoUSD,
                  expectedCashInDrawer,
                  cashInDrawerCounted: hasCounted ? countedNum : expectedCashInDrawer,
                  differenceUSD: hasCounted ? differenceUSD : 0,
                  netProfitUSD,
                  transactionsCount: todayTx.length,
                  commissionsByStaff,
                  tipsByStaff,
                  exchangeRate
                }

                if (onSaveDailyClose) {
                  onSaveDailyClose(closingRecord)
                }
                if (handleResetAction) {
                  handleResetAction(closingRecord)
                }

                setClosingSaved(true)
                setTimeout(() => {
                  setClosingSaved(false)
                  onClose()
                }, 1200)
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              {closingSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>¡Cierre Guardado!</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar Cuadre & Cerrar Jornada</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
