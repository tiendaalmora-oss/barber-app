import React, { useState } from 'react'
import { TrendingUp, DollarSign, Users, Award, ArrowUpRight, ArrowDownRight, Wallet, Clock, Plus, Minus, MessageSquare, Send, Trash2, RotateCcw, Lock, Receipt, Smartphone, X, Calendar as CalendarIcon } from 'lucide-react'
import { getLocalDateIso, isEfectivoMethod, isPuntoMethod, isPagoMovilMethod, isDigitalMethod, isFiadoMethod, getTxMethodAmountUSD, formatTxPaymentSummary, normalizeWhatsAppPhone } from '../lib/dateUtils'
import ReceiptModal from './ReceiptModal'

export default function DashboardView({ 
  transactions = [], 
  exchangeRate = 889.26, 
  onOpenCashModal,
  onOpenExpenseModal,
  onOpenWhatsAppModal,
  onOpenDailyCloseModal,
  onDeleteTransaction,
  nicheData = {},
  businessProfile = {}
}) {
  const safeTransactions = Array.isArray(transactions) ? transactions : []
  const todayIso = getLocalDateIso()
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayIso = getLocalDateIso(yesterdayDate)

  // Selected date for viewing cash register (defaults to today)
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [viewingReceiptTx, setViewingReceiptTx] = useState(null)

  const isViewingToday = selectedDate === todayIso
  const isViewingYesterday = selectedDate === yesterdayIso

  const formatDateLabel = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return ''
    if (dateStr === todayIso) return 'Hoy'
    if (dateStr === yesterdayIso) return 'Ayer'
    const parts = dateStr.split('-')
    if (parts.length < 3) return dateStr
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const mIdx = parseInt(parts[1], 10) - 1
    const monthName = months[mIdx] || ''
    return `${parts[2]} de ${monthName}`
  }

  // Filter transactions strictly for the selected date
  const dateTransactions = safeTransactions.filter(t => {
    if (!t) return false
    if (!t.fecha) return isViewingToday
    return getLocalDateIso(t.fecha) === selectedDate
  })

  // Calculate totals strictly for the selected date
  const totalIncomeUSD = dateTransactions
    .filter(t => t.monto_usd > 0)
    .reduce((sum, t) => sum + t.monto_usd, 0)
  
  const totalExpensesUSD = Math.abs(dateTransactions
    .filter(t => t.monto_usd < 0)
    .reduce((sum, t) => sum + t.monto_usd, 0))

  const totalCommissionsUSD = dateTransactions
    .filter(t => t.comision_usd > 0)
    .reduce((sum, t) => sum + t.comision_usd, 0)

  // Net profit = Income - Expenses - Commissions
  const totalBusinessNetUSD = totalIncomeUSD - totalExpensesUSD - totalCommissionsUSD
  const totalServicesCount = dateTransactions.filter(t => t.monto_usd > 0).length

  // 1. DYNAMIC 7-day revenue trend based strictly on REAL transactions (Local Timezone Resilient)
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const today = new Date()

  const weeklyData = Array.from({ length: 7 }).map((_, idx) => {
    // 6 days ago ... today (idx = 6 is today)
    const d = new Date()
    d.setDate(today.getDate() - (6 - idx))
    const dateIso = getLocalDateIso(d)
    const dayLabel = idx === 6 ? 'Hoy' : dayNames[d.getDay()]

    const dayTx = safeTransactions.filter(t => {
      if (!t) return false
      const txDate = t.fecha ? getLocalDateIso(t.fecha) : ''
      return txDate === dateIso
    })

    const dayIncome = dayTx.filter(t => t.monto_usd > 0).reduce((sum, t) => sum + t.monto_usd, 0)
    const dayExpenses = Math.abs(dayTx.filter(t => t.monto_usd < 0).reduce((sum, t) => sum + t.monto_usd, 0))
    const dayCommissions = dayTx.filter(t => t.comision_usd > 0).reduce((sum, t) => sum + t.comision_usd, 0)
    const dayProfit = Math.max(0, dayIncome - dayExpenses - dayCommissions)

    return {
      date: dateIso,
      day: dayLabel,
      revenue: dayIncome,
      profit: dayProfit
    }
  })

  const maxWeeklyRevenue = Math.max(...weeklyData.map(d => d.revenue), 1)
  const hasWeeklySales = weeklyData.some(d => d.revenue > 0)
  const bestDay = hasWeeklySales ? [...weeklyData].sort((a, b) => b.revenue - a.revenue)[0] : null

  // 2. DYNAMIC real payment methods breakdown (Unified IDs & Split Payments Support) for selected date
  const paymentMethodsList = [
    { id: 'pago_movil', label: 'Pago Móvil (Bs)', color: 'bg-blue-500' },
    { id: 'efectivo', label: 'Efectivo $ (Gaveta)', color: 'bg-emerald-500' },
    { id: 'zelle', label: 'Zelle / Binance', color: 'bg-purple-500' },
    { id: 'punto', label: 'Punto de Venta', color: 'bg-teal-500' },
    { id: 'fiado', label: 'Fiados (Por Cobrar)', color: 'bg-amber-500' },
  ].map(m => {
    const sum = dateTransactions.reduce((acc, t) => acc + getTxMethodAmountUSD(t, m.id), 0)
    const pct = totalIncomeUSD > 0 ? Math.round((sum / totalIncomeUSD) * 100) : 0
    return { ...m, sum, pct }
  })

  // Physical Cash (Gaveta) vs Digital / Banks vs Fiados (Real-time Criollo split + Mixed Payment support) for selected date
  const cashUSD = dateTransactions.reduce((sum, t) => sum + getTxMethodAmountUSD(t, 'efectivo'), 0)

  const digitalUSD = dateTransactions.reduce(
    (sum, t) => sum + getTxMethodAmountUSD(t, 'pago_movil') + getTxMethodAmountUSD(t, 'punto') + getTxMethodAmountUSD(t, 'zelle'),
    0
  )

  const fiadoUSD = dateTransactions.reduce((sum, t) => sum + getTxMethodAmountUSD(t, 'fiado'), 0)

  // Distribution percentages of Total Revenue
  const profitPct = totalIncomeUSD > 0 ? Math.max(0, Math.round((totalBusinessNetUSD / totalIncomeUSD) * 100)) : 0
  const commissionsPct = totalIncomeUSD > 0 ? Math.max(0, Math.round((totalCommissionsUSD / totalIncomeUSD) * 100)) : 0
  const expensesPct = totalIncomeUSD > 0 ? Math.max(0, Math.round((totalExpensesUSD / totalIncomeUSD) * 100)) : 0

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* ─── FINTECH COMMAND CENTER: HERO CARD ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-dark-850 via-dark-900 to-dark-950 border border-dark-750/80 shadow-2xl p-5 sm:p-7">
        
        {/* Subtle Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Row inside Hero */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-dark-800/80">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`w-2.5 h-2.5 rounded-full ${
              isViewingToday ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20' : 'bg-blue-400'
            }`} />
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              isViewingToday ? 'text-emerald-400' : 'text-blue-400'
            }`}>
              {isViewingToday ? 'Caja en Vivo • Hoy' : isViewingYesterday ? 'Auditoría de Caja • Ayer' : `Auditoría • ${formatDateLabel(selectedDate)}`}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-medium">
              {totalServicesCount} {totalServicesCount === 1 ? 'servicio' : 'servicios'}
            </span>
            {!isViewingToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all ml-1"
              >
                ↩️ Volver a Hoy
              </button>
            )}
          </div>

          {/* Date Selector Pills (Hoy / Ayer / Otra Fecha) & Quick Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Quick Date Switcher */}
            <div className="flex items-center gap-1 bg-dark-950/90 p-1 rounded-2xl border border-dark-750">
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  isViewingToday 
                    ? 'bg-emerald-500 text-black font-black shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(yesterdayIso)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  isViewingYesterday 
                    ? 'bg-blue-500 text-white font-black shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ayer
              </button>
              <label className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all relative ${
                !isViewingToday && !isViewingYesterday 
                  ? 'bg-purple-600 text-white font-black shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}>
                <CalendarIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Fecha</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="w-0 h-0 opacity-0 absolute pointer-events-none"
                />
              </label>
            </div>

            {/* Quick Action Pills */}
            <button
              onClick={onOpenDailyCloseModal || onOpenWhatsAppModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800/90 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Arqueo de gaveta en efectivo, comisiones y cierre diario"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Cuadre</span>
            </button>
            <button
              onClick={onOpenExpenseModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-xs font-bold transition-all active:scale-95"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Gasto</span>
            </button>
            <button
              onClick={onOpenCashModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black text-xs font-black shadow-md shadow-gold-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Cobro</span>
            </button>
          </div>
        </div>

        {/* Main Hero Number: Ganancia Limpia */}
        <div className="relative z-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Tu Ganancia Limpia (En Bolsillo)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  ${totalBusinessNetUSD.toFixed(2)}
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-400">
                  USD
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm">
                <span className="font-mono font-bold text-slate-300">
                  ≈ Bs. {(totalBusinessNetUSD * exchangeRate).toFixed(2)}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400/90 text-xs font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 inline" />
                  Libre de comisiones y gastos
                </span>
              </div>
            </div>

            {/* Cash Drawer vs Digital Pill (Quick Criollo Glance) */}
            <div className="flex items-center gap-2 bg-dark-950/80 border border-dark-800 p-2.5 rounded-2xl">
              <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">💵 Gaveta Físico</span>
                <span className="text-xs font-black font-mono text-white">${cashUSD.toFixed(2)}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left">
                <span className="text-[10px] uppercase font-bold text-blue-400 block">📱 Banco / Digital</span>
                <span className="text-xs font-black font-mono text-white">${digitalUSD.toFixed(2)}</span>
              </div>
              {fiadoUSD > 0 && (
                <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">⏳ Fiados</span>
                  <span className="text-xs font-black font-mono text-white">${fiadoUSD.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Distribution Bar (Proportional Revenue Flow) */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="text-slate-400">Distribución de Ingresos de Hoy</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Local {profitPct}%
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Equipo {commissionsPct}%
                </span>
                {expensesPct > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> Gastos {expensesPct}%
                  </span>
                )}
              </div>
            </div>

            <div className="h-2.5 w-full bg-dark-950 rounded-full overflow-hidden flex border border-dark-800">
              {totalIncomeUSD === 0 ? (
                <div className="w-full h-full bg-dark-800" />
              ) : (
                <>
                  <div 
                    style={{ width: `${Math.max(0, profitPct)}%` }} 
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" 
                    title={`Ganancia Local: ${profitPct}%`}
                  />
                  <div 
                    style={{ width: `${Math.max(0, commissionsPct)}%` }} 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500" 
                    title={`Comisiones Equipo: ${commissionsPct}%`}
                  />
                  <div 
                    style={{ width: `${Math.max(0, expensesPct)}%` }} 
                    className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500" 
                    title={`Gastos: ${expensesPct}%`}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Integrated 3-Column Glass Micro-KPIs */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-dark-800/80">
          
          {/* Micro 1: Total Facturado */}
          <div className="p-3.5 rounded-2xl bg-dark-900/70 border border-dark-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Plata que Entró
              </span>
              <div className="text-xl font-black text-white mt-0.5">
                ${totalIncomeUSD.toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Bs. {(totalIncomeUSD * exchangeRate).toFixed(1)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          {/* Micro 2: Comisiones a Pagar */}
          <div className="p-3.5 rounded-2xl bg-dark-900/70 border border-dark-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                A Pagar ({nicheData?.rolePlural || 'Personal'})
              </span>
              <div className="text-xl font-black text-amber-400 mt-0.5">
                ${totalCommissionsUSD.toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Bs. {(totalCommissionsUSD * exchangeRate).toFixed(1)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>

          {/* Micro 3: Gastos del Local */}
          <div className="p-3.5 rounded-2xl bg-dark-900/70 border border-dark-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Gastos del Local
              </span>
              <div className="text-xl font-black text-red-400 mt-0.5">
                -${totalExpensesUSD.toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Bs. {(totalExpensesUSD * exchangeRate).toFixed(1)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>

        </div>

      </div>

      {/* Main Visual Section: 7-Day Performance Chart & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-800/80 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-base">Rendimiento de los Últimos 7 Días</h3>
                <p className="text-xs text-slate-400">Datos reales de lo que entra contra lo que te queda limpio</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-gold-500"></span> Entradas
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Tu Ganancia
                </span>
              </div>
            </div>

            {/* Pure CSS Bar Chart (100% Real Data) */}
            <div className="h-44 flex items-end gap-3 sm:gap-6 pt-4 px-2 border-b border-dark-800 relative">
              {!hasWeeklySales && (
                <div className="absolute inset-0 flex items-center justify-center text-center p-4 bg-dark-900/60 backdrop-blur-[1px] rounded-2xl">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-300 block">
                      📊 Barras en Cero (Cuenta Limpia)
                    </span>
                    <span className="text-[11px] text-slate-500 block max-w-xs">
                      Apenas anotes tu primer cobro en caja, las barras crecerán automáticamente con tus números reales.
                    </span>
                  </div>
                </div>
              )}

              {weeklyData.map((d, i) => {
                const heightPct = hasWeeklySales && d.revenue > 0 ? Math.min(Math.round((d.revenue / maxWeeklyRevenue) * 100), 100) : 4
                const profitPct = hasWeeklySales && d.profit > 0 ? Math.min(Math.round((d.profit / maxWeeklyRevenue) * 100), 100) : 4
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full max-w-[28px] flex items-end justify-center gap-1 h-full">
                      {/* Revenue Bar */}
                      <div 
                        style={{ height: `${heightPct}%` }}
                        className={`w-1/2 rounded-t-md transition-all ${
                          d.revenue > 0 ? 'bg-gradient-to-t from-gold-600 to-gold-400 group-hover:brightness-125' : 'bg-dark-800'
                        }`}
                        title={`Entradas: $${d.revenue.toFixed(2)}`}
                      ></div>
                      {/* Profit Bar */}
                      <div 
                        style={{ height: `${profitPct}%` }}
                        className={`w-1/2 rounded-t-md transition-all ${
                          d.profit > 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:brightness-125' : 'bg-dark-800'
                        }`}
                        title={`Ganancia Limpia: $${d.profit.toFixed(2)}`}
                      ></div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white">
                      {d.day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 text-xs text-slate-400">
            <span>
              {bestDay && bestDay.revenue > 0
                ? `Día más movido: ${bestDay.day} ($${bestDay.revenue.toFixed(2)})`
                : 'Día más movido: Sin registros aún ($0.00)'}
            </span>
            <span className="text-emerald-400 font-medium">{totalServicesCount} atenciones hoy</span>
          </div>
        </div>

        {/* Payments breakdown (100% Real Data) */}
        <div className="bg-dark-900 border border-dark-800/80 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base mb-1">Métodos de Pago • Hoy</h3>
            <p className="text-xs text-slate-400 mb-4">Efectivo vs. Pago Móvil y Digital</p>

            {totalIncomeUSD === 0 ? (
              <div className="py-8 text-center space-y-2 bg-dark-850/50 rounded-2xl p-4 border border-dark-800">
                <span className="text-xs font-bold text-slate-400 block">
                  Sin cobros registrados hoy ($0.00)
                </span>
                <p className="text-[11px] text-slate-500">
                  Al anotar cobros con Pago Móvil, Efectivo o Zelle, aquí verás la proporción exacta en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethodsList.map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{m.label} (${m.sum.toFixed(2)})</span>
                      <span className="text-white font-mono">{m.pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full transition-all`} style={{ width: `${m.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 p-3.5 rounded-2xl bg-dark-950/70 border border-dark-800 text-xs">
            <span className="text-gold-400 font-bold block mb-0.5">💡 Control de Caja Criollo:</span>
            <span className="text-slate-400">
              {totalIncomeUSD === 0
                ? (isViewingToday 
                    ? 'Mantén tu caja al día anotando cada servicio y gasto para tener tu arqueo perfecto al final del día.'
                    : `No se registraron ventas en esta fecha (${selectedDate}).`)
                : `Tienes $${totalIncomeUSD.toFixed(2)} facturados (${formatDateLabel(selectedDate)}). ${isViewingToday ? 'Recuerda hacer tu arqueo de gaveta antes de cerrar la jornada.' : 'Registro auditado de fecha anterior.'}`}
            </span>
          </div>
        </div>

      </div>

      {/* Daily Cash Closing & Audit Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-dark-900 to-dark-950 border border-emerald-500/30 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              ¿Vas a cerrar la jornada de hoy?
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25">
                Cuadre & Cierre Diario
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz el arqueo de efectivo en gaveta, calcula lo que toca pagar al equipo y genera el acta de cierre.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenDailyCloseModal || onOpenWhatsAppModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black text-xs font-black shadow-lg shadow-emerald-500/20 transition-all shrink-0 active:scale-95"
        >
          <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Hacer Cuadre y Cierre de Caja</span>
        </button>
      </div>

      {/* Recent Movements Feed (Ingresos en Verde, Gastos en Rojo) */}
      <div className="bg-dark-900 border border-dark-800/80 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-dark-800/80 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span>Movimientos de Caja ({dateTransactions.length})</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-dark-800 text-gold-400 border border-gold-500/30">
                {formatDateLabel(selectedDate)}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {isViewingToday 
                ? 'Historial en tiempo real de entradas y salidas de hoy' 
                : `Auditoría histórica de movimientos del ${selectedDate}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={onOpenExpenseModal}
              className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 font-bold"
            >
              - Gasto
            </button>
            <button 
              onClick={onOpenCashModal}
              className="text-xs px-2.5 py-1 rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/30 hover:bg-gold-500/20 font-bold"
            >
              + Cobro
            </button>
          </div>
        </div>

        <div className="divide-y divide-dark-800">
          {dateTransactions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-white">
                {isViewingToday ? 'La caja está en $0.00 (Lista para empezar)' : `No hubo movimientos el ${selectedDate}`}
              </p>
              <p className="text-xs text-slate-400">
                {isViewingToday 
                  ? 'Usa el botón dorado "+ Cobro" arriba para registrar tu primera venta real.' 
                  : 'Puedes regresar a "Hoy" pulsando el botón rápido en la parte superior.'}
              </p>
            </div>
          ) : (
              dateTransactions.map((tx) => {
                const isExpense = tx.monto_usd < 0
                return (
                  <div key={tx.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-dark-850/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-base shrink-0 ${
                        isExpense 
                          ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                          : 'bg-dark-800/80 border-dark-700/80 text-gold-400'
                      }`}>
                        {isExpense ? '📉' : '✂️'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                          <span className="truncate">{tx.item_name}</span>
                          {isExpense ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 font-bold border border-red-500/20">
                              GASTO
                            </span>
                          ) : (
                            <span className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded border ${
                              tx.metodo_pago === 'mixto'
                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold'
                                : 'bg-dark-800 text-slate-400 border-dark-750'
                            }`}>
                              {formatTxPaymentSummary(tx)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                          <span>{isExpense ? 'Salida' : tx.staff_name}</span>
                          {tx.client_name && tx.client_name !== '-' && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-300 truncate">{tx.client_name}</span>
                            </>
                          )}
                          {tx.propina_usd > 0 && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-amber-400 font-bold">🪙 +${tx.propina_usd.toFixed(2)}</span>
                            </>
                          )}
                          <span className="text-slate-600">•</span>
                          <span className="font-mono text-[11px] text-slate-500">{tx.hora}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t border-dark-800/60 sm:border-0">
                      {/* Amount */}
                      <div className="text-left sm:text-right">
                        <div className={`text-sm font-black font-mono ${isExpense ? 'text-red-400' : 'text-white'}`}>
                          {isExpense ? `-$${Math.abs(Number(tx.monto_usd || 0)).toFixed(2)}` : `+$${Number(tx.monto_usd || 0).toFixed(2)}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Bs. {Math.abs(Number(tx.monto_bs || (Number(tx.monto_usd || 0) * exchangeRate) || 0)).toFixed(1)}
                        </div>
                      </div>

                      {/* Action Buttons: Factura & Borrar */}
                      <div className="flex items-center gap-1">
                        {!isExpense && (
                          <button
                            onClick={() => setViewingReceiptTx(tx)}
                            className="p-1.5 px-2.5 rounded-xl bg-dark-800 hover:bg-gold-500/15 text-slate-300 hover:text-gold-400 border border-dark-700 hover:border-gold-500/30 transition-all flex items-center gap-1 text-xs font-bold shadow-sm"
                            title="Ver factura / recibo de pago"
                          >
                            <Receipt className="w-3.5 h-3.5 text-gold-400" />
                            <span className="text-[11px]">Recibo</span>
                          </button>
                        )}

                        {onDeleteTransaction && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Seguro que deseas borrar este movimiento (${tx.item_name}) de la caja?`)) {
                                onDeleteTransaction(tx.id)
                              }
                            }}
                            className="p-1.5 rounded-xl hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors"
                            title="Eliminar movimiento por error"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      {/* Modal Comprobante / Factura Digital Reutilizable */}
      <ReceiptModal
        isOpen={Boolean(viewingReceiptTx)}
        onClose={() => setViewingReceiptTx(null)}
        transaction={viewingReceiptTx}
        exchangeRate={exchangeRate}
        businessProfile={businessProfile}
      />

    </div>
  )
}
