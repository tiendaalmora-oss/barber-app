import React, { useState } from 'react'
import { Package, AlertTriangle, Plus, Minus, DollarSign, TrendingUp } from 'lucide-react'

export default function InventoryView({ products, exchangeRate }) {
  const [items, setItems] = useState(products)

  const updateStock = (id, delta) => {
    setItems(prev => prev.map(p => {
      if (p.id === id) {
        const newStock = Math.max(0, p.stock + delta)
        return { ...p, stock: newStock }
      }
      return p
    }))
  }

  const totalInventoryCostUSD = items.reduce((sum, p) => sum + (p.stock * p.cost_usd), 0)
  const totalPotentialSaleUSD = items.reduce((sum, p) => sum + (p.stock * p.price_usd), 0)
  const totalPotentialProfitUSD = totalPotentialSaleUSD - totalInventoryCostUSD

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Mercancía, Pomadas & Insumos
            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              Inventario
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Lleva la cuenta de lo que tienes para vender y lo que gastas en el negocio
          </p>
        </div>

        {/* Inventory Valuation */}
        <div className="flex items-center gap-2 text-xs">
          <div className="p-3 bg-dark-850 border border-dark-750 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">Plata Invertida:</span>
            <span className="text-sm font-bold text-white">${totalInventoryCostUSD.toFixed(2)} USD</span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="text-[10px] text-emerald-400 block uppercase">Ganancia al Vender:</span>
            <span className="text-sm font-bold text-emerald-400">+${totalPotentialProfitUSD.toFixed(2)} USD</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {items.map((prod) => {
          const isLowStock = prod.stock <= prod.min_stock
          const unitProfitUSD = prod.price_usd - prod.cost_usd
          const priceBs = (prod.price_usd * exchangeRate).toFixed(2)

          return (
            <div 
              key={prod.id}
              className={`bg-dark-900 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                isLowStock 
                  ? 'border-amber-500/40 bg-amber-950/10 shadow-lg' 
                  : 'border-dark-800 hover:border-dark-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{prod.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-slate-400">Costo: ${prod.cost_usd}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">Te ganas: +${unitProfitUSD.toFixed(2)}/u</span>
                    </div>
                  </div>

                  {isLowStock && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold whitespace-nowrap">
                      <AlertTriangle className="w-3 h-3" />
                      ¡Se está acabando!
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 mt-3 p-2.5 rounded-xl bg-dark-850 border border-dark-750">
                  <span className="text-xs text-slate-400 font-medium">Precio al Cliente:</span>
                  <span className="text-base font-black text-white">${prod.price_usd.toFixed(2)} USD</span>
                  <span className="text-xs text-gold-400 font-mono ml-auto font-bold">
                    Bs. {priceBs}
                  </span>
                </div>
              </div>

              {/* Stock controls */}
              <div className="flex items-center justify-between pt-2 border-t border-dark-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Quedan en el local:</span>
                  <span className={`text-base font-black ${isLowStock ? 'text-amber-400' : 'text-white'}`}>
                    {prod.stock} unidades
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateStock(prod.id, -1)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 flex items-center justify-center font-bold active:scale-90 transition-all"
                    title="Restar 1 unidad"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateStock(prod.id, 1)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-750 text-gold-400 border border-dark-700 flex items-center justify-center font-bold active:scale-90 transition-all"
                    title="Sumar 1 unidad"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}
