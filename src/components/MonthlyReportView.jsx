import React, { useState } from 'react'
import { 
  Calendar, DollarSign, TrendingUp, ArrowDownRight, ArrowUpRight, Users, 
  PieChart, BarChart3, Search, Filter, Receipt, Lock, CheckCircle2, 
  AlertTriangle, Copy, Check, MessageSquare, ChevronDown, Trash2, Sparkles, 
  Wallet, Clock, FileText, ArrowRight
} from 'lucide-react'
import { 
  isDateToday, getLocalDateIso, isEfectivoMethod, isPuntoMethod, 
  isPagoMovilMethod, isDigitalMethod, isFiadoMethod, txMatchesPaymentFilter,
  formatTxPaymentSummary, normalizeWhatsAppPhone 
} from '../lib/dateUtils'
import ReceiptModal from './ReceiptModal'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function MonthlyReportView({ 
  transactions = [], 
  exchangeRate = 889.26,
  dailyClosings = [],
  businessProfile = {},
  staffList = [],
  onDeleteTransaction
}) {
  const safeTransactions = Array.isArray(transactions) ? transactions : []
  const safeClosings = Array.isArray(dailyClosings) ? dailyClosings : []

  const [activeSubTab, setActiveSubTab] = useState('summary') // 'summary' | 'sales_history' | 'daily_closings'
  const [periodFilter, setPeriodFilter] = useState('last_3_months') // 'this_month' | 'prev_month' | 'last_3_months' | 'last_6_months' | 'year' | 'all'
  
  // Sales History filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'income' | 'expense'
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const [viewingReceiptTx, setViewingReceiptTx] = useState(null)
  const [copiedCloseId, setCopiedCloseId] = useState(null)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Period filtering logic
  const isInPeriod = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return false
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
    const parts = cleanDate.split('-')
    if (parts.length !== 3) return true
    
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    if (isNaN(d.getTime())) return true

    if (periodFilter === 'all') return true
    if (periodFilter === 'this_month') {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    }
    if (periodFilter === 'prev_month') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth
    }
    if (periodFilter === 'last_3_months') {
      const diffMs = now.getTime() - d.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      return diffDays >= -1 && diffDays <= 93
    }
    if (periodFilter === 'last_6_months') {
      const diffMs = now.getTime() - d.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      return diffDays >= -1 && diffDays <= 186
    }
    if (periodFilter === 'year') {
      return d.getFullYear() === currentYear
    }
    return true
  }

  // Transactions scoped to chosen period
  const periodTransactions = safeTransactions.filter(t => t && isInPeriod(t.fecha))

  // Financial KPI calculations for period
  const periodIncomeTx = periodTransactions.filter(t => (t.monto_usd || 0) > 0)
  const periodExpenseTx = periodTransactions.filter(t => (t.monto_usd || 0) < 0)

  const periodTotalRevenueUSD = periodIncomeTx.reduce((sum, t) => sum + Number(t.monto_usd || 0), 0)
  const periodTotalExpensesUSD = Math.abs(periodExpenseTx.reduce((sum, t) => sum + Number(t.monto_usd || 0), 0))
  const periodTotalCommissionsUSD = periodIncomeTx.reduce((sum, t) => sum + Number(t.comision_usd || 0), 0)
  const periodNetProfitUSD = Math.max(0, periodTotalRevenueUSD - periodTotalExpensesUSD - periodTotalCommissionsUSD)

  // Monthly History Breakdown (for Summary Tab)
  const monthlyMap = {}
  safeTransactions.forEach(t => {
    if (!t || !t.fecha || typeof t.fecha !== 'string') return
    const cleanDate = t.fecha.includes('T') ? t.fecha.split('T')[0] : t.fecha
    const parts = cleanDate.split('-')
    if (parts.length !== 3) return
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    if (isNaN(d.getTime())) return

    const mIdx = d.getMonth()
    const y = d.getFullYear()
    const mKey = `${MONTH_NAMES[mIdx]} ${y}`

    if (!monthlyMap[mKey]) {
      monthlyMap[mKey] = { mes: MONTH_NAMES[mIdx], year: y, facturacion: 0, gastos: 0, comisiones: 0, lucro: 0, count: 0 }
    }

    if ((t.monto_usd || 0) > 0) {
      monthlyMap[mKey].facturacion += Number(t.monto_usd || 0)
      monthlyMap[mKey].comisiones += Number(t.comision_usd || 0)
      monthlyMap[mKey].count += 1
    } else {
      monthlyMap[mKey].gastos += Math.abs(Number(t.monto_usd || 0))
    }
  })

  // Ensure current month is present
  const currentMonthKey = `${MONTH_NAMES[currentMonth]} ${currentYear}`
  if (!monthlyMap[currentMonthKey]) {
    monthlyMap[currentMonthKey] = { mes: MONTH_NAMES[currentMonth], year: currentYear, facturacion: 0, gastos: 0, comisiones: 0, lucro: 0, count: 0 }
  }

  const monthlyHistory = Object.entries(monthlyMap).map(([key, vals]) => {
    const lucro = vals.facturacion - vals.gastos - vals.comisiones
    return {
      key,
      mesLabel: key === currentMonthKey ? `${vals.mes} (Actual)` : key,
      facturacion: vals.facturacion,
      gastos: vals.gastos,
      comisiones: vals.comisiones,
      lucro: Math.max(0, lucro),
      count: vals.count
    }
  }).sort((a, b) => b.key.localeCompare(a.key))

  // Categories Breakdown (Period Scoped)
  const categoryCounts = {}
  let totalCategoryVolume = 0
  periodIncomeTx.forEach(t => {
    const cat = t.category || (t.item_name ? t.item_name.split(' ')[0] : 'Servicios')
    categoryCounts[cat] = (categoryCounts[cat] || 0) + t.monto_usd
    totalCategoryVolume += t.monto_usd
  })

  const palette = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4', '#84cc16']
  const categoriesData = Object.entries(categoryCounts).map(([name, sum], idx) => {
    const pct = totalCategoryVolume > 0 ? Math.round((sum / totalCategoryVolume) * 100) : 0
    return {
      name,
      sum,
      pct,
      color: palette[idx % palette.length]
    }
  }).sort((a, b) => b.sum - a.sum)

  // Filtered Sales for Tab 2
  const filteredSales = periodTransactions.filter(t => {
    // Type filter
    if (typeFilter === 'income' && t.monto_usd <= 0) return false
    if (typeFilter === 'expense' && t.monto_usd >= 0) return false

    // Payment method filter (supports both single and split/mixed payments)
    if (paymentFilter !== 'all' && !txMatchesPaymentFilter(t, paymentFilter)) return false

    // Staff filter
    if (staffFilter !== 'all') {
      const match = t.staff_id === staffFilter || t.staff_name === staffFilter
      if (!match) return false
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const inClient = (t.client_name || '').toLowerCase().includes(q)
      const inPhone = (t.client_phone || '').includes(q)
      const inStaff = (t.staff_name || '').toLowerCase().includes(q)
      const inItem = (t.item_name || '').toLowerCase().includes(q)
      const inNotes = (t.notes || '').toLowerCase().includes(q)
      return inClient || inPhone || inStaff || inItem || inNotes
    }

    return true
  })

  // Filtered sales metrics
  const filteredSalesIncome = filteredSales.filter(t => t.monto_usd > 0)
  const filteredTotalUSD = filteredSalesIncome.reduce((sum, t) => sum + t.monto_usd, 0)
  const filteredCount = filteredSalesIncome.length
  const averageTicket = filteredCount > 0 ? filteredTotalUSD / filteredCount : 0

  // Filtered Closings for Tab 3
  const filteredClosings = dailyClosings.filter(c => isInPeriod(c.fecha))

  const handleCopyClosingActa = (closing) => {
    const bizName = businessProfile?.businessName || 'Mi Negocio'
    let msg = `💈 *ACTA DE CIERRE HISTÓRICO • ${bizName.toUpperCase()}*\n`
    msg += `📅 *Fecha:* ${closing.fecha}\n`
    msg += `💰 *Facturación Total:* $${(closing.totalIncomeUSD || 0).toFixed(2)} USD\n`
    msg += `💵 *Efectivo en Gaveta Contado:* $${(closing.cashInDrawerCounted || 0).toFixed(2)}\n`
    msg += `⚖️ *Diferencia Arqueo:* $${(closing.differenceUSD || 0).toFixed(2)}\n`
    msg += `✂️ *Comisiones Personal:* $${(closing.totalCommissionsUSD || 0).toFixed(2)}\n`
    msg += `💎 *Lucro Limpio Negocio:* $${(closing.netProfitUSD || 0).toFixed(2)} USD\n`

    navigator.clipboard.writeText(msg).then(() => {
      setCopiedCloseId(closing.id)
      setTimeout(() => setCopiedCloseId(null), 2000)
    })
  }

  const periodOptions = [
    { id: 'this_month', label: 'Este Mes' },
    { id: 'prev_month', label: 'Mes Anterior' },
    { id: 'last_3_months', label: 'Últimos 3 Meses' },
    { id: 'last_6_months', label: 'Últimos 6 Meses' },
    { id: 'year', label: 'Todo el Año' },
    { id: 'all', label: 'Todo el Historial' },
  ]

  const formatTxDateBadge = (fecha, hora) => {
    if (!fecha) return hora || ''
    const clean = fecha.includes('T') ? fecha.split('T')[0] : fecha
    const todayIso = getLocalDateIso()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayIso = getLocalDateIso(yesterday)

    if (clean === todayIso) return `Hoy • ${hora || ''}`
    if (clean === yesterdayIso) return `Ayer • ${hora || ''}`
    return `${clean} • ${hora || ''}`
  }

  return (
    <div className="space-y-5 animate-fadeIn pb-12">

      {/* Top Header & Period Selector */}
      <div className="bg-dark-900 border border-dark-800 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/25 flex items-center justify-center font-black">
              📊
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Centro Financiero & Auditoría
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 font-bold border border-gold-500/25">
                  Pro
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Historial de ventas, arqueos de caja y balance financiero auditado
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {periodOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setPeriodFilter(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                periodFilter === opt.id
                  ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20 font-black'
                  : 'bg-dark-800 text-slate-400 hover:text-white hover:bg-dark-750 border border-dark-750'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex border-b border-dark-800 gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveSubTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'summary'
              ? 'border-gold-500 text-gold-400 bg-gold-500/5 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Resumen Financiero</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sales_history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'sales_history'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Historial de Ventas & Tickets ({periodTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('daily_closings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'daily_closings'
              ? 'border-teal-400 text-teal-300 bg-teal-500/5 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Cierres de Caja Diarios ({dailyClosings.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: FINANCIAL SUMMARY */}
      {activeSubTab === 'summary' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Facturación */}
            <div className="p-4 rounded-3xl bg-dark-900 border border-dark-800 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Facturado</span>
                <span className="w-7 h-7 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center text-xs font-bold">
                  $
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white">
                ${periodTotalRevenueUSD.toFixed(2)}
              </div>
              <div className="text-[11px] text-gold-400 font-mono mt-0.5">
                Bs. {(periodTotalRevenueUSD * exchangeRate).toFixed(2)}
              </div>
            </div>

            {/* Gastos Operativos */}
            <div className="p-4 rounded-3xl bg-dark-900 border border-dark-800 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gastos Local</span>
                <span className="w-7 h-7 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center text-xs font-bold">
                  📉
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-red-400">
                -${periodTotalExpensesUSD.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Bs. {(periodTotalExpensesUSD * exchangeRate).toFixed(2)}
              </div>
            </div>

            {/* Comisiones Equipo */}
            <div className="p-4 rounded-3xl bg-dark-900 border border-dark-800 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Comisiones Equipo</span>
                <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold">
                  👥
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                ${periodTotalCommissionsUSD.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Bs. {(periodTotalCommissionsUSD * exchangeRate).toFixed(2)}
              </div>
            </div>

            {/* Ganancia Limpia Dueño */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/40 to-dark-900 border border-emerald-500/40 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Ganancia Limpia</span>
                <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shadow-inner">
                  💎
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                ${periodNetProfitUSD.toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
                Bs. {(periodNetProfitUSD * exchangeRate).toFixed(2)}
              </div>
            </div>

          </div>

          {/* Two Column Layout: Monthly Table + Category Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Monthly History Table (Col 1 & 2) */}
            <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="font-bold text-white text-base">Cuentas Mes a Mes (Historial Consolidado)</h3>
                <p className="text-xs text-slate-400">Facturación real, gastos del local, comisiones y ganancia neta</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-dark-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="pb-3">Mes</th>
                      <th className="pb-3 text-center">Tickets</th>
                      <th className="pb-3 text-right">Facturado</th>
                      <th className="pb-3 text-right">Gastos</th>
                      <th className="pb-3 text-right">Comisiones</th>
                      <th className="pb-3 text-right text-emerald-400">Ganancia Limpia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800 font-mono">
                    {monthlyHistory.map((row, idx) => (
                      <tr key={idx} className="hover:bg-dark-850/50 transition-colors">
                        <td className="py-3 font-sans font-bold text-slate-200">{row.mesLabel}</td>
                        <td className="py-3 text-center text-slate-400">{row.count}</td>
                        <td className="py-3 text-right text-white font-semibold">${row.facturacion.toFixed(2)}</td>
                        <td className="py-3 text-right text-red-400">-${row.gastos.toFixed(2)}</td>
                        <td className="py-3 text-right text-amber-400">${row.comisiones.toFixed(2)}</td>
                        <td className="py-3 text-right text-emerald-400 font-bold font-sans">
                          ${row.lucro.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Breakdown (Col 3) */}
            <div className="bg-dark-900 border border-dark-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PieChart className="w-4 h-4 text-gold-400" />
                  <h3 className="font-bold text-white text-base">¿De Dónde Entra la Plata?</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">Ingresos por categoría en el período seleccionado</p>

                {categoriesData.length === 0 ? (
                  <div className="py-12 text-center space-y-2 bg-dark-850/50 rounded-2xl p-4 border border-dark-800">
                    <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
                    <span className="text-xs font-bold text-slate-400 block">
                      Sin movimientos en este período
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Tus ventas registradas se clasificarán automáticamente según el servicio o producto cobrado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoriesData.map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                            <span>{cat.name}</span>
                          </span>
                          <span className="text-white font-mono font-bold">${cat.sum.toFixed(2)} ({cat.pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 p-3 rounded-2xl bg-dark-850 border border-dark-800 text-xs">
                <span className="text-gold-400 font-bold block mb-0.5">Control de Rentabilidad:</span>
                <span className="text-slate-400">
                  {periodTotalRevenueUSD > 0
                    ? `Has facturado $${periodTotalRevenueUSD.toFixed(2)} en este período con un margen neto del ${Math.round((periodNetProfitUSD / periodTotalRevenueUSD) * 100)}%.`
                    : 'Selecciona otro período o anota cobros para ver tus analíticas.'}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUBTAB 2: DETAILED SALES HISTORY & TICKETS */}
      {activeSubTab === 'sales_history' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Facturado Filtrado</span>
                <span className="text-lg font-black font-mono text-emerald-400">${filteredTotalUSD.toFixed(2)}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Bs. {(filteredTotalUSD * exchangeRate).toFixed(1)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Tickets Registrados</span>
                <span className="text-lg font-black font-mono text-white">{filteredCount}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Movimientos</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Ticket Promedio</span>
                <span className="text-lg font-black font-mono text-gold-400">${averageTicket.toFixed(2)}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">USD / cliente</span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-dark-900 border border-dark-800 p-4 rounded-3xl shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, barbero/estilista, servicio, nota..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-800 border border-dark-750 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
                />
              </div>

              {/* Staff Filter Dropdown */}
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-dark-800 border border-dark-750 text-xs text-slate-200 focus:outline-none focus:border-gold-500 font-medium"
              >
                <option value="all">Todo el Personal</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-dark-800 border border-dark-750 text-xs text-slate-200 focus:outline-none focus:border-gold-500 font-medium"
              >
                <option value="all">Todos los Métodos</option>
                <option value="efectivo">💵 Efectivo $</option>
                <option value="pago_movil">📱 Pago Móvil</option>
                <option value="punto">💳 Punto de Venta</option>
                <option value="digital">⚡ Zelle / Binance</option>
                <option value="fiado">🤝 Fiado (Por Cobrar)</option>
                <option value="mixto">🔀 Pago Mixto</option>
              </select>

              {/* Type Filter */}
              <div className="flex rounded-xl bg-dark-800 p-1 border border-dark-750 shrink-0">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === 'all' ? 'bg-gold-500 text-black font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setTypeFilter('income')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === 'income' ? 'bg-emerald-500 text-black font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => setTypeFilter('expense')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === 'expense' ? 'bg-red-500 text-black font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Gastos
                </button>
              </div>

            </div>
          </div>

          {/* Sales History Feed */}
          <div className="bg-dark-900 border border-dark-800 rounded-3xl shadow-xl overflow-hidden divide-y divide-dark-800">
            {filteredSales.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No se encontraron movimientos con estos filtros</h4>
                <p className="text-xs text-slate-400">Prueba cambiando el rango de fechas superior o limpiando la búsqueda.</p>
              </div>
            ) : (
              filteredSales.map(tx => {
                const isExpense = tx.monto_usd < 0
                return (
                  <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-dark-850/50 transition-colors">
                    
                    {/* Left: Icon & Details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-lg shrink-0 ${
                        isExpense
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-dark-800 border-dark-750 text-gold-400'
                      }`}>
                        {isExpense ? '📉' : '✂️'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{tx.item_name}</span>
                          
                          {/* Payment method badge */}
                          {isExpense ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold border border-red-500/20">
                              GASTO OPERATIVO
                            </span>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase font-mono ${
                              tx.metodo_pago === 'mixto'
                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold'
                                : 'bg-dark-800 text-slate-300 border-dark-750'
                            }`}>
                              {formatTxPaymentSummary(tx)}
                            </span>
                          )}

                          {/* Date badge */}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800/80 text-gold-400/90 font-mono border border-gold-500/20">
                            {formatTxDateBadge(tx.fecha, tx.hora)}
                          </span>
                        </div>

                        {/* Subtitle with staff, client and tip info */}
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 truncate">
                          <span className="text-slate-300 font-medium">{isExpense ? 'Salida de Caja' : tx.staff_name || 'Personal'}</span>
                          {tx.client_name && tx.client_name !== '-' && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-300 truncate">👤 {tx.client_name}</span>
                            </>
                          )}
                          {tx.propina_usd > 0 && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-amber-400 font-bold">🪙 +${tx.propina_usd.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amounts & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-dark-800/80 sm:border-0">
                      <div className="text-left sm:text-right">
                        <div className={`text-base font-black font-mono ${isExpense ? 'text-red-400' : 'text-white'}`}>
                          {isExpense ? `-$${Math.abs(tx.monto_usd).toFixed(2)}` : `+$${tx.monto_usd.toFixed(2)}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Bs. {Math.abs(tx.monto_bs || (tx.monto_usd * exchangeRate)).toFixed(1)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isExpense && (
                          <button
                            onClick={() => setViewingReceiptTx(tx)}
                            className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-gold-500/15 text-slate-300 hover:text-gold-400 border border-dark-700 hover:border-gold-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            title="Ver e imprimir comprobante / factura"
                          >
                            <Receipt className="w-3.5 h-3.5 text-gold-400" />
                            <span>Recibo</span>
                          </button>
                        )}

                        {onDeleteTransaction && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar definitivamente este movimiento (${tx.item_name}) del historial?`)) {
                                onDeleteTransaction(tx.id)
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Eliminar movimiento"
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
      )}

      {/* SUBTAB 3: DAILY CASH CLOSURES & AUDIT LOG */}
      {activeSubTab === 'daily_closings' && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="p-4 rounded-3xl bg-dark-900 border border-dark-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>Libro de Cierres Diarios & Arqueos de Gaveta</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25">
                  Auditado
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cada vez que cierras la jornada se guarda aquí el arqueo de gaveta con faltantes o sobrantes
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Total Cierres: <strong className="text-white">{filteredClosings.length}</strong>
            </div>
          </div>

          {filteredClosings.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-dark-900 border border-dark-800 rounded-3xl">
              <Lock className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No hay cierres registrados en este período</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Al final de tu jornada, haz clic en el botón verde <strong className="text-emerald-400">"Hacer Cuadre y Cierre de Caja"</strong> en el panel principal. El acta completa y la comparación de efectivo quedarán guardadas aquí para siempre.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClosings.map(closing => {
                const diff = closing.differenceUSD || 0
                const isPerfect = Math.abs(diff) < 0.01
                const isSurplus = diff > 0
                const isCopied = copiedCloseId === closing.id

                return (
                  <div key={closing.id} className="bg-dark-900 border border-dark-800 rounded-3xl p-5 shadow-xl space-y-4 hover:border-dark-700 transition-all">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/25 flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{closing.fecha}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {closing.timestamp ? new Date(closing.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Cierre'}
                          </span>
                        </div>
                      </div>

                      {/* Difference Badge */}
                      <span className={`text-[11px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 border ${
                        isPerfect 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                          : isSurplus 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                      }`}>
                        {isPerfect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cuadre Exacto</span>
                          </>
                        ) : isSurplus ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Sobrante +${diff.toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Faltante -${Math.abs(diff).toFixed(2)}</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Financial Numbers Grid */}
                    <div className="grid grid-cols-2 gap-2.5 bg-dark-950 p-3.5 rounded-2xl border border-dark-850 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Facturado Jornada:</span>
                        <strong className="text-white text-sm">${(closing.totalIncomeUSD || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Efectivo Contado:</span>
                        <strong className="text-emerald-400 text-sm">${(closing.cashInDrawerCounted || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Comisiones Equipo:</span>
                        <strong className="text-amber-400">${(closing.totalCommissionsUSD || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Lucro Limpio:</span>
                        <strong className="text-teal-400">${(closing.netProfitUSD || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Breakdown by Payment Methods */}
                    <div className="text-[11px] flex flex-wrap gap-1.5 font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 border border-dark-750">
                        💵 Ef: ${(closing.efectivoUSD || 0).toFixed(2)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 border border-dark-750">
                        📱 PM: ${(closing.pagoMovilUSD || 0).toFixed(2)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 border border-dark-750">
                        💳 Punto: ${(closing.puntoUSD || 0).toFixed(2)}
                      </span>
                      {(closing.zelleUSD || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 border border-dark-750">
                          ⚡ Zelle: ${(closing.zelleUSD || 0).toFixed(2)}
                        </span>
                      )}
                      {(closing.fiadoUSD || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-dark-800 text-amber-400 border border-dark-750">
                          🤝 Fiado: ${(closing.fiadoUSD || 0).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-dark-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {closing.transactionsCount || 0} tickets cerrados
                      </span>

                      <button
                        onClick={() => handleCopyClosingActa(closing)}
                        className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-dark-700 transition-colors"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? '¡Acta Copiada!' : 'Copiar Acta'}</span>
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
          )}

        </div>
      )}

      {/* Reusable Receipt Modal */}
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
