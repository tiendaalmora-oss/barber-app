import React, { useState, useEffect } from 'react'
import { Users, CheckCircle2, DollarSign, Plus, Pencil, Trash2, X, Award, FileText, Calendar, Clock, ArrowDownRight, MessageSquare, AlertCircle, Receipt, Wallet, Check, AlertTriangle, ChevronDown } from 'lucide-react'
import { getLocalDateIso, isDateToday, isDateInWeek, normalizeWhatsAppPhone, DAYS_OF_WEEK } from '../lib/dateUtils'
import { isArgentina, formatCurrency } from '../lib/brandConfig'
import { isServiceTx } from '../lib/bookingUtils'
import {
  isCashierStaff,
  getCashierStaff,
  isTxEligibleForCashier,
  calculateCashierCommissionForTx,
  getSalaryPeriodLabel,
  getCommissionScopeLabel,
  getCashierCommissionType,
  formatCashierBonusBadge
} from '../lib/securityUtils'

const AVATAR_OPTIONS = ['✂️', '💈', '⚡', '👑', '🔥', '💅', '✨', '🧔', '💼', '👩‍💻', '🧾']

// Helper to check if ISO date is in current week (Monday to Sunday in local timezone)
const isDateInCurrentWeek = (dateStr) => isDateInWeek(dateStr, 0)

export default function CommissionsView({
  staffList = [],
  servicesList = [],
  rolePlural = 'Barberos',
  roleName = 'Barbero',
  transactions = [],
  exchangeRate = 889.26,
  businessProfile = {},
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onRegisterExpense,
  onLiquidateStaff,
  onDeleteTransaction
}) {
  const isAr = isArgentina(null, businessProfile)
  const fmt = (val) => formatCurrency(val, isAr)
  const currTag = isAr ? 'ARS' : 'USD'
  // Top Tabs: 'equipo' | 'vales'
  const [activeTab, setActiveTab] = useState('equipo')
  
  // Period filter: 'pending' (Cuenta Corriente) | 'today' | 'week' | 'all'
  const [periodFilter, setPeriodFilter] = useState('pending')

  // Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [isValeModalOpen, setIsValeModalOpen] = useState(false)
  const [valeStaffId, setValeStaffId] = useState('')
  const [liquidatingStaff, setLiquidatingStaff] = useState(null)

  // Staff Form state
  const [name, setName] = useState('')
  const [staffRole, setStaffRole] = useState('operativo') // 'operativo' | 'cajero'
  const [commissionPct, setCommissionPct] = useState(50)
  const [commissionType, setCommissionType] = useState('fixed') // 'fixed' | 'percent'
  const [commissionFixedUsd, setCommissionFixedUsd] = useState('0')
  const [baseSalaryUsd, setBaseSalaryUsd] = useState('0')
  const [salaryPeriod, setSalaryPeriod] = useState('semanal')
  const [commissionScope, setCommissionScope] = useState('servicios')
  const [staffPin, setStaffPin] = useState('')
  const [showCashierAdvanced, setShowCashierAdvanced] = useState(false)
  const [avatar, setAvatar] = useState('✂️')
  const [serviceCommissions, setServiceCommissions] = useState({}) // { [serviceId]: percentage }
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState('')
  const [customPctToAdd, setCustomPctToAdd] = useState('')
  const [showAdvancedCommissions, setShowAdvancedCommissions] = useState(false)
  const [staffDaysOff, setStaffDaysOff] = useState([])
  const [staffBlockedDates, setStaffBlockedDates] = useState([])
  const [blockedDateInput, setBlockedDateInput] = useState('')

  // Vale Form state
  const [valeAmount, setValeAmount] = useState('')
  const [valeCurrency, setValeCurrency] = useState('USD') // 'USD' | 'Bs'
  const [valePaymentMethod, setValePaymentMethod] = useState('efectivo_usd')
  const [valeMotivo, setValeMotivo] = useState('')

  // Liquidation Form state
  const [payoutPaymentMethod, setPayoutPaymentMethod] = useState('efectivo_usd')
  const [liquidateBaseSalary, setLiquidateBaseSalary] = useState('0')

  // Quick Vale Motives
  const QUICK_MOTIVOS = ['Almuerzo', 'Pasaje', 'Gasolina', 'Medicina', 'Adelanto Personal', 'Emergencia']

  // 1. Gather all Vales
  const allVales = transactions.filter(t => t.type === 'vale' || t.category === 'Vale Empleado')
  const pendingValesTotal = allVales.filter(t => t.status !== 'liquidado')
  const pendingValesTotalUSD = pendingValesTotal.reduce((sum, t) => sum + Math.abs(t.monto_usd || 0), 0)

  const cashiersList = getCashierStaff(staffList)

  // 2. Compute stats per staff member under the Ledger model (Barbers/Stylists + Cashiers)
  const staffStats = staffList.map((st) => {
    const isCashier = isCashierStaff(st)

    if (isCashier) {
      const allShopIncome = transactions.filter(t => isTxEligibleForCashier(t, st))
      const attributedIncome = allShopIncome.filter(t => {
        if (t.cajero_staff_id) return t.cajero_staff_id === st.id
        if (t.registered_by_id) return t.registered_by_id === st.id
        return cashiersList.length <= 1
      })
      const pendingCuts = attributedIncome.filter(t => !t.cajero_comision_pagada)

      let periodCuts = attributedIncome
      if (periodFilter === 'today') periodCuts = attributedIncome.filter(t => isDateToday(t.fecha))
      else if (periodFilter === 'week') periodCuts = attributedIncome.filter(t => isDateInCurrentWeek(t.fecha))
      else if (periodFilter === 'pending') periodCuts = pendingCuts

      const periodServicesCount = periodCuts.length
      const periodBilledUSD = periodCuts.reduce((sum, t) => sum + (Number(t.monto_usd) || 0), 0)
      const periodEarnedUSD = periodCuts.reduce((sum, t) => {
        if (t.cajero_staff_id === st.id && typeof t.comision_cajero_usd === 'number') {
          return sum + t.comision_cajero_usd
        }
        return sum + calculateCashierCommissionForTx(t, st)
      }, 0)

      // Per-barber breakdown for transparent cashier liquidation
      const barberMap = {}
      periodCuts.forEach(t => {
        const bName = t.staff_name || 'Local'
        if (!barberMap[bName]) barberMap[bName] = { barberName: bName, count: 0, billedUSD: 0, bonusUSD: 0 }
        const txBonus = (t.cajero_staff_id === st.id && typeof t.comision_cajero_usd === 'number')
          ? t.comision_cajero_usd
          : calculateCashierCommissionForTx(t, st)
        barberMap[bName].count += 1
        barberMap[bName].billedUSD += Number(t.monto_usd) || 0
        barberMap[bName].bonusUSD += txBonus
      })
      const barberBreakdown = Object.values(barberMap).sort((a, b) => b.bonusUSD - a.bonusUSD)

      // Vales of this cashier
      const staffVales = allVales.filter(t => t.staff_id === st.id || t.staff_name === st.name)
      const pendingStaffVales = staffVales.filter(t => t.status !== 'liquidado')
      let periodStaffVales = staffVales
      if (periodFilter === 'today') periodStaffVales = staffVales.filter(t => isDateToday(t.fecha))
      else if (periodFilter === 'week') periodStaffVales = staffVales.filter(t => isDateInCurrentWeek(t.fecha))
      else if (periodFilter === 'pending') periodStaffVales = pendingStaffVales

      const periodValesUSD = periodStaffVales.reduce((sum, t) => sum + Math.abs(t.monto_usd || 0), 0)
      const pendingValesUSD = pendingStaffVales.reduce((sum, t) => sum + Math.abs(t.monto_usd || 0), 0)

      const baseSalaryUSD = Number(st.base_salary_usd) || 0
      const activeVales = periodFilter === 'pending' ? pendingValesUSD : periodValesUSD
      const netBalanceUSD = baseSalaryUSD + periodEarnedUSD - activeVales

      return {
        ...st,
        isCashier: true,
        baseSalaryUSD,
        servicesCount: periodServicesCount,
        totalBilledUSD: periodBilledUSD,
        totalEarnedUSD: periodEarnedUSD,
        totalEarnedBs: periodEarnedUSD * exchangeRate,
        totalTipsUSD: 0,
        totalTipsBs: 0,
        valesUSD: activeVales,
        valesCount: (periodFilter === 'pending' ? pendingStaffVales : periodStaffVales).length,
        pendingVales: pendingStaffVales,
        pendingCuts,
        pendingTips: [],
        barberBreakdown,
        netBalanceUSD,
        netBalanceBs: netBalanceUSD * exchangeRate
      }
    }

    // All real service cuts/procedures for Barber / Operative staff (excludes pure product sales & debt settlements)
    const allCuts = transactions.filter(t => isServiceTx(t) && (t.staff_id === st.id || t.staff_name === st.name))
    // Pending cuts (not liquidated yet)
    const pendingCuts = allCuts.filter(t => !t.comision_pagada)

    // Filter cuts by active period
    let periodCuts = allCuts
    if (periodFilter === 'today') periodCuts = allCuts.filter(t => isDateToday(t.fecha))
    else if (periodFilter === 'week') periodCuts = allCuts.filter(t => isDateInCurrentWeek(t.fecha))
    else if (periodFilter === 'pending') periodCuts = pendingCuts

    const periodServicesCount = periodCuts.length
    const periodBilledUSD = periodCuts.reduce((sum, t) => sum + (t.monto_usd || 0), 0)
    const periodEarnedUSD = periodCuts.reduce((sum, t) => sum + (t.comision_usd || 0), 0)

    // Tips
    const allTips = transactions.filter(t => (t.propina_staff_id === st.id || t.propina_staff_name === st.name) && (t.propina_usd || 0) > 0)
    const pendingTips = allTips.filter(t => !t.propina_pagada)
    let periodTips = allTips
    if (periodFilter === 'today') periodTips = allTips.filter(t => isDateToday(t.fecha))
    else if (periodFilter === 'week') periodTips = allTips.filter(t => isDateInCurrentWeek(t.fecha))
    else if (periodFilter === 'pending') periodTips = pendingTips
    const periodTipsUSD = periodTips.reduce((sum, t) => sum + (t.propina_usd || 0), 0)

    // Vales of this staff member
    const staffVales = allVales.filter(t => t.staff_id === st.id || t.staff_name === st.name)
    const pendingStaffVales = staffVales.filter(t => t.status !== 'liquidado')
    
    let periodStaffVales = staffVales
    if (periodFilter === 'today') periodStaffVales = staffVales.filter(t => isDateToday(t.fecha))
    else if (periodFilter === 'week') periodStaffVales = staffVales.filter(t => isDateInCurrentWeek(t.fecha))
    else if (periodFilter === 'pending') periodStaffVales = pendingStaffVales

    const periodValesUSD = periodStaffVales.reduce((sum, t) => sum + Math.abs(t.monto_usd || 0), 0)
    const pendingValesUSD = pendingStaffVales.reduce((sum, t) => sum + Math.abs(t.monto_usd || 0), 0)

    // Net balance to settle: Comisiones + Propinas - Vales
    const netBalanceUSD = periodEarnedUSD + periodTipsUSD - (periodFilter === 'pending' ? pendingValesUSD : periodValesUSD)

    return {
      ...st,
      isCashier: false,
      baseSalaryUSD: 0,
      servicesCount: periodServicesCount,
      totalBilledUSD: periodBilledUSD,
      totalEarnedUSD: periodEarnedUSD,
      totalEarnedBs: periodEarnedUSD * exchangeRate,
      totalTipsUSD: periodTipsUSD,
      totalTipsBs: periodTipsUSD * exchangeRate,
      valesUSD: periodFilter === 'pending' ? pendingValesUSD : periodValesUSD,
      valesCount: (periodFilter === 'pending' ? pendingStaffVales : periodStaffVales).length,
      pendingVales: pendingStaffVales,
      pendingCuts,
      pendingTips,
      barberBreakdown: [],
      netBalanceUSD,
      netBalanceBs: netBalanceUSD * exchangeRate
    }
  })

  // Open staff modal
  const openCreateStaffModal = () => {
    setEditingStaff(null)
    setName('')
    setStaffRole('operativo')
    setCommissionPct(50)
    setCommissionType('fixed')
    setCommissionFixedUsd('0')
    setBaseSalaryUsd('0')
    setSalaryPeriod('semanal')
    setCommissionScope('servicios')
    setStaffPin('')
    setShowCashierAdvanced(false)
    setAvatar('✂️')
    setServiceCommissions({})
    setSelectedServiceToAdd('')
    setCustomPctToAdd('')
    setShowAdvancedCommissions(false)
    setStaffDaysOff([])
    setStaffBlockedDates([])
    setBlockedDateInput('')
    setIsStaffModalOpen(true)
  }

  const openEditStaffModal = (st) => {
    const isCashier = isCashierStaff(st)
    const cType = getCashierCommissionType(st)
    setEditingStaff(st)
    setName(st.name)
    setStaffRole(isCashier ? 'cajero' : 'operativo')
    setCommissionType(isCashier ? cType : 'percent')
    setCommissionFixedUsd(String(st.commission_fixed_usd ?? 0))
    setCommissionPct(st.commission_pct !== undefined ? st.commission_pct : (isCashier ? 5 : 50))
    setBaseSalaryUsd(String(st.base_salary_usd ?? 0))
    setSalaryPeriod(st.salary_period || 'semanal')
    setCommissionScope(st.commission_scope || 'servicios')
    setStaffPin(st.pin || '')
    setShowCashierAdvanced(Boolean(isCashier && ((st.commission_scope && st.commission_scope !== 'servicios') || (st.pin && st.pin.trim()))))
    setAvatar(st.avatar || (isCashier ? '💼' : '✂️'))
    setServiceCommissions(st.service_commissions || {})
    setSelectedServiceToAdd('')
    setCustomPctToAdd('')
    setShowAdvancedCommissions(Object.keys(st.service_commissions || {}).length > 0)
    setStaffDaysOff(Array.isArray(st.days_off) ? st.days_off : [])
    setStaffBlockedDates(Array.isArray(st.blocked_dates) ? st.blocked_dates : [])
    setBlockedDateInput('')
    setIsStaffModalOpen(true)
  }

  const handleSaveStaff = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    const isCashier = staffRole === 'cajero'

    // Auto-commit any pending service selection and % typed before saving
    let finalServiceCommissions = { ...serviceCommissions }
    if (!isCashier && selectedServiceToAdd && customPctToAdd) {
      const pct = parseFloat(customPctToAdd)
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        finalServiceCommissions[selectedServiceToAdd] = pct
      }
    }

    const parsedPct = parseFloat(commissionPct)
    const staffPayload = {
      name: name.trim(),
      staff_role: isCashier ? 'cajero' : 'operativo',
      commission_type: isCashier ? commissionType : 'percent',
      commission_fixed_usd: isCashier && commissionType === 'fixed' ? (parseFloat(commissionFixedUsd) || 0) : 0,
      commission_pct: isCashier ? (commissionType === 'percent' ? (isNaN(parsedPct) ? 0 : parsedPct) : 0) : (isNaN(parsedPct) ? 50 : parsedPct),
      base_salary_usd: isCashier ? (parseFloat(baseSalaryUsd) || 0) : 0,
      salary_period: isCashier ? salaryPeriod : null,
      commission_scope: isCashier ? commissionScope : null,
      pin: isCashier ? staffPin.replace(/\s+/g, '') : '',
      avatar,
      service_commissions: isCashier ? {} : finalServiceCommissions,
      days_off: isCashier ? [] : staffDaysOff,
      blocked_dates: isCashier ? [] : Array.from(new Set(staffBlockedDates.filter(Boolean))).sort()
    }

    if (editingStaff) {
      onUpdateStaff({
        ...editingStaff,
        ...staffPayload
      })
    } else {
      onAddStaff({
        id: 'st_' + Date.now(),
        ...staffPayload
      })
    }
    setIsStaffModalOpen(false)
  }

  // Open Vale modal
  const openCreateValeModal = (preselectedStaffId = null) => {
    setValeStaffId(preselectedStaffId || staffList[0]?.id || '')
    setValeAmount('')
    setValeCurrency('USD')
    setValePaymentMethod('efectivo_usd')
    setValeMotivo('')
    setIsValeModalOpen(true)
  }

  const handleSaveVale = (e) => {
    e.preventDefault()
    const numAmount = parseFloat(valeAmount) || 0
    if (numAmount <= 0) return

    const targetStaff = staffList.find(s => s.id === valeStaffId) || staffList[0]
    if (!targetStaff) return

    const finalUSD = valeCurrency === 'USD' ? numAmount : numAmount / exchangeRate
    const finalBs = valeCurrency === 'USD' ? numAmount * exchangeRate : numAmount
    const cleanMotivo = valeMotivo.trim() || 'Adelanto de comisiones'

    const newValeTx = {
      id: 'vale_' + Date.now(),
      type: 'vale',
      item_name: `Vale - ${targetStaff.name}: ${cleanMotivo}`,
      category: 'Vale Empleado',
      staff_name: targetStaff.name,
      staff_id: targetStaff.id,
      motivo: cleanMotivo,
      status: 'pendiente',
      monto_usd: -finalUSD,
      monto_bs: -finalBs,
      tasa_bcv: exchangeRate,
      metodo_pago: valePaymentMethod,
      comision_usd: 0,
      ganancia_negocio_usd: 0, // Advance does not decrease shop profit
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fecha: new Date().toISOString()
    }

    if (onRegisterExpense) {
      onRegisterExpense(newValeTx)
    }
    setIsValeModalOpen(false)
  }

  // Open liquidation modal
  const openLiquidateModal = (staffStat) => {
    setLiquidatingStaff(staffStat)
    setPayoutPaymentMethod('efectivo_usd')
    setLiquidateBaseSalary(staffStat?.isCashier ? String(staffStat.baseSalaryUSD || 0) : '0')
  }

  const handleConfirmLiquidation = () => {
    if (!liquidatingStaff) return
    const salaryToPay = liquidatingStaff.isCashier ? (parseFloat(liquidateBaseSalary) || 0) : 0
    const netUSD = salaryToPay + liquidatingStaff.totalEarnedUSD + liquidatingStaff.totalTipsUSD - liquidatingStaff.valesUSD
    const netBs = netUSD * exchangeRate

    const payoutTx = {
      id: 'liq_' + Date.now(),
      type: 'gasto',
      item_name: `Liquidación ${liquidatingStaff.isCashier ? 'Caja' : ''} - ${liquidatingStaff.name} (Neto: $${netUSD.toFixed(2)})`,
      category: 'Comisiones',
      staff_id: liquidatingStaff.id,
      staff_name: liquidatingStaff.name,
      monto_usd: -Math.max(0, netUSD),
      monto_bs: -Math.max(0, netBs),
      tasa_bcv: exchangeRate,
      metodo_pago: payoutPaymentMethod,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fecha: new Date().toISOString()
    }

    const settledTxIds = (liquidatingStaff.pendingCuts || []).map(t => t.id)
      .concat((liquidatingStaff.pendingTips || []).map(t => t.id))
    const settledValeIds = (liquidatingStaff.pendingVales || []).map(t => t.id)

    if (onLiquidateStaff) {
      onLiquidateStaff(payoutTx, settledTxIds, settledValeIds, {
        isCashier: Boolean(liquidatingStaff.isCashier),
        baseSalaryPaid: salaryToPay
      })
    } else if (onRegisterExpense) {
      onRegisterExpense(payoutTx)
    }

    setLiquidatingStaff(null)
  }

  const handleSendWhatsAppReceipt = (st) => {
    const bizName = businessProfile?.businessName || 'Mi Barbería'
    const cleanPhone = normalizeWhatsAppPhone(st.phone || '')
    const dateStr = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const nowHour = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    let msg = `💈 *RECIBO DE LIQUIDACIÓN • ${bizName.toUpperCase()}*\n`
    msg += `👤 *${st.isCashier ? 'Cajera / Recepción' : 'Profesional'}:* ${st.name}\n`
    msg += `📅 *Fecha:* ${dateStr} - ${nowHour}\n`
    if (!isAr) {
      msg += `💵 *Tasa BCV:* Bs. ${exchangeRate.toFixed(2)}\n`
    }
    msg += `------------------------------------\n\n`
    if (st.isCashier) {
      if ((st.baseSalaryUSD || 0) > 0) {
        msg += `💼 *Sueldo Base (${getSalaryPeriodLabel(st.salary_period)}):* +${fmt(st.baseSalaryUSD)} ${currTag}\n`
      }
      msg += `📊 *Ventas supervisadas:* ${st.servicesCount} tickets (${fmt(st.totalBilledUSD)})\n`
      msg += `📈 *Bono Extra (${formatCashierBonusBadge(st, fmt, currTag)} s/ ${getCommissionScopeLabel(st.commission_scope)}):* +${fmt(st.totalEarnedUSD)} ${currTag}\n`
      if (st.barberBreakdown && st.barberBreakdown.length > 0) {
        msg += `✂️ *Desglose por barbero:*\n`
        st.barberBreakdown.forEach(b => {
          msg += `  - ${b.barberName} (${b.count} serv.): +${fmt(b.bonusUSD)} ${currTag}\n`
        })
      }
    } else {
      msg += `✂️ *Servicios Realizados:* ${st.servicesCount} serv. (${fmt(st.totalBilledUSD)})\n`
      msg += `📈 *Tus Comisiones (${st.commission_pct}%):* +${fmt(st.totalEarnedUSD)} ${currTag}\n`
    }
    if (st.totalTipsUSD > 0) {
      msg += `🪙 *Propinas acumuladas:* +${fmt(st.totalTipsUSD)} ${currTag}\n`
    }
    if (st.valesUSD > 0) {
      msg += `\n🧾 *Vales y Adelantos Descontados:*\n`
      st.pendingVales.forEach(v => {
        msg += `  - ${v.motivo || 'Vale'}: -${fmt(Math.abs(v.monto_usd))} ${currTag} (${v.metodo_pago === 'efectivo_usd' ? 'Efectivo' : (isAr ? 'Mercado Pago' : 'Banco')})\n`
      })
      msg += `• Total Vales: -${fmt(st.valesUSD)} ${currTag}\n`
    }
    msg += `\n------------------------------------\n`
    msg += `💰 *TOTAL NETO A RECIBIR: ${fmt(st.netBalanceUSD)} ${currTag}*\n`
    if (!isAr) {
      msg += `👉 *En Bolívares: Bs. ${st.netBalanceBs.toFixed(2)}*\n`
    }
    msg += `\n`
    msg += `¡Cuentas claras conservan amistades! ✅`

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // Team Totals for Hero Command Center (operative services only so cashiers never double-count cuts)
  const totalTeamNetUSD = staffStats.reduce((sum, s) => sum + Math.max(0, s.netBalanceUSD), 0)
  const totalTeamNetBs = totalTeamNetUSD * exchangeRate
  const totalTeamServices = staffStats.filter(s => !s.isCashier).reduce((sum, s) => sum + s.servicesCount, 0)
  const totalTeamEarnedUSD = staffStats.reduce((sum, s) => sum + s.totalEarnedUSD, 0)

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* ─── HERO COMMAND CENTER: EQUIPO & LIQUIDACIONES ─── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-dark-850 via-dark-900 to-dark-950 border border-dark-750/80 p-5 sm:p-7 rounded-3xl shadow-2xl">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-dark-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-pulse ring-4 ring-gold-500/20" />
            <span className="text-[11px] font-black uppercase tracking-wider text-gold-400">
              Control de Comisiones & Liquidaciones • {rolePlural}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-300 font-medium">
              {staffList.length} {staffList.length === 1 ? roleName : rolePlural}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => openCreateValeModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Receipt className="w-4 h-4 stroke-[2.5]" />
              <span>+ Entregar Vale</span>
            </button>
            <button
              onClick={openCreateStaffModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo {roleName}</span>
            </button>
          </div>
        </div>

        {/* Main Hero Metric: Total a Liquidar */}
        <div className="relative z-10 py-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Neto a Liquidar al Equipo ({periodFilter === 'pending' ? 'Cuenta Corriente' : periodFilter === 'today' ? 'Hoy' : 'Periodo Activo'})
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  ${fmt(totalTeamNetUSD)}
                </span>
                <span className="text-base sm:text-lg font-bold text-gold-400">
                  {currTag}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm">
                {!isAr && (
                  <>
                    <span className="font-mono font-bold text-slate-300">
                      ≈ Bs. {totalTeamNetBs.toFixed(2)}
                    </span>
                    <span className="text-slate-600">•</span>
                  </>
                )}
                <span className="text-gold-400/90 text-xs font-medium">
                  Listo para pagar tras descontar vales y adelantos
                </span>
              </div>
            </div>

            {/* Quick Status Breakdown */}
            <div className="flex items-center gap-2 bg-dark-950/80 border border-dark-800 p-2.5 rounded-2xl flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-750 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">✂️ Atenciones</span>
                <span className="text-xs font-black font-mono text-white">{totalTeamServices} cortes</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">📈 Comisiones</span>
                <span className="text-xs font-black font-mono text-white">${fmt(totalTeamEarnedUSD)}</span>
              </div>
              {pendingValesTotalUSD > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">🧾 Vales Activos</span>
                  <span className="text-xs font-black font-mono text-white">-${fmt(pendingValesTotalUSD)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ─── TABS & PERIOD FILTER BAR ─── */}
      <div className="bg-dark-900 border border-dark-800/80 p-3 sm:p-4 rounded-3xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
          
          {/* Subtab Buttons */}
          <div className="flex items-center gap-1.5 bg-dark-850 p-1 rounded-2xl border border-dark-750/80 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('equipo')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-1 sm:flex-none justify-center ${
                activeTab === 'equipo'
                  ? 'bg-gold-500 text-black shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Equipo & Liquidaciones</span>
            </button>
            <button
              onClick={() => setActiveTab('vales')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-1 sm:flex-none justify-center ${
                activeTab === 'vales'
                  ? 'bg-gold-500 text-black shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Libro de Vales</span>
              {pendingValesTotal.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                  activeTab === 'vales' ? 'bg-black text-gold-400' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {pendingValesTotal.length} pend.
                </span>
              )}
            </button>
          </div>

          {/* Period Filter Pills (Only in equipo tab) */}
          {activeTab === 'equipo' && (
            <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-2xl border border-dark-750/80 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'pending', label: '⚖️ Cuenta Corriente' },
                { id: 'today', label: '📅 Hoy' },
                { id: 'week', label: '🗓️ Esta Semana' },
                { id: 'all', label: '📋 Todo' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPeriodFilter(f.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                    periodFilter === f.id
                      ? 'bg-dark-700 text-white shadow-sm font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ─── VISTA 1: TARJETAS DEL EQUIPO (ESTADOS DE CUENTA) ─── */}
      {activeTab === 'equipo' && (
        <>
          {staffStats.length === 0 ? (
            <div className="bg-dark-900 border border-dark-800/80 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-3xl bg-gold-500/10 text-gold-400 border border-gold-500/20 mx-auto flex items-center justify-center shadow-inner">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-white text-base sm:text-lg">Tu equipo está vacío</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Agrega a tus especialistas y asígnales su porcentaje de comisión para liquidar de forma automática sin calculadoras.
                </p>
              </div>
              <button
                onClick={openCreateStaffModal}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black text-xs font-black shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
              >
                + Agregar mi primer {roleName}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffStats.map((st) => {
                const hasPendingVales = st.valesUSD > 0
                const isNegative = st.netBalanceUSD < 0
                const isZero = Math.abs(st.netBalanceUSD) < 0.01

                return (
                  <div 
                    key={st.id} 
                    className={`relative overflow-hidden bg-dark-900 border hover:border-dark-700/90 rounded-3xl p-5 shadow-xl transition-all group flex flex-col justify-between gap-4 ${
                      isNegative 
                        ? 'border-rose-500/30 bg-gradient-to-br from-rose-950/15 via-dark-900 to-dark-900' 
                        : isZero 
                        ? 'border-dark-800/90' 
                        : 'border-gold-500/30 bg-gradient-to-br from-amber-950/10 via-dark-900 to-dark-900'
                    }`}
                  >
                    {/* Status accent edge */}
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                      isNegative ? 'bg-rose-500' : isZero ? 'bg-dark-700' : 'bg-gold-500'
                    }`} />

                    <div className="space-y-3.5 pl-2">
                      {/* Profile Header */}
                      <div className="flex items-start justify-between pb-3 border-b border-dark-800/80 gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
                            {st.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-black text-white text-base leading-snug truncate">{st.name}</h3>
                              {st.isCashier && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-black uppercase shrink-0">
                                  💼 Caja
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => openEditStaffModal(st)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all ${
                                  st.isCashier
                                    ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-300'
                                    : 'bg-gold-500/15 hover:bg-gold-500/25 border-gold-500/30 text-gold-400'
                                }`}
                              >
                                <span>
                                  {st.isCashier
                                    ? (() => {
                                        const bonusLabel = formatCashierBonusBadge(st, fmt, currTag)
                                        if (st.baseSalaryUSD > 0) {
                                          return bonusLabel === 'Sin bono'
                                            ? `$${fmt(st.baseSalaryUSD)} base • Solo sueldo`
                                            : `$${fmt(st.baseSalaryUSD)} base + ${bonusLabel}`
                                        }
                                        return bonusLabel
                                      })()
                                    : `${st.commission_pct}% base`}
                                </span>
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              {st.isCashier && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-dark-850 text-slate-300 border border-dark-750 font-medium">
                                  {getSalaryPeriodLabel(st.salary_period)}
                                </span>
                              )}
                              {!st.isCashier && st.service_commissions && Object.keys(st.service_commissions).length > 0 && (
                                <span 
                                  title={`${Object.keys(st.service_commissions).length} servicios con porcentaje personalizado`}
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium"
                                >
                                  🏷️ {Object.keys(st.service_commissions).length} esp.
                                </span>
                              )}
                              {!st.isCashier && Array.isArray(st.days_off) && st.days_off.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/25 font-medium">
                                  📅 Libre: {st.days_off.map(d => DAYS_OF_WEEK.find(w => w.id === d)?.short || d).join(', ')}
                                </span>
                              )}
                              {!st.isCashier && Array.isArray(st.blocked_dates) && st.blocked_dates.includes(getLocalDateIso()) && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                                  🚫 Hoy libre
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top Actions: Vale, Edit, Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openCreateValeModal(st.id)}
                            className="px-2 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all"
                            title="Entregar vale a este especialista"
                          >
                            + Vale
                          </button>
                          <button
                            onClick={() => openEditStaffModal(st)}
                            className="p-1.5 rounded-xl bg-dark-850 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750"
                            title="Editar especialista"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Seguro que deseas eliminar a ${st.name} del equipo?`)) {
                                onDeleteStaff(st.id)
                              }
                            }}
                            className="p-1.5 rounded-xl bg-dark-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-750"
                            title="Eliminar especialista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Micro Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-2xl bg-dark-850 border border-dark-750/80">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            {st.isCashier ? 'Ventas Barberos' : 'Atenciones'}
                          </span>
                          <span className="text-sm font-black text-white">
                            {st.servicesCount} {st.isCashier ? 'tickets' : 'cortes'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-dark-850 border border-dark-750/80">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            {st.isCashier ? 'Total Supervisado' : 'Generó en Caja'}
                          </span>
                          <span className="text-sm font-black text-slate-200">${fmt(st.totalBilledUSD)}</span>
                        </div>
                      </div>

                      {/* Revenue Flow Breakdown */}
                      <div className="space-y-1.5 text-xs bg-dark-950/80 p-3 rounded-2xl border border-dark-800/80">
                        {st.isCashier && st.baseSalaryUSD > 0 && (
                          <div className="flex justify-between items-center text-sky-300">
                            <span>💼 Sueldo Fijo ({getSalaryPeriodLabel(st.salary_period)}):</span>
                            <span className="font-mono font-bold">+${fmt(st.baseSalaryUSD)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-slate-300">
                          <span>
                            {st.isCashier
                              ? `📈 Bono Extra (${formatCashierBonusBadge(st, fmt, currTag)}):`
                              : '📈 Comisiones ganadas:'}
                          </span>
                          <span className="font-mono font-bold text-white">+${fmt(st.totalEarnedUSD)}</span>
                        </div>
                        {st.isCashier && st.barberBreakdown && st.barberBreakdown.length > 0 && (
                          <div className="pt-1 border-t border-dark-800/70 space-y-0.5 text-[10px] text-slate-400">
                            {st.barberBreakdown.slice(0, 4).map(b => (
                              <div key={b.barberName} className="flex justify-between">
                                <span className="truncate pr-2">• Por {b.barberName} ({b.count})</span>
                                <span className="font-mono text-sky-300">+${fmt(b.bonusUSD)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {st.totalTipsUSD > 0 && (
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>🪙 Propinas acumuladas:</span>
                            <span className="font-mono font-bold">+${fmt(st.totalTipsUSD)}</span>
                          </div>
                        )}
                        {hasPendingVales && (
                          <div className="flex justify-between items-center text-amber-400 pt-1 border-t border-dark-800">
                            <span>🧾 Vales a descontar ({st.valesCount}):</span>
                            <span className="font-mono font-black">-${fmt(st.valesUSD)}</span>
                          </div>
                        )}
                      </div>

                      {/* Net Balance Box (Fintech Total Due) */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        isNegative
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                          : isZero
                          ? 'bg-dark-850 border-dark-750 text-slate-400'
                          : 'bg-gradient-to-r from-amber-500/10 to-gold-500/15 border-gold-500/40 text-white'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {isNegative ? '⚠️ Saldo en Contra (Debe al Local)' : '💰 Saldo Neto a Liquidar'}
                          </span>
                          {!isAr && (
                            <span className="text-[10px] font-mono text-slate-400">
                              Tasa: {exchangeRate.toFixed(0)}
                            </span>
                          )}
                        </div>

                        <div className="text-2xl font-black mt-1">
                          ${fmt(st.netBalanceUSD)} <span className="text-xs font-normal text-slate-400">{currTag}</span>
                        </div>
                        {!isAr && (
                          <div className="text-xs text-gold-400 font-mono mt-0.5">
                            Bs. {st.netBalanceBs.toFixed(2)}
                          </div>
                        )}

                        {isNegative && (
                          <p className="text-[10px] text-rose-300/80 mt-1">
                            El profesional tomó más vales de lo que ha generado. Se descontará con sus siguientes atenciones.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pl-2 pt-2 border-t border-dark-800/80 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSendWhatsAppReceipt(st)}
                        disabled={isZero && !hasPendingVales}
                        className="py-2.5 px-2.5 rounded-2xl bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-emerald-400 border border-dark-750 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 active:scale-95"
                        title="Enviar resumen por WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => openLiquidateModal(st)}
                        disabled={st.netBalanceUSD <= 0}
                        className={`py-2.5 px-2.5 rounded-2xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                          st.netBalanceUSD > 0
                            ? 'bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black shadow-md shadow-gold-500/20 active:scale-95'
                            : 'bg-dark-800 text-slate-600 border border-dark-750 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Liquidar</span>
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── VISTA 2: LIBRO DE VALES (HISTORIAL COMPLETO) ─── */}
      {activeTab === 'vales' && (
        <div className="bg-dark-900 border border-dark-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>Libro Histórico de Vales & Adelantos</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                  {allVales.length} total
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Registro auditable de cada vale entregado, motivo y estado de descuento
              </p>
            </div>

            <button
              onClick={() => openCreateValeModal()}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Entregar Nuevo Vale</span>
            </button>
          </div>

          {allVales.length === 0 ? (
            <div className="text-center py-10 space-y-2 bg-dark-950 rounded-2xl border border-dark-800">
              <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No hay vales registrados</p>
              <p className="text-xs text-slate-500">
                Cuando un empleado pida plata para almuerzo o pasaje, regístralo con el botón "+ Entregar Vale".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-dark-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-bold">Fecha / Hora</th>
                    <th className="pb-3 font-bold">Profesional</th>
                    <th className="pb-3 font-bold">Motivo</th>
                    <th className="pb-3 font-bold">Origen del Pago</th>
                    <th className="pb-3 font-bold text-right">Monto USD</th>
                    <th className="pb-3 font-bold text-center">Estado</th>
                    <th className="pb-3 font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/60 font-mono">
                  {allVales.map((v) => {
                    const isPending = v.status !== 'liquidado'
                    const dateFormatted = v.fecha ? v.fecha.split('T')[0] : 'Hoy'

                    return (
                      <tr key={v.id} className="hover:bg-dark-850/50 transition-colors">
                        <td className="py-3 text-slate-300 font-sans text-xs">
                          <div>{dateFormatted}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{v.hora || 'Caja'}</div>
                        </td>
                        <td className="py-3 text-white font-sans font-bold text-xs">
                          {v.staff_name || 'Empleado'}
                        </td>
                        <td className="py-3 text-slate-300 font-sans text-xs">
                          <span className="px-2 py-0.5 rounded-lg bg-dark-800 border border-dark-750 text-[11px]">
                            {v.motivo || 'Vale'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 font-sans text-xs">
                          {v.metodo_pago === 'efectivo_usd' ? '💵 Gaveta Efectivo' : '📲 Pago Móvil / Banco'}
                        </td>
                        <td className="py-3 text-right font-bold text-amber-400 text-sm">
                          -${Math.abs(v.monto_usd || 0).toFixed(2)}
                          <div className="text-[10px] text-slate-500 font-normal">
                            Bs. {Math.abs(v.monto_bs || (v.monto_usd * exchangeRate)).toFixed(2)}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {isPending ? '⏳ Pendiente' : '✓ Liquidado'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-sans">
                          {isPending && onDeleteTransaction && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Anular y eliminar este vale de $${Math.abs(v.monto_usd).toFixed(2)} para ${v.staff_name}?`)) {
                                  onDeleteTransaction(v.id)
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-dark-800 transition-colors"
                              title="Anular vale"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: REGISTRAR VALE / ADELANTO */}
      {isValeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Receipt className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Entregar Vale / Adelanto</h3>
                  <p className="text-xs text-slate-400">Salida de dinero deducible de comisiones</p>
                </div>
              </div>
              <button onClick={() => setIsValeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVale} className="space-y-4">
              {/* Selección del Profesional */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ¿A qué profesional se le entrega la plata?
                </label>
                <select
                  value={valeStaffId}
                  onChange={(e) => setValeStaffId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  {staffList.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.avatar} {st.name} ({st.commission_pct}% comisión)
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto del Vale con selector de Moneda y Chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Monto a Entregar
                  </label>
                  {isAr ? (
                    <span className="text-[11px] font-mono font-bold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-lg border border-sky-500/30">
                      🇦🇷 Pesos ($ ARS)
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 bg-dark-800 p-0.5 rounded-lg border border-dark-700 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setValeCurrency('USD')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          valeCurrency === 'USD' ? 'bg-amber-500 text-black' : 'text-slate-400'
                        }`}
                      >
                        $ USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setValeCurrency('Bs')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          valeCurrency === 'Bs' ? 'bg-amber-500 text-black' : 'text-slate-400'
                        }`}
                      >
                        Bs.
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {valeCurrency === 'USD' ? '$' : 'Bs.'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    placeholder="0.00"
                    value={valeAmount}
                    onChange={(e) => setValeAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white font-mono font-bold text-lg focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>

                {/* Chips rápidos de monto */}
                <div className="flex gap-1.5 mt-2">
                  {(isAr ? [2000, 5000, 10000, 20000] : [2, 5, 10, 20]).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setValeAmount(v.toString())
                        setValeCurrency('USD')
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                        valeAmount === v.toString() && valeCurrency === 'USD'
                          ? 'bg-amber-500 text-black border-amber-400 font-black'
                          : 'bg-dark-850 hover:bg-dark-750 text-slate-300 border-dark-750'
                      }`}
                    >
                      ${fmt(v)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivo con pastillas rápidas */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Motivo del Vale
                </label>
                <input
                  type="text"
                  placeholder="Ej. Almuerzo o Pasaje"
                  value={valeMotivo}
                  onChange={(e) => setValeMotivo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {QUICK_MOTIVOS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setValeMotivo(m)}
                      className="px-2 py-0.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-[11px] text-amber-400/90 border border-dark-700"
                    >
                      + {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Origen del dinero */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ¿De dónde sale el dinero?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValePaymentMethod('efectivo_usd')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      valePaymentMethod === 'efectivo_usd'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-dark-850 border-dark-750 text-slate-400'
                    }`}
                  >
                    💵 Gaveta en Efectivo
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Resta del arqueo físico</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValePaymentMethod('pago_movil')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      valePaymentMethod === 'pago_movil'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-dark-850 border-dark-750 text-slate-400'
                    }`}
                  >
                    {isAr ? '📱 Mercado Pago / Transf.' : '📱 Pago Móvil / Banco'}
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">{isAr ? 'No toca la caja física' : 'No toca la gaveta física'}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsValeModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-dark-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Entregar Vale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIQUIDAR Y PAGAR CUENTA CLARA */}
      {liquidatingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-xl">
                  {liquidatingStaff.avatar}
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Liquidar a {liquidatingStaff.name}</h3>
                  <p className="text-xs text-slate-400">Corte de cuentas y entrega de comisiones</p>
                </div>
              </div>
              <button onClick={() => setLiquidatingStaff(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen del Corte */}
            <div className="bg-dark-950 p-4 rounded-2xl border border-dark-800 space-y-2 text-xs">
              {liquidatingStaff.isCashier ? (
                <>
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-dark-800">
                    <span className="text-sky-300 font-bold">💼 Sueldo Fijo a incluir ({currTag}):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={liquidateBaseSalary}
                      onChange={(e) => setLiquidateBaseSalary(e.target.value)}
                      className="w-28 px-2.5 py-1 rounded-lg bg-dark-900 border border-sky-500/40 text-right font-mono font-black text-white text-xs"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">📊 Ventas supervisadas:</span>
                    <span className="font-bold text-white">{liquidatingStaff.servicesCount} (${fmt(liquidatingStaff.totalBilledUSD)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">📈 Bono extra ({formatCashierBonusBadge(liquidatingStaff, fmt, currTag)}):</span>
                    <span className="font-bold text-emerald-400">+${fmt(liquidatingStaff.totalEarnedUSD)} {currTag}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">✂️ Cortes realizados:</span>
                    <span className="font-bold text-white">{liquidatingStaff.servicesCount} (${fmt(liquidatingStaff.totalBilledUSD)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">📈 Comisiones ganadas ({liquidatingStaff.commission_pct}%):</span>
                    <span className="font-bold text-emerald-400">+${fmt(liquidatingStaff.totalEarnedUSD)} {currTag}</span>
                  </div>
                </>
              )}
              {liquidatingStaff.totalTipsUSD > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">🪙 Propinas acumuladas:</span>
                  <span className="font-bold text-emerald-400">+${fmt(liquidatingStaff.totalTipsUSD)} {currTag}</span>
                </div>
              )}
              {liquidatingStaff.valesUSD > 0 && (
                <div className="flex justify-between text-amber-400 pt-1.5 border-t border-dark-800">
                  <span>🧾 Vales a descontar ({liquidatingStaff.valesCount}):</span>
                  <span className="font-black">-${fmt(liquidatingStaff.valesUSD)} {currTag}</span>
                </div>
              )}
              {(() => {
                const salaryToPay = liquidatingStaff.isCashier ? (parseFloat(liquidateBaseSalary) || 0) : 0
                const finalNet = salaryToPay + liquidatingStaff.totalEarnedUSD + liquidatingStaff.totalTipsUSD - liquidatingStaff.valesUSD
                return (
                  <>
                    <div className="flex justify-between pt-2 border-t border-dark-800 text-sm font-black">
                      <span className="text-white">💰 NETO A ENTREGAR:</span>
                      <span className="text-gold-400 font-mono text-base">
                        ${fmt(finalNet)} {currTag}
                      </span>
                    </div>
                    {!isAr && (
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        Al cambio BCV: Bs. {(finalNet * exchangeRate).toFixed(2)}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Método con el que se le paga */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ¿Cómo le estás pagando esta liquidación?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutPaymentMethod('efectivo_usd')}
                  className={`p-2 rounded-xl border text-xs font-bold text-center transition-all ${
                    payoutPaymentMethod === 'efectivo_usd'
                      ? 'bg-gold-500/15 border-gold-500 text-white'
                      : 'bg-dark-850 border-dark-750 text-slate-400'
                  }`}
                >
                  💵 Efectivo de Gaveta
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutPaymentMethod('pago_movil')}
                  className={`p-2 rounded-xl border text-xs font-bold text-center transition-all ${
                    payoutPaymentMethod === 'pago_movil'
                      ? 'bg-gold-500/15 border-gold-500 text-white'
                      : 'bg-dark-850 border-dark-750 text-slate-400'
                  }`}
                >
                  {isAr ? '📱 Mercado Pago / Transf.' : '📱 Pago Móvil / Banco'}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleSendWhatsAppReceipt(liquidatingStaff)}
                className="w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Comprobante por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmLiquidation}
                className="w-full py-3.5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-black uppercase tracking-wide shadow-xl shadow-gold-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmar Pago y Cerrar Cuentas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AGREGAR O EDITAR PROFESIONAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-md max-h-[88vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden">
            {/* Header Fijo */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-dark-800 shrink-0">
              <div>
                <h3 className="font-black text-white text-base">
                  {editingStaff ? `Editar ${roleName}` : `Nuevo ${roleName}`}
                </h3>
                <p className="text-xs text-slate-400">
                  Configura su nombre y comisiones
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsStaffModalOpen(false)} 
                className="p-1.5 rounded-full hover:bg-dark-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario Scrolleable */}
            <form onSubmit={handleSaveStaff} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-left">
              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Rol en el Local:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-dark-950 p-1.5 rounded-2xl border border-dark-800">
                  <button
                    type="button"
                    onClick={() => {
                      setStaffRole('operativo')
                      if (Number(commissionPct) < 15) setCommissionPct(50)
                      if (avatar === '💼') setAvatar('✂️')
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all ${
                      staffRole === 'operativo'
                        ? 'bg-gold-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ✂️ {roleName} / Especialista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffRole('cajero')
                      if (Number(commissionPct) >= 30) setCommissionPct(5)
                      if (avatar === '✂️' || avatar === '💈') setAvatar('💼')
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all ${
                      staffRole === 'cajero'
                        ? 'bg-sky-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    💼 Cajera / Recepción
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre o Apodo del {staffRole === 'cajero' ? 'Encargado/a de Caja' : roleName}
                </label>
                <input
                  type="text"
                  required
                  placeholder={staffRole === 'cajero' ? 'Ej. María (Caja)' : 'Ej. Carlos El Fino'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  autoFocus
                />
              </div>

              {staffRole === 'cajero' ? (
                <div className="space-y-3.5 p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/30">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-sky-300 mb-1">
                        Sueldo Base Fijo ($ {currTag})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={baseSalaryUsd}
                        onChange={(e) => setBaseSalaryUsd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Frecuencia de Sueldo
                      </label>
                      <select
                        value={salaryPeriod}
                        onChange={(e) => setSalaryPeriod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-700 text-xs text-white focus:outline-none focus:border-sky-400"
                      >
                        <option value="diario">Diario</option>
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="mensual">Mensual</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-bold text-sky-300">
                        Bono Extra por Ventas
                      </label>
                      <div className="inline-flex bg-dark-950 p-0.5 rounded-xl border border-dark-750 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCommissionType('fixed')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                            commissionType === 'fixed'
                              ? 'bg-sky-500 text-black shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          $ Fijo por corte
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommissionType('percent')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                            commissionType === 'percent'
                              ? 'bg-sky-500 text-black shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          % por venta
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={commissionType === 'percent' ? 100 : undefined}
                        step={commissionType === 'percent' ? '0.5' : '0.01'}
                        placeholder={
                          commissionType === 'fixed'
                            ? (isAr ? 'Ej. 500' : 'Ej. 1.00')
                            : 'Ej. 5'
                        }
                        value={commissionType === 'fixed' ? commissionFixedUsd : commissionPct}
                        onChange={(e) => {
                          if (commissionType === 'fixed') {
                            setCommissionFixedUsd(e.target.value)
                          } else {
                            setCommissionPct(e.target.value)
                          }
                        }}
                        className="w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                        {commissionType === 'fixed' ? `${currTag} / ticket` : '%'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      {commissionType === 'fixed'
                        ? <>Se suma <strong>1 vez</strong> por cada cliente cobrado (ej. Corte + Barba = 1 bono). No descuenta nada a los barberos. Pon 0 si solo cobra sueldo fijo.</>
                        : <>Se suma aparte como bono para la caja; <strong>no</strong> descuenta nada a los barberos. Pon 0 si solo cobra sueldo fijo.</>}
                    </p>
                  </div>

                  <div className="pt-1 border-t border-sky-500/20">
                    <button
                      type="button"
                      onClick={() => setShowCashierAdvanced(prev => !prev)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-slate-300 hover:text-white py-1 transition-colors"
                    >
                      <span>⚙️ Opciones avanzadas (alcance y PIN)</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCashierAdvanced ? 'rotate-180' : ''}`} />
                    </button>

                    {showCashierAdvanced && (
                      <div className="grid grid-cols-2 gap-2.5 pt-2 animate-fadeIn">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Aplica sobre:
                          </label>
                          <select
                            value={commissionScope}
                            onChange={(e) => setCommissionScope(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl bg-dark-900 border border-dark-700 text-xs text-white focus:outline-none focus:border-sky-400"
                          >
                            <option value="servicios">Cortes / Servicios</option>
                            <option value="productos">Solo Productos</option>
                            <option value="ambos">Servicios + Productos</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            PIN Personal (Opcional)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={8}
                            placeholder="Ej. 1111"
                            value={staffPin}
                            onChange={(e) => setStaffPin(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                          />
                        </div>
                        <p className="col-span-2 text-[10px] text-sky-300/80 leading-snug">
                          La cajera puede entrar con el correo del local + este PIN (directo a Modo Cajero).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gold-400 mb-1.5">
                    Porcentaje de Comisión Base (%)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {[40, 50, 55, 60, 70].map(pct => (
                      <button
                        type="button"
                        key={pct}
                        onClick={() => setCommissionPct(pct)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          Number(commissionPct) === pct
                            ? 'bg-gold-500 text-black border-gold-400'
                            : 'bg-dark-850 text-slate-400 border-dark-750'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                    />
                    <span className="text-xs text-slate-400 shrink-0">
                      (Local: {Math.max(0, 100 - (Number(commissionPct) || 0))}%)
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Elige su Ícono
                </label>
                <div className="flex items-center justify-between gap-1 bg-dark-850 p-2 rounded-xl border border-dark-750 overflow-x-auto">
                  {AVATAR_OPTIONS.map(ic => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setAvatar(ic)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 transition-all ${
                        avatar === ic ? 'bg-gold-500/25 border border-gold-500 scale-110' : 'hover:bg-dark-800'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección: Disponibilidad y Días Libres (Solo Operativos) */}
              {staffRole !== 'cajero' && (() => {
                const todayIso = getLocalDateIso()
                const tomDate = new Date()
                tomDate.setDate(tomDate.getDate() + 1)
                const tomorrowIso = getLocalDateIso(tomDate)
                const activeBlocked = staffBlockedDates.filter(d => d && d >= todayIso)
                const toggleBlocked = (iso) => {
                  if (!iso) return
                  setStaffBlockedDates(prev => prev.includes(iso) ? prev.filter(x => x !== iso) : [...prev, iso].sort())
                }
                return (
                  <div className="pt-2 border-t border-dark-800 space-y-2.5">
                    <div>
                      <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span>📅 Disponibilidad y Días Libres</span>
                      </label>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Hereda el horario del local. Marca solo los días que libra o fechas ausentes.
                      </p>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {DAYS_OF_WEEK.map(d => {
                        const isOff = staffDaysOff.includes(d.id)
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setStaffDaysOff(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])
                            }}
                            className={`py-1.5 px-1 rounded-lg border text-center transition-all flex flex-col items-center ${
                              isOff
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                : 'bg-dark-850 border-dark-750 text-slate-300 hover:border-dark-650'
                            }`}
                            title={isOff ? `Libra los ${d.label} (toca para activar)` : `Trabaja los ${d.label} (toca para marcar libre)`}
                          >
                            <span className="text-[10px] font-bold">{d.short}</span>
                            <span className={`text-[8px] font-black uppercase ${isOff ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isOff ? 'Libre' : 'Act'}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="p-2.5 rounded-xl bg-dark-950/80 border border-dark-800 space-y-2">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-300">Ausencias puntuales:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleBlocked(todayIso)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                              staffBlockedDates.includes(todayIso)
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                : 'bg-dark-850 border-dark-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {staffBlockedDates.includes(todayIso) ? '✓ Hoy libre' : '+ Hoy libre'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBlocked(tomorrowIso)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                              staffBlockedDates.includes(tomorrowIso)
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                : 'bg-dark-850 border-dark-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {staffBlockedDates.includes(tomorrowIso) ? '✓ Mañana libre' : '+ Mañana libre'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          min={todayIso}
                          value={blockedDateInput}
                          onChange={(e) => setBlockedDateInput(e.target.value)}
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-700 text-[11px] font-mono text-white focus:outline-none focus:border-rose-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!blockedDateInput) return
                            if (!staffBlockedDates.includes(blockedDateInput)) {
                              setStaffBlockedDates(prev => [...prev, blockedDateInput].sort())
                            }
                            setBlockedDateInput('')
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/35 text-[10px] font-black shrink-0"
                        >
                          + Agregar fecha
                        </button>
                      </div>

                      {activeBlocked.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {activeBlocked.map(dt => (
                            <span
                              key={dt}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold"
                            >
                              <span>{dt === todayIso ? `Hoy (${dt})` : dt === tomorrowIso ? `Mañana (${dt})` : dt}</span>
                              <button
                                type="button"
                                onClick={() => setStaffBlockedDates(prev => prev.filter(x => x !== dt))}
                                className="hover:text-white font-sans"
                                title="Quitar fecha libre"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Sección: Comisiones Especiales por Servicio (Solo Operativos) */}
              {staffRole !== 'cajero' && (
              <div className="pt-2 border-t border-dark-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gold-400 flex items-center gap-1.5">
                    <span>🏷️ Comisiones Especiales por Servicio</span>
                  </label>
                  {Object.keys(serviceCommissions).length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 font-mono font-bold">
                      {Object.keys(serviceCommissions).length} asignada(s)
                    </span>
                  )}
                </div>

                {/* Lista de comisiones especiales ya asignadas a este empleado */}
                {Object.keys(serviceCommissions).length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-dark-950 rounded-xl border border-dark-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Comisiones activas de este profesional:
                    </span>
                    {Object.entries(serviceCommissions).map(([svcId, pct]) => {
                      const svc = (servicesList || []).find(s => s.id === svcId || s.name.toLowerCase() === svcId.toLowerCase())
                      const svcName = svc ? svc.name : svcId
                      return (
                        <div
                          key={svcId}
                          className="flex items-center justify-between p-2 rounded-lg bg-dark-900 border border-dark-750 text-xs hover:border-dark-650 transition-all"
                        >
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className="text-white font-bold truncate text-[11px]">{svcName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-black text-gold-400 text-xs bg-gold-500/15 px-2 py-0.5 rounded border border-gold-500/30">
                              {pct}%
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setServiceCommissions(prev => {
                                  const next = { ...prev }
                                  delete next[svcId]
                                  return next
                                })
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-dark-800 transition-colors"
                              title="Eliminar excepción"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic py-0.5">
                    Sin comisiones especiales aún (gana {commissionPct}% base en todos los servicios).
                  </p>
                )}

                {/* Asignador de comisiones especiales adaptado a móvil */}
                <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 block">
                    {Object.keys(serviceCommissions).length > 0 ? '+ Asignar otro servicio:' : 'Asignar servicio con porcentaje especial:'}
                  </span>
                  
                  {/* Fila 1: Selector de Servicio (ancho completo) */}
                  <select
                    value={selectedServiceToAdd}
                    onChange={(e) => {
                      const svcId = e.target.value
                      setSelectedServiceToAdd(svcId)
                      if (svcId && serviceCommissions[svcId] !== undefined) {
                        setCustomPctToAdd(String(serviceCommissions[svcId]))
                      } else if (svcId) {
                        const found = (servicesList || []).find(s => s.id === svcId)
                        setCustomPctToAdd(found?.commission_pct ? String(found.commission_pct) : String(commissionPct))
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="">Seleccionar servicio...</option>
                    {(servicesList || [])
                      .filter(s => !s.isProduct)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (${s.price_usd}) {serviceCommissions[s.id] !== undefined ? `[Asignado: ${serviceCommissions[s.id]}%]` : ''}
                        </option>
                      ))}
                  </select>

                  {/* Fila 2: Input de % y Botón Asignar */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">% com</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Ej. 30"
                        value={customPctToAdd}
                        onChange={(e) => setCustomPctToAdd(e.target.value)}
                        className="w-full pl-3 pr-12 py-2 rounded-xl bg-dark-900 border border-dark-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-gold-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedServiceToAdd) {
                          alert('Selecciona un servicio de la lista primero')
                          return
                        }
                        const pct = parseFloat(customPctToAdd)
                        if (isNaN(pct) || pct <= 0 || pct > 100) {
                          alert('Ingresa un porcentaje válido entre 1 y 100')
                          return
                        }
                        setServiceCommissions(prev => ({
                          ...prev,
                          [selectedServiceToAdd]: pct
                        }))
                        setSelectedServiceToAdd('')
                        setCustomPctToAdd('')
                      }}
                      className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-xs shrink-0 flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                    >
                      <span>+ Asignar</span>
                    </button>
                  </div>
                </div>
              </div>
              )}

              {/* Botones de Acción (Fijos al final del formulario) */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black text-xs font-black shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
                >
                  {editingStaff ? 'Guardar Cambios' : 'Agregar al Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
