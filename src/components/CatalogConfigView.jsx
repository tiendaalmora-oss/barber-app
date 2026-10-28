import React, { useState } from 'react'
import { Globe, Copy, Check, ExternalLink, Share2, Store, MapPin, Phone, Clock, Sparkles, Plus, Trash2, CreditCard, Instagram } from 'lucide-react'

export default function CatalogConfigView({
  businessProfile,
  onSaveProfile,
  nicheData,
  customServices,
  onAddCustomService,
  onRemoveCustomService,
  exchangeRate,
  onOpenPublicPreview
}) {
  const [form, setForm] = useState(businessProfile)
  const [copied, setCopied] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  // New custom service state
  const [newSvcName, setNewSvcName] = useState('')
  const [newSvcPrice, setNewSvcPrice] = useState('')
  const [newSvcCategory, setNewSvcCategory] = useState('Promos / Combos')

  // Public URL construction
  const publicUrl = `${window.location.origin}/?reserva=1`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShareWhatsApp = () => {
    const text = `✂️💈 ¡Hola! Aquí te dejo el catálogo de precios y horarios de *${form.businessName}*.\n\nEntra en este link para ver nuestros servicios y apartar tu turno sin hacer cola:\n👉 ${publicUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleSave = (e) => {
    e.preventDefault()
    onSaveProfile(form)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
  }

  const togglePaymentMethod = (method) => {
    const exists = form.paymentMethods.includes(method)
    if (exists) {
      setForm({ ...form, paymentMethods: form.paymentMethods.filter(m => m !== method) })
    } else {
      setForm({ ...form, paymentMethods: [...form.paymentMethods, method] })
    }
  }

  const handleCreateService = (e) => {
    e.preventDefault()
    if (!newSvcName.trim() || !newSvcPrice) return
    onAddCustomService({
      id: 'cust_' + Date.now(),
      name: newSvcName.trim(),
      price_usd: parseFloat(newSvcPrice) || 5,
      category: newSvcCategory,
      isCustom: true
    })
    setNewSvcName('')
    setNewSvcPrice('')
  }

  const allServices = [...(customServices || []), ...nicheData.services]

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner: Tu Link Público */}
      <div className="bg-gradient-to-br from-dark-900 via-dark-900 to-gold-500/10 border border-gold-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30 text-[10px] font-black uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              <span>Tu Propia Página Web & Agenda Online</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Mi Catálogo y Link de Turnos
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Pon este link en tu biografía de Instagram o mándaselo por WhatsApp a tus clientes. Ellos verán tu presentación, precios en <span className="text-gold-400 font-bold">$ y Bs.</span> y podrán apartar su turno directo en tu calendario.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenPublicPreview}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
            >
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              <span>Ver Cómo lo Ven mis Clientes</span>
            </button>
          </div>
        </div>

        {/* Shareable URL Bar */}
        <div className="mt-4 pt-4 border-t border-dark-700/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2 bg-dark-950 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-400 overflow-x-auto">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{publicUrl}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-dark-800 hover:bg-dark-750 text-white border-dark-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gold-400" />}
              <span>{copied ? '¡Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Datos de Presentación | Right = Catálogo de Servicios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Configuración de la Landing */}
        <div className="lg:col-span-7 bg-dark-900 border border-dark-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Store className="w-4 h-4 text-gold-400" />
                <span>Presentación de tu Negocio</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Personaliza lo que verán tus clientes al abrir tu link
              </p>
            </div>
            {savedToast && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-fadeIn">
                ✓ Cambios Guardados
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de tu Barbería / Salón
                </label>
                <input
                  type="text"
                  required
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Ej. Barbería El Fino"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp para Recibir Citas</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="Ej. +584121234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mensaje de Bienvenida / Eslogan
              </label>
              <textarea
                rows={2}
                value={form.slogan}
                onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                placeholder="Describe el estilo de tu local..."
                className="w-full px-3.5 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gold-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aviso de Promo Destacada (Opcional)</span>
              </label>
              <input
                type="text"
                value={form.promoBanner}
                onChange={(e) => setForm({ ...form, promoBanner: e.target.value })}
                placeholder="Ej. 🔥 Promo de la Semana: Corte + Barba por $10"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-gold-500/30 text-xs text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>Dirección / Punto de Referencia</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ej. Av. Principal, al lado del banco..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Horario de Trabajo</span>
                </label>
                <input
                  type="text"
                  value={form.schedule}
                  onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  placeholder="Ej. Lun a Sáb: 9:00 AM a 7:00 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  <span>Usuario de Instagram / TikTok</span>
                </label>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="Ej. @barberiaelfino"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>Métodos de Pago Aceptados</span>
                </label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {['Pago Móvil BCV', 'Efectivo ($)', 'Zelle', 'Punto de Venta'].map(method => {
                    const active = form.paymentMethods.includes(method)
                    return (
                      <button
                        type="button"
                        key={method}
                        onClick={() => togglePaymentMethod(method)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-dark-850 text-slate-500 border-dark-750'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{method}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-xs shadow-lg shadow-gold-500/20 transition-all"
              >
                Guardar Datos de Mi Página
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Catálogo de Servicios & Agregar Servicio */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
            <h3 className="font-bold text-white text-base mb-1">
              Catálogo de Servicios y Precios
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Tus clientes ven los precios en Dólares y calculados en Bolívares a tu tasa BCV (<span className="text-gold-400 font-bold">Bs. {exchangeRate.toFixed(2)}</span>).
            </p>

            {/* Quick Form to add a new Service / Promo */}
            <form onSubmit={handleCreateService} className="bg-dark-850 border border-dark-750 rounded-xl p-3 mb-4 space-y-2.5">
              <div className="text-[11px] font-bold text-gold-400 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Servicio o Promo al Catálogo</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Ej. Corte + Mascarilla Negra"
                  value={newSvcName}
                  onChange={(e) => setNewSvcName(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-lg bg-dark-900 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="Precio $"
                  value={newSvcPrice}
                  onChange={(e) => setNewSvcPrice(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-dark-900 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-gold-500/30 text-gold-400 text-xs font-bold transition-all"
              >
                + Publicar en mi Catálogo
              </button>
            </form>

            {/* Active Catalog List */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {allServices.map(svc => (
                <div
                  key={svc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-dark-850 border border-dark-750 hover:border-dark-700 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs truncate">{svc.name}</span>
                      {svc.isCustom && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-500/15 text-gold-400 font-bold">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Bs. {(svc.price_usd * exchangeRate).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-xs">
                      ${svc.price_usd}
                    </span>
                    {svc.isCustom && (
                      <button
                        onClick={() => onRemoveCustomService(svc.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        title="Quitar servicio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
