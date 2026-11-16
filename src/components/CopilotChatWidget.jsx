import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles, MessageSquare, X, Send, Bot, User, Copy, Check,
  ChevronDown, Flame, ShieldAlert, DollarSign, ArrowRight
} from 'lucide-react'
import { isDateToday, getLocalDateIso } from '../lib/dateUtils'
import { getActiveBrand } from '../lib/brandConfig'

export default function CopilotChatWidget({
  activeTenant,
  businessProfile = {},
  transactions = [],
  clients = [],
  appointments = [],
  exchangeRate = 889.26,
  currentNiche = 'barberia'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [remainingQuota, setRemainingQuota] = useState(10)
  const [copiedId, setCopiedId] = useState(null)

  const brand = getActiveBrand(activeTenant)
  const isGlamBrand = brand.code === 'glamos' || currentNiche === 'estetica'
  const copilotName = isGlamBrand ? 'Socia GlamOS' : 'Socio BarberOS'
  const copilotSubtitle = isGlamBrand ? 'Tu copiloto de salón & estética' : 'Tu copiloto de barbería'
  const bizName = businessProfile?.businessName || (isGlamBrand ? 'Mi Salón' : 'Mi Barbería')

  const tenantId = activeTenant?.id || 'anon'

  // Initial welcome message
  const initialMessages = [
    {
      id: 'welcome',
      role: 'assistant',
      content: isGlamBrand
        ? `¡Hola bella! ✨ Soy tu Socia GlamOS. Conozco los números de tu salón y la tasa del día. Pregúntame lo que necesites: redactar un mensaje para cobrar un saldo pendiente, una promo para llenar la tarde o reactivar clientas.`
        : `¡Epa hermano! 💈 Soy tu Socio BarberOS. Conozco cómo va tu caja hoy. Pregúntame lo que necesites: cómo redactar un cobro de saldo pendiente, una promo para mover la tarde o reactivar clientes que no han vuelto.`
    }
  ]

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`copilot_chat_${tenantId}`)
      return saved ? JSON.parse(saved) : initialMessages
    } catch (e) {
      return initialMessages
    }
  })

  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    try {
      sessionStorage.setItem(`copilot_chat_${tenantId}`, JSON.stringify(messages))
    } catch (e) {}
  }, [messages, tenantId])

  // Context calculations in local timezone
  const todayTxs = (transactions || []).filter(t => isDateToday(t.fecha))
  const todayIncomeTxs = todayTxs.filter(t => t.monto_usd > 0)
  const todayServicesCount = todayIncomeTxs.length
  const todayRevenueUSD = todayIncomeTxs.reduce((sum, t) => sum + (t.monto_usd || 0), 0)

  const debtors = (clients || []).filter(c => (c.debt_usd || 0) > 0)
  const totalDebtUSD = debtors.reduce((sum, c) => sum + (c.debt_usd || 0), 0)

  const todayIso = getLocalDateIso()
  const todayApts = (appointments || []).filter(a => a.date === todayIso && a.status !== 'cancelada')

  const quickPrompts = isGlamBrand ? [
    '✨ Promo para llenar la tarde de hoy',
    '💸 Mensaje para cobrar saldo pendiente',
    '🌸 Mensaje para reactivar clientas que no vienen',
    '📊 ¿Cómo van mis números de hoy?'
  ] : [
    '✂️ Promo para llenar la tarde de hoy',
    '💸 Mensaje para cobrar saldo pendiente',
    '💈 Mensaje para reactivar clientes inactivos',
    '📊 ¿Cómo van mis números de hoy?'
  ]

  const handleSendMessage = async (textToSend) => {
    const userText = (textToSend || input).trim()
    if (!userText || loading) return

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: userText
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const contextPayload = {
      businessName: bizName,
      brandName: brand.name,
      isSalon: isGlamBrand,
      exchangeRate,
      todayServicesCount,
      todayRevenueUSD,
      totalDebtUSD,
      debtorsCount: debtors.length,
      todayAppointmentsCount: todayApts.length
    }

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.slice(-5),
          context: contextPayload,
          tenantId
        })
      })

      if (res.ok) {
        const data = await res.json()
        const botReply = data.reply || '¡Entendido! ¿En qué otra cosa te apoyo hoy?'
        if (typeof data.remainingToday === 'number') {
          setRemainingQuota(data.remainingToday)
        }
        setMessages(prev => [...prev, {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          content: botReply
        }])
      } else {
        throw new Error('Servidor ocupado')
      }
    } catch (err) {
      // Offline / fallback response
      let fallbackText = '¡Entendido hermano! Cuenta conmigo para redactar mensajes de WhatsApp, promociones de la tarde o revisar tus números.'
      if (userText.toLowerCase().includes('fiado') || userText.toLowerCase().includes('deuda') || userText.toLowerCase().includes('saldo')) {
        fallbackText = `Para cobrar con educación y efectividad, usa este mensaje listo:\n\n"¡Epa hermano! 👋 Espero estés bien. Te escribo para cuadrar caja esta semana; cuando puedas me pasas el Pago Móvil del saldo pendiente de tu visita pasada para cerrarte la cuenta en el sistema. ¡Un abrazo!"`
      } else if (userText.toLowerCase().includes('promo') || userText.toLowerCase().includes('tarde')) {
        fallbackText = `Para mover la tarde, lanza este estado de WhatsApp:\n\n"💈 ¡Buenas tardes mi gente! Abrimos 2 espacios especiales para hoy a las 4:00 PM y 5:30 PM en ${bizName}. Quien reserve hoy le obsequiamos perfilado de cejas. Aparta tu turno aquí 👉 [Tu Link]"`
      } else if (userText.toLowerCase().includes('reactivar') || userText.toLowerCase().includes('inactivo') || userText.toLowerCase().includes('semanas')) {
        fallbackText = `Para reactivar clientes que tienen tiempo sin visitarte, envíales este mensaje personal:\n\n"¡Hola hermano! 👋 Teníamos días sin verte por la barbería. Espero todo marche excelente. Si te toca recorte esta semana, avísame para apartarte tu espacio preferido. ¡Un abrazo!"`
      } else if (userText.toLowerCase().includes('números') || userText.toLowerCase().includes('cómo voy')) {
        fallbackText = `Hoy llevas ${todayServicesCount} servicios registrados con un total de $${todayRevenueUSD.toFixed(2)} USD (Tasa BCV: Bs. ${exchangeRate.toFixed(2)}). Tienes ${debtors.length} clientes con saldo pendiente ($${totalDebtUSD.toFixed(2)} USD). ¡A darle con todo a la jornada!`
      }

      setMessages(prev => [...prev, {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: fallbackText
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleCopyText = (text, id) => {
    // Extract quoted text if present, otherwise copy whole message
    const quoteMatch = text.match(/"([^"]+)"/) || text.match(/“([^”]+)”/)
    const textToCopy = quoteMatch ? quoteMatch[1] : text

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2500)
    })
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-20 md:bottom-6 right-4 z-40 p-3 sm:px-4 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 transition-all duration-300 active:scale-95 border ${
            isGlamBrand
              ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-rose-600 border-pink-400/40 text-white shadow-pink-600/30'
              : 'bg-gradient-to-r from-gold-500 via-amber-600 to-yellow-500 border-gold-300/40 text-black shadow-gold-500/30'
          }`}
          title="Abrir Asesor Inteligente"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-dark-900 animate-ping" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-black text-xs leading-none">{copilotName}</span>
            <span className={`text-[9px] font-semibold leading-tight opacity-90 ${isGlamBrand ? 'text-pink-100' : 'text-slate-900'}`}>
              IA de Negocio
            </span>
          </div>
        </button>
      )}

      {/* Slide-up Chat Window */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-3 sm:inset-auto sm:bottom-6 sm:right-4 z-50 w-auto sm:w-96 max-h-[85vh] sm:max-h-[600px] h-[540px] bg-dark-900 border border-gold-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp font-sans">
          
          {/* Header */}
          <div className={`p-3.5 border-b border-dark-800 flex items-center justify-between ${
            isGlamBrand
              ? 'bg-gradient-to-r from-pink-950/70 via-dark-900 to-purple-950/70'
              : 'bg-gradient-to-r from-dark-850 via-dark-900 to-gold-950/60'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black border ${
                isGlamBrand
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                  : 'bg-gold-500/20 text-gold-400 border-gold-500/30'
              }`}>
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-white">{copilotName}</h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    DeepSeek Flash
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{copilotSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-gold-400 bg-dark-950 px-2 py-0.5 rounded-lg border border-dark-750" title="Consultas diarias disponibles">
                ⚡ {remainingQuota} hoy
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {messages.map((m) => {
              const isBot = m.role === 'assistant'
              const hasQuote = m.content.includes('"') || m.content.includes('“')

              return (
                <div key={m.id} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                    isBot
                      ? 'bg-dark-850 border border-dark-750 text-slate-200 shadow-sm'
                      : isGlamBrand
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white font-medium shadow-md shadow-pink-500/10'
                      : 'bg-gradient-to-r from-gold-500 to-amber-500 text-black font-semibold shadow-md shadow-gold-500/10'
                  }`}>
                    {m.content}
                  </div>

                  {/* 1-Click Copy WhatsApp message helper */}
                  {isBot && hasQuote && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(m.content, m.id)}
                      className="mt-1 px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-gold-400 border border-dark-700 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
                    >
                      {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === m.id ? '¡Mensaje Copiado!' : 'Copiar mensaje para WhatsApp'}</span>
                    </button>
                  )}
                </div>
              )
            })}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-2xl bg-dark-850 border border-dark-750 w-20">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-3 py-1.5 bg-dark-950/70 border-t border-dark-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp)}
                className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-[10px] font-bold text-slate-300 hover:text-gold-300 transition-colors shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Footer Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-2.5 bg-dark-950 border-t border-dark-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={isGlamBrand ? 'Pregúntale a tu socia...' : 'Pregúntale a tu socio...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-dark-900 border border-dark-750 focus:border-gold-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`p-2 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isGlamBrand
                  ? 'bg-pink-500 hover:bg-pink-400 text-white'
                  : 'bg-gold-500 hover:bg-gold-400 text-black'
              }`}
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

        </div>
      )}
    </>
  )
}
