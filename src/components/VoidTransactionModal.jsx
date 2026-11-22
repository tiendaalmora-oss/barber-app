import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, ShieldAlert, KeyRound, Trash2 } from 'lucide-react'
import { isArgentina, formatCurrency } from '../lib/brandConfig'

const VOID_REASONS = [
  'Error de método de pago',
  'Monto o servicio equivocado',
  'Cobro duplicado',
  'Error de barbero asignado',
  'Cliente canceló / devolución'
]

export default function VoidTransactionModal({
  isOpen,
  transaction,
  onClose,
  onConfirmVoid,
  onLogPinFailed,
  isCashierMode = false,
  securityConfig = {},
  businessProfile = {}
}) {
  const [reason, setReason] = useState('')
  const [ownerPinInput, setOwnerPinInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setOwnerPinInput('')
      setError('')
    }
  }, [isOpen, transaction?.id])

  if (!isOpen || !transaction) return null

  const isAr = isArgentina(null, businessProfile)
  const fmt = (val) => formatCurrency(val, isAr)
  const currTag = isAr ? 'ARS' : 'USD'
  const isExpense = Number(transaction.monto_usd) < 0
  const needsOwnerPin = Boolean(
    isCashierMode &&
    securityConfig?.enabled &&
    (securityConfig?.allowCashierVoid || 'pin_required') === 'pin_required'
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const cleanReason = reason.trim()
    if (cleanReason.length < 3) {
      setError('Debes seleccionar o escribir un motivo claro para anular este movimiento.')
      return
    }

    if (needsOwnerPin) {
      const expectedPin = String(securityConfig?.ownerPin || '1234').trim()
      if (ownerPinInput.trim() !== expectedPin) {
        setError('PIN de Dueño incorrecto. El intento fallido quedó registrado en Auditoría.')
        setOwnerPinInput('')
        if (onLogPinFailed) {
          onLogPinFailed(`PIN incorrecto al intentar anular "${transaction.item_name}" ($${Math.abs(Number(transaction.monto_usd) || 0).toFixed(2)})`)
        }
        return
      }
    }

    onConfirmVoid(transaction, cleanReason, needsOwnerPin ? 'Autorizado con PIN de Dueño' : null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-900 border border-red-500/40 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/35 text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">
                Anular {isExpense ? 'Gasto / Vale' : 'Venta'} (Con Auditoría)
              </h3>
              <p className="text-[11px] text-slate-400">
                Quedará registro permanente en la Bitácora del Dueño
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

        {/* Transaction Snapshot */}
        <div className="p-3.5 rounded-2xl bg-dark-950 border border-dark-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-white truncate">{transaction.item_name}</span>
            <span className={`font-mono font-black shrink-0 ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
              {isExpense ? '-' : '+'}${fmt(Math.abs(Number(transaction.monto_usd) || 0))} {currTag}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{transaction.staff_name || 'Local'} {transaction.client_name && transaction.client_name !== '-' ? `• ${transaction.client_name}` : ''}</span>
            <span className="font-mono">{transaction.hora || ''}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Motivo obligatorio de la anulación:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VOID_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r)
                    setError('')
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    reason === r
                      ? 'bg-red-500/20 text-red-300 border-red-500/50'
                      : 'bg-dark-850 text-slate-400 border-dark-750 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="Escribe el motivo exacto..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-850 border border-dark-700 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Owner PIN Gate when Cashier attempts void under strict mode */}
          {needsOwnerPin && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/35 space-y-2">
              <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                <span>Autorización requerida: PIN del Dueño</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                required
                placeholder="Ingresa PIN de 4 dígitos"
                value={ownerPinInput}
                onChange={(e) => {
                  setOwnerPinInput(e.target.value)
                  setError('')
                }}
                className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-amber-500/40 text-center text-base font-mono font-black tracking-[0.35em] text-white focus:outline-none focus:border-amber-400"
              />
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
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirmar Anulación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
