import React, { useState } from 'react'
import { Users, CheckCircle2, DollarSign, Plus, Pencil, Trash2, X, Award } from 'lucide-react'

const AVATAR_OPTIONS = ['✂️', '💈', '⚡', '👑', '🔥', '💅', '✨', '🧔']

export default function CommissionsView({
  staffList,
  rolePlural,
  roleName,
  transactions,
  exchangeRate,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff
}) {
  const [paidStatus, setPaidStatus] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)

  // Form state
  const [name, setName] = useState('')
  const [commissionPct, setCommissionPct] = useState(50)
  const [avatar, setAvatar] = useState('✂️')

  const openCreateModal = () => {
    setEditingStaff(null)
    setName('')
    setCommissionPct(50)
    setAvatar('✂️')
    setIsModalOpen(true)
  }

  const openEditModal = (st) => {
    setEditingStaff(st)
    setName(st.name)
    setCommissionPct(st.commission_pct)
    setAvatar(st.avatar || '✂️')
    setIsModalOpen(true)
  }

  const handleSaveStaff = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    if (editingStaff) {
      onUpdateStaff({
        ...editingStaff,
        name: name.trim(),
        commission_pct: parseFloat(commissionPct) || 50,
        avatar
      })
    } else {
      onAddStaff({
        id: 'st_' + Date.now(),
        name: name.trim(),
        commission_pct: parseFloat(commissionPct) || 50,
        avatar
      })
    }
    setIsModalOpen(false)
  }

  const staffStats = staffList.map((st) => {
    const staffTx = transactions.filter((t) => t.staff_id === st.id && t.monto_usd > 0)
    const totalEarnedUSD = staffTx.reduce((sum, t) => sum + (t.comision_usd || 0), 0)
    const totalBilledUSD = staffTx.reduce((sum, t) => sum + (t.monto_usd || 0), 0)
    const servicesCount = staffTx.length

    return {
      ...st,
      servicesCount,
      totalBilledUSD,
      totalEarnedUSD,
      totalEarnedBs: totalEarnedUSD * exchangeRate,
      isPaid: paidStatus[st.id] || false
    }
  })

  const handlePayCommission = (staffId, staffName, amount) => {
    if (confirm(`¿Confirmas que le entregaste a ${staffName} su comisión de $${amount.toFixed(2)} USD?`)) {
      setPaidStatus(prev => ({ ...prev, [staffId]: true }))
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Equipo y Comisiones
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              {rolePlural} ({staffList.length})
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Agrega a tu equipo, asigna el % de comisión de cada quien y controla cuánto les toca cobrar hoy
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Agregar {roleName}</span>
        </button>
      </div>

      {/* Empty state if cleaned */}
      {staffStats.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/20 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">Tu equipo está vacío</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Agrega a tus barberos o especialistas y ponles su porcentaje de comisión (ej. 50%, 60%) para que el sistema divida la plata automáticamente.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-black"
          >
            + Agregar mi primer {roleName}
          </button>
        </div>
      ) : (
        /* Staff Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {staffStats.map((st) => (
            <div 
              key={st.id} 
              className={`bg-dark-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                st.isPaid 
                  ? 'border-emerald-500/40 bg-emerald-950/10 shadow-lg' 
                  : 'border-dark-800 hover:border-dark-700 shadow-md'
              }`}
            >
              <div>
                {/* Profile Bar + Edit/Delete Actions */}
                <div className="flex items-start justify-between pb-3 border-b border-dark-800 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {st.avatar}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base leading-snug truncate">{st.name}</h3>
                      <button
                        type="button"
                        onClick={() => openEditModal(st)}
                        className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-xs text-gold-400 font-bold transition-all"
                        title="Cambiar % de comisión"
                      >
                        <span>Comisión: {st.commission_pct}%</span>
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(st)}
                      className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-750"
                      title="Editar nombre o % de comisión"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Seguro que deseas eliminar a ${st.name} del equipo?`)) {
                          onDeleteStaff(st.id)
                        }
                      }}
                      className="p-1.5 rounded-lg bg-dark-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-dark-750"
                      title="Eliminar del equipo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-dark-850 border border-dark-750">
                    <span className="text-slate-400 block text-[10px] uppercase">Atenciones Hoy</span>
                    <span className="text-base font-black text-white">{st.servicesCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-dark-850 border border-dark-750">
                    <span className="text-slate-400 block text-[10px] uppercase">Generó en Caja</span>
                    <span className="text-base font-black text-slate-200">${st.totalBilledUSD.toFixed(2)}</span>
                  </div>
                </div>

                {/* Commission to Pay */}
                <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-dark-850 to-dark-800 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                      Su Comisión ({st.commission_pct}%):
                    </span>
                    {st.isPaid && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                        ✓ Pagado
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white mt-0.5">
                    ${st.totalEarnedUSD.toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
                  </div>
                  <div className="text-xs text-gold-400 font-mono mt-0.5">
                    Bs. {st.totalEarnedBs.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={() => handlePayCommission(st.id, st.name, st.totalEarnedUSD)}
                disabled={st.isPaid || st.totalEarnedUSD === 0}
                className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${
                  st.isPaid
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                    : st.totalEarnedUSD === 0
                    ? 'bg-dark-800 text-slate-600 border border-dark-700 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:scale-95'
                }`}
              >
                {st.isPaid ? 'Comisión Entregada' : 'Entregar Plata / Pagar Comisión'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Agregar / Editar Barbero y su Comisión */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base">
                  {editingStaff ? `Editar ${roleName}` : `Nuevo ${roleName} en el Equipo`}
                </h3>
                <p className="text-xs text-slate-400">
                  Configura su nombre y cuánto % gana por cada servicio
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre o Apodo del {roleName}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos El Fino"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gold-400 mb-1.5">
                  Porcentaje de Comisión para el {roleName} (%)
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
                    (El local gana {Math.max(0, 100 - (Number(commissionPct) || 0))}%)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Elige su Ícono
                </label>
                <div className="flex items-center justify-between gap-1 bg-dark-850 p-2 rounded-xl border border-dark-750">
                  {AVATAR_OPTIONS.map(ic => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setAvatar(ic)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                        avatar === ic ? 'bg-gold-500/25 border border-gold-500 scale-110' : 'hover:bg-dark-800'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
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
