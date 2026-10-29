import React, { useState, useRef } from 'react'
import { X, Store, Upload, Image, Phone, MapPin, Clock, Instagram, Sparkles, Check, Trash2, CreditCard, ShieldCheck } from 'lucide-react'

const LOGO_PRESETS = [
  { id: 'p1', label: '💈 Navaja Dorada', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&h=200&fit=crop&crop=faces&q=80' },
  { id: 'p2', label: '✂️ Tijeras Royal', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&h=200&fit=crop&crop=faces&q=80' },
  { id: 'p3', label: '👑 Corona VIP', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=200&h=200&fit=crop&crop=faces&q=80' },
  { id: 'p4', label: '💅 Salón Glamour', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop&crop=faces&q=80' },
  { id: 'p5', label: '🏬 Studio Urbano', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=200&h=200&fit=crop&crop=faces&q=80' }
]

export default function BusinessSettingsModal({
  isOpen,
  onClose,
  businessProfile,
  onSaveProfile
}) {
  const [form, setForm] = useState(businessProfile || {})
  const [activeTab, setActiveTab] = useState('perfil') // 'perfil' | 'logo' | 'pagos'
  const [savedToast, setSavedToast] = useState(false)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  // Handle local image upload with automatic Canvas downscaling (prevents LocalStorage QuotaExceededError)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 256
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        setForm(prev => ({ ...prev, logoUrl: compressedBase64 }))
      }
      img.src = event.target?.result
    }
    reader.readAsDataURL(file)
  }

  const handleSelectPreset = (url) => {
    setForm(prev => ({ ...prev, logoUrl: url }))
  }

  const handleRemoveLogo = () => {
    setForm(prev => ({ ...prev, logoUrl: '' }))
  }

  const togglePaymentMethod = (method) => {
    const current = form.paymentMethods || []
    if (current.includes(method)) {
      setForm({ ...form, paymentMethods: current.filter(m => m !== method) })
    } else {
      setForm({ ...form, paymentMethods: [...current, method] })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSaveProfile(form)
    setSavedToast(true)
    setTimeout(() => {
      setSavedToast(false)
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-xl rounded-3xl shadow-2xl p-5 sm:p-6 my-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">
                Configuración de tu Negocio
              </h3>
              <p className="text-xs text-slate-400">
                Logo, datos del local y lo que ven tus clientes en tu Link Web
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1.5 bg-dark-950 p-1.5 rounded-2xl border border-dark-800">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'perfil' ? 'bg-gold-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Datos del Local
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'logo' ? 'bg-gold-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Logo / Foto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pagos')}
            className={`py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'pagos' ? 'bg-gold-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pagos & Promos
          </button>
        </div>

        {savedToast && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>¡Datos y logo guardados con éxito! Se reflejan de inmediato en tu link público.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* TAB 1: DATOS DEL LOCAL */}
          {activeTab === 'perfil' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre de tu Barbería / Salón
                </label>
                <input
                  type="text"
                  required
                  value={form.businessName || ''}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Ej. Barbería Imperio VIP"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Eslogan / Descripción Breve
                </label>
                <input
                  type="text"
                  value={form.slogan || ''}
                  onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                  placeholder="Ej. Cortes degradé, barba con toalla caliente y atención de primera"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp de Atención (con código de país)</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.whatsapp || ''}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="+584121234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-400" />
                    <span>Instagram / Red Social</span>
                  </label>
                  <input
                    type="text"
                    value={form.instagram || ''}
                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    placeholder="@tubarberia"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gold-400" />
                    <span>Dirección del Local</span>
                  </label>
                  <input
                    type="text"
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Ej. Av. Principal, C.C. Nivel 1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Horario de Atención</span>
                  </label>
                  <input
                    type="text"
                    value={form.schedule || ''}
                    onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                    placeholder="Ej. Lun a Sáb: 9:00 AM a 7:00 PM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGO / FOTO DEL LOCAL */}
          {activeTab === 'logo' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview */}
                <div className="w-24 h-24 rounded-2xl bg-dark-900 border-2 border-dashed border-gold-500/40 flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {form.logoUrl ? (
                    <img
                      src={form.logoUrl}
                      alt="Logo de tu negocio"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-500">
                      <Image className="w-8 h-8 mx-auto mb-1 text-slate-600" />
                      <span className="text-[10px]">Sin Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Action */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="text-xs font-bold text-white block">
                    Sube el Logo o Foto de tu Fachada
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Este logo aparecerá en la parte superior de tu página web de reservas y en el ticket que reciben tus clientes por WhatsApp.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-black flex items-center gap-1.5 shadow-md"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir desde mi Teléfono / PC</span>
                    </button>

                    {form.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset Logos */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  O elige uno de estos logos listos:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {LOGO_PRESETS.map(preset => {
                    const isSelected = form.logoUrl === preset.url
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-md'
                            : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white hover:border-dark-700'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-12 h-12 rounded-xl object-cover border border-dark-700"
                        />
                        <span className="text-[10px] font-bold truncate max-w-[80px]">
                          {preset.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAGOS & PROMOS */}
          {activeTab === 'pagos' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gold-400 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Banner de Promoción Destacada (Aparece arriba en tu link)</span>
                </label>
                <input
                  type="text"
                  value={form.promoBanner || ''}
                  onChange={(e) => setForm({ ...form, promoBanner: e.target.value })}
                  placeholder="Ej. 🔥 Promo de la Semana: Combo Corte + Barba + Cejas por solo $10"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-gold-500/30 text-xs text-gold-300 focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>Métodos de Pago que Acepta tu Local:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Pago Móvil BCV',
                    'Efectivo ($)',
                    'Punto de Venta',
                    'Zelle',
                    'Binance Pay',
                    'Biopago'
                  ].map(method => {
                    const isChecked = (form.paymentMethods || []).includes(method)
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => togglePaymentMethod(method)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : 'bg-dark-850 border-dark-750 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{method}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-2 pt-3 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black text-xs font-black shadow-lg shadow-gold-500/20"
            >
              Guardar Configuración
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
