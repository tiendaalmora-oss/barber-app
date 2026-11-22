import React, { useState } from 'react'
import { ShieldCheck, Search, Lock, Clock } from 'lucide-react'
import { isDateToday } from '../lib/dateUtils'
import { isArgentina, formatCurrency } from '../lib/brandConfig'

const TYPE_META = {
  TX_VOIDED: { label: 'Venta / Mov. Anulado', badge: 'bg-red-500/15 text-red-400 border-red-500/35', icon: '🔴', group: 'void' },
  PRICE_CHANGED: { label: 'Cambio de Precio', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/35', icon: '🟠', group: 'price' },
  SERVICE_DELETED: { label: 'Servicio Eliminado', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/35', icon: '🟠', group: 'price' },
  PRODUCT_DELETED: { label: 'Producto Eliminado', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/35', icon: '🟠', group: 'price' },
  EXPENSE_CREATED: { label: 'Gasto Registrado', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/35', icon: '🟡', group: 'expense' },
  VALE_CREATED: { label: 'Vale Entregado', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/35', icon: '🟡', group: 'expense' },
  DAILY_CLOSE: { label: 'Cierre / Arqueo de Caja', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/35', icon: '🔵', group: 'close' },
  STAFF_LIQUIDATED: { label: 'Liquidación de Personal', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35', icon: '🟢', group: 'close' },
  PIN_FAILED: { label: 'PIN Fallido (Alerta)', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: '🟣', group: 'security' },
  ROLE_SWITCH: { label: 'Cambio de Modo', badge: 'bg-slate-700/40 text-slate-300 border-slate-600/40', icon: '🔐', group: 'security' }
}

export default function AuditLogView({
  auditLogs = [],
  businessProfile = {},
  onOpenSettingsModal
}) {
  const isAr = isArgentina(null, businessProfile)
  const fmt = (val) => formatCurrency(val, isAr)
  const currTag = isAr ? 'ARS' : 'USD'

  const [filterGroup, setFilterGroup] = useState('all')
  const [onlyToday, setOnlyToday] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const safeLogs = Array.isArray(auditLogs) ? auditLogs : []

  // Top KPIs
  const voidLogs = safeLogs.filter(l => l.type === 'TX_VOIDED')
  const todayVoids = voidLogs.filter(l => isDateToday(l.timestamp))
  const totalVoidedAmount = voidLogs.reduce((sum, l) => sum + Math.abs(Number(l.amountUsd) || 0), 0)
  const priceChanges = safeLogs.filter(l => ['PRICE_CHANGED', 'SERVICE_DELETED', 'PRODUCT_DELETED'].includes(l.type))
  const cashierExpenses = safeLogs.filter(l => ['EXPENSE_CREATED', 'VALE_CREATED'].includes(l.type) && l.actorRole === 'cajero')
  const securityAlerts = safeLogs.filter(l =>
    l.type === 'PIN_FAILED' ||
    (l.type === 'DAILY_CLOSE' && Math.abs(Number(l.details?.differenceUSD) || 0) >= 0.01)
  )

  const filteredLogs = safeLogs.filter(log => {
    if (onlyToday && !isDateToday(log.timestamp)) return false
    const meta = TYPE_META[log.type] || { group: 'other' }
    if (filterGroup !== 'all' && meta.group !== filterGroup) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const haystack = `${log.summary || ''} ${log.reason || ''} ${log.actorName || ''} ${JSON.stringify(log.details || {})}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-br from-dark-850 via-dark-900 to-dark-950 border border-dark-750/80 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/35 text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">Bitácora de Auditoría ("Caja Negra")</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black uppercase">
                  Solo Dueño • Inborrable
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Registro histórico sincronizado en vivo de anulaciones, cambios de precio, gastos de caja, arqueos e intentos de PIN.
              </p>
            </div>
          </div>

          {onOpenSettingsModal && (
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs font-bold text-gold-400 flex items-center gap-1.5 self-start sm:self-center shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Configurar PIN y Roles</span>
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/30">
            <span className="text-[10px] font-black uppercase text-red-400 block">🔴 Anulaciones</span>
            <div className="text-2xl font-black text-white mt-0.5">{voidLogs.length}</div>
            <span className="text-[11px] text-red-300/90 font-mono">
              Hoy: {todayVoids.length} • Total: ${fmt(totalVoidedAmount)} {currTag}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30">
            <span className="text-[10px] font-black uppercase text-amber-400 block">🟠 Cambios de Precio</span>
            <div className="text-2xl font-black text-white mt-0.5">{priceChanges.length}</div>
            <span className="text-[11px] text-slate-400">Servicios y productos</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-yellow-950/20 border border-yellow-500/30">
            <span className="text-[10px] font-black uppercase text-yellow-400 block">🟡 Gastos/Vales (Caja)</span>
            <div className="text-2xl font-black text-white mt-0.5">{cashierExpenses.length}</div>
            <span className="text-[11px] text-slate-400">Registrados en Modo Cajero</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30">
            <span className="text-[10px] font-black uppercase text-purple-400 block">🟣 Alertas / Descuadres</span>
            <div className="text-2xl font-black text-white mt-0.5">{securityAlerts.length}</div>
            <span className="text-[11px] text-slate-400">PIN fallidos y diferencias</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `Todos (${safeLogs.length})` },
            { id: 'void', label: '🔴 Anulaciones' },
            { id: 'price', label: '🟠 Precios' },
            { id: 'expense', label: '🟡 Gastos / Vales' },
            { id: 'close', label: '🔵 Cierres / Nómina' },
            { id: 'security', label: '🟣 Seguridad / PIN' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterGroup(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                filterGroup === f.id
                  ? 'bg-gold-500/15 text-gold-400 border-gold-500/40'
                  : 'bg-dark-850 text-slate-400 border-dark-750 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOnlyToday(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              onlyToday
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-dark-850 text-slate-400 border-dark-750 hover:text-white'
            }`}
          >
            📅 Solo Hoy
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar motivo, monto o persona..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-dark-950 border border-dark-700 text-xs text-white focus:outline-none focus:border-gold-500"
          />
        </div>
      </div>

      {/* Audit Timeline List */}
      <div className="bg-dark-900 border border-dark-800 rounded-3xl overflow-hidden shadow-xl">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-400/70 mx-auto" />
            <p className="text-sm font-bold text-white">Sin eventos en este filtro</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Cada vez que alguien anule una venta, modifique un precio, registre un gasto/vale, realice un arqueo o falle el PIN de Dueño, aparecerá aquí automáticamente sin poder ser borrado.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800">
            {filteredLogs.map(log => {
              const meta = TYPE_META[log.type] || { label: log.type, badge: 'bg-dark-800 text-slate-300 border-dark-700', icon: '📋' }
              const isCashierActor = log.actorRole === 'cajero'
              const diffVal = log.type === 'DAILY_CLOSE' && log.details?.differenceUSD !== undefined ? Number(log.details.differenceUSD) : null

              return (
                <div key={log.id} className="p-4 hover:bg-dark-850/40 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isCashierActor
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                          : 'bg-gold-500/15 text-gold-300 border-gold-500/30'
                      }`}>
                        {isCashierActor ? `🧾 ${log.actorName || 'Cajero'}` : `👑 ${log.actorName || 'Dueño'}`}
                      </span>
                      {log.details?.authorizedBy && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          🔑 {log.details.authorizedBy}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{log.fecha || (log.timestamp ? log.timestamp.split('T')[0] : '')}</span>
                      <span>•</span>
                      <span className="text-slate-300">{log.hora || ''}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-bold text-white">{log.summary}</p>
                    {log.amountUsd !== null && log.amountUsd !== undefined && (
                      <span className={`text-sm font-mono font-black shrink-0 ${
                        log.type === 'TX_VOIDED' ? 'text-red-400 line-through' : 'text-gold-400'
                      }`}>
                        ${fmt(Math.abs(Number(log.amountUsd) || 0))} {currTag}
                      </span>
                    )}
                  </div>

                  {log.reason && (
                    <div className="p-2.5 rounded-xl bg-dark-950 border border-dark-800 text-xs text-slate-300">
                      <span className="text-[10px] uppercase font-bold text-slate-500 mr-1.5">Motivo:</span>
                      <span className="font-semibold text-white">{log.reason}</span>
                    </div>
                  )}

                  {log.type === 'TX_VOIDED' && log.details?.snapshot && (
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                      <span>👤 Barbero/Esp.: <strong className="text-slate-200">{log.details.snapshot.staff_name || '-'}</strong></span>
                      <span>🧑 Cliente: <strong className="text-slate-200">{log.details.snapshot.client_name || 'Mostrador'}</strong></span>
                      <span>💳 Método: <strong className="text-slate-200">{log.details.snapshot.metodo_pago || '-'}</strong></span>
                      <span>🕒 Cobrado a las: <strong className="text-slate-200">{log.details.snapshot.hora || '-'}</strong></span>
                    </div>
                  )}

                  {log.type === 'PRICE_CHANGED' && (
                    <div className="text-[11px] text-amber-300 font-mono">
                      Antes: ${fmt(log.details?.oldPrice || 0)} {currTag} → Ahora: ${fmt(log.details?.newPrice || 0)} {currTag}
                    </div>
                  )}

                  {log.type === 'DAILY_CLOSE' && (
                    <div className="text-[11px] text-slate-300 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                      <span>Contado: <strong className="text-white">${fmt(log.details?.cashInDrawerCounted || 0)}</strong></span>
                      <span>Esperado: <strong className="text-white">${fmt(log.details?.expectedCashInDrawer || 0)}</strong></span>
                      {diffVal !== null && (
                        <span className={Math.abs(diffVal) < 0.01 ? 'text-emerald-400 font-bold' : diffVal > 0 ? 'text-emerald-300 font-bold' : 'text-red-400 font-black'}>
                          Diferencia: {diffVal >= 0 ? '+' : '-'}${fmt(Math.abs(diffVal))} {log.details?.blindMode ? '(Arqueo Ciego)' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
