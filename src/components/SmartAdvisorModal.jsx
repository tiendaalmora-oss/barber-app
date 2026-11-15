import React, { useState } from 'react'
import {
  X, Sparkles, Target, TrendingUp, AlertTriangle, MessageSquare,
  Calculator, Check, Copy, ExternalLink, ShieldCheck, Flame,
  Clock, DollarSign, Users, ArrowUpRight, ArrowDownRight, Smartphone,
  CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react'
import {
  getLocalDateIso, isDateToday, isDateInWeek, isTimeSlotInPast,
  normalizeWhatsAppPhone, getScheduleForDate, formatMethodName,
  getTxMethodAmountUSD, formatDurationLabel
} from '../lib/dateUtils'
import { getActiveBrand } from '../lib/brandConfig'

export default function SmartAdvisorModal({
  isOpen,
  onClose,
  transactions = [],
  clients = [],
  appointments = [],
  businessProfile = {},
  onSaveProfile,
  exchangeRate = 889.26,
  nicheData = {}
}) {
  const [activeTab, setActiveTab] = useState('meta') // 'meta' | 'fugas' | 'mision' | 'calculadora'
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(() => String(businessProfile?.monthlyGoalUSD || 600))
  const [copiedState, setCopiedState] = useState(false)
  const [copiedStateText, setCopiedStateText] = useState('')

  // Calculator state
  const [calcServiceName, setCalcServiceName] = useState('Servicio Especial')
  const [calcPriceUSD, setCalcPriceUSD] = useState(15)
  const [calcDurationMin, setCalcDurationMin] = useState(60)
  const [calcProductCostUSD, setCalcProductCostUSD] = useState(2)
  const [calcCommissionPct, setCalcCommissionPct] = useState(50)

  if (!isOpen) return null

  const brand = getActiveBrand()
  const isGlamBrand = brand.code === 'glamos'
  const bizName = businessProfile?.businessName || (isGlamBrand ? 'Mi Salón' : 'Mi Barbería')
  const tenantSlug = (typeof window !== 'undefined' ? localStorage.getItem('barber_logged_tenant_id') : '') || ''
  const publicBookingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?reserva=1${tenantSlug ? `&b=${encodeURIComponent(tenantSlug)}` : ''}`

  // Dates & Boundaries
  const todayIso = getLocalDateIso()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-11
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const currentDayOfMonth = now.getDate()
  const remainingDaysInMonth = Math.max(1, daysInCurrentMonth - currentDayOfMonth + 1)

  // Monthly Financials
  const currentMonthTxs = (transactions || []).filter(t => {
    if (!t || !t.fecha) return false
    const d = new Date(t.fecha.includes('T') ? t.fecha.split('T')[0] : t.fecha)
    if (isNaN(d.getTime())) return false
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth
  })

  const currentMonthIncomeTxs = currentMonthTxs.filter(t => (t.monto_usd || 0) > 0)
  const currentMonthExpenseTxs = currentMonthTxs.filter(t => (t.monto_usd || 0) < 0)

  const monthRevenueUSD = currentMonthIncomeTxs.reduce((sum, t) => sum + (t.monto_usd || 0), 0)
  const monthCommissionsUSD = currentMonthIncomeTxs.reduce((sum, t) => sum + (t.comision_usd || 0), 0)
  const monthExpensesUSD = Math.abs(currentMonthExpenseTxs.reduce((sum, t) => sum + (t.monto_usd || 0), 0))
  const monthNetProfitUSD = Math.max(0, monthRevenueUSD - monthCommissionsUSD - monthExpensesUSD)

  // Current Target Goal
  const monthlyGoalUSD = Number(businessProfile?.monthlyGoalUSD) || 600
  const goalProgressPct = monthlyGoalUSD > 0 ? Math.min(100, Math.round((monthNetProfitUSD / monthlyGoalUSD) * 100)) : 0
  const missingToGoalUSD = Math.max(0, monthlyGoalUSD - monthNetProfitUSD)
  const dailyTargetUSD = remainingDaysInMonth > 0 ? (missingToGoalUSD / remainingDaysInMonth) : missingToGoalUSD

  // Weekly Comparison
  const thisWeekTxs = (transactions || []).filter(t => isDateInWeek(t.fecha, 0))
  const prevWeekTxs = (transactions || []).filter(t => isDateInWeek(t.fecha, -1))
  const thisWeekIncomeUSD = thisWeekTxs.filter(t => t.monto_usd > 0).reduce((sum, t) => sum + t.monto_usd, 0)
  const prevWeekIncomeUSD = prevWeekTxs.filter(t => t.monto_usd > 0).reduce((sum, t) => sum + t.monto_usd, 0)
  const weekDiffPct = prevWeekIncomeUSD > 0
    ? Math.round(((thisWeekIncomeUSD - prevWeekIncomeUSD) / prevWeekIncomeUSD) * 100)
    : (thisWeekIncomeUSD > 0 ? 100 : 0)

  // Average ticket estimation
  const totalCutsCount = currentMonthIncomeTxs.length
  const avgTicketUSD = totalCutsCount > 0 ? (monthRevenueUSD / totalCutsCount) : 10
  const estimatedServicesPerDay = avgTicketUSD > 0 ? Math.ceil(dailyTargetUSD / (avgTicketUSD * 0.5)) : 3

  // Save Goal Handler
  const handleSaveGoal = (e) => {
    e.preventDefault()
    const parsed = parseFloat(goalInput)
    if (!isNaN(parsed) && parsed > 0 && onSaveProfile) {
      onSaveProfile({ monthlyGoalUSD: parsed })
    }
    setIsEditingGoal(false)
  }

  // --- TAB 2: FUGAS & AUDITORÍA ---
  // A. Deudas / Fiados
  const clientsWithDebt = (clients || []).filter(c => (c.debt_usd || 0) > 0)
  const totalDebtUSD = clientsWithDebt.reduce((sum, c) => sum + (c.debt_usd || 0), 0)

  // B. Ratio de Gastos
  const expenseRatioPct = monthRevenueUSD > 0 ? Math.round((monthExpensesUSD / monthRevenueUSD) * 100) : 0

  // WhatsApp Reminder for Debt
  const handleSendDebtReminder = (client) => {
    const cleanPhone = normalizeWhatsAppPhone(client.phone || '')
    if (!cleanPhone) {
      alert(`El cliente ${client.name} no tiene teléfono guardado.`)
      return
    }
    const debtBs = ((client.debt_usd || 0) * exchangeRate).toFixed(2)
    const pagoMovilText = businessProfile?.pagoMovilData || businessProfile?.phone || ''
    let msg = `👋 ¡Hola *${client.name}*! Un saludo cordial de parte de *${bizName}*.\n\n`
    msg += `Te escribimos con aprecio para recordarte tu saldo pendiente de *$${Number(client.debt_usd).toFixed(2)} USD* (al cambio oficial: *Bs. ${debtBs}*).\n\n`
    if (pagoMovilText) {
      msg += `📲 *Datos para Pago Móvil / Transferencia:*\n${pagoMovilText}\n\n`
    }
    msg += `Apenas realices el pago, envíanos el comprobante por acá para actualizar tu cuenta. ¡Muchísimas gracias y que tengas excelente día! ✨`
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // --- TAB 3: MISIÓN DEL DÍA ---
  // Free slots today (future only)
  const todaySchedule = getScheduleForDate(businessProfile, todayIso)
  const allTodaySlots = (todaySchedule.enabled && todaySchedule.slots.length > 0)
    ? todaySchedule.slots
    : ['09:00 AM', '10:30 AM', '02:00 PM', '04:00 PM', '05:30 PM']

  const todayAppointments = (appointments || []).filter(a => a.date === todayIso && a.status !== 'cancelada')
  const occupiedSlotsSet = new Set(todayAppointments.map(a => a.time))

  // Filter future and unoccupied slots
  const freeFutureSlots = allTodaySlots.filter(s => {
    const isOccupied = occupiedSlotsSet.has(s)
    const isPast = isTimeSlotInPast(s, todayIso, 15)
    return !isOccupied && !isPast
  })

  const generateSocialStatusText = () => {
    const fechaBonita = now.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' })
    if (freeFutureSlots.length > 0) {
      let t = `✨ *¡HOLA A TODOS! DISPONIBILIDAD PARA HOY (${fechaBonita.toUpperCase()}):*\n\n`
      t += `Nos quedan solo *${freeFutureSlots.length} turnos disponibles* en *${bizName}*:\n`
      freeFutureSlots.slice(0, 5).forEach(s => {
        t += `⏰ *${s}*\n`
      })
      t += `\n💈 Aparta tu turno en 10 segundos aquí 👉 ${publicBookingUrl}\n\n¡Te esperamos!`
      return t
    } else {
      return `💈 *¡CASA LLENA HOY EN ${bizName.toUpperCase()}!*\n\nMuchísimas gracias a todos por su confianza. ✨\nYa abrimos la agenda para MAÑANA y el resto de la semana. Aparta tu turno online aquí 👉 ${publicBookingUrl}`
    }
  }

  const handleCopySocialStatus = () => {
    const text = generateSocialStatusText()
    navigator.clipboard.writeText(text).then(() => {
      setCopiedState(true)
      setTimeout(() => setCopiedState(false), 2500)
    })
  }

  // Hot Leads: Clients ready for retouch with phone
  const hotClients = (clients || [])
    .filter(c => c.phone && c.phone.trim().length >= 7)
    .sort((a, b) => (b.visits_count || 1) - (a.visits_count || 1))
    .slice(0, 3)

  const handleInviteHotClient = (client) => {
    const cleanPhone = normalizeWhatsAppPhone(client.phone || '')
    const msg = `👋 ¡Hola *${client.name.split(' ')[0]}*! ¿Cómo estás hermano? Te escribimos de *${bizName}*.\n\n` +
      `Estábamos revisando la agenda de hoy y queríamos avisarte que abrimos un par de espacios ideales para tu retoque. 💈✨\n\n` +
      `Si gustas pasar hoy o apartar tu turno online, entra directo aquí 👉 ${publicBookingUrl}\n\n` +
      `¡Un abrazo y feliz día!`
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // --- TAB 4: CALCULADORA DE PRECIO ---
  const calcGrossRevenueUSD = Number(calcPriceUSD) || 0
  const calcProductCost = Number(calcProductCostUSD) || 0
  const calcCommPct = Number(calcCommissionPct) || 0
  const calcCommissionUSD = (calcGrossRevenueUSD * (calcCommPct / 100))
  const calcNetBusinessProfitUSD = Math.max(0, calcGrossRevenueUSD - calcCommissionUSD - calcProductCost)
  const calcDurationHours = Math.max(0.25, (Number(calcDurationMin) || 60) / 60)
  const calcProfitPerHourUSD = calcDurationHours > 0 ? (calcNetBusinessProfitUSD / calcDurationHours) : 0

  const getPriceDiagnosis = () => {
    if (calcProfitPerHourUSD >= 8) {
      return {
        badge: '🔥 Rentabilidad Alta',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        desc: `Este servicio te deja $${calcProfitPerHourUSD.toFixed(2)} por cada hora de silla. Es un producto estrella para tu negocio.`
      }
    } else if (calcProfitPerHourUSD >= 4.5) {
      return {
        badge: '⚖️ Rentabilidad Normal',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        desc: `Deja $${calcProfitPerHourUSD.toFixed(2)}/hora. Para maximizar ganancia, ofrece un adicional rápido (cejas, exfoliación o venta de producto).`
      }
    } else {
      const suggestedPrice = Math.ceil(((5 * calcDurationHours) + calcProductCost) / (1 - (calcCommPct / 100)))
      return {
        badge: '⚠️ Margen Bajo por Hora',
        color: 'text-red-400 bg-red-500/10 border-red-500/30',
        desc: `Dura mucho tiempo (${calcDurationMin}m) para el margen que deja ($${calcProfitPerHourUSD.toFixed(2)}/h). Precio sugerido para ganar $5/h: $${suggestedPrice} USD (o agilizar el tiempo).`
      }
    }
  }

  const diagnosis = getPriceDiagnosis()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-dark-900 border border-gold-500/40 w-full max-w-2xl rounded-3xl shadow-2xl p-5 sm:p-6 my-auto space-y-5 text-slate-100 relative">
        
        {/* Glow Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-gold-500/20 to-purple-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                Copiloto de Negocio & Rentabilidad
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 font-bold border border-gold-500/30">
                  Pro $0 Tokens
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Auditoría en vivo, detección de fugas y herramientas para generar plata hoy
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Tabs Selector */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 bg-dark-950 p-1 rounded-2xl border border-dark-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`py-2 px-1 rounded-xl font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'meta'
                ? 'bg-gold-500 text-black font-black shadow-md shadow-gold-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Mi Meta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fugas')}
            className={`py-2 px-1 rounded-xl font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'fugas'
                ? 'bg-red-500 text-white font-black shadow-md shadow-red-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Fugas ({clientsWithDebt.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mision')}
            className={`py-2 px-1 rounded-xl font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'mision'
                ? 'bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="truncate">Llenar Hoy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculadora')}
            className={`py-2 px-1 rounded-xl font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'calculadora'
                ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">¿Cobro Bien?</span>
          </button>
        </div>

        {/* TAB 1: META MENSUAL */}
        {activeTab === 'meta' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Goal Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-dark-850 to-dark-900 border border-gold-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Tu Meta Libre Este Mes
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-gold-400 font-mono">
                      ${monthlyGoalUSD.toFixed(2)} USD
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingGoal(!isEditingGoal)}
                      className="text-[10px] text-slate-400 hover:text-gold-300 underline"
                    >
                      {isEditingGoal ? 'Cancelar' : 'Cambiar'}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                    Ganancia Limpia Acumulada
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white font-mono">
                    ${monthNetProfitUSD.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Edit Goal Input */}
              {isEditingGoal && (
                <form onSubmit={handleSaveGoal} className="flex gap-2 pt-1 border-t border-dark-800">
                  <input
                    type="number"
                    min="50"
                    step="25"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="w-32 px-3 py-1.5 rounded-xl bg-dark-950 border border-gold-500/50 text-xs font-mono font-bold text-white focus:outline-none"
                    placeholder="Ej: 600"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-black"
                  >
                    Guardar Meta
                  </button>
                </form>
              )}

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Progreso del mes:</span>
                  <span className="text-gold-400 font-mono">{goalProgressPct}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-dark-950 overflow-hidden border border-dark-750 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${goalProgressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Smart Actionable Diagnostic */}
            <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gold-400 font-black">
                <Sparkles className="w-4 h-4" />
                <span>Diagnóstico del Asesor:</span>
              </div>

              {missingToGoalUSD === 0 ? (
                <p className="text-slate-200 leading-relaxed">
                  🎉 <strong>¡FELICITACIONES! Ya superaste tu meta del mes con ${monthNetProfitUSD.toFixed(2)} USD libres.</strong> Todo lo que entre en los próximos {remainingDaysInMonth} días es ganancia extra de abundancia para tu negocio.
                </p>
              ) : (
                <div className="space-y-1.5 text-slate-300 leading-relaxed">
                  <p>
                    Te faltan <strong className="text-white font-mono">${missingToGoalUSD.toFixed(2)} USD</strong> para llegar a tu meta en los <strong>{remainingDaysInMonth} días</strong> que le quedan al mes.
                  </p>
                  <p className="p-2.5 rounded-xl bg-dark-900 border border-dark-800 text-slate-200">
                    🎯 <strong>La misión diaria:</strong> Necesitas generar aproximadamente <strong className="text-gold-400 font-mono">${dailyTargetUSD.toFixed(2)} USD libres al día</strong>. Eso equivale a hacer unos <strong className="text-white">{estimatedServicesPerDay} servicios diarios</strong> de aquí a fin de mes.
                  </p>
                </div>
              )}

              {/* Weekly Comparison */}
              <div className="pt-2 border-t border-dark-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Ritmo semanal:</span>
                <span className={`font-bold font-mono ${weekDiffPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {weekDiffPct >= 0 ? `📈 +${weekDiffPct}% vs semana pasada` : `📉 ${weekDiffPct}% vs semana pasada`} (${thisWeekIncomeUSD.toFixed(0)} vs ${prevWeekIncomeUSD.toFixed(0)})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FUGAS & AUDITORÍA */}
        {activeTab === 'fugas' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Fuga 1: Fiados */}
            <div className="p-4 rounded-2xl bg-dark-850 border border-red-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-red-500/15 text-red-400 font-bold text-xs">
                    📝 Fiados
                  </span>
                  <span className="text-xs font-bold text-white">Plata en la calle por cobrar</span>
                </div>
                <span className="text-sm font-black text-red-400 font-mono">
                  ${totalDebtUSD.toFixed(2)} USD
                </span>
              </div>

              {clientsWithDebt.length === 0 ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Excelente! Cero fiados pendientes. Nadie te debe plata hoy.</span>
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 divide-y divide-dark-800 text-xs">
                  {clientsWithDebt.map(c => (
                    <div key={c.id} className="pt-2 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-white block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Debe ${Number(c.debt_usd).toFixed(2)} • {c.phone || 'Sin teléfono'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendDebtReminder(c)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Cobrar por WA</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fuga 2: Gastos vs Ingresos */}
            <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>📉 Porcentaje de Gastos Operativos:</span>
                  <span className="font-mono text-gold-400">{expenseRatioPct}% de tus ingresos</span>
                </span>
                <span className="font-mono text-slate-400">-${monthExpensesUSD.toFixed(2)}</span>
              </div>

              {expenseRatioPct > 35 ? (
                <p className="text-amber-300 text-[11px] bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                  ⚠️ <strong>Alerta:</strong> Los gastos del local y compras de insumos se están comiendo más del 35% de lo facturado este mes. Revisa qué compras puedes aplazar o negociar con proveedores.
                </p>
              ) : (
                <p className="text-emerald-400 text-[11px] bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  ✅ <strong>Control de Gastos Saludable:</strong> Tus costos operativos representan el {expenseRatioPct}%, permitiéndote un margen de ganancia alto.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LLENAR HOY */}
        {activeTab === 'mision' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Herramienta 1: Estado WhatsApp */}
            <div className="p-4 rounded-2xl bg-dark-850 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  <span>Estado de WhatsApp / Instagram con Turnos Libres:</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono font-bold">
                  {freeFutureSlots.length} horas disponibles
                </span>
              </div>

              <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {generateSocialStatusText()}
              </div>

              <button
                type="button"
                onClick={handleCopySocialStatus}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
              >
                {copiedState ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedState ? '¡Copiado! Pégalo en tu Estado de WhatsApp' : 'Copiar Texto para Estado de WhatsApp'}</span>
              </button>
            </div>

            {/* Herramienta 2: Clientes Calientes */}
            <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 space-y-2.5 text-xs">
              <span className="font-bold text-white block">
                🎯 3 Clientes Ideales para Escribirles Hoy:
              </span>

              {hotClients.length === 0 ? (
                <p className="text-slate-400 text-[11px]">
                  Guarda clientes con número de teléfono al cobrar para que el Asesor los seleccione aquí.
                </p>
              ) : (
                <div className="space-y-2">
                  {hotClients.map(c => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-white block">{c.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {c.visits_count || 1} visitas acumuladas • {c.phone}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInviteHotClient(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-gold-500/15 hover:bg-gold-500/25 text-gold-300 border border-gold-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <MessageSquare className="w-3 h-3 text-gold-400" />
                        <span>Invitar hoy</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CALCULADORA ¿COBRO BIEN? */}
        {activeTab === 'calculadora' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-dark-850 p-2.5 rounded-xl border border-dark-750">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Precio Cobrado ($):</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={calcPriceUSD}
                  onChange={(e) => setCalcPriceUSD(e.target.value)}
                  className="w-full bg-dark-950 px-2 py-1.5 rounded-lg border border-dark-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-dark-850 p-2.5 rounded-xl border border-dark-750">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Duración (min):</label>
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={calcDurationMin}
                  onChange={(e) => setCalcDurationMin(e.target.value)}
                  className="w-full bg-dark-950 px-2 py-1.5 rounded-lg border border-dark-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-dark-850 p-2.5 rounded-xl border border-dark-750">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Costo Material ($):</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={calcProductCostUSD}
                  onChange={(e) => setCalcProductCostUSD(e.target.value)}
                  className="w-full bg-dark-950 px-2 py-1.5 rounded-lg border border-dark-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-dark-850 p-2.5 rounded-xl border border-dark-750">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">% Comisión:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={calcCommissionPct}
                  onChange={(e) => setCalcCommissionPct(e.target.value)}
                  className="w-full bg-dark-950 px-2 py-1.5 rounded-lg border border-dark-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Live Profitability Result */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-dark-850 to-dark-900 border border-purple-500/30 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-dark-950 border border-dark-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Comisión Personal:</span>
                  <span className="text-sm font-black text-amber-400 font-mono">${calcCommissionUSD.toFixed(2)}</span>
                </div>
                <div className="p-2 rounded-xl bg-dark-950 border border-dark-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Ganancia Negocio:</span>
                  <span className="text-sm font-black text-white font-mono">${calcNetBusinessProfitUSD.toFixed(2)}</span>
                </div>
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <span className="text-[10px] text-purple-300 block font-black">Por Hora de Silla:</span>
                  <span className="text-sm font-black text-purple-400 font-mono">${calcProfitPerHourUSD.toFixed(2)}/h</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${diagnosis.color}`}>
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{diagnosis.badge}</span>
                </div>
                <p className="text-[11px] opacity-90">{diagnosis.desc}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
