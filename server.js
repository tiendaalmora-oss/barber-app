import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 80
const DIST_DIR = path.join(__dirname, 'dist')
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'saas_db.json')
const BACKUPS_DIR = path.join(DATA_DIR, 'backups')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true })
}

const DEFAULT_SAAS_CONFIG = {
  monthlyPriceUsd: 6,
  monthlyPriceBsFixed: '6.024',
  guaranteeDays: 7,
  subscriptionDays: 30,
  adminEmail: 'admin@ingenioos.online',
  adminPin: '2026',
  ownerWhatsapp: '+5491164827875',
  pagoMovilBank: 'Banco de Venezuela (0102)',
  pagoMovilHolder: 'Carlos Rojas',
  pagoMovilId: '17.907.078',
  pagoMovilPhone: '04242061590',
  pagoMovilAccount: '01020213260000172378',
  binanceEmail: 'ID: 92423494 (IngenioOS)',
  binanceIdOnly: '92423494',
  zelleInfo: 'BNB Smart Chain (BEP20): 0xf34fe548272f23d363462ba2685f92932ddbd7aa',
  bep20Address: '0xf34fe548272f23d363462ba2685f92932ddbd7aa'
}

const DEFAULT_TENANTS = [
  {
    id: 'ten_1',
    businessName: 'Barbería & Studio Imperial (Cuenta Demo Oficial)',
    ownerName: 'Cuenta Demo IngenioOS',
    email: 'demo@ingenioos.online',
    password: 'demo2026',
    phone: '+5491164827875',
    niche: 'barberia',
    isCleanAccount: false,
    status: 'activo',
    activatedAt: new Date().toISOString().split('T')[0],
    daysRemaining: 30,
    lastPaymentRef: 'CUENTA-DEMO-INTERNA',
    amountPaidUsd: 6
  }
]

function createDailyBackupIfNeeded(data = db) {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const backupFile = path.join(BACKUPS_DIR, `saas_db_backup_${today}.json`)
    // Write daily snapshot if not exists today
    if (!fs.existsSync(backupFile)) {
      fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8')
    }
    // Maintain a rolling latest backup
    const latestBak = path.join(BACKUPS_DIR, 'saas_db_latest.bak')
    fs.writeFileSync(latestBak, JSON.stringify(data, null, 2), 'utf8')

    // Prune old backups, keep last 20
    const allBackups = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('saas_db_backup_') && f.endsWith('.json'))
      .sort()
    while (allBackups.length > 20) {
      const oldest = allBackups.shift()
      try { fs.unlinkSync(path.join(BACKUPS_DIR, oldest)) } catch (e) {}
    }
  } catch (e) {
    console.error('Backup error:', e)
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8')
      if (raw && raw.trim().length > 10) {
        const parsed = JSON.parse(raw)
        const deletedIds = Array.isArray(parsed.deletedTenantIds) ? parsed.deletedTenantIds : []
        const deletedEmails = Array.isArray(parsed.deletedTenantEmails)
          ? parsed.deletedTenantEmails.map(e => (e || '').toLowerCase().trim())
          : []
        const rawTenants = Array.isArray(parsed.tenants) && parsed.tenants.length > 0 ? parsed.tenants : DEFAULT_TENANTS
        // Strict prune against tombstone blacklist so deleted accounts never resurrect from disk
        const cleanTenants = rawTenants.filter(
          t => !deletedIds.includes(t.id) && (!t.email || !deletedEmails.includes((t.email || '').toLowerCase().trim()))
        )
        return {
          saasConfig: { ...DEFAULT_SAAS_CONFIG, ...(parsed.saasConfig || {}) },
          tenants: cleanTenants,
          deletedTenantIds: deletedIds,
          deletedTenantEmails: deletedEmails,
          workspaces: parsed.workspaces || {}
        }
      }
    }
  } catch (err) {
    console.error('Error loading DB from primary DB_FILE, attempting backup recovery:', err)
  }

  // Attempt recovery from backups directory if DB_FILE was corrupted or missing
  try {
    if (fs.existsSync(BACKUPS_DIR)) {
      const latestBak = path.join(BACKUPS_DIR, 'saas_db_latest.bak')
      if (fs.existsSync(latestBak)) {
        const raw = fs.readFileSync(latestBak, 'utf8')
        if (raw && raw.trim().length > 10) {
          const parsed = JSON.parse(raw)
          console.log('Successfully recovered database from saas_db_latest.bak!')
          const deletedIds = Array.isArray(parsed.deletedTenantIds) ? parsed.deletedTenantIds : []
          const deletedEmails = Array.isArray(parsed.deletedTenantEmails)
            ? parsed.deletedTenantEmails.map(e => (e || '').toLowerCase().trim())
            : []
          const rawTenants = Array.isArray(parsed.tenants) && parsed.tenants.length > 0 ? parsed.tenants : DEFAULT_TENANTS
          const cleanTenants = rawTenants.filter(
            t => !deletedIds.includes(t.id) && (!t.email || !deletedEmails.includes((t.email || '').toLowerCase().trim()))
          )
          const recovered = {
            saasConfig: { ...DEFAULT_SAAS_CONFIG, ...(parsed.saasConfig || {}) },
            tenants: cleanTenants,
            deletedTenantIds: deletedIds,
            deletedTenantEmails: deletedEmails,
            workspaces: parsed.workspaces || {}
          }
          saveDb(recovered)
          return recovered
        }
      }
    }
  } catch (bakErr) {
    console.error('Backup recovery failed:', bakErr)
  }

  const initial = {
    saasConfig: DEFAULT_SAAS_CONFIG,
    tenants: DEFAULT_TENANTS,
    deletedTenantIds: [],
    deletedTenantEmails: [],
    workspaces: {}
  }
  saveDb(initial)
  return initial
}

let db = loadDb()

function saveDb(data = db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8')
    createDailyBackupIfNeeded(data)
  } catch (err) {
    console.error('Error saving DB:', err)
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(payload))
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
      if (body.length > 5 * 1024 * 1024) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        resolve({})
      }
    })
  })
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.pdf': 'application/pdf'
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true })
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = parsedUrl.pathname

  // --- API ROUTES ---
  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    return sendJson(res, 200, {
      saasConfig: db.saasConfig,
      tenants: db.tenants,
      deletedTenantIds: db.deletedTenantIds || [],
      deletedTenantEmails: db.deletedTenantEmails || []
    })
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    const body = await parseBody(req)
    if (body && typeof body === 'object') {
      db.saasConfig = { ...db.saasConfig, ...body }
      saveDb()
    }
    return sendJson(res, 200, { ok: true, saasConfig: db.saasConfig })
  }

  if (pathname === '/api/tenants/upsert' && req.method === 'POST') {
    const body = await parseBody(req)
    const tenant = body.tenant
    if (tenant && tenant.id) {
      const lowerEmail = (tenant.email || '').toLowerCase().trim()

      // If new registration or explicit un-delete, release from tombstones
      if (body.isNewRegistration || body.allowResurrection) {
        if (db.deletedTenantIds) {
          db.deletedTenantIds = db.deletedTenantIds.filter(id => id !== tenant.id)
        }
        if (db.deletedTenantEmails && lowerEmail) {
          db.deletedTenantEmails = db.deletedTenantEmails.filter(e => e.toLowerCase().trim() !== lowerEmail)
        }
      } else {
        // Strict guard: if account was deleted, prevent ghost resurrection
        const isTombstoned = (db.deletedTenantIds || []).includes(tenant.id) ||
          (lowerEmail && (db.deletedTenantEmails || []).includes(lowerEmail))
        if (isTombstoned) {
          return sendJson(res, 200, {
            ok: false,
            error: 'Tenant has been permanently deleted',
            tenants: db.tenants,
            deletedTenantIds: db.deletedTenantIds || [],
            deletedTenantEmails: db.deletedTenantEmails || []
          })
        }
      }

      const idx = db.tenants.findIndex(
        t => t.id === tenant.id || (lowerEmail && (t.email || '').toLowerCase().trim() === lowerEmail)
      )
      if (idx >= 0) {
        db.tenants[idx] = { ...db.tenants[idx], ...tenant }
      } else {
        db.tenants.unshift(tenant)
      }
      saveDb()
    }
    return sendJson(res, 200, {
      ok: true,
      tenants: db.tenants,
      deletedTenantIds: db.deletedTenantIds || [],
      deletedTenantEmails: db.deletedTenantEmails || []
    })
  }

  if (pathname === '/api/tenants/sync-local' && req.method === 'POST') {
    // Merges local accounts with bidirectional tombstone sync so deleted accounts NEVER resurrect
    const body = await parseBody(req)
    const localTenants = Array.isArray(body.tenants) ? body.tenants : []
    const clientDelIds = Array.isArray(body.deletedTenantIds) ? body.deletedTenantIds : []
    const clientDelEmails = Array.isArray(body.deletedTenantEmails)
      ? body.deletedTenantEmails.map(e => (e || '').toLowerCase().trim())
      : []

    const idSet = new Set(db.deletedTenantIds || [])
    const emailSet = new Set((db.deletedTenantEmails || []).map(e => (e || '').toLowerCase().trim()))

    let tombstonesChanged = false
    clientDelIds.forEach(id => {
      if (id && !idSet.has(id)) { idSet.add(id); tombstonesChanged = true }
    })
    clientDelEmails.forEach(em => {
      if (em && !emailSet.has(em)) { emailSet.add(em); tombstonesChanged = true }
    })

    if (tombstonesChanged) {
      db.deletedTenantIds = Array.from(idSet)
      db.deletedTenantEmails = Array.from(emailSet)
    }

    // Prune server db.tenants of any tombstoned accounts
    const initialLen = db.tenants.length
    db.tenants = db.tenants.filter(
      t => !idSet.has(t.id) && (!t.email || !emailSet.has((t.email || '').toLowerCase().trim()))
    )
    let changed = tombstonesChanged || (db.tenants.length !== initialLen)

    for (const lt of localTenants) {
      if (!lt || !lt.email) continue
      if (['ten_2', 'ten_3', 'ten_4'].includes(lt.id)) continue
      const lowerEmail = lt.email.toLowerCase().trim()
      // Strict guard: account was deleted permanently, do NOT resurrect!
      if (idSet.has(lt.id) || emailSet.has(lowerEmail)) {
        continue
      }
      const exists = db.tenants.find(t => (t.email || '').toLowerCase().trim() === lowerEmail || t.id === lt.id)
      if (!exists) {
        db.tenants.unshift(lt)
        changed = true
      }
    }
    if (changed) saveDb()
    return sendJson(res, 200, {
      ok: true,
      tenants: db.tenants,
      deletedTenantIds: db.deletedTenantIds || [],
      deletedTenantEmails: db.deletedTenantEmails || [],
      saasConfig: db.saasConfig
    })
  }

  if (pathname === '/api/tenants/delete' && req.method === 'POST') {
    const body = await parseBody(req)
    if (body && body.id) {
      const targetTenant = db.tenants.find(t => t.id === body.id)
      const targetEmail = (body.email || targetTenant?.email || '').toLowerCase().trim()

      const idSet = new Set(db.deletedTenantIds || [])
      const emailSet = new Set((db.deletedTenantEmails || []).map(e => (e || '').toLowerCase().trim()))

      idSet.add(body.id)
      if (targetEmail) emailSet.add(targetEmail)

      db.deletedTenantIds = Array.from(idSet)
      db.deletedTenantEmails = Array.from(emailSet)
      db.tenants = db.tenants.filter(
        t => t.id !== body.id && (!targetEmail || (t.email || '').toLowerCase().trim() !== targetEmail)
      )
      delete db.workspaces[body.id]
      saveDb()
    }
    return sendJson(res, 200, {
      ok: true,
      tenants: db.tenants,
      deletedTenantIds: db.deletedTenantIds || [],
      deletedTenantEmails: db.deletedTenantEmails || []
    })
  }

  if (pathname === '/api/tenants/purge-test' && req.method === 'POST') {
    const body = await parseBody(req)
    const masterPin = db.saasConfig?.adminPin || '2026'
    if (body?.adminPin && body.adminPin.trim() !== masterPin) {
      return sendJson(res, 401, { error: 'PIN Maestro incorrecto' })
    }

    const idSet = new Set(db.deletedTenantIds || [])
    const emailSet = new Set((db.deletedTenantEmails || []).map(e => (e || '').toLowerCase().trim()))

    let purgedCount = 0
    const remainingTenants = []

    for (const t of db.tenants) {
      // 100% PROTECTED:
      // - Shielded VIP accounts (isShielded: true)
      // - Official Demo account (ten_1)
      if (t.isShielded || t.id === 'ten_1') {
        remainingTenants.push(t)
        continue
      }

      // If specific ids are provided, only purge those; otherwise purge all unshielded test accounts
      if (Array.isArray(body?.tenantIds) && body.tenantIds.length > 0) {
        if (!body.tenantIds.includes(t.id)) {
          remainingTenants.push(t)
          continue
        }
      }

      idSet.add(t.id)
      if (t.email) emailSet.add(t.email.toLowerCase().trim())
      delete db.workspaces[t.id]
      purgedCount++
    }

    db.deletedTenantIds = Array.from(idSet)
    db.deletedTenantEmails = Array.from(emailSet)
    db.tenants = remainingTenants
    saveDb()

    return sendJson(res, 200, {
      ok: true,
      purgedCount,
      tenants: db.tenants,
      deletedTenantIds: db.deletedTenantIds,
      deletedTenantEmails: db.deletedTenantEmails
    })
  }

function reconstructWorkspaceTransactions(tenantId, ws) {
  if (!ws || typeof ws !== 'object' || tenantId === 'ten_1') return ws
  const existingTxs = Array.isArray(ws.transactions) ? ws.transactions : []
  const clientsList = Array.isArray(ws.clients) ? ws.clients : []
  if (clientsList.length === 0) return ws

  const deletedTxIds = new Set(Array.isArray(ws.deletedTxIds) ? ws.deletedTxIds : [])
  const rate = Number(ws.exchangeRate) || 889.26
  const allServices = [
    ...((ws.servicesByNiche && ws.servicesByNiche.barberia) || []),
    ...((ws.servicesByNiche && ws.servicesByNiche.estetica) || []),
    ...((ws.servicesByNiche && ws.servicesByNiche.mixto) || [])
  ]
  const allStaff = [
    ...((ws.staffByNiche && ws.staffByNiche.barberia) || []),
    ...((ws.staffByNiche && ws.staffByNiche.estetica) || []),
    ...((ws.staffByNiche && ws.staffByNiche.mixto) || [])
  ]

  const recoveredTxs = []
  for (const c of clientsList) {
    if (!c || !c.last_visit || !c.last_service || c.last_service === 'Registro Directo') continue
    if (tenantId === 'ten_1793499033884' && c.last_staff === 'Agenda Web') continue

    const recId = 'rec_' + c.id
    if (deletedTxIds.has(recId)) continue

    const alreadyExists = existingTxs.some(
      t => t && (t.id === recId || (t.client_name === c.name && (t.fecha || '').startsWith(c.last_visit)))
    )
    if (alreadyExists) continue

    let qty = 1
    let cleanSvcName = c.last_service || 'Corte Clásico'
    const qtyMatch = cleanSvcName.match(/^(\d+)x\s+(.+)$/i)
    if (qtyMatch) {
      qty = Number(qtyMatch[1]) || 1
      cleanSvcName = qtyMatch[2].trim()
    }

    const svcObj =
      allServices.find(s => s && s.name && s.name.toLowerCase() === cleanSvcName.toLowerCase()) ||
      allServices.find(s => s && s.name && cleanSvcName.toLowerCase().includes(s.name.toLowerCase())) ||
      allServices[0] ||
      { id: 's1', name: cleanSvcName, price_usd: 7.5, category: 'Cortes' }

    const staffObj =
      allStaff.find(st => st && st.name && st.name.toLowerCase() === (c.last_staff || '').toLowerCase()) ||
      allStaff[0] ||
      { id: 'e1', name: c.last_staff || 'Barbero', commission_pct: 50 }

    const unitPrice = Number(svcObj.price_usd) || 7.5
    const totalUsd = unitPrice * qty
    const totalBs = Math.round(totalUsd * rate * 100) / 100
    const commPct =
      svcObj.commission_pct !== undefined && svcObj.commission_pct !== null && svcObj.commission_pct !== ''
        ? Number(svcObj.commission_pct)
        : Number(staffObj.commission_pct) || 50
    const commUsd = Math.round(totalUsd * (commPct / 100) * 100) / 100
    const netUsd = Math.round((totalUsd - commUsd) * 100) / 100

    const tsNum = Number((c.id || '').replace(/\D+/g, ''))
    let horaStr = '03:00 p.m.'
    if (tsNum > 1700000000000 && tsNum < 1900000000000) {
      horaStr = new Date(tsNum).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
    }

    recoveredTxs.push({
      id: recId,
      type: 'ingreso',
      item_name: c.last_service,
      product_id: null,
      product_items: [],
      items: [
        {
          id: svcObj.id || 's1',
          name: cleanSvcName,
          price_usd: unitPrice,
          commission_pct: commPct,
          isProduct: false,
          qty
        }
      ],
      category: svcObj.category || 'Cortes',
      staff_name: staffObj.name,
      staff_id: staffObj.id,
      client_name: c.name,
      client_phone: c.phone || '',
      monto_usd: totalUsd,
      monto_bs: totalBs,
      propina_usd: 0,
      propina_bs: 0,
      propina_moneda_origen: 'USD',
      total_cobrado_usd: totalUsd,
      total_cobrado_bs: totalBs,
      propina_staff_id: null,
      propina_staff_name: null,
      tasa_bcv: rate,
      metodo_pago: 'pago_movil',
      comision_usd: commUsd,
      ganancia_negocio_usd: netUsd,
      comision_pagada: true,
      hora: horaStr,
      fecha: c.last_visit + 'T15:30:00.000Z'
    })
  }

  if (recoveredTxs.length === 0) return ws
  const merged = [...existingTxs, ...recoveredTxs].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
  return {
    ...ws,
    transactions: merged
  }
}

  if (pathname.startsWith('/api/workspace/')) {
    const tenantId = decodeURIComponent(pathname.replace('/api/workspace/', ''))
    if (!tenantId) return sendJson(res, 400, { error: 'Missing tenantId' })

    if (req.method === 'GET') {
      if (db.workspaces[tenantId]) {
        db.workspaces[tenantId] = reconstructWorkspaceTransactions(tenantId, db.workspaces[tenantId])
      }
      return sendJson(res, 200, {
        ok: true,
        workspace: db.workspaces[tenantId] || null
      })
    }

    if (req.method === 'POST') {
      const body = await parseBody(req)
      const currentWs = db.workspaces[tenantId] || {}

      const existingApts = Array.isArray(currentWs.appointments) ? currentWs.appointments : []
      let incomingApts = Array.isArray(body.appointments) ? body.appointments : existingApts

      // If a single new appointment is provided (e.g. from public client booking)
      if (body.newAppointment && body.newAppointment.id) {
        const exists = incomingApts.some(a => a.id === body.newAppointment.id)
        if (!exists) {
          incomingApts = [body.newAppointment, ...incomingApts]
        }
      }

      // Merge: preserve any appointments existing on server that were not in incomingApts unless cancelled
      const incomingIds = new Set(incomingApts.map(a => a.id))
      const preservedApts = existingApts.filter(a => !incomingIds.has(a.id) && a.status !== 'cancelada')
      const finalAppointments = [...incomingApts, ...preservedApts]

      // Merge clients: preserve existing server clients if incoming has fewer
      const existingClients = Array.isArray(currentWs.clients) ? currentWs.clients : []
      const incomingClients = Array.isArray(body.clients) ? body.clients : existingClients
      const incomingClientIds = new Set(incomingClients.map(c => c && c.id).filter(Boolean))
      const preservedClients = existingClients.filter(c => c && c.id && !incomingClientIds.has(c.id))
      const finalClients = [...incomingClients, ...preservedClients]

      // Merge: preserve historical/restored transactions existing on server unless explicitly deleted
      const existingTxs = Array.isArray(currentWs.transactions) ? currentWs.transactions : []
      const incomingTxs = Array.isArray(body.transactions) ? body.transactions : existingTxs
      const deletedTxIds = new Set(Array.isArray(body.deletedTxIds) ? body.deletedTxIds : [
        ...(Array.isArray(currentWs.deletedTxIds) ? currentWs.deletedTxIds : [])
      ])
      const incomingTxIds = new Set(incomingTxs.map(t => t && t.id).filter(Boolean))
      const preservedTxs = existingTxs.filter(t => t && t.id && !incomingTxIds.has(t.id) && !deletedTxIds.has(t.id))
      const finalTransactions = [...incomingTxs, ...preservedTxs].filter(t => t && !deletedTxIds.has(t.id))

      const mergedWs = reconstructWorkspaceTransactions(tenantId, {
        ...currentWs,
        ...(body || {}),
        clients: finalClients,
        transactions: finalTransactions,
        deletedTxIds: Array.from(deletedTxIds),
        appointments: finalAppointments,
        updatedAt: Date.now()
      })

      db.workspaces[tenantId] = mergedWs
      saveDb()
      return sendJson(res, 200, {
        ok: true,
        workspace: db.workspaces[tenantId]
      })
    }
  }

  // --- ADMIN BACKUP & RESTORE ROUTES ---
  if (pathname === '/api/admin/backup-download' && req.method === 'GET') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="saas_db_backup_${timestamp}.json"`,
      'Access-Control-Allow-Origin': '*'
    })
    return res.end(JSON.stringify(db, null, 2))
  }

  if (pathname === '/api/admin/backup-restore' && req.method === 'POST') {
    const body = await parseBody(req)
    if (body && Array.isArray(body.tenants) && body.saasConfig) {
      db = {
        saasConfig: { ...DEFAULT_SAAS_CONFIG, ...body.saasConfig },
        tenants: body.tenants,
        deletedTenantIds: Array.isArray(body.deletedTenantIds) ? body.deletedTenantIds : (db.deletedTenantIds || []),
        deletedTenantEmails: Array.isArray(body.deletedTenantEmails) ? body.deletedTenantEmails : (db.deletedTenantEmails || []),
        workspaces: body.workspaces || {}
      }
      saveDb()
      return sendJson(res, 200, { ok: true, message: 'Base de datos restaurada con éxito', tenantsCount: db.tenants.length })
    } else {
      return sendJson(res, 400, { error: 'Estructura de respaldo JSON inválida' })
    }
  }

  // --- DYNAMIC PWA MANIFEST (BarberOS vs GlamOS) ---
  if (pathname === '/manifest.webmanifest' || pathname === '/manifest.json') {
    const host = (req.headers.host || '').toLowerCase()
    const queryBrand = parsedUrl.searchParams.get('brand') || ''
    const isGlam = host.includes('glam') || queryBrand.includes('glam')
    const manifest = isGlam
      ? {
          name: 'GlamOS · Salones de Belleza, Uñas & Spas',
          short_name: 'GlamOS',
          description: 'Sistema de Citas, Caja y Comisiones para Salones de Belleza, Uñas & Spas',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#090a0d',
          theme_color: '#ec4899',
          icons: [
            {
              src: '/icon-glamos.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      : {
          name: 'BarberOS · Control Financiero & Caja',
          short_name: 'BarberOS',
          description: 'Sistema de Control de Caja, Comisiones, Radar de Clientes y Catálogo para Barberías y Salones',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#090a0d',
          theme_color: '#090a0d',
          icons: [
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }

    res.writeHead(200, {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    })
    return res.end(JSON.stringify(manifest, null, 2))
  }

  // --- STATIC SPA SERVING ---
  const serveHtml = (htmlFilePath) => {
    const host = (req.headers.host || '').toLowerCase()
    const queryBrand = parsedUrl.searchParams.get('brand') || ''
    const isGlam = host.includes('glam') || queryBrand.includes('glam')
    let html = fs.readFileSync(htmlFilePath, 'utf8')
    if (isGlam) {
      html = html.replace(/<title>.*?<\/title>/, '<title>GlamOS · Salones de Belleza, Uñas & Spas</title>')
      html = html.replace(/content="BarberOS"/g, 'content="GlamOS"')
      html = html.replace(/content="#090a0d"/g, 'content="#ec4899"')
      html = html.replace(/\/icon\.svg/g, '/icon-glamos.svg')
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    })
    res.end(html)
  }

  let targetPath = pathname
  const host = (req.headers.host || '').toLowerCase()
  const queryBrand = parsedUrl.searchParams.get('brand') || ''
  const isGlamHost = host.includes('glam') || queryBrand.includes('glam')

  if (targetPath === '/landing' || targetPath === '/v4' || targetPath === '/ventas') {
    targetPath = isGlamHost ? '/landing_glamos.html' : '/landing.html'
  } else if (
    targetPath === '/landing-glamos' ||
    targetPath === '/landing_glamos' ||
    targetPath === '/landing_glamos.html' ||
    targetPath === '/glam' ||
    targetPath === '/glamos' ||
    targetPath === '/salon'
  ) {
    targetPath = '/landing_glamos.html'
  }
  if (targetPath === '/manual' || targetPath === '/manual.pdf' || targetPath === '/guia') {
    targetPath = '/bonos/Manual_Oficial_BarberOS.pdf'
  }
  if (targetPath === '/bono1' || targetPath === '/bono1.pdf') {
    targetPath = '/bonos/Bono1_Corte_Rentable.pdf'
  }
  if (targetPath === '/bono2' || targetPath === '/bono2.pdf') {
    targetPath = '/bonos/Bono2_Kit_Redes_Dias_Muertos.pdf'
  }
  if (targetPath === '/bono3' || targetPath === '/bono3.pdf') {
    targetPath = '/bonos/Bono3_Checklist_Arranque_BarberOS.pdf'
  }
  let filePath = path.join(DIST_DIR, targetPath === '/' ? 'index.html' : targetPath)
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    if (filePath.endsWith('.html')) {
      return serveHtml(filePath)
    }
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const isServiceWorker = pathname === '/sw.js'
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isServiceWorker ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable'
    })
    fs.createReadStream(filePath).pipe(res)
  } else {
    // SPA Fallback to index.html
    const indexHtml = path.join(DIST_DIR, 'index.html')
    if (fs.existsSync(indexHtml)) {
      return serveHtml(indexHtml)
    } else {
      res.writeHead(404)
      res.end('Build not found')
    }
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Ingenio OS Barber SaaS Server running on port ${PORT}`)
})
