import React from 'react'
import { Calendar, DollarSign, TrendingUp, ArrowDownRight, Users, PieChart } from 'lucide-react'
import { MONTHLY_HISTORY } from '../lib/mockData'

export default function MonthlyReportView({ exchangeRate }) {
  // Category distribution
  const categoriesData = [
    { name: 'Cortes', pct: 55, color: '#f59e0b', stroke: 'stroke-amber-500' },
    { name: 'Combos Completos', pct: 20, color: '#10b981', stroke: 'stroke-emerald-500' },
    { name: 'Arreglo de Barba', pct: 15, color: '#3b82f6', stroke: 'stroke-blue-500' },
    { name: 'Pomadas y Productos', pct: 10, color: '#a855f7', stroke: 'stroke-purple-500' },
  ]

  const totalYearRevenue = MONTHLY_HISTORY.reduce((sum, m) => sum + m.facturacion, 0)
  const totalYearProfit = MONTHLY_HISTORY.reduce((sum, m) => sum + m.lucro, 0)
  const totalYearExpenses = MONTHLY_HISTORY.reduce((sum, m) => sum + m.gastos, 0)

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Reporte Mensual y del Año
            <span className="text-xs px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-400 border border-gold-500/20 font-medium">
              Cuentas Claras
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
            ${totalYearProfit.toLocaleString()} <span className="text-xs text-slate-400">USD</span>
          </span>
          <span className="text-xs text-gold-400 font-mono ml-2">
            (Bs. {(totalYearProfit * exchangeRate).toLocaleString()})
          </span>
        </div>
      </div>

      {/* Two Column Layout: Monthly Table + Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Table of Months (Col 1 & 2) */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-xl">
          <h3 className="font-bold text-white text-base mb-1">Cuentas Mes a Mes (Año en Curso)</h3>
          <p className="text-xs text-slate-400 mb-4">Detalle de facturación, gastos y lo que te queda en el bolsillo</p>

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
                {MONTHLY_HISTORY.map((row, idx) => (
                  <tr key={idx} className="hover:bg-dark-850/50 transition-colors">
                    <td className="py-3 font-sans font-bold text-slate-200">{row.mes}</td>
                    <td className="py-3 text-right text-white font-semibold">${row.facturacion.toLocaleString()}</td>
                    <td className="py-3 text-right text-red-400">-${row.gastos.toLocaleString()}</td>
                    <td className="py-3 text-right text-amber-400">${row.comisiones.toLocaleString()}</td>
                    <td className="py-3 text-right text-emerald-400 font-bold font-sans">
                      ${row.lucro.toLocaleString()} USD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Donut Chart / Categorías (Col 3) */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="w-4 h-4 text-gold-400" />
              <h3 className="font-bold text-white text-base">¿De Dónde Entra la Plata?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Distribución de ingresos por categoría</p>

            {/* Circular SVG Donut */}
            <div className="flex items-center justify-center my-4 relative">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle cx="50" cy="50" r="38" className="stroke-dark-800" strokeWidth="14" fill="none" />
                
                {/* Segments: Cortes 55%, Combos 20%, Barba 15%, Productos 10% */}
                <circle 
                  cx="50" cy="50" r="38" 
                  stroke="#f59e0b" strokeWidth="14" fill="none"
                  strokeDasharray="131 238" strokeDashoffset="0"
                />
                <circle 
                  cx="50" cy="50" r="38" 
                  stroke="#10b981" strokeWidth="14" fill="none"
                  strokeDasharray="47 238" strokeDashoffset="-131"
                />
                <circle 
                  cx="50" cy="50" r="38" 
                  stroke="#3b82f6" strokeWidth="14" fill="none"
                  strokeDasharray="35 238" strokeDashoffset="-178"
                />
                <circle 
                  cx="50" cy="50" r="38" 
                  stroke="#a855f7" strokeWidth="14" fill="none"
                  strokeDasharray="25 238" strokeDashoffset="-213"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-slate-400">Mayor Ingreso</span>
                <span className="text-base font-black text-gold-400">Cortes (55%)</span>
              </div>
            </div>

            {/* Legend breakdown */}
            <div className="space-y-2 mt-2">
              {categoriesData.map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-300 font-medium">{cat.name}</span>
                  </div>
                  <span className="font-bold text-white font-mono">{cat.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-850 border border-dark-750 text-xs mt-4">
            <span className="text-gold-400 font-bold block mb-0.5">📌 Consejo Criollo:</span>
            <span className="text-slate-400">
              Las pomadas representan el 10% pero tienen un margen del 50%. Si le dices a cada cliente que se lleve una cera, subes tus ganancias sin cortar más pelo.
            </span>
          </div>

        </div>

      </div>

    </div>
  )
}
