import React, { useState } from 'react'
import { TrendingUp, DollarSign, Users, Award, ArrowUpRight, ArrowDownRight, Wallet, Clock, Plus, Minus, MessageSquare, Send, Trash2, RotateCcw, Sparkles, Lock } from 'lucide-react'

export default function DashboardView({ 
  transactions, 
  exchangeRate, 
  onOpenCashModal,
  onOpenExpenseModal,
  onOpenWhatsAppModal,
  onOpenDailyCloseModal,
  onDeleteTransaction,
  onClearAllData,
  onLoadDemoData,
  isDemoAccount,
  nicheData
}) {
  const [filterPeriod, setFilterPeriod] = useState('hoy')

  // Calculate totals
  const totalIncomeUSD = transactions
    .filter(t => t.monto_usd > 0)
    .reduce((sum, t) => sum + t.monto_usd, 0)
  
  const totalExpensesUSD = Math.abs(transactions
    .filter(t => t.monto_usd < 0)
    .reduce((sum, t) => sum + t.monto_usd, 0))

  const totalCommissionsUSD = transactions
    .filter(t => t.comision_usd > 0)
    .reduce((sum, t) => sum + t.comision_usd, 0)

  // Net profit = Income - Expenses - Commissions
  const totalBusinessNetUSD = totalIncomeUSD - totalExpensesUSD - totalCommissionsUSD
  const totalServicesCount = transactions.filter(t => t.monto_usd > 0).length

  // 1. DYNAMIC 7-day revenue trend based strictly on REAL transactions
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const today = new Date()

  const weeklyData = Array.from({ length: 7 }).map((_, idx) => {
    // 6 days ago ... today (idx = 6 is today)
    const d = new Date()
    d.setDate(today.getDate() - (6 - idx))
    const dateIso = d.toISOString().split('T')[0]
    const dayLabel = idx === 6 ? 'Hoy' : dayNames[d.getDay()]

    const dayTx = transactions.filter(t => {
      const txDate = t.fecha ? t.fecha.split('T')[0] : ''
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

  // 2. DYNAMIC real payment methods breakdown
  const paymentMethodsList = [
    { id: 'pago_movil', label: 'Pago Móvil (Bs)', color: 'bg-blue-500' },
    { id: 'efectivo', label: 'Efectivo $ (Gaveta)', color: 'bg-emerald-500' },
    { id: 'zelle', label: 'Zelle / Binance', color: 'bg-purple-500' },
    { id: 'punto', label: 'Punto de Venta', color: 'bg-teal-500' },
    { id: 'fiado', label: 'Fiados (Por Cobrar)', color: 'bg-amber-500' },
  ].map(m => {
    const sum = transactions
      .filter(t => t.monto_usd > 0 && (t.metodo_pago === m.id || (m.id === 'zelle' && t.metodo_pago === 'binance')))
      .reduce((acc, t) => acc + t.monto_usd, 0)
    const pct = totalIncomeUSD > 0 ? Math.round((sum / totalIncomeUSD) * 100) : 0
    return { ...m, sum, pct }
  })

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Top Welcome & Quick Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Resumen de Caja de Hoy
            <span className="text-xs px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-400 border border-gold-500/20 font-medium">
              En Vivo
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Plata que entra, comisiones de los muchachos, gastos del local y ganancia limpia
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onOpenDailyCloseModal || onOpenWhatsAppModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-black transition-all shadow-sm"
            title="Arqueo de gaveta en efectivo, comisiones y cierre diario"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Cuadre de Caja</span>
          </button>
          <button
            onClick={onOpenExpenseModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 text-xs font-bold transition-all"
          >
            <Minus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Anotar Gasto</span>
          </button>
          <button
            onClick={onOpenCashModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-bold shadow-md shadow-gold-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Anotar Cobro</span>
          </button>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Facturación Total */}
        <div className="bg-dark-900 border border-dark-800 hover:border-dark-700 p-4 rounded-2xl transition-all shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Plata que Entró</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ${totalIncomeUSD.toFixed(2)} <span className="text-xs font-medium text-slate-400">USD</span>
          </div>
          <div className="text-xs text-blue-400 font-mono mt-1 font-semibold">
            Bs. {(totalIncomeUSD * exchangeRate).toFixed(2)}
          </div>
        </div>

        {/* Card 2: Ganancia Limpia del Dueño */}
        <div className="bg-gradient-to-br from-dark-900 to-dark-850 border border-emerald-500/30 p-4 rounded-2xl transition-all shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Ganancia Limpia
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            ${totalBusinessNetUSD.toFixed(2)} <span className="text-xs font-medium text-emerald-500">USD</span>
          </div>
          <div className="text-xs text-slate-300 font-mono mt-1">
            Bs. {(totalBusinessNetUSD * exchangeRate).toFixed(2)} (En tu bolsillo)
          </div>
        </div>

        {/* Card 3: Comisiones para los muchachos */}
        <div className="bg-dark-900 border border-dark-800 hover:border-dark-700 p-4 rounded-2xl transition-all shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">A Pagar ({nicheData.rolePlural})</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            ${totalCommissionsUSD.toFixed(2)} <span className="text-xs font-medium text-slate-400">USD</span>
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Bs. {(totalCommissionsUSD * exchangeRate).toFixed(2)}
          </div>
        </div>

        {/* Card 4: Gastos del Local */}
        <div className="bg-dark-900 border border-dark-800 hover:border-dark-700 p-4 rounded-2xl transition-all shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Gastos del Local</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-400 tracking-tight">
            -${totalExpensesUSD.toFixed(2)} <span className="text-xs font-medium text-slate-400">USD</span>
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Bs. {(totalExpensesUSD * exchangeRate).toFixed(2)}
          </div>
        </div>

      </div>

      {/* Main Visual Section: 7-Day Performance Chart & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
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
                <div className="absolute inset-0 flex items-center justify-center text-center p-4 bg-dark-900/60 backdrop-blur-[1px] rounded-xl">
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
        <div className="bg-dark-900 border border-dark-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base mb-1">¿Cómo Pagó la Gente?</h3>
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

          <div className="mt-5 p-3 rounded-xl bg-dark-850 border border-dark-750 text-xs">
            <span className="text-gold-400 font-bold block mb-0.5">💡 Control de Caja Criollo:</span>
            <span className="text-slate-400">
              {totalIncomeUSD === 0
                ? 'Mantén tu caja al día anotando cada corte y gasto para tener tu arqueo perfecto al final del día.'
                : `Tienes $${totalIncomeUSD.toFixed(2)} facturados hoy. Recuerda hacer tu arqueo de gaveta antes de cerrar.`}
            </span>
          </div>
        </div>

      </div>

      {/* Daily Cash Closing & Audit Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-dark-900 to-dark-900 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
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
              Haz el arqueo de efectivo en gaveta, calcula lo que toca pagar a cada barbero y genera el acta de cierre.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenDailyCloseModal || onOpenWhatsAppModal}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-md shadow-emerald-500/20 transition-all shrink-0 active:scale-95"
        >
          <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Hacer Cuadre y Cierre de Caja</span>
        </button>
      </div>

      {/* Recent Movements Feed (Ingresos en Verde, Gastos en Rojo) */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-white text-base">Movimientos de Caja de Hoy ({transactions.length})</h3>
            <p className="text-xs text-slate-400">Historial en tiempo real de entradas y salidas (puedes borrar si te equivocas)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onClearAllData && transactions.length > 0 && (
              <button
                onClick={onClearAllData}
                className="text-xs px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-dark-700 font-bold flex items-center gap-1"
                title="Dejar toda la cuenta en cero lista para uso real"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar Datos de Prueba (Dejar en 0)</span>
              </button>
            )}
            {onLoadDemoData && (transactions.length === 0 || isDemoAccount) && (
              <button
                onClick={() => {
                  if (transactions.length > 0 && !confirm('¿Recargar todos los datos de demostración con el historial completo de 7 días y reportes mensuales para grabar videos?')) {
                    return
                  }
                  onLoadDemoData()
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1 transition-all"
                title="Carga el set completo de 35 ventas de toda la semana y meses anteriores para grabar videos con gráficas y reportes llenos"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{transactions.length === 0 ? 'Cargar Datos Demo (Para Videos)' : 'Recargar Historial Demo (Videos)'}</span>
              </button>
            )}
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
          {transactions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-white">La caja está en $0.00 (Lista para empezar)</p>
              <p className="text-xs text-slate-400">Usa el botón dorado "+ Anotar Cobro" arriba para registrar tu primera venta real.</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isExpense = tx.monto_usd < 0
              return (
                <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-dark-850/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${
                      isExpense 
                        ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                        : 'bg-dark-800 border-dark-700 text-gold-400'
                    }`}>
                      {isExpense ? '📉' : '✂️'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {tx.item_name}
                        {isExpense && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-red-500/15 text-red-400 font-semibold border border-red-500/25">
                            GASTO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{isExpense ? 'Salida de caja' : `Atendió: ${tx.staff_name}`}</span>
                        {tx.client_name && tx.client_name !== '-' && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300">Cliente: {tx.client_name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono text-[11px]">{tx.hora}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {/* Payment Method Badge */}
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
                      tx.metodo_pago === 'pago_movil' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      tx.metodo_pago === 'efectivo_usd' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      tx.metodo_pago === 'fiado' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}>
                      {tx.metodo_pago === 'pago_movil' ? 'PAGO MÓVIL' :
                       tx.metodo_pago === 'efectivo_usd' ? 'EFECTIVO $' :
                       tx.metodo_pago === 'fiado' ? 'FIADO' : tx.metodo_pago.toUpperCase()}
                    </span>

                    {/* Amount */}
                    <div className="text-right">
                      <div className={`text-sm font-black ${isExpense ? 'text-red-400' : 'text-white'}`}>
                        {isExpense ? `-$${Math.abs(tx.monto_usd).toFixed(2)}` : `+$${tx.monto_usd.toFixed(2)}`} USD
                      </div>
                      <div className="text-xs text-gold-400 font-mono">
                        Bs. {Math.abs(tx.monto_bs).toFixed(2)}
                      </div>
                    </div>

                    {/* Delete Transaction Button */}
                    {onDeleteTransaction && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Seguro que deseas borrar este movimiento (${tx.item_name}) de la caja?`)) {
                            onDeleteTransaction(tx.id)
                          }
                        }}
                        className="p-2 rounded-xl bg-dark-850 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-dark-750 transition-colors"
                        title="Eliminar movimiento por error"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}
