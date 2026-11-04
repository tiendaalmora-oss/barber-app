import React, { useState, useEffect } from 'react'

const COUNTRIES = [
  { id: '58', prefix: '+58', flag: '🇻🇪', label: 'Venezuela (+58)', placeholder: '0414 123 4567' },
  { id: '54', prefix: '+54', flag: '🇦🇷', label: 'Argentina (+54)', placeholder: '11 6482 7875' },
  { id: 'other', prefix: '+', flag: '🌐', label: 'Otro (+)', placeholder: 'Código y número' }
]

/**
 * Parses any incoming phone string into { countryId, localDigits }
 */
function parseIncomingPhone(raw) {
  if (!raw) return { countryId: '58', localNumber: '' }
  const str = String(raw).trim()
  const clean = str.replace(/[^0-9]/g, '')

  // Argentina: starts with 54
  if (clean.startsWith('54')) {
    let local = clean.slice(2)
    // Strip the mobile WhatsApp '9' if present so user sees their natural 11... number
    if (local.startsWith('9') && local.length >= 11) {
      local = local.slice(1)
    }
    return { countryId: '54', localNumber: local }
  }

  // Venezuela: starts with 58
  if (clean.startsWith('58')) {
    let local = clean.slice(2)
    // If user saved without 0, show natural 04...
    if (local.startsWith('4') && local.length === 10) {
      local = '0' + local
    }
    return { countryId: '58', localNumber: local }
  }

  // Venezuelan local patterns: 0412..., 0414..., 0424..., 0416..., 0426...
  if (clean.startsWith('04') || (clean.startsWith('4') && clean.length === 10)) {
    return { countryId: '58', localNumber: clean.startsWith('4') ? '0' + clean : clean }
  }

  // Argentine local patterns: 11..., 15..., etc.
  if (clean.startsWith('11') || clean.startsWith('15')) {
    return { countryId: '54', localNumber: clean }
  }

  return { countryId: '58', localNumber: clean }
}

/**
 * Combines countryId and localDigits into a clean E.164 international phone for WhatsApp / database
 */
function buildFullPhone(countryId, localDigits) {
  const clean = String(localDigits || '').replace(/[^0-9]/g, '')
  if (!clean) return ''

  if (countryId === '58') {
    // Strip leading 0 if user typed 0414 -> becomes 414
    const stripped = clean.startsWith('0') ? clean.slice(1) : clean
    return `+58${stripped}`
  }

  if (countryId === '54') {
    // Argentina mobile WhatsApp requires +54 9 [area][number]
    let stripped = clean
    if (stripped.startsWith('0')) stripped = stripped.slice(1)
    if (stripped.startsWith('15') && stripped.length >= 10) stripped = stripped.slice(2)
    if (!stripped.startsWith('9')) stripped = '9' + stripped
    return `+54${stripped}`
  }

  return clean.startsWith('+') ? clean : `+${clean}`
}

export default function PhoneCountryInput({
  value = '',
  onChange,
  required = false,
  placeholder,
  className = '',
  isGlam = false,
  autoFocus = false
}) {
  const [selectedCountry, setSelectedCountry] = useState('58')
  const [localNumber, setLocalNumber] = useState('')

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      const parsed = parseIncomingPhone(value)
      setSelectedCountry(parsed.countryId)
      setLocalNumber(parsed.localNumber)
    } else {
      setLocalNumber('')
    }
  }, [value])

  const handleCountryChange = (e) => {
    const newCountry = e.target.value
    setSelectedCountry(newCountry)
    const combined = buildFullPhone(newCountry, localNumber)
    if (onChange) onChange(combined)
  }

  const handleNumberChange = (e) => {
    const rawVal = e.target.value
    setLocalNumber(rawVal)
    const combined = buildFullPhone(selectedCountry, rawVal)
    if (onChange) onChange(combined)
  }

  const currentCountry = COUNTRIES.find(c => c.id === selectedCountry) || COUNTRIES[0]

  return (
    <div className={`flex items-center rounded-xl overflow-hidden border border-dark-700 bg-dark-850 transition-all ${
      isGlam ? 'focus-within:border-pink-500' : 'focus-within:border-gold-500'
    } ${className}`}>
      
      {/* Country Prefix Selector */}
      <div className="relative shrink-0 border-r border-dark-700 bg-dark-900">
        <select
          value={selectedCountry}
          onChange={handleCountryChange}
          className="appearance-none bg-transparent text-xs text-white font-bold pl-2.5 pr-6 py-2.5 focus:outline-none cursor-pointer"
          title="Seleccionar país (Venezuela +58 / Argentina +54)"
        >
          {COUNTRIES.map(c => (
            <option key={c.id} value={c.id} className="bg-dark-900 text-white">
              {c.flag} {c.prefix}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
          ▾
        </span>
      </div>

      {/* Local Phone Input */}
      <input
        type="tel"
        required={required}
        autoFocus={autoFocus}
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder || currentCountry.placeholder}
        className="flex-1 px-3 py-2.5 bg-transparent text-xs text-white font-mono placeholder-slate-500 focus:outline-none min-w-0"
      />
    </div>
  )
}
