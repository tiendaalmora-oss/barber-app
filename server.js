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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
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

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8')
      const parsed = JSON.parse(raw)
      return {
        saasConfig: { ...DEFAULT_SAAS_CONFIG, ...(parsed.saasConfig || {}) },
        tenants: Array.isArray(parsed.tenants) && parsed.tenants.length > 0 ? parsed.tenants : DEFAULT_TENANTS,
        workspaces: parsed.workspaces || {}
      }
    }
  } catch (err) {
    console.error('Error loading DB, using defaults:', err)
  }
  const initial = {
    saasConfig: DEFAULT_SAAS_CONFIG,
    tenants: DEFAULT_TENANTS,
    workspaces: {}
  }
  saveDb(initial)
  return initial
}

let db = loadDb()

function saveDb(data = db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8')
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
  '.woff2': 'font/woff2'
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
      tenants: db.tenants
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
      const idx = db.tenants.findIndex(
        t => t.id === tenant.id || (tenant.email && t.email.toLowerCase() === tenant.email.toLowerCase())
      )
      if (idx >= 0) {
        db.tenants[idx] = { ...db.tenants[idx], ...tenant }
      } else {
        db.tenants.unshift(tenant)
      }
      saveDb()
    }
    return sendJson(res, 200, { ok: true, tenants: db.tenants })
  }

  if (pathname === '/api/tenants/sync-local' && req.method === 'POST') {
    // Merges any locally created tenants from browser storage into server DB without losing server updates
    const body = await parseBody(req)
    const localTenants = Array.isArray(body.tenants) ? body.tenants : []
    let changed = false
    for (const lt of localTenants) {
      if (!lt || !lt.email) continue
      if (['ten_2', 'ten_3', 'ten_4'].includes(lt.id)) continue
      const exists = db.tenants.find(t => t.email.toLowerCase() === lt.email.toLowerCase() || t.id === lt.id)
      if (!exists) {
        db.tenants.unshift(lt)
        changed = true
      }
    }
    if (changed) saveDb()
    return sendJson(res, 200, { ok: true, tenants: db.tenants, saasConfig: db.saasConfig })
  }

  if (pathname === '/api/tenants/delete' && req.method === 'POST') {
    const body = await parseBody(req)
    if (body.id) {
      db.tenants = db.tenants.filter(t => t.id !== body.id)
      delete db.workspaces[body.id]
      saveDb()
    }
    return sendJson(res, 200, { ok: true, tenants: db.tenants })
  }

  if (pathname.startsWith('/api/workspace/')) {
    const tenantId = decodeURIComponent(pathname.replace('/api/workspace/', ''))
    if (!tenantId) return sendJson(res, 400, { error: 'Missing tenantId' })

    if (req.method === 'GET') {
      return sendJson(res, 200, {
        ok: true,
        workspace: db.workspaces[tenantId] || null
      })
    }

    if (req.method === 'POST') {
      const body = await parseBody(req)
      db.workspaces[tenantId] = {
        ...(db.workspaces[tenantId] || {}),
        ...(body || {}),
        updatedAt: Date.now()
      }
      saveDb()
      return sendJson(res, 200, {
        ok: true,
        workspace: db.workspaces[tenantId]
      })
    }
  }

  // --- STATIC SPA SERVING ---
  let targetPath = pathname
  if (targetPath === '/landing' || targetPath === '/v4' || targetPath === '/ventas') {
    targetPath = '/landing.html'
  }
  let filePath = path.join(DIST_DIR, targetPath === '/' ? 'index.html' : targetPath)
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    })
    fs.createReadStream(filePath).pipe(res)
  } else {
    // SPA Fallback to index.html
    const indexHtml = path.join(DIST_DIR, 'index.html')
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      })
      fs.createReadStream(indexHtml).pipe(res)
    } else {
      res.writeHead(404)
      res.end('Build not found')
    }
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Ingenio OS Barber SaaS Server running on port ${PORT}`)
})
