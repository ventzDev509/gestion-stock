import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeDatabase, pool, registerDatabaseRoutes } from './database.mjs'

const app = express()
const port = Number(process.env.PORT || 10000)
const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(here, '../dist')
app.set('trust proxy', 1)
app.use(express.json({ limit: '16kb' }))

const delivered = new Map()
const requestsByIp = new Map()
let requestsToday = 0
let dayKey = new Date().toISOString().slice(0, 10)

function rateLimit(ip) {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== dayKey) { dayKey = today; requestsToday = 0; requestsByIp.clear() }
  const now = Date.now()
  const bucket = requestsByIp.get(ip) || { startedAt: now, count: 0 }
  if (now - bucket.startedAt > 60 * 60 * 1000) { bucket.startedAt = now; bucket.count = 0 }
  bucket.count += 1
  requestsByIp.set(ip, bucket)
  requestsToday += 1
  return bucket.count <= 8 && requestsToday <= 300
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

async function sendEmail(event) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) throw new Error('Courriel non configuré : RESEND_API_KEY et EMAIL_FROM requis.')
  const to = process.env.ALERT_EMAIL_TO || 'ventzdev@gmail.com'
  const subject = `Alerte stock : ${event.products.length} produit(s) en rupture`
  const rows = event.products.map(p => `<li><strong>${escapeHtml(p.name)}</strong> (${escapeHtml(p.code)}) : ${p.currentStock} ${escapeHtml(p.unit)} disponible(s), seuil ${p.threshold}</li>`).join('')
  const text = [`Alerte de rupture de stock — ${new Date(event.occurredAt).toLocaleString('fr-HT')}`, '', ...event.products.map(p => `- ${p.name} (${p.code}) : ${p.currentStock} ${p.unit} disponible(s), seuil ${p.threshold}`)].join('\n')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, html: `<h2>Alerte de rupture de stock</h2><p>${escapeHtml(new Date(event.occurredAt).toLocaleString('fr-HT'))}</p><ul>${rows}</ul>` }),
  })
  if (!response.ok) throw new Error(`Courriel refusé par le fournisseur (HTTP ${response.status}).`)
}

async function sendWhatsApp(event) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const template = process.env.WHATSAPP_TEMPLATE_NAME
  if (!token || !phoneId || !template) throw new Error('WhatsApp non configuré : WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_TEMPLATE_NAME requis.')
  const to = (process.env.ALERT_WHATSAPP_TO || '50946123390').replace(/\D/g, '')
  const version = process.env.WHATSAPP_API_VERSION || 'v27.0'
  const language = process.env.WHATSAPP_LANGUAGE || 'fr'
  const summary = event.products.map(p => `${p.name} (${p.code}), stock ${p.currentStock} ${p.unit}, seuil ${p.threshold}`).join('; ').slice(0, 900)
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: template, language: { code: language }, components: [{ type: 'body', parameters: [{ type: 'text', text: summary }] }] },
    }),
  })
  if (!response.ok) throw new Error(`WhatsApp a refusé le message (HTTP ${response.status}).`)
}

async function deliverStockout(event){
  let state=delivered.get(event.eventId);if(!state){state={email:false,whatsapp:false};delivered.set(event.eventId,state)}
  const channels={},tasks=[]
  if(process.env.RESEND_API_KEY&&!state.email)tasks.push(sendEmail(event).then(()=>{state.email=true;channels.email={sent:true}}).catch(error=>{channels.email={sent:false,error:error.message}}))
  if(process.env.WHATSAPP_TOKEN&&!state.whatsapp)tasks.push(sendWhatsApp(event).then(()=>{state.whatsapp=true;channels.whatsapp={sent:true}}).catch(error=>{channels.whatsapp={sent:false,error:error.message}}))
  if(!tasks.length)return{ok:false,channels:{}}
  await Promise.all(tasks)
  const configured=[process.env.RESEND_API_KEY?'email':null,process.env.WHATSAPP_TOKEN?'whatsapp':null].filter(Boolean)
  for(const channel of configured)if(!(channel in channels))channels[channel]={sent:Boolean(state[channel])}
  return{ok:configured.every(channel=>state[channel]),channels}
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: Boolean(pool) }))
registerDatabaseRoutes(app,{notifyOutOfStock:async event=>{const result=await deliverStockout(event);if(!result.ok)console.error('Échec partiel de notification de rupture',event.eventId,result.channels)}})
app.post('/api/stockout-alert', async (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false, message: 'Connexion requise.' })
  const ip = req.ip || 'unknown'
  if (!rateLimit(ip)) return res.status(429).json({ ok: false, message: 'Trop de tentatives. Réessayez plus tard.' })
  const event = req.body
  if (!event || typeof event.eventId !== 'string' || event.eventId.length > 100 || !Array.isArray(event.products) || event.products.length < 1 || event.products.length > 20) {
    return res.status(400).json({ ok: false, message: 'Données d’alerte invalides.' })
  }
  if (!event.products.every(p => p && typeof p.name === 'string' && p.name.length <= 120 && typeof p.code === 'string' && p.code.length <= 40 && typeof p.unit === 'string' && p.unit.length <= 30 && Number.isFinite(p.currentStock) && p.currentStock === 0 && Number.isFinite(p.threshold) && p.threshold >= 0)) {
    return res.status(400).json({ ok: false, message: 'Le message doit concerner un stock à zéro.' })
  }
  const result=await deliverStockout(event);if(!Object.keys(result.channels).length)return res.status(503).json({ok:false,message:'Aucun canal d’alerte n’est configuré.'});return res.status(result.ok?200:207).json(result)
})

app.use(express.static(dist))
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html'), error => { if (error) res.status(404).send('Application non construite. Lancez npm run build.') }))

if(pool)await initializeDatabase()
app.listen(port, '0.0.0.0', () => console.log(`StockPilot écoute sur le port ${port}`))
