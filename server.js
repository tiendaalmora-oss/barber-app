import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  normalizeDeletedIds,
  mergeDeletedIds,
  mergeEntityList,
  filterDeletedByNiche
} from './src/lib/workspaceSync.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load local .env if present (without checking into git)
try {
  const envCandidates = [path.join(__dirname, '.env'), path.join(__dirname, 'data', '.env')]
  for (const ef of envCandidates) {
    if (fs.existsSync(ef)) {
      const raw = fs.readFileSync(ef, 'utf8')
      for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx > 0) {
            const k = trimmed.slice(0, eqIdx).trim()
            const v = trimmed.slice(eqIdx + 1).trim()
            if (!process.env[k]) process.env[k] = v
          }
        }
      }
    }
  }
} catch (e) {}

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
  bep20Address: '0xf34fe548272f23d363462ba2685f92932ddbd7aa',
  monthlyPriceArsFixed: '9.800',
  argBank: 'Mercado Pago / Transferencia (CBU / CVU)',
  argHolder: 'Roberto (Ingenio OS)',
  argAlias: 'ingenio.os.mp',
  argCvu: '0000003100000000000000'
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

function notifyCrmSaasEvent(eventType, tenant) {
  if (!tenant || !tenant.phone) return;
  try {
    const coreUrl = process.env.CORE_URL || 'https://core.ai.ingeniodigital.shop';
    const adminKey = process.env.ADMIN_API_KEY || '995eef64a341c2ca2b1b98584f5c7b89b7534a55502117663096b14b5e7a1549';
    const payload = {
      event: eventType,
      app: tenant.saasProduct || tenant.niche || 'barberos',
      country: tenant.country || 'VE',
      businessName: tenant.businessName || '',
      ownerName: tenant.ownerName || '',
      email: tenant.email || '',
      password: tenant.password || '',
      securityPin: tenant.securityPin || '',
      phone: tenant.phone || '',
      amountPaidUsd: tenant.amountPaidUsd || 6,
      paymentRef: tenant.lastPaymentRef || ''
    };
    fetch(`${coreUrl}/crm/saas-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminKey}`
      },
      body: JSON.stringify(payload)
    }).then(res => {
      if (res.ok) {
        console.log(`[CRM SaaS Sync] Evento ${eventType} sincronizado para ${tenant.ownerName || tenant.businessName}`);
      } else {
        console.warn(`[CRM SaaS Sync] HTTP ${res.status} al sincronizar ${eventType}`);
      }
    }).catch(err => {
      console.error('[CRM SaaS Sync] Error de red:', err.message);
    });
  } catch (e) {
    console.error('[CRM SaaS Sync] Falló disparo:', e.message);
  }
}

// Routine to auto-expire trials and subscriptions in database
function pruneAndExpireTenants() {
  const now = Date.now()
  let changed = false
  const idSet = new Set(db.deletedTenantIds || [])
  const emailSet = new Set((db.deletedTenantEmails || []).map(e => (e || '').toLowerCase().trim()))

  // 1. Strict tombstone prune
  const prevLen = db.tenants.length
  db.tenants = db.tenants.filter(
    t => !idSet.has(t.id) && (!t.email || !emailSet.has((t.email || '').toLowerCase().trim()))
  )
  if (db.tenants.length !== prevLen) changed = true

  // 2. Auto-expire 24h trials & 30d subscriptions
  for (const t of db.tenants) {
    if (t.id === 'ten_1') continue // Official demo account stays intact
    const isTrial = Boolean(t.isTrial24h || t.subscriptionType === 'trial_24h')
    if (isTrial && t.trialExpiresAt) {
      const trialExpired = new Date(t.trialExpiresAt).getTime() <= now
      if (trialExpired && t.status !== 'vencido') {
        t.status = 'vencido'
        t.daysRemaining = 0
        t.wasTrial = true
        changed = true
      }
    } else if (t.status === 'activo' && t.subscriptionType === 'mes_30d' && t.activatedAt) {
      const startMs = new Date(t.activatedAt + 'T00:00:00').getTime()
      if (!isNaN(startMs)) {
        const daysPassed = Math.floor((now - startMs) / (1000 * 60 * 60 * 24))
        const subDays = db.saasConfig?.subscriptionDays || 30
        const daysLeft = Math.max(0, subDays - daysPassed)
        if (t.daysRemaining !== daysLeft) {
          t.daysRemaining = daysLeft
          changed = true
        }
        if (daysLeft === 0 && t.status !== 'vencido') {
          t.status = 'vencido'
          changed = true
        }
      }
    }
  }

  if (changed) {
    saveDb()
  }
}

// Auto-run expiration routine every 60 seconds
setInterval(pruneAndExpireTenants, 60000)

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true })
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = parsedUrl.pathname

  // --- API ROUTES ---
  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    pruneAndExpireTenants()
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

      // Sincronización automática no-invasiva con el CRM
      if (body.isNewRegistration) {
        notifyCrmSaasEvent('REGISTRATION', tenant);
      } else if (body.isActivation30d || tenant.isActivation30d || (tenant.status === 'activo' && tenant.subscriptionType === 'mes_30d')) {
        notifyCrmSaasEvent('ACTIVATION_30D', tenant);
      }
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
  const normDeleted = normalizeDeletedIds(ws)
  const deletedTxIds = new Set(normDeleted.transactions)
  const deletedClientIds = new Set(normDeleted.clients)
  const existingTxs = (Array.isArray(ws.transactions) ? ws.transactions : []).filter(
    t => t && t.id && !deletedTxIds.has(t.id)
  )
  const clientsList = (Array.isArray(ws.clients) ? ws.clients : []).filter(
    c => c && c.id && !deletedClientIds.has(c.id)
  )
  if (clientsList.length === 0) return ws
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
    if (!c || deletedClientIds.has(c.id) || !c.last_visit || !c.last_service || c.last_service === 'Registro Directo') continue
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

  // --- CASHIER DIRECT PIN LOGIN (Email del local + PIN personal de cajera) ---
  if (pathname === '/api/auth/cashier-login' && req.method === 'POST') {
    const body = await parseBody(req)
    const cleanEmail = String(body?.email || '').trim().toLowerCase()
    const cleanPin = String(body?.pin || '').replace(/\s+/g, '')
    if (!cleanEmail || !cleanPin) {
      return sendJson(res, 400, { ok: false, error: 'Ingresa el correo del local y el PIN de cajera.' })
    }

    const delEmailSet = new Set((db.deletedTenantEmails || []).map(e => (e || '').toLowerCase().trim()))
    const delIdSet = new Set(db.deletedTenantIds || [])
    const tenant = (db.tenants || []).find(t =>
      t &&
      t.id &&
      !delIdSet.has(t.id) &&
      !delEmailSet.has((t.email || '').toLowerCase().trim()) &&
      (t.email || '').toLowerCase().trim() === cleanEmail
    )

    if (!tenant) {
      return sendJson(res, 401, { ok: false, error: 'PIN de cajera no encontrado o incorrecto' })
    }

    const ws = db.workspaces[tenant.id] || {}
    const normCashierDel = normalizeDeletedIds(ws)
    const deletedStaffSet = new Set(normCashierDel.staff)
    const sbn = ws.staffByNiche || {}
    const order = []
    ;[ws.currentNiche || tenant.niche, 'barberia', 'estetica', 'mixto', ...Object.keys(sbn)].forEach(k => {
      if (k && !order.includes(k)) order.push(k)
    })

    let matched = null
    let matchedNiche = null
    for (const nk of order) {
      const arr = Array.isArray(sbn[nk]) ? sbn[nk] : []
      const found = arr.find(s =>
        s &&
        !deletedStaffSet.has(s.id) &&
        s.staff_role === 'cajero' &&
        String(s.pin || '').replace(/\s+/g, '') === cleanPin &&
        String(s.pin || '').replace(/\s+/g, '').length > 0
      )
      if (found) {
        matched = found
        matchedNiche = nk
        break
      }
    }

    if (!matched) {
      return sendJson(res, 401, { ok: false, error: 'PIN de cajera no encontrado o incorrecto' })
    }

    return sendJson(res, 200, {
      ok: true,
      tenant,
      cashier: { id: matched.id, name: matched.name, staff_role: 'cajero' },
      niche: matchedNiche
    })
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

      // Unified deletedIds tombstones across all 6 collections + legacy flat keys backward-compatibility
      const mergedDeleted = mergeDeletedIds(currentWs, body)

      // Merge auditLogs strictly as append-only (tamper-proof: never deleted even on reset or localStorage clear)
      const existingAuditLogs = Array.isArray(currentWs.auditLogs) ? currentWs.auditLogs : []
      const incomingAuditLogs = Array.isArray(body.auditLogs) ? body.auditLogs : []
      const auditMap = new Map()
      existingAuditLogs.forEach(log => { if (log && log.id) auditMap.set(log.id, log) })
      incomingAuditLogs.forEach(log => { if (log && log.id && !auditMap.has(log.id)) auditMap.set(log.id, log) })
      const finalAuditLogs = Array.from(auditMap.values())
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
        .slice(0, 2000)

      // Explicit Owner Reset ("Reiniciar Caja a 0") — tombstones wiped items so stale tabs never resurrect them
      if (body && body.explicitReset === true) {
        const curTxs = Array.isArray(currentWs.transactions) ? currentWs.transactions : []
        const curApts = Array.isArray(currentWs.appointments) ? currentWs.appointments : []
        const curClients = Array.isArray(currentWs.clients) ? currentWs.clients : []
        const resetDeleted = mergeDeletedIds(mergedDeleted, {
          deletedIds: {
            transactions: curTxs.map(t => t && t.id).filter(Boolean),
            appointments: curApts.map(a => a && a.id).filter(Boolean),
            clients: curClients.map(c => c && c.id).filter(Boolean)
          }
        })
        const resetWs = {
          ...currentWs,
          transactions: [],
          appointments: [],
          clients: [],
          deletedIds: resetDeleted,
          deletedTxIds: resetDeleted.transactions,
          deletedAppointmentIds: resetDeleted.appointments,
          deletedStaffIds: resetDeleted.staff,
          auditLogs: finalAuditLogs,
          lastResetAt: Number(body.resetAt) || Date.now(),
          updatedAt: Date.now()
        }
        db.workspaces[tenantId] = resetWs
        saveDb()
        return sendJson(res, 200, {
          ok: true,
          workspace: db.workspaces[tenantId]
        })
      }

      // 1. Appointments: merge by updatedAt + strictly exclude deleted & unreturned cancelled appointments
      const existingApts = Array.isArray(currentWs.appointments) ? currentWs.appointments : []
      const delAptSet = new Set(mergedDeleted.appointments)
      let incomingApts = (Array.isArray(body.appointments) ? body.appointments : existingApts)
        .filter(a => a && a.id && !delAptSet.has(a.id))

      if (body.newAppointment && body.newAppointment.id && !delAptSet.has(body.newAppointment.id)) {
        const exists = incomingApts.some(a => a.id === body.newAppointment.id)
        if (!exists) {
          incomingApts = [body.newAppointment, ...incomingApts]
        }
      }

      const incomingAptIds = new Set(incomingApts.map(a => a.id))
      const eligibleExistingApts = existingApts.filter(
        a => a && a.id && !delAptSet.has(a.id) && (a.status !== 'cancelada' || incomingAptIds.has(a.id))
      )
      const finalAppointments = mergeEntityList(
        incomingApts,
        eligibleExistingApts,
        mergedDeleted.appointments,
        { preferIncomingOnTie: true }
      )

      // 2. Clients / Fiados / VIP: merge by updatedAt + enforce deletedIds.clients tombstones
      const existingClients = Array.isArray(currentWs.clients) ? currentWs.clients : []
      const incomingClients = Array.isArray(body.clients) ? body.clients : existingClients
      const finalClients = mergeEntityList(
        incomingClients,
        existingClients,
        mergedDeleted.clients,
        { preferIncomingOnTie: true }
      )

      // 3. Transactions: merge by updatedAt + enforce deletedIds.transactions tombstones
      const existingTxs = Array.isArray(currentWs.transactions) ? currentWs.transactions : []
      const incomingTxs = Array.isArray(body.transactions) ? body.transactions : existingTxs
      const finalTransactions = mergeEntityList(
        incomingTxs,
        existingTxs,
        mergedDeleted.transactions,
        {
          preferIncomingOnTie: true,
          sortFn: (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)
        }
      )

      // 4. Daily closings
      const existingClosings = Array.isArray(currentWs.dailyClosings) ? currentWs.dailyClosings : []
      const incomingClosings = Array.isArray(body.dailyClosings) ? body.dailyClosings : existingClosings
      const finalDailyClosings = mergeEntityList(
        incomingClosings,
        existingClosings,
        [],
        { preferIncomingOnTie: true }
      )

      // 5. Config & By-Niche collections (staff, services, products) with stale-device & tombstone protection
      const existingConfigTs = Number(currentWs.configUpdatedAt) || 0
      const incomingConfigTs = Number(body.configUpdatedAt) || 0
      const isOlderConfigFromStaleDevice =
        existingConfigTs > 0 && (incomingConfigTs === 0 || incomingConfigTs < existingConfigTs)

      const isStaleEmptyPayload =
        (existingClients.length > 0 || existingTxs.length > 0) &&
        Array.isArray(body.clients) && body.clients.length === 0 &&
        Array.isArray(body.transactions) && body.transactions.length === 0

      const isDefaultMockStaff = (sbn) =>
        sbn && Array.isArray(sbn.barberia) && sbn.barberia.length === 3 &&
        sbn.barberia[0]?.name === 'Carlos (El Maestro)' && sbn.barberia[1]?.name === 'Miguel (Fade Pro)'

      const isDefaultMockServices = (svbn) =>
        svbn && Array.isArray(svbn.barberia) && svbn.barberia.length === 5 &&
        svbn.barberia[0]?.name === 'Corte Clásico / Degradé' && Number(svbn.barberia[0]?.price_usd) === 8

      const rawStaffByNiche =
        (isOlderConfigFromStaleDevice && currentWs.staffByNiche) ||
        (isStaleEmptyPayload && currentWs.staffByNiche) ||
        (currentWs.staffByNiche && !isDefaultMockStaff(currentWs.staffByNiche) && isDefaultMockStaff(body.staffByNiche))
          ? currentWs.staffByNiche
          : (body.staffByNiche || currentWs.staffByNiche)
      const finalStaffByNiche = filterDeletedByNiche(rawStaffByNiche, mergedDeleted.staff)

      const rawServicesByNiche =
        (isOlderConfigFromStaleDevice && currentWs.servicesByNiche) ||
        (isStaleEmptyPayload && currentWs.servicesByNiche) ||
        (currentWs.servicesByNiche && !isDefaultMockServices(currentWs.servicesByNiche) && isDefaultMockServices(body.servicesByNiche))
          ? currentWs.servicesByNiche
          : (body.servicesByNiche || currentWs.servicesByNiche)
      const finalServicesByNiche = filterDeletedByNiche(rawServicesByNiche, mergedDeleted.services)

      const rawProductsByNiche =
        (isOlderConfigFromStaleDevice && currentWs.productsByNiche) ||
        (isStaleEmptyPayload && currentWs.productsByNiche)
          ? currentWs.productsByNiche
          : (body.productsByNiche || currentWs.productsByNiche)
      const finalProductsByNiche = filterDeletedByNiche(rawProductsByNiche, mergedDeleted.products)

      const finalBusinessProfile =
        (isOlderConfigFromStaleDevice && currentWs.businessProfile) ||
        (isStaleEmptyPayload && currentWs.businessProfile) ||
        (currentWs.businessProfile?.businessName &&
          currentWs.businessProfile.businessName !== 'Barbería & Studio El Fino' &&
          body.businessProfile?.businessName === 'Barbería & Studio El Fino')
          ? currentWs.businessProfile
          : (body.businessProfile || currentWs.businessProfile)

      const finalExchangeRate =
        (isOlderConfigFromStaleDevice && currentWs.exchangeRate) ||
        (isStaleEmptyPayload && currentWs.exchangeRate)
          ? currentWs.exchangeRate
          : (body.exchangeRate || currentWs.exchangeRate)

      const mergedWs = reconstructWorkspaceTransactions(tenantId, {
        ...currentWs,
        ...(body || {}),
        businessProfile: finalBusinessProfile,
        staffByNiche: finalStaffByNiche,
        servicesByNiche: finalServicesByNiche,
        productsByNiche: finalProductsByNiche,
        exchangeRate: finalExchangeRate,
        clients: finalClients,
        transactions: finalTransactions,
        appointments: finalAppointments,
        deletedIds: mergedDeleted,
        deletedTxIds: mergedDeleted.transactions,
        deletedAppointmentIds: mergedDeleted.appointments,
        deletedStaffIds: mergedDeleted.staff,
        configUpdatedAt: Math.max(existingConfigTs, incomingConfigTs),
        dailyClosings: finalDailyClosings,
        auditLogs: finalAuditLogs,
        updatedAt: Date.now()
      })

      // Detectar primer cobro o primera cita registrada en el workspace (Telemetría Onboarding)
      if (tenantId !== 'ten_1') {
        const tenantRecord = db.tenants.find(t => t && t.id === tenantId)
        const hadNoActivity = existingTxs.length === 0 && existingApts.length === 0
        const hasNewActivity = finalTransactions.length > 0 || finalAppointments.length > 0
        if (tenantRecord && !tenantRecord.firstActionNotified && hadNoActivity && hasNewActivity) {
          tenantRecord.firstActionNotified = true
          notifyCrmSaasEvent('FIRST_ACTION_COMPLETED', tenantRecord)
        }
      }

      db.workspaces[tenantId] = mergedWs
      saveDb()
      return sendJson(res, 200, {
        ok: true,
        workspace: db.workspaces[tenantId]
      })
    }
  }

  // --- COPILOT AI CHAT ROUTE (DeepSeek Flash via OpenRouter) ---
  if (pathname === '/api/copilot/chat' && req.method === 'POST') {
    const body = await parseBody(req)
    const { message, history = [], context = {}, tenantId = 'anon' } = body
    if (!message || typeof message !== 'string') {
      return sendJson(res, 400, { ok: false, error: 'Mensaje requerido' })
    }

    // Daily limit check: max 10 requests per tenant per calendar day
    const todayIso = new Date().toISOString().split('T')[0]
    if (!db.copilotUsage || typeof db.copilotUsage !== 'object') {
      db.copilotUsage = {}
    }
    const usageKey = `${tenantId}_${todayIso}`
    const currentCount = db.copilotUsage[usageKey] || 0
    const MAX_DAILY_QUOTA = 10

    if (currentCount >= MAX_DAILY_QUOTA) {
      return sendJson(res, 200, {
        ok: false,
        quotaExceeded: true,
        remainingToday: 0,
        reply: '⚡ Has alcanzado tu cupo de 10 consultas gratuitas de hoy. Mañana a primera hora se renuevan tus consultas.'
      })
    }

    const isSalon = Boolean(context.isSalon)
    const isAr = context.country === 'AR'
    const isCashierMode = Boolean(context.isCashierMode)
    const hideOwnerProfits = Boolean(isCashierMode && context.hideOwnerProfits !== false)
    const roleCopilot = isSalon ? 'Socia GlamOS' : 'Socio BarberOS'
    const currLabel = isAr ? 'ARS' : 'USD'

    const systemPrompt = `Eres "${roleCopilot}", el asistente virtual de inteligencia artificial especializado en la gestión y operación de ${isSalon ? 'salones de belleza, uñas y spas en GlamOS' : 'barberías y estudios masculinos en BarberOS'} en ${isAr ? 'Argentina' : 'Venezuela'}.

DIRECTRICES DE VOZ Y COMPORTAMIENTO:
1. TONO PROFESIONAL, CORDIAL Y NEUTRO: Trata siempre al usuario con respeto profesional y cordialidad. TIENES TERMINANTEMENTE PROHIBIDO usar modismos excesivamente informales o términos de excesiva familiaridad como "bella", "hermano", "mi pana", "chamo", "pana", "mi gente" o "amiga". Saluda siempre de forma respetuosa ("Hola", "Con gusto le asisto", "Saludos", "Por supuesto").
2. CONOCIMIENTO INTEGRAL DEL SOFTWARE (${isSalon ? 'GlamOS' : 'BarberOS'}):
Tú eres el asistente oficial DE ESTA PLATAFORMA. NUNCA recomiendes aplicaciones o servicios de terceros (como AgendaPro, Fresha, Calendly o Google Calendar). Toda la solución ya está integrada en este software:
- LINK DE AGENDA WEB / RESERVAS ONLINE:
  * El usuario encuentra su link de reservas online en la pestaña "Catálogo" del menú superior.
  * En la parte superior de esa pantalla verá la caja "Link Público de Reservas".
  * Cuenta con los botones "Copiar Link" y "Compartir en WhatsApp" para colocarlo en su biografía de Instagram, historias o enviarlo a sus clientes.
  * Su enlace directo actual de reservas es: ${context.publicBookingUrl || 'Disponible en la pestaña Catálogo'}.
  * Cuando un cliente reserva por la web, la cita aparece automáticamente en la pestaña "Citas" de su panel.
- REGISTRO DE COBROS Y CAJA DIARIA:
  * Botón dorado "+ Cobro" en la barra superior.
  * ${isAr ? 'Permite cobrar en Pesos Argentinos ($ ARS) vía Efectivo, Mercado Pago / Transferencia por Alias/CVU, Tarjeta / Point o pagos mixtos. Emite recibo digital listo para enviar por WhatsApp.' : 'Permite cobrar en Efectivo ($ USD o Bs), Pago Móvil exacto a tasa oficial BCV, Zelle o pagos mixtos (parte efectivo y parte Pago Móvil). Emite recibo digital listo para enviar por WhatsApp.'}
- CUADRE, ARQUEO CIEGO Y CIERRE DIARIO Y SEMANAL:
  * Botón "Cierre Diario" / "Cuadre Diario (Arqueo)" para el cuadre y arqueo de gaveta del día. Cuando está activo el Arqueo Ciego en Modo Cajero, la cajera ingresa el efectivo contado sin ver el monto esperado por el sistema; al guardar el cierre, el dueño ve la diferencia exacta (sobrante o faltante).
  * Botón "Cierre Semanal" (solo Modo Dueño) en el panel principal y menú superior para liquidación y balance semanal consolidado.
  * Pestaña "Reportes" (solo Modo Dueño): al seleccionar "Esta Semana" o "Semana Pasada", muestra el balance día por día (lunes a domingo) con botones para copiar o enviar el acta completa por WhatsApp.
${hideOwnerProfits ? '' : `  * Datos de Esta Semana (${context.thisWeekRange || 'Actual'}): ${context.thisWeekServicesCount || 0} atenciones, Facturado: ${context.thisWeekRevenueUSD || 0} ${currLabel}, Gastos: -${context.thisWeekExpensesUSD || 0} ${currLabel}, Comisiones: -${context.thisWeekCommissionsUSD || 0} ${currLabel}, Ganancia Limpia: ${context.thisWeekNetProfitUSD || 0} ${currLabel}.\n`}- EQUIPO, CAJERA / RECEPCIÓN, COMISIONES Y VALES:
  * Pestaña "Equipo": permite configurar especialistas con su porcentaje de comisión y registrar vales/adelantos descontados automáticamente en la liquidación.
  * También permite crear personal con rol "Cajera / Recepción" (no aparece en la agenda web pública ni como barbero en cobros), configurable con Sueldo Base Fijo (Diario, Semanal, Quincenal o Mensual) + Bono Extra por Ventas en dos modos: "$ Fijo por corte" (1 bono por cada cliente/ticket cobrado con servicio) o "% por venta" (o 0 si solo cobra sueldo fijo). Este bono se suma aparte SIN descontar nada a los barberos, con liquidación independiente y desglose por barbero.
- MODO DUEÑO VS. MODO CAJERO CON PIN:
  * Se configura en "Configuración & PIN" → pestaña "Seguridad & PIN" (disponible en Modo Dueño).
  * Permite definir el PIN maestro del dueño, bloquear un equipo o mostrador en Modo Cajero, activar auto-bloqueo por inactividad, ocultar ganancias limpias, activar Arqueo Ciego y exigir motivo o PIN para anular cobros o registrar gastos.
  * Para cambiar entre Modo Cajero y Modo Dueño se pulsa la insignia de rol en la barra superior y se ingresa el PIN del dueño.
- ANULACIONES CONTROLADAS Y AUDITORÍA ("CAJA NEGRA"):
  * Anular una venta/cobro exige obligatoriamente seleccionar o escribir un motivo (y PIN del dueño si está configurado).
  * La pestaña "Auditoría" (solo visible en Modo Dueño) guarda un historial inmutable de anulaciones, cambios de precios de catálogo, eliminación de servicios, cierres e intentos fallidos de PIN.
- CLIENTES Y RETARGETING:
  * Pestaña "Clientes": control de historial, clientes con saldos pendientes (deudas) y función de retargeting para escribir con 1 toque a quienes tienen semanas sin venir.
${isAr ? '- MONEDA Y MEDIOS DE PAGO EN ARGENTINA:\n  * Toda la operación está configurada en Pesos Argentinos ($ ARS). Nunca menciones Bolívares, Tasa BCV ni Pago Móvil; habla de Mercado Pago, Transferencia por Alias/CVU, Efectivo o Tarjeta / Point.' : `- TASA OFICIAL BCV:\n  * Se actualiza automáticamente con la tasa oficial del Banco Central de Venezuela (tasa actual: Bs. ${context.exchangeRate || 'N/A'}).`} 

3. LÍMITES ESTRICTOS (CERO CONTENIDO AJENO):
Tu única función es asesorar sobre el uso del software y el crecimiento comercial del negocio. Tienes TERMINANTEMENTE PROHIBIDO redactar cuentos, chistes, historias de ficción, poemas, tareas escolares, responder sobre política, deportes o temas ajenos al negocio. Si el usuario solicita un cuento, historia o tarea, declina cortésmente en 1 sola frase cordial recordando que estás enfocado en la gestión operativa y comercial de su negocio.

4. MENSAJES LISTOS PARA ENVIAR:
Cuando el usuario te pida redactar un mensaje (para cobrar un saldo pendiente, lanzar una promoción para la tarde o reactivar clientes inactivos), entrega el texto exacto entre comillas listo para copiar y enviar por WhatsApp con tono educado y profesional.

5. DATOS DEL NEGOCIO EN VIVO:
- Negocio: ${context.businessName || 'Mi Negocio'} (${isSalon ? 'Salón de Belleza / Uñas' : 'Barbería'})
- Rol activo: ${isCashierMode ? 'Modo Cajero' : 'Modo Dueño'}
${isAr ? '- Moneda: Pesos Argentinos ($ ARS)' : `- Tasa BCV: Bs. ${context.exchangeRate || 'N/A'}`}
- Ventas de hoy: ${hideOwnerProfits ? `${context.todayServicesCount || 0} atenciones registradas (cifras monetarias ocultas en Modo Cajero)` : `${context.todayServicesCount || 0} servicios (${context.todayRevenueUSD || 0} ${currLabel})`}
- Total en saldos pendientes: ${context.totalDebtUSD || 0} ${currLabel} (${context.debtorsCount || 0} clientes)
- Citas hoy: ${context.todayAppointmentsCount || 0}
${hideOwnerProfits ? '\nRESTRICCIÓN MODO CAJERO: El usuario actual opera en Modo Cajero con ganancias ocultas. NO muestres, estimes ni inventes cifras de facturación total, gastos, comisiones, ganancia limpia ni reportes semanales; indica cortésmente que esa información es exclusiva del Modo Dueño.' : ''}`

    const apiKey = (process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '').trim()
    const model = process.env.AI_MODEL || 'deepseek/deepseek-v4.1-flash'

    if (!apiKey) {
      console.warn('[Copilot AI] No OPENROUTER_API_KEY configured. Returning tactical fallback.')
      const q = message.toLowerCase()
      let fallback = 'Con gusto le asisto en la gestión de su negocio. Puede consultarme cómo usar las opciones de la plataforma, configuración de cajera, Modo PIN, cierre diario, agenda web o mensajes de cobro.'
      if (hideOwnerProfits && /semanal|semana|números|numeros|cómo voy|como voy|ganancia|utilidad|reporte|facturaci|ingresos/.test(q)) {
        fallback = 'Las cifras financieras, reportes semanales y ganancias limpias están protegidas y solo son visibles en Modo Dueño.'
      } else if (q.includes('cajera') || q.includes('recepcion') || q.includes('recepción') || q.includes('sueldo') || q.includes('bono fijo') || q.includes('fijo por corte')) {
        fallback = 'Para configurar una Cajera / Recepción en "Equipo":\n\n1. Ingrese a "Equipo" y cree personal con el rol "💼 Cajera / Recepción".\n2. Defina su Sueldo Base Fijo (Diario, Semanal, Quincenal o Mensual).\n3. En "Bono Extra por Ventas" elija "$ Fijo por corte" (suma 1 vez por cada cliente cobrado) o "% por venta" (o 0 si solo cobra sueldo fijo).\n\nEse bono se liquida aparte y NO descuenta nada a los barberos.'
      } else if (q.includes('pin') || q.includes('modo cajero') || q.includes('modo dueño') || q.includes('seguridad') || q.includes('bloquear')) {
        fallback = 'Para configurar el Modo Dueño vs. Modo Cajero con PIN:\n\n1. Entre a "Configuración & PIN" → pestaña "Seguridad & PIN".\n2. Defina el PIN del Dueño, active Arqueo Ciego y bloquee si desea esa PC en Modo Cajero.\n3. Para alternar entre modos, pulse la insignia de rol en la barra superior.'
      } else if (q.includes('auditoría') || q.includes('auditoria') || q.includes('caja negra') || q.includes('anular') || q.includes('elimin')) {
        fallback = 'Al anular un cobro, el sistema exige un motivo obligatorio (y PIN del Dueño si está activado). En Modo Dueño, la pestaña "Auditoría" registra anulaciones, cambios de precio, eliminaciones de servicios, cierres e intentos fallidos de PIN.'
      } else if (q.includes('arqueo') || q.includes('ciego') || q.includes('gaveta')) {
        fallback = 'En "Cierre Diario", cuando el Arqueo Ciego está activo en Modo Cajero, la cajera ingresa el efectivo físico contado sin ver el monto esperado; el dueño verá la diferencia exacta (sobrante o faltante) al revisar el cierre o auditoría.'
      } else if (q.includes('link') || q.includes('agenda') || q.includes('reserva') || q.includes('catálogo') || q.includes('catalogo')) {
        fallback = `Para obtener el enlace de su agenda web de reservas:\n\n1. Ingrese a la pestaña "Catálogo" en el menú.\n2. En la parte superior observará la sección "Link Público de Reservas".\n3. Pulse "Copiar Link" para pegarlo en sus redes o "Compartir en WhatsApp".\n\nSu enlace directo es:\n${context.publicBookingUrl || 'Disponible en menú Catálogo'}`
      } else if (q.includes('fiado') || q.includes('deuda') || q.includes('saldo') || q.includes('cobrar')) {
        fallback = isAr
          ? 'Para gestionar un saldo pendiente con educación, puede usar este mensaje:\n\n"¡Hola! 👋 Espero que se encuentre muy bien. Le escribo para cuadrar la caja de la semana; cuando tenga oportunidad me comparte el comprobante por Mercado Pago o transferencia del saldo pendiente de su última visita para actualizar su cuenta en el sistema. ¡Buen día!"'
          : 'Para gestionar un saldo pendiente con educación, puede usar este mensaje:\n\n"¡Hola! 👋 Espero que se encuentre muy bien. Le escribo para cuadrar la caja de la semana; cuando tenga oportunidad me comparte el Pago Móvil del saldo pendiente de su última visita para actualizar su cuenta en el sistema. ¡Feliz día!"'
      }
      db.copilotUsage[usageKey] = currentCount + 1
      saveDb()
      return sendJson(res, 200, {
        ok: true,
        reply: fallback,
        remainingToday: MAX_DAILY_QUOTA - (currentCount + 1)
      })
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-5) : []).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.content || '').slice(0, 400)
      })),
      { role: 'user', content: message.slice(0, 400) }
    ]

    try {
      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://barber.ingenioos.online',
          'X-Title': 'BarberOS Copilot'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 500
        })
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        const replyText = aiData?.choices?.[0]?.message?.content?.trim() || '¡Entendido hermano! ¿En qué otra cosa te apoyo hoy?'
        const usage = aiData?.usage || {}
        const promptTokens = usage.prompt_tokens || 0
        const completionTokens = usage.completion_tokens || 0
        const totalTokens = usage.total_tokens || (promptTokens + completionTokens)

        // OpenRouter DeepSeek Flash pricing (~$0.14/1M prompt, ~$0.28/1M completion)
        const queryCostUsd = ((promptTokens * 0.14) + (completionTokens * 0.28)) / 1000000

        if (!db.copilotMetrics || typeof db.copilotMetrics !== 'object') {
          db.copilotMetrics = {
            totalQueries: 0,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTokens: 0,
            estimatedCostUsd: 0,
            byTenant: {}
          }
        }
        db.copilotMetrics.totalQueries += 1
        db.copilotMetrics.totalPromptTokens += promptTokens
        db.copilotMetrics.totalCompletionTokens += completionTokens
        db.copilotMetrics.totalTokens += totalTokens
        db.copilotMetrics.estimatedCostUsd = Number((db.copilotMetrics.estimatedCostUsd + queryCostUsd).toFixed(6))

        if (!db.copilotMetrics.byTenant) db.copilotMetrics.byTenant = {}
        if (!db.copilotMetrics.byTenant[tenantId]) {
          db.copilotMetrics.byTenant[tenantId] = { queries: 0, totalTokens: 0, estimatedCostUsd: 0, lastQueryAt: null }
        }
        db.copilotMetrics.byTenant[tenantId].queries += 1
        db.copilotMetrics.byTenant[tenantId].totalTokens += totalTokens
        db.copilotMetrics.byTenant[tenantId].estimatedCostUsd = Number((db.copilotMetrics.byTenant[tenantId].estimatedCostUsd + queryCostUsd).toFixed(6))
        db.copilotMetrics.byTenant[tenantId].lastQueryAt = new Date().toISOString()

        console.log(`[Copilot AI] Tenant: ${tenantId} | Tokens: ${promptTokens} in + ${completionTokens} out = ${totalTokens} | Costo query: $${queryCostUsd.toFixed(6)} USD | Costo total acumulado: $${db.copilotMetrics.estimatedCostUsd.toFixed(5)} USD (${db.copilotMetrics.totalQueries} consultas)`)

        db.copilotUsage[usageKey] = currentCount + 1
        saveDb()
        return sendJson(res, 200, {
          ok: true,
          reply: replyText,
          remainingToday: MAX_DAILY_QUOTA - (currentCount + 1),
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
            costUsd: Number(queryCostUsd.toFixed(6))
          }
        })
      } else {
        const errText = await aiResponse.text()
        console.warn('[Copilot AI] OpenRouter HTTP error:', aiResponse.status, errText)
        let fallback = 'Con gusto le asisto. Recuerde proteger su rentabilidad ofreciendo un servicio adicional en lugar de bajar sus precios.'
        if (message.toLowerCase().includes('fiado') || message.toLowerCase().includes('deuda') || message.toLowerCase().includes('saldo')) {
          fallback = isAr
            ? 'Para cobrar un saldo pendiente con respeto, puede usar este mensaje:\n\n"¡Hola! 👋 Espero que se encuentre muy bien. Le escribo para cuadrar la caja de la semana; cuando tenga oportunidad me comparte el comprobante por Mercado Pago o transferencia de su visita pasada para actualizar su cuenta en el sistema. ¡Buen día!"'
            : 'Para cobrar un saldo pendiente con respeto, puede usar este mensaje:\n\n"¡Hola! 👋 Espero que se encuentre muy bien. Le escribo para cuadrar la caja de la semana; cuando tenga oportunidad me comparte el Pago Móvil de su visita pasada para actualizar su cuenta en el sistema. ¡Saludos!"'
        }
        db.copilotUsage[usageKey] = currentCount + 1
        saveDb()
        return sendJson(res, 200, {
          ok: true,
          reply: fallback,
          remainingToday: MAX_DAILY_QUOTA - (currentCount + 1)
        })
      }
    } catch (err) {
      console.error('[Copilot AI] Network error:', err.message)
      return sendJson(res, 200, {
        ok: true,
        reply: isAr
          ? 'Se presentó una breve intermitencia de conexión con el asistente. Si necesita cobrar un saldo pendiente, puede enviar: "¡Hola! 👋 Le escribo para cuadrar la caja de la semana; cuando pueda me comparte la transferencia o Mercado Pago de su saldo pendiente. ¡Saludos!"'
          : 'Se presentó una breve intermitencia de conexión con el asistente. Si necesita cobrar un saldo pendiente, puede enviar: "¡Hola! 👋 Le escribo para cuadrar la caja de la semana; cuando pueda me comparte el Pago Móvil de su saldo pendiente. ¡Saludos!"',
        remainingToday: MAX_DAILY_QUOTA - currentCount
      })
    }
  }


  // --- COPILOT CONSUMPTION & REAL METRICS ENDPOINT ---
  if (pathname === '/api/copilot/stats' && req.method === 'GET') {
    const metrics = db.copilotMetrics || {
      totalQueries: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      byTenant: {}
    }
    return sendJson(res, 200, {
      ok: true,
      model: process.env.AI_MODEL || 'deepseek/deepseek-v4.1-flash',
      metrics: {
        ...metrics,
        estimatedCostFormattedUsd: `$${(metrics.estimatedCostUsd || 0).toFixed(4)} USD`,
        avgTokensPerQuery: metrics.totalQueries > 0 ? Math.round(metrics.totalTokens / metrics.totalQueries) : 0,
        avgCostPerQueryUsd: metrics.totalQueries > 0 ? `$${((metrics.estimatedCostUsd || 0) / metrics.totalQueries).toFixed(6)} USD` : '$0.000000 USD'
      },
      pricingReference: {
        provider: 'OpenRouter.ai',
        model: 'deepseek/deepseek-v4.1-flash',
        promptTokensPerMillionUsd: '$0.14 USD',
        completionTokensPerMillionUsd: '$0.28 USD',
        cost1000QueriesEstimatedUsd: '~$0.05 USD (5 centavos de dólar por cada 1,000 preguntas)',
        openRouterActivityUrl: 'https://openrouter.ai/activity',
        openRouterKeysUrl: 'https://openrouter.ai/keys'
      }
    })
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
    const queryPais = (parsedUrl.searchParams.get('pais') || parsedUrl.searchParams.get('country') || '').toLowerCase()
    const isGlam = host.includes('glam') || queryBrand.includes('glam')
    const isArHost =
      host.startsWith('ar.') ||
      host.includes('-ar.') ||
      host.includes('.ar.') ||
      host.includes('argentina') ||
      queryPais === 'ar'
    let html = fs.readFileSync(htmlFilePath, 'utf8')
    if (isGlam) {
      html = html.replace(/<title>.*?<\/title>/, '<title>GlamOS · Salones de Belleza, Uñas & Spas</title>')
      html = html.replace(/content="BarberOS"/g, 'content="GlamOS"')
      html = html.replace(/content="#090a0d"/g, 'content="#ec4899"')
      html = html.replace(/\/icon\.svg/g, '/icon-glamos.svg')
    }
    if (isArHost && (htmlFilePath.endsWith('landing.html') || htmlFilePath.endsWith('landing_glamos.html'))) {
      html = html
        .replace(/href="\/\?registro=1"/g, 'href="/?pais=ar&registro=1"')
        .replace(/href="\/\?login=1"/g, 'href="/?pais=ar&login=1"')
        .replace(/6\.024%20Bs\.%2Fmes/g, '%249.800%20ARS%2Fmes')
        .replace(/Bs\.%206\.024/g, '%249.800%20ARS')
        .replace(/<span class="strike-val">Bs\. 12\.000<\/span>/g, '<span class="strike-val">$19.600 ARS</span>')
        .replace(/<span class="price-sym">Bs\.<\/span>/g, '<span class="price-sym">$</span>')
        .replace(/<span class="price-val">6\.024<\/span>/g, '<span class="price-val">9.800</span>')
        .replace(/<span class="price-cadence">\/ mes<\/span>/g, '<span class="price-cadence">ARS / mes</span>')
        .replace(/\(Equivalente a solo <strong>\$6 USD \/ USDT<\/strong> · Pago Móvil BCV o Binance\)/g, '(Plan mensual único <strong>$9.800 ARS</strong> · Mercado Pago o Transferencia)')
        .replace(/ACTIVAR MI BARBERÍA POR BS\. 6\.024/g, 'ACTIVAR MI BARBERÍA POR $9.800 ARS')
        .replace(/ACTIVAR MI SALÓN POR BS\. 6\.024/g, 'ACTIVAR MI SALÓN POR $9.800 ARS')
        .replace(/\(Bs\. 6\.024\)/g, '($9.800 ARS)')
        .replace(/Bs\. 6\.024 \(\$6\)/g, '$9.800 ARS')
        .replace(/Bs\. 6\.024/g, '$9.800 ARS')
        .replace(/Por \$6 al mes/g, 'Por $9.800 ARS al mes')
        .replace(/100% de tus 6\.024 Bs\. por Pago Móvil de inmediato/g, '100% de tus $9.800 ARS por Mercado Pago o transferencia de inmediato')
        .replace(/Caja Bimoneda BCV/g, 'Caja en Pesos ($ ARS)')
        .replace(/Efectivo \$ \(gaveta\) y Pago Móvil \(Bs\) a Tasa BCV/g, 'Efectivo (gaveta), Mercado Pago y Tarjeta / Point')
        .replace(/Efectivo \$ y mitad en Pago Móvil/g, 'Efectivo y mitad en Mercado Pago')
        .replace(/Efectivo \$ y mitad Pago Móvil/g, 'Efectivo y mitad Mercado Pago')
        .replace(/dólares en efectivo y mitad en Pago Móvil/g, 'Efectivo y mitad en Mercado Pago')
        .replace(/\(\$\/Bs\)/g, '($ ARS)')
        .replace(/Pago Móvil Bs/g, 'Mercado Pago')
        .replace(/Gaveta vs\. Pago Móvil Exacto/g, 'Gaveta vs. Mercado Pago Exacto')
        .replace(/a la Tasa BCV del día/g, 'en Pesos ($ ARS)')
        .replace(/en Bolívares a Tasa BCV/g, 'por Mercado Pago o Tarjeta')
        .replace(/cuántos dólares dio en efectivo/g, 'cuánto dio en efectivo')
        .replace(/Tasa BCV/g, 'Mercado Pago y Tarjeta')
        .replace(/Pago Móvil/g, 'Mercado Pago')
        .replace(/Venezuela/g, 'Argentina')
        .replace(/Maracaibo/g, 'Buenos Aires')
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
