import React, { useState } from 'react'
import { Package, AlertTriangle, Plus, Minus, Pencil, Trash2, X, Globe, EyeOff, Image, Upload } from 'lucide-react'
import { PRODUCT_IMAGE_PRESETS } from '../lib/mockData'

export default function InventoryView({
  products,
  exchangeRate,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProd, setEditingProd] = useState(null)

  // Form state
  const [name, setName] = useState('')
  const [costUsd, setCostUsd] = useState('3')
  const [priceUsd, setPriceUsd] = useState('7')
  const [stock, setStock] = useState('10')
  const [minStock, setMinStock] = useState('4')
  const [category, setCategory] = useState('Productos')
  const [showInCatalog, setShowInCatalog] = useState(true)
  const [imageUrl, setImageUrl] = useState('')

  const openCreateModal = () => {
    setEditingProd(null)
    setName('')
    setCostUsd('3')
    setPriceUsd('7')
    setStock('10')
    setMinStock('4')
    setCategory('Productos')
    setShowInCatalog(true)
    setImageUrl('')
    setIsModalOpen(true)
  }

  const openEditModal = (prod) => {
    setEditingProd(prod)
    setName(prod.name)
    setCostUsd(String(prod.cost_usd || 0))
    setPriceUsd(String(prod.price_usd || 0))
    setStock(String(prod.stock || 0))
    setMinStock(String(prod.min_stock || 3))
    setCategory(prod.category || 'Productos')
    setShowInCatalog(prod.showInCatalog !== false)
    setImageUrl(prod.imageUrl || '')
    setIsModalOpen(true)
  }

  const handleToggleCatalogVisibility = (prod) => {
    const nextVal = prod.showInCatalog === false ? true : false
    onUpdateProduct({
      ...prod,
      showInCatalog: nextVal
    })
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 180
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        setImageUrl(compressed)
      }
      img.src = event.target?.result
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProduct = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      id: editingProd ? editingProd.id : 'prod_' + Date.now(),
      name: name.trim(),
      cost_usd: parseFloat(costUsd) || 0,
      price_usd: parseFloat(priceUsd) || 0,
      stock: parseInt(stock) || 0,
      min_stock: parseInt(minStock) || 3,
      category,
      showInCatalog,
      imageUrl: (imageUrl || '').trim()
    }

    if (editingProd) {
      onUpdateProduct(payload)
    } else {
      onAddProduct(payload)
    }
    setIsModalOpen(false)
  }

  const updateStock = (prod, delta) => {
    const newStock = Math.max(0, (prod.stock || 0) + delta)
    onUpdateProduct({ ...prod, stock: newStock })
  }

  const totalInventoryCostUSD = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost_usd || 0)), 0)
  const totalPotentialSaleUSD = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price_usd || 0)), 0)
  const totalPotentialProfitUSD = totalPotentialSaleUSD - totalInventoryCostUSD

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Mercancía, Pomadas & Insumos
            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              Inventario ({products.length})
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Agrega tus productos, controla el stock y véndelos directo desde Anotar Cobro o tu Catálogo Web
          </p>
        </div>

        {/* Inventory Valuation + Add Button */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="p-2.5 bg-dark-850 border border-dark-750 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">Invertido:</span>
            <span className="text-sm font-bold text-white">${totalInventoryCostUSD.toFixed(2)} USD</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="text-[10px] text-emerald-400 block uppercase">Ganancia Estimada:</span>
            <span className="text-sm font-bold text-emerald-400">+${totalPotentialProfitUSD.toFixed(2)} USD</span>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Agregar Producto</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mx-auto flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">No tienes productos cargados todavía</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Agrega tus pomadas, ceras, aceites de barba, bebidas o insumos para llevar el control de unidades y ganancias.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-black"
          >
            + Agregar mi primer producto
          </button>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {products.map((prod) => {
            const isLowStock = prod.stock <= (prod.min_stock || 3)
            const unitProfitUSD = (prod.price_usd || 0) - (prod.cost_usd || 0)
            const priceBs = ((prod.price_usd || 0) * exchangeRate).toFixed(2)

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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Product Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-dark-850 border border-dark-750 shrink-0 overflow-hidden flex items-center justify-center relative shadow-sm">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-white text-sm truncate" title={prod.name}>
                            {prod.name}
                          </h3>
                        </div>

                        {/* Toggle Web Catalog Badge */}
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleCatalogVisibility(prod)}
                            className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 font-bold transition-all ${
                              prod.showInCatalog !== false
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-dark-850 text-slate-400 border-dark-750 hover:text-slate-300'
                            }`}
                            title="Toca para mostrar u ocultar en tu Catálogo Web"
                          >
                            {prod.showInCatalog !== false ? (
                              <>
                                <Globe className="w-3 h-3 text-emerald-400" />
                                <span>En Catálogo Web</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 text-slate-500" />
                                <span>Solo Local (Oculto)</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-slate-400">Costo: ${prod.cost_usd}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">Ganas: +${unitProfitUSD.toFixed(2)}/u</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isLowStock && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold whitespace-nowrap mr-1">
                          <AlertTriangle className="w-3 h-3" />
                          Poco Stock
                        </span>
                      )}
                      <button
                        onClick={() => openEditModal(prod)}
                        className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750"
                        title="Editar producto"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${prod.name}" del inventario?`)) {
                            onDeleteProduct(prod.id)
                          }
                        }}
                        className="p-1.5 rounded-lg bg-dark-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-750"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="flex items-baseline gap-2 mt-3 p-2.5 rounded-xl bg-dark-850 border border-dark-750">
                    <span className="text-xs text-slate-400 font-medium">Precio Venta:</span>
                    <span className="text-base font-black text-white">${(prod.price_usd || 0).toFixed(2)} USD</span>
                    <span className="text-xs text-gold-400 font-mono ml-auto font-bold">
                      Bs. {priceBs}
                    </span>
                  </div>
                </div>

                {/* Stock controls */}
                <div className="flex items-center justify-between pt-2 border-t border-dark-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Disponible en local:</span>
                    <span className={`text-base font-black ${isLowStock ? 'text-amber-400' : 'text-white'}`}>
                      {prod.stock} unidades
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateStock(prod, -1)}
                      className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 flex items-center justify-center font-bold active:scale-90 transition-all"
                      title="Restar 1 unidad"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateStock(prod, 1)}
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
      )}

      {/* Modal: Agregar o Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base">
                  {editingProd ? 'Editar Producto / Insumo' : 'Agregar Producto al Inventario'}
                </h3>
                <p className="text-xs text-slate-400">
                  También aparecerá en tu Catálogo Público y en Anotar Cobro
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre del Producto o Insumo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cera Mate Fijadora 150g"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Costo de Compra ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={costUsd}
                    onChange={(e) => setCostUsd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">
                    Precio de Venta ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-emerald-500/40 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Cantidad Actual (Stock)
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    Avisar cuando queden:
                  </label>
                  <input
                    type="number"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Switch de visibilidad en el catálogo web */}
              <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block">
                    Mostrar en Catálogo Web
                  </span>
                  <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                    {showInCatalog 
                      ? '✓ Visible para clientes en tu link de reservas' 
                      : '🔒 Solo local (oculto en tu link web, para cobrar en el local)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInCatalog(!showInCatalog)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                    showInCatalog ? 'bg-emerald-500' : 'bg-dark-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    showInCatalog ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Selector de Foto del Producto */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-gold-400" />
                    <span>Foto del Producto (Elegante y Ligera)</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>

                {/* Presets Rápidos */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2">
                  {PRODUCT_IMAGE_PRESETS.map(preset => (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => setImageUrl(preset.url)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 transition-all ${
                        imageUrl === preset.url
                          ? 'bg-gold-500 text-black border-gold-400 shadow-sm'
                          : 'bg-dark-850 text-slate-400 border-dark-750 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Upload or Preview */}
                <div className="flex items-center gap-2.5">
                  {imageUrl ? (
                    <div className="w-12 h-12 rounded-xl bg-dark-850 border border-gold-500/40 overflow-hidden shrink-0">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-dark-850 border border-dashed border-dark-700 hover:border-gold-500/50 text-slate-400 hover:text-white text-xs flex items-center justify-center gap-2 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{imageUrl ? 'Cambiar por foto de mi teléfono' : 'Subir foto propia (Auto-comprimida)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-dark-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-black shadow-lg shadow-gold-500/20"
                >
                  {editingProd ? 'Guardar Cambios' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
