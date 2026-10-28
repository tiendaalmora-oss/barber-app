import React from 'react'
import { Calendar, DollarSign, TrendingUp, ArrowDownRight, Users, PieChart, BarChart3 } from 'lucide-react'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function MonthlyReportView({ transactions = [], exchangeRate = 53 }) {
  const currentMonthIdx = new Date().getMonth()
  const currentMonthName = MONTH_NAMES[currentMonthIdx]

  // Group real transactions by month
  const monthlyMap = {}
  transactions.forEach(t => {
    if (!t.fecha) return
    const d = new Date(t.fecha)
    const mIdx = isNaN(d.getTime()) ? currentMonthIdx : d.getMonth()
    const mName = MONTH_NAMES[mIdx] || currentMonthName

    if (!monthlyMap[mName]) {
      monthlyMap[mName] = { facturacion: 0, gastos: 0, comisiones: 0, lucro: 0 }
    }

    if (t.monto_usd > 0) {
      monthlyMap[mName].facturacion += t.monto_usd
      monthlyMap[mName].comisiones += (t.comision_usd || 0)
    } else {
      monthlyMap[mName].gastos += Math.abs(t.monto_usd)
    }
  })

  // Ensure at least the current month is present in the table
  if (!monthlyMap[currentMonthName]) {
    monthlyMap[currentMonthName] = { facturacion: 0, gastos: 0, comisiones: 0, lucro: 0 }
  }

  // Calculate net profit for each month
  const monthlyHistory = Object.entries(monthlyMap).map(([mes, vals]) => {
    const lucro = vals.facturacion - vals.gastos - vals.comisiones
    return {
      mes: mes === currentMonthName ? `${mes} (Actual)` : mes,
      facturacion: vals.facturacion,
      gastos: vals.gastos,
      comisiones: vals.comisiones,
      lucro: Math.max(0, lucro)
    }
  })

  const totalYearRevenue = monthlyHistory.reduce((sum, m) => sum + m.facturacion, 0)
  const totalYearProfit = monthlyHistory.reduce((sum, m) => sum + m.lucro, 0)
  const totalYearExpenses = monthlyHistory.reduce((sum, m) => sum + m.gastos, 0)

  // Real Category Distribution from Transactions
  const categoryCounts = {}
  let totalCategoryVolume = 0
  transactions.filter(t => t.monto_usd > 0).forEach(t => {
    const cat = t.category || (t.item_name ? t.item_name.split(' ')[0] : 'Servicios')
    categoryCounts[cat] = (categoryCounts[cat] || 0) + t.monto_usd
    totalCategoryVolume += t.monto_usd
  })

  const palette = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4']
  const categoriesData = Object.entries(categoryCounts).map(([name, sum], idx) => {
    const pct = totalCategoryVolume > 0 ? Math.round((sum / totalCategoryVolume) * 100) : 0
    return {
      name,
      sum,
      pct,
      color: palette[idx % palette.length]
    }
  })

  const hasSales = totalYearRevenue > 0

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Reporte Mensual y del Año
            <span className="text-xs px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-400 border border-gold-500/20 font-medium">
              Datos Reales
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico mes a mes de todo lo que entra, los gastos y la ganancia limpia
          </p>
        </div>

        {/* Year Total Box */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-right self-start sm:self-auto">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
            Ganancia Limpia Acumulada:
          </span>
          <span className="text-lg font-black text-emerald-400">
            ${totalYearProfit.toFixed(2)} <span className="text-xs text-slate-400">USD</span>
          </span>
          <span className="text-xs text-gold-400 font-mono ml-2">
            (Bs. {(totalYearProfit * exchangeRate).toFixed(2)})
          </span>
        </div>
      </div>

      {/* Two Column Layout: Monthly Table + Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Table of Months (Col 1 & 2) */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="font-bold text-white text-base mb-1">Cuentas Mes a Mes (Año en Curso)</h3>
            <p className="text-xs text-slate-400">Detalle de facturación, gastos y lo que te queda en el bolsillo</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dark-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-3">Mes</th>
                  <th className="pb-3 text-right">Plata que Entró</th>
                  <th className="pb-3 text-right">Gastos Local</th>
                  <th className="pb-3 text-right">Comisiones</th>
                  <th className="pb-3 text-right text-emerald-400">Ganancia Limpia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 font-mono">
                {monthlyHistory.map((row, idx) => (
                  <tr key={idx} className="hover:bg-dark-850/50 transition-colors">
                    <td className="py-3 font-sans font-bold text-slate-200">{row.mes}</td>
                    <td className="py-3 text-right text-white font-semibold">${row.facturacion.toFixed(2)}</td>
                    <td className="py-3 text-right text-red-400">-${row.gastos.toFixed(2)}</td>
                    <td className="py-3 text-right text-amber-400">${row.comisiones.toFixed(2)}</td>
                    <td className="py-3 text-right text-emerald-400 font-bold font-sans">
                      ${row.lucro.toFixed(2)} USD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!hasSales && (
            <div className="p-3.5 rounded-xl bg-dark-850 border border-dark-750 text-center text-xs text-slate-400">
              💡 Tu historial mensual se irá consolidando automáticamente a medida que anotes ventas y cierres de caja.
            </div>
          )}
        </div>

        {/* Donut Chart / Categorías (Col 3) */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="w-4 h-4 text-gold-400" />
              <h3 className="font-bold text-white text-base">¿De Dónde Entra la Plata?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Distribución de ingresos por servicio/producto</p>

            {categoriesData.length === 0 ? (
              <div className="py-12 text-center space-y-2 bg-dark-850/50 rounded-2xl p-4 border border-dark-800">
                <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs font-bold text-slate-400 block">
                  Sin ventas registradas este mes ($0.00)
                </span>
                <p className="text-[11px] text-slate-500">
                  Cuando anotes cobros de cortes, barbas o pomadas, aquí verás qué servicio te da más dinero.
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

          <div className="mt-5 p-3 rounded-xl bg-dark-850 border border-dark-750 text-xs">
            <span className="text-gold-400 font-bold block mb-0.5">Rentabilidad Real:</span>
            <span className="text-slate-400">
              {hasSales
                ? `Has generado $${totalYearRevenue.toFixed(2)} en total. Tus números reflejan únicamente las transacciones reales anotadas.`
                : 'Tus gráficos están limpios en $0.00 listos para iniciar tus operaciones reales.'}
            </span>
          </div>
        </div>

      </div>

    </div>
  )
}
