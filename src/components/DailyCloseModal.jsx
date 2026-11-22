import React, { useState, useEffect } from 'react'
import { X, Lock, DollarSign, Users, ArrowDownRight, MessageSquare, Copy, Check, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'
import { isDateToday, isDateInWeek, getWeekBoundsLocal, getLocalDateIso, normalizeWhatsAppPhone, isEfectivoMethod, isPuntoMethod, isPagoMovilMethod, isDigitalMethod, isFiadoMethod, getTxMethodAmountUSD } from '../lib/dateUtils'
import { getActiveBrand, isArgentina, formatCurrency } from '../lib/brandConfig'
import { isCashierStaff, calculateCashierCommissionForTx } from '../lib/securityUtils'

export default function DailyCloseModal({
  isOpen,
  onClose,
  transactions,
  exchangeRate,
  businessProfile,
  staffList,
  onResetDay,
  onResetDailyTransactions,
  onSaveDailyClose,
  initialPeriod = 'today',
  isCashierMode = false,
  securityConfig = {},
  auditLogs = [],
  activeOperator = null
}) {
  const [cashInDrawerCounted, setCashInDrawerCounted] = useState('')
  const [copied, setCopied] = useState(false)
  const [closingSaved, setClosingSaved] = useState(false)
  const [tipDeliveryMode, setTipDeliveryMode] = useState('individual') // 'individual' | 'grupal'
  const [closePeriod, setClosePeriod] = useState(initialPeriod || 'today')

  useEffect(() => {
    if (isOpen) {
      setClosePeriod(isCashierMode ? 'today' : (initialPeriod || 'today'))
      setCashInDrawerCounted('')
    }
  }, [isOpen, initialPeriod, isCashierMode]) // 'today' | 'this_week' | 'prev_week'

  const handleResetAction = onResetDay || onResetDailyTransactions

  if (!isOpen) return null

  const isAr = isArgentina(null, businessProfile)
  const fmt = (val) => formatCurrency(val, isAr)
  const currTag = isAr ? 'ARS' : 'USD'
  const hideProfits = Boolean(isCashierMode && securityConfig?.enabled && securityConfig?.hideOwnerProfits)
  const isBlindCount = Boolean(isCashierMode && securityConfig?.enabled && securityConfig?.blindCashCount)
  const effectivePeriod = isCashierMode ? 'today' : closePeriod
  const thisWeekBounds = getWeekBoundsLocal(0)
  const prevWeekBounds = getWeekBoundsLocal(-1)
  const isWeekly = effectivePeriod !== 'today'
  const periodTitle = effectivePeriod === 'this_week'
    ? `Esta Semana (${thisWeekBounds.rangeLabel})`
    : effectivePeriod === 'prev_week'
    ? `Semana Pasada (${prevWeekBounds.rangeLabel})`
    : 'Hoy'
  const periodShortLabel = isWeekly ? 'en la semana' : 'hoy'

  // 1. Filter transactions for selected period in local time
  const periodTx = (transactions || []).filter(t => {
    if (effectivePeriod === 'this_week') return isDateInWeek(t.fecha, 0)
    if (effectivePeriod === 'prev_week') return isDateInWeek(t.fecha, -1)
    return isDateToday(t.fecha)
  })
  const incomeTx = periodTx.filter(t => t.monto_usd > 0)
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

  const efectivoUSD = incomeTx.reduce((sum, t) => sum + getTxMethodAmountUSD(t, 'efectivo'), 0)

  const pagoMovilUSD = incomeTx.reduce((sum, t) => sum + getTxMethodAmountUSD(t, 'pago_movil'), 0)
  const pagoMovilBs = pagoMovilUSD * exchangeRate

  const zelleUSD = incomeTx.reduce((sum, t) => sum + getTxMethodAmountUSD(t, 'zelle'), 0)

  const puntoUSD = incomeTx.reduce((sum, t) => sum + getTxMethodAmountUSD(t, 'punto'), 0)

  const fiadoUSD = incomeTx.reduce((sum, t) => sum + getTxMethodAmountUSD(t, 'fiado'), 0)

  // 2. Expenses & Vales of selected period
  const allNegativeTx = periodTx.filter(t => t.monto_usd < 0)
  const valesTx = periodTx.filter(t => t.type === 'vale' || t.category === 'Vale Empleado')
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

  // 3. Commissions by Staff Member (Operative + Cashier extra bonus, with Vales deducted)
  const cashierListInClose = (staffList || []).filter(s => isCashierStaff(s))
  const commissionsByStaff = (staffList || []).map(staff => {
    const isCashier = isCashierStaff(staff)
    const staffTx = isCashier
      ? incomeTx.filter(t => (t.cajero_staff_id ? t.cajero_staff_id === staff.id : cashierListInClose.length <= 1))
      : incomeTx.filter(t => t.staff_id === staff.id || t.staff_name === staff.name)
    const count = staffTx.length
    const generatedUSD = staffTx.reduce((sum, t) => sum + t.monto_usd, 0)
    const commissionUSD = isCashier
      ? staffTx.reduce((sum, t) => sum + (t.cajero_staff_id === staff.id && typeof t.comision_cajero_usd === 'number' ? t.comision_cajero_usd : calculateCashierCommissionForTx(t, staff)), 0)
      : staffTx.reduce((sum, t) => sum + (t.comision_usd || 0), 0)

    // Vales of this staff member today
    const staffValesToday = valesTx.filter(t => t.staff_id === staff.id || t.staff_name === staff.name)
    const staffValesUSD = Math.abs(staffValesToday.reduce((sum, t) => sum + (t.monto_usd || 0), 0))
    const netCommissionUSD = commissionUSD - staffValesUSD

    return {
      id: staff.id,
      name: isCashier ? `${staff.name} (Caja)` : staff.name,
      isCashier,
      percentage: staff.commission_pct ?? staff.commission_percentage ?? (isCashier ? 0 : 50),
      count,
      generatedUSD,
      commissionUSD,
      valesUSD: staffValesUSD,
      netCommissionUSD,
      commissionBs: commissionUSD * exchangeRate,
      netCommissionBs: netCommissionUSD * exchangeRate
    }
  }).filter(s => s.count > 0 || s.commissionUSD > 0 || s.valesUSD > 0)

  const totalCashierCommissionsUSD = commissionsByStaff.filter(s => s.isCashier).reduce((sum, s) => sum + s.commissionUSD, 0)
  const totalCommissionsUSD = commissionsByStaff.reduce((sum, s) => sum + s.commissionUSD, 0)
  const totalNetCommissionsUSD = commissionsByStaff.reduce((sum, s) => sum + s.netCommissionUSD, 0)

  // Audit metrics for this period
  const periodAuditLogs = (auditLogs || []).filter(l => {
    const dt = l.timestamp || l.fecha
    if (effectivePeriod === 'this_week') return isDateInWeek(dt, 0)
    if (effectivePeriod === 'prev_week') return isDateInWeek(dt, -1)
    return isDateToday(dt)
  })
  const periodVoidsCount = periodAuditLogs.filter(l => l.type === 'TX_VOIDED').length
  const periodPriceChangesCount = periodAuditLogs.filter(l => l.type === 'PRICE_CHANGED').length
  const periodPinFailsCount = periodAuditLogs.filter(l => l.type === 'PIN_FAILED').length

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

    let msg = `💈 *${isWeekly ? 'ACTA DE CIERRE SEMANAL DE CAJA' : 'ACTA DE CIERRE DE CAJA'} • ${bizName.toUpperCase()}*\n`
    msg += isWeekly
      ? `📆 *Período:* ${periodTitle} (Lun - Dom)\n`
      : `📅 *Fecha:* ${dateStr}\n`
    if (!isAr) {
      msg += `💵 *Tasa BCV:* Bs. ${exchangeRate.toFixed(2)}\n`
    }
    msg += `------------------------------------\n\n`

    msg += `💰 *1. PLATA QUE ENTRÓ (FACTURACIÓN):*\n`
    msg += isAr
      ? `• Total Facturado: *${fmt(totalIncomeUSD)} ARS*\n`
      : `• Total Facturado: *${totalIncomeUSD.toFixed(2)} USD* (Bs. ${totalIncomeBs.toFixed(2)})\n`
    msg += `  - 💵 ${isAr ? 'Efectivo Caja' : 'Efectivo Gaveta'}: ${fmt(efectivoUSD)}\n`
    msg += isAr
      ? `  - 📲 Mercado Pago / Transf.: ${fmt(pagoMovilUSD)} ARS\n`
      : `  - 📲 Pago Móvil: Bs. ${pagoMovilBs.toFixed(2)} (${pagoMovilUSD.toFixed(2)})\n`
    if (puntoUSD > 0) msg += `  - 💳 ${isAr ? 'Tarjeta / Point' : 'Punto de Venta'}: ${fmt(puntoUSD)}\n`
    if (zelleUSD > 0) msg += `  - 🟡 ${isAr ? 'Digital / USDT' : 'Zelle / Binance'}: ${fmt(zelleUSD)}\n`
    if (fiadoUSD > 0) msg += `  - 📝 Fiados ${isWeekly ? 'de la Semana' : 'del Día'}: ${fmt(fiadoUSD)}\n`

    msg += `\n➖ *2. GASTOS OPERATIVOS DEL LOCAL:*\n`
    msg += isAr
      ? `• Total Gastos: *-${fmt(totalExpensesUSD)} ARS*\n`
      : `• Total Gastos: *-${totalExpensesUSD.toFixed(2)} USD* (Bs. ${totalExpensesBs.toFixed(2)})\n`
    if (operatingExpenseTx.length > 0) {
      operatingExpenseTx.forEach(ex => {
        msg += `  - ${ex.item_name}: -${fmt(Math.abs(ex.monto_usd))}\n`
      })
    } else {
      msg += `  - Cero gastos ${periodShortLabel}\n`
    }

    if (totalValesUSD > 0) {
      msg += `\n🧾 *3. VALES Y ADELANTOS ENTREGADOS ${isWeekly ? 'EN LA SEMANA' : 'HOY'}:*\n`
      msg += isAr
        ? `• Total Vales: *-${fmt(totalValesUSD)} ARS*\n`
        : `• Total Vales: *-${totalValesUSD.toFixed(2)} USD* (Bs. ${totalValesBs.toFixed(2)})\n`
      valesTx.forEach(v => {
        msg += `  - ${v.staff_name || 'Empleado'} (${v.motivo || 'Vale'}): -${fmt(Math.abs(v.monto_usd))} (${v.metodo_pago === 'efectivo_usd' ? 'Efectivo' : (isAr ? 'Mercado Pago' : 'Banco')})\n`
      })
    }

    msg += `\n✂️ *${totalValesUSD > 0 ? '4' : '3'}. A PAGAR AL EQUIPO (LIQUIDACIÓN):*\n`
    if (commissionsByStaff.length > 0) {
      commissionsByStaff.forEach(st => {
        if (st.valesUSD > 0) {
          msg += isAr
            ? `  - ${st.name} (${st.count} serv.): Comisiones ${fmt(st.commissionUSD)} - Vales ${fmt(st.valesUSD)} = *Neto ${fmt(st.netCommissionUSD)} ARS*\n`
            : `  - ${st.name} (${st.count} cortes): Comisiones ${st.commissionUSD.toFixed(2)} - Vales ${st.valesUSD.toFixed(2)} = *Neto ${st.netCommissionUSD.toFixed(2)} USD* (Bs. ${st.netCommissionBs.toFixed(2)})\n`
        } else {
          msg += isAr
            ? `  - ${st.name} (${st.count} serv.): *${fmt(st.commissionUSD)} ARS*\n`
            : `  - ${st.name} (${st.count} cortes): *${st.commissionUSD.toFixed(2)} USD* (Bs. ${st.commissionBs.toFixed(2)})\n`
        }
      })
      msg += `• Total Comisiones Netas: *${fmt(totalNetCommissionsUSD)} ${currTag}*\n`
    } else {
      msg += `  - Sin comisiones registradas\n`
    }

    if (totalTipsUSD > 0) {
      msg += `\n🪙 *${totalValesUSD > 0 ? '5' : '4'}. PROPINAS ${isWeekly ? 'DE LA SEMANA' : 'DEL DÍA'} (APARTE):*\n`
      msg += isAr
        ? `• Total Propinas Recaudadas: *${fmt(totalTipsUSD)} ARS*\n`
        : `• Total Propinas Recaudadas: *${totalTipsUSD.toFixed(2)} USD* (Bs. ${totalTipsBs.toFixed(2)})\n`
      if (tipDeliveryMode === 'grupal') {
        msg += `  - Modalidad: 👥 *Pote Grupal Equitativo*\n`
        msg += isAr
          ? `  - Corresponde a cada profesional (${activeStaffCount}): *${fmt(tipPoolPerStaffUSD)} ARS*\n`
          : `  - Corresponde a cada profesional (${activeStaffCount}): *${tipPoolPerStaffUSD.toFixed(2)} USD* (Bs. ${tipPoolPerStaffBs.toFixed(2)})\n`
      } else {
        msg += `  - Modalidad: 👤 *Entrega Individual Separada*\n`
        tipsByStaff.forEach(st => {
          msg += isAr
            ? `  - ${st.name}: *${fmt(st.tipsUSD)} ARS*\n`
            : `  - ${st.name}: *${st.tipsUSD.toFixed(2)} USD* (Bs. ${st.tipsBs.toFixed(2)})\n`
        })
      }
    }

    msg += `\n------------------------------------\n`
    msg += `🏆 *${totalValesUSD > 0 ? '6' : '5'}. TU GANANCIA LIMPIA (EN EL BOLSILLO):*\n`
    msg += isAr
      ? `👉 *${fmt(netProfitUSD)} ARS*\n\n`
      : `👉 *${netProfitUSD.toFixed(2)} USD* (Bs. ${netProfitBs.toFixed(2)})\n\n`

    if (hasCounted) {
      msg += `🔎 *ARQUEO DE CAJA EN FÍSICO:*\n`
      msg += `• Esperado en Efectivo: ${fmt(expectedCashInDrawer)}\n`
      msg += `• Contado en Caja: ${fmt(countedNum)}\n`
      if (Math.abs(differenceUSD) < 0.01) {
        msg += `• Estado: ✅ *¡CUADRE PERFECTO! (${isAr ? '0' : '0.00'} diferencia)*\n`
      } else if (differenceUSD > 0) {
        msg += `• Estado: 🟢 Sobrante de +${fmt(differenceUSD)}\n`
      } else {
        msg += `• Estado: 🔴 Faltante de -${fmt(Math.abs(differenceUSD))}\n`
      }
    }

    if (periodAuditLogs.length > 0 || securityConfig?.enabled) {
      msg += `\n🛡️ *Control Auditoría:* ${periodVoidsCount} anulac. | ${periodPriceChangesCount} camb. precio${periodPinFailsCount > 0 ? ` | ⚠️ ${periodPinFailsCount} PIN fallido(s)` : ''}\n`
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
                Cuadre y Cierre {isWeekly ? 'Semanal' : 'Diario'} de Caja
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  En Vivo
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Arqueo de gaveta, pago móvil, gastos, vales y liquidación ({periodTitle})
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

        {/* Selector de Período: Hoy vs Semanal (Solo Dueño) */}
        {!isCashierMode && (
        <div className="grid grid-cols-3 gap-1.5 bg-dark-950 p-1 rounded-2xl border border-dark-800">
          <button
            type="button"
            onClick={() => setClosePeriod('today')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
              closePeriod === 'today'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📅 Hoy
          </button>
          <button
            type="button"
            onClick={() => setClosePeriod('this_week')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
              closePeriod === 'this_week'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📆 Esta Semana
            <span className="block text-[9px] font-mono opacity-80">{thisWeekBounds.rangeLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setClosePeriod('prev_week')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
              closePeriod === 'prev_week'
                ? 'bg-gold-500 text-black shadow-md shadow-gold-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⏪ Semana Pasada
            <span className="block text-[9px] font-mono opacity-80">{prevWeekBounds.rangeLabel}</span>
          </button>
        </div>
        )}

        {/* 4 Pillars Summary Grid */}
        <div className={`grid ${hideProfits ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2.5`}>
          <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Entró</span>
            <div className="text-lg font-black text-white mt-0.5">${fmt(totalIncomeUSD)}</div>
            {!isAr && <span className="text-[10px] text-blue-400 font-mono">Bs. {totalIncomeBs.toFixed(2)}</span>}
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] uppercase font-bold text-red-400 block">Gastos Local</span>
            <div className="text-lg font-black text-red-400 mt-0.5">-${fmt(totalExpensesUSD)}</div>
            <span className="text-[10px] text-slate-500 font-mono">
              {totalValesUSD > 0 ? `+ ${fmt(totalValesUSD)} en vales` : (!isAr ? `Bs. ${totalExpensesBs.toFixed(2)}` : 'Operativos')}
            </span>
          </div>

          {!hideProfits && (
            <>
              <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Comisiones</span>
                <div className="text-lg font-black text-amber-400 mt-0.5">${fmt(totalCommissionsUSD)}</div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {totalValesUSD > 0 ? `Neto ${periodShortLabel}: ${fmt(totalNetCommissionsUSD)}` : 'Al equipo'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] uppercase font-black text-emerald-400 block">Ganancia Limpia</span>
                <div className="text-lg font-black text-emerald-400 mt-0.5">${fmt(netProfitUSD)}</div>
                <span className="text-[10px] text-slate-300 font-mono">{isAr ? 'Pesos ARS' : 'En tu bolsillo'}</span>
              </div>
            </>
          )}
        </div>

        {/* Breakdown by Payment Method */}
        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Desglose de Facturación por Método:</span>
            {!isAr && <span className="text-gold-400 font-mono">Tasa BCV: Bs. {exchangeRate.toFixed(2)}</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">{isAr ? '💵 Efectivo (Caja)' : '💵 Efectivo Gaveta ($)'}</span>
              <strong className="text-white text-sm font-mono">${fmt(efectivoUSD)}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">{isAr ? '📲 Mercado Pago / Transf.' : '📲 Pago Móvil (Bs)'}</span>
              {isAr ? (
                <strong className="text-emerald-400 text-sm font-mono">${fmt(pagoMovilUSD)}</strong>
              ) : (
                <>
                  <strong className="text-emerald-400 text-sm font-mono">Bs. {pagoMovilBs.toFixed(2)}</strong>
                  <span className="text-[10px] text-slate-400 block font-mono">(${pagoMovilUSD.toFixed(2)})</span>
                </>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">{isAr ? '💳 Tarjeta / Point' : '💳 Punto de Venta'}</span>
              <strong className="text-white text-sm font-mono">${fmt(puntoUSD)}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">{isAr ? '🟡 Digital / USDT' : '🟡 Zelle / Binance'}</span>
              <strong className="text-white text-sm font-mono">${fmt(zelleUSD)}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-amber-400 block">📝 Fiados (Por Cobrar)</span>
              <strong className="text-amber-400 text-sm font-mono">${fmt(fiadoUSD)}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-[10px] text-slate-400 block">✂️ Total Atenciones</span>
              <strong className="text-white text-sm font-mono">{incomeTx.length} clientes</strong>
            </div>
          </div>
        </div>

        {/* Staff Payout List */}
        {!hideProfits && (
        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 space-y-2">
          <span className="text-xs font-bold text-slate-300 block">
            Liquidación de Comisiones {isWeekly ? `(${periodTitle})` : 'de Hoy'} (A Pagar al Personal):
          </span>

          {commissionsByStaff.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">
              No hay comisiones registradas {isWeekly ? 'en este período' : 'el día de hoy'}.
            </p>
          ) : (
            <div className="divide-y divide-dark-800 text-xs">
              {commissionsByStaff.map(st => (
                <div key={st.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{st.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {st.count} {st.count === 1 ? 'servicio' : 'servicios'} • Facturó ${fmt(st.generatedUSD)} ({st.percentage}%)
                    </span>
                    {st.valesUSD > 0 && (
                      <span className="inline-block mt-0.5 text-[10px] text-amber-400 font-bold">
                        🧾 Vales {isWeekly ? 'semana' : 'hoy'}: -${fmt(st.valesUSD)} {currTag}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-amber-400 text-sm block">
                      ${fmt(st.netCommissionUSD)} {st.valesUSD > 0 ? 'Neto' : currTag}
                    </span>
                    {(st.valesUSD > 0 || !isAr) && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {st.valesUSD > 0 ? `(Comisión: ${fmt(st.commissionUSD)})` : `Bs. ${st.commissionBs.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Propinas del Período (Aparte) */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>🪙 Propinas {isWeekly ? 'de la Semana' : 'del Día'} (Aparte):</span>
              <span className="font-mono font-black text-amber-400">${fmt(totalTipsUSD)} {currTag}</span>
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
              No se registraron propinas {periodShortLabel}.
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
                  ${fmt(tipPoolPerStaffUSD)} c/u
                </span>
                {!isAr && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Bs. {tipPoolPerStaffBs.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-dark-800 text-xs">
              {tipsByStaff.map(st => (
                <div key={st.id} className="py-1.5 flex items-center justify-between">
                  <span className="font-bold text-white">{st.name}</span>
                  <div className="text-right">
                    <span className="font-mono font-black text-amber-400 text-xs block">
                      +${fmt(st.tipsUSD)} {currTag}
                    </span>
                    {!isAr && (
                      <span className="text-[9px] text-slate-400 font-mono">
                        Bs. {st.tipsBs.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Physical Drawer Cash Audit (Arqueo de Gaveta) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 to-dark-850 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Arqueo Físico de Gaveta (¿Cuánto Efectivo $ tienes en mano?)</span>
            </span>
            {!isBlindCount ? (
              <span className="text-[10px] text-slate-400">
                Esperado: <strong className="text-white font-mono">${fmt(expectedCashInDrawer)}</strong>
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                🔒 Arqueo Ciego Activo
              </span>
            )}
          </div>

          {isBlindCount && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200">
              Cuenta físicamente el dinero en gaveta e ingresa el monto exacto. El sistema enviará la comparación y el cuadre directo al panel del Dueño.
            </div>
          )}

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

            {hasCounted && !isBlindCount && (
              <div className="flex-1 w-full text-xs font-bold">
                {Math.abs(differenceUSD) < 0.01 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>¡Cuadre Perfecto! Coincide exactamente con el sistema.</span>
                  </span>
                ) : differenceUSD > 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Tienes un sobrante de +${fmt(differenceUSD)} en caja.</span>
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Hay un faltante de -${fmt(Math.abs(differenceUSD))} en caja.</span>
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
              disabled={closingSaved || (isBlindCount && !hasCounted)}
              onClick={() => {
                if (isBlindCount && !hasCounted) {
                  alert('Debes ingresar el monto contado en gaveta para cerrar en modo Arqueo Ciego.')
                  return
                }
                const closingRecord = {
                  id: `close_${Date.now()}`,
                  fecha: getLocalDateIso(),
                  periodType: effectivePeriod,
                  periodLabel: periodTitle,
                  timestamp: new Date().toISOString(),
                  totalIncomeUSD,
                  totalIncomeBs,
                  totalExpensesUSD,
                  totalValesUSD,
                  totalCommissionsUSD,
                  cashierCommissionsUSD: totalCashierCommissionsUSD,
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
                  transactionsCount: periodTx.length,
                  commissionsByStaff,
                  tipsByStaff,
                  exchangeRate,
                  blindMode: isBlindCount,
                  closedByName: activeOperator?.name || (isCashierMode ? 'Cajero' : 'Dueño'),
                  closedByRole: isCashierMode ? 'cajero' : 'dueno'
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
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-45 disabled:cursor-not-allowed text-black text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              {closingSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>¡Cierre Guardado!</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar Cuadre {isWeekly ? 'Semanal' : '& Cerrar Jornada'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
