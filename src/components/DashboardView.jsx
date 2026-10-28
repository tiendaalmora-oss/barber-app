import React, { useState } from 'react'
import { TrendingUp, DollarSign, Users, Award, ArrowUpRight, ArrowDownRight, Wallet, Clock, Plus, Minus, MessageSquare, Send } from 'lucide-react'

export default function DashboardView({ 
  transactions, 
  exchangeRate, 
  onOpenCashModal,
  onOpenExpenseModal,
  onOpenWhatsAppModal,
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

  // Simulated 7-day revenue trend data for the chart
  const weeklyData = [
    { day: 'Lun', revenue: 45, profit: 24 },
    { day: 'Mar', revenue: 60, profit: 32 },
    { day: 'Mié', revenue: 55, profit: 30 },
    { day: 'Jue', revenue: 75, profit: 42 },
    { day: 'Vie', revenue: 110, profit: 60 },
    { day: 'Sáb', revenue: 140, profit: 78 },
    { day: 'Hoy', revenue: totalIncomeUSD, profit: Math.max(0, totalBusinessNetUSD) },
  ]
  const maxWeeklyRevenue = Math.max(...weeklyData.map(d => d.revenue), 1)

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
            onClick={onOpenWhatsAppModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-bold transition-all shadow-sm"
            title="Generar y enviar resumen del día por WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Cierre WhatsApp</span>
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
                <p className="text-xs text-slate-400">Compara lo que entra contra lo que te queda limpio</p>
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

            {/* Pure CSS Bar Chart */}
            <div className="h-44 flex items-end gap-3 sm:gap-6 pt-4 px-2 border-b border-dark-800">
              {weeklyData.map((d, i) => {
                const heightPct = Math.min(Math.round((d.revenue / maxWeeklyRevenue) * 100), 100)
                const profitPct = Math.min(Math.round((d.profit / maxWeeklyRevenue) * 100), 100)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full max-w-[28px] flex items-end justify-center gap-1 h-full">
                      {/* Revenue Bar */}
                      <div 
                        style={{ height: `${heightPct}%` }}
                        className="w-1/2 bg-gradient-to-t from-gold-600 to-gold-400 rounded-t-md group-hover:brightness-125 transition-all"
                        title={`Entradas: $${d.revenue}`}
                      ></div>
                      {/* Profit Bar */}
                      <div 
                        style={{ height: `${profitPct}%` }}
                        className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md group-hover:brightness-125 transition-all"
                        title={`Ganancia Limpia: $${d.profit}`}
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
            <span>Día más movido: Sábado ($140.00)</span>
            <span className="text-emerald-400 font-medium">{totalServicesCount} atenciones hoy</span>
          </div>
        </div>

        {/* Payments breakdown */}
        <div className="bg-dark-900 border border-dark-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base mb-1">¿Cómo Pagó la Gente?</h3>
            <p className="text-xs text-slate-400 mb-4">Efectivo vs. Pago Móvil y Digital</p>

            <div className="space-y-3">
              {[
                { label: 'Pago Móvil (Bs)', pct: 60, color: 'bg-blue-500' },
                { label: 'Efectivo $ (Gaveta)', pct: 25, color: 'bg-emerald-500' },
                { label: 'Zelle / Binance', pct: 10, color: 'bg-purple-500' },
                { label: 'Fiados (Por Cobrar)', pct: 5, color: 'bg-amber-500' },
              ].map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{m.label}</span>
                    <span className="text-white font-mono">{m.pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-dark-850 border border-dark-750 text-xs">
            <span className="text-gold-400 font-bold block mb-0.5">💡 Consejo Criollo:</span>
            <span className="text-slate-400">
              El 60% de tus cobros entra por Pago Móvil. Trata de cambiar a dólares o pagar proveedores antes del viernes para protegerte de la devaluación.
            </span>
          </div>
        </div>

      </div>

      {/* WhatsApp Quick Closing Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-dark-900 to-dark-900 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              ¿Terminaste la jornada de hoy?
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25">
                Cierre Automático
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Genera en 1 clic el reporte completo con comisiones, gastos y ganancia neta listo para enviar a WhatsApp.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenWhatsAppModal}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-md shadow-emerald-500/20 transition-all shrink-0 active:scale-95"
        >
          <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Enviar Cierre a WhatsApp</span>
        </button>
      </div>

      {/* Recent Movements Feed (Ingresos en Verde, Gastos en Rojo) */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Movimientos de Caja de Hoy</h3>
            <p className="text-xs text-slate-400">Historial en tiempo real de entradas y salidas</p>
          </div>
          <div className="flex gap-2">
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
          {transactions.map((tx) => {
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
                      <span>•</span>
                      <span className="font-mono text-[11px]">{tx.hora}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
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
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
