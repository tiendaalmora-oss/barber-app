import React, { useState, useEffect } from 'react'
import { X, Lock, ShieldCheck, UserCheck, KeyRound, AlertTriangle, Unlock } from 'lucide-react'
import { getCashierStaff } from '../lib/securityUtils'

export default function RolePinModal({
  isOpen,
  onClose,
  securityConfig,
  staffList = [],
  isCashierMode = false,
  activeOperator = null,
  onSwitchToOwner,
  onSwitchToCashier,
  onLogPinFailed
}) {
  const [targetMode, setTargetMode] = useState(isCashierMode ? 'owner' : 'cashier') // 'owner' | 'cashier'
  const [selectedCashierId, setSelectedCashierId] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState('')

  const cashiers = getCashierStaff(staffList)

  useEffect(() => {
    if (isOpen) {
      setTargetMode(isCashierMode ? 'owner' : 'cashier')
      setPinInput('')
      setError('')
      setSelectedCashierId(activeOperator?.id || cashiers[0]?.id || 'generic_cashier')
    }
  }, [isOpen, isCashierMode])

  if (!isOpen) return null

  const ownerPin = String(securityConfig?.ownerPin || '1234').trim()
  const selectedCashierObj = cashiers.find(c => c.id === selectedCashierId) || null
  const requiresCashierPin = targetMode === 'cashier' && Boolean(selectedCashierObj?.pin && String(selectedCashierObj.pin).trim())

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (targetMode === 'owner') {
      if (pinInput.trim() === ownerPin) {
        onSwitchToOwner && onSwitchToOwner()
        onClose()
      } else {
        setError('PIN de Dueño incorrecto. Intento registrado en auditoría.')
        setPinInput('')
        if (onLogPinFailed) {
          onLogPinFailed('Intento fallido de ingresar a Modo Dueño (Admin)')
        }
      }
      return
    }

    if (requiresCashierPin) {
      if (pinInput.trim() !== String(selectedCashierObj.pin).trim()) {
        setError(`PIN incorrecto para ${selectedCashierObj.name}.`)
        setPinInput('')
        if (onLogPinFailed) {
          onLogPinFailed(`PIN incorrecto al iniciar turno de cajero (${selectedCashierObj.name})`)
        }
        return
      }
    }

    const operatorPayload = selectedCashierObj
      ? { id: selectedCashierObj.id, name: selectedCashierObj.name, staff_role: 'cajero' }
      : { id: 'generic_cashier', name: 'Cajero / Recepción', staff_role: 'cajero' }

    onSwitchToCashier && onSwitchToCashier(operatorPayload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              targetMode === 'owner'
                ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
            }`}>
              {targetMode === 'owner' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-white text-base">Control de Acceso</h3>
              <p className="text-[11px] text-slate-400">
                Estado actual: <strong className={isCashierMode ? 'text-sky-400' : 'text-gold-400'}>
                  {isCashierMode ? `🧾 ${activeOperator?.name || 'Modo Cajero'}` : '👑 Modo Dueño'}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 bg-dark-950 p-1.5 rounded-2xl border border-dark-800">
          <button
            type="button"
            onClick={() => {
              setTargetMode('owner')
              setPinInput('')
              setError('')
            }}
            className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              targetMode === 'owner'
                ? 'bg-gold-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>👑 Modo Dueño</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetMode('cashier')
              setPinInput('')
              setError('')
            }}
            className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              targetMode === 'cashier'
                ? 'bg-sky-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>🧾 Modo Cajero</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {targetMode === 'owner' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Ingresa el PIN de Dueño (Administrador):
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gold-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  autoFocus
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value)
                    setError('')
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-gold-500/40 text-center text-lg font-mono font-black tracking-[0.4em] text-white focus:outline-none focus:border-gold-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Desbloquea Reportes, Equipo, Precios, Configuración y Auditoría.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cashiers.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    ¿Qué Cajera / Recepcionista opera este turno?
                  </label>
                  <div className="space-y-1.5">
                    {cashiers.map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setSelectedCashierId(c.id)
                          setPinInput('')
                          setError('')
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          selectedCashierId === c.id
                            ? 'bg-sky-500/15 border-sky-500/60 text-white'
                            : 'bg-dark-850 border-dark-750 text-slate-300 hover:border-dark-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.avatar || '💼'}</span>
                          <div>
                            <div className="text-xs font-bold">{c.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {c.pin ? '🔒 Requiere PIN personal' : 'Acceso directo al turno'}
                            </div>
                          </div>
                        </div>
                        {Number(c.commission_pct) > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold">
                            +{c.commission_pct}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 leading-relaxed">
                  Entrarás en <strong>Modo Cajero Restringido</strong>: solo podrá cobrar a precios fijos, gestionar citas y hacer arqueo diario. Reportes, precios y nómina quedarán ocultos.
                </div>
              )}

              {requiresCashierPin && (
                <div>
                  <label className="block text-xs font-bold text-sky-300 mb-1">
                    PIN personal de {selectedCashierObj.name}:
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    autoFocus
                    placeholder="••••"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value)
                      setError('')
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-sky-500/40 text-center text-lg font-mono font-black tracking-[0.4em] text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all active:scale-95 ${
                targetMode === 'owner'
                  ? 'bg-gold-500 hover:bg-gold-400 text-black'
                  : 'bg-sky-500 hover:bg-sky-400 text-black'
              }`}
            >
              {targetMode === 'owner' ? 'Desbloquear Dueño' : 'Activar Modo Cajero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
