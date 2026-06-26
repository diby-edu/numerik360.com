const express = require('express')
const nodemailer = require('nodemailer')
require('dotenv').config()

const app = express()
app.use(express.json())

function formatXOF(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

/* ── SMTP ── */
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: (process.env.SMTP_PORT || '465') === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function sendMail(to, subject, html) {
  if (!to) return
  await mailer.sendMail({
    from: `"${process.env.SHOP_NAME || 'Boutique'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to, subject, html,
  })
}

/* ── Supabase REST ── */
async function sbQuery(method, path, body) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  return text ? JSON.parse(text) : null
}

/* ── PayDunya ── */
const PD_BASE = process.env.PAYDUNYA_MODE === 'live'
  ? 'https://app.paydunya.com/api/v1'
  : 'https://app.paydunya.com/sandbox-api/v1'

const PD_H = {
  'Content-Type': 'application/json',
  'PAYDUNYA-MASTER-KEY':  process.env.PAYDUNYA_MASTER_KEY,
  'PAYDUNYA-PUBLIC-KEY':  process.env.PAYDUNYA_PUBLIC_KEY,
  'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
  'PAYDUNYA-TOKEN':       process.env.PAYDUNYA_TOKEN,
}

/* ── Digital delivery ── */

async function getSignedUrl(bucket, path, expiresIn = 604800) {
  const r = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ expiresIn }),
    }
  )
  const d = await r.json()
  return d.signedURL ? `${process.env.SUPABASE_URL}/storage/v1${d.signedURL}` : null
}

async function claimCode(productId, orderId) {
  const rows = await sbQuery('GET', `product_codes?product_id=eq.${productId}&order_id=is.null&select=id,code&limit=1`)
  if (!rows?.length) return null
  const { id, code } = rows[0]
  await sbQuery('PATCH', `product_codes?id=eq.${id}`, { order_id: orderId, used_at: new Date().toISOString() })
  return code
}

function tplDigital(customerName, deliveries) {
  const shop = process.env.SHOP_NAME || 'Boutique'
  const rows = deliveries.map(d => {
    if (d.type === 'codes') {
      return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:12px 0">
        <p style="margin:0 0 4px;font-size:12px;color:#16a34a;font-weight:600">PRODUIT : ${d.name}</p>
        <p style="margin:0 0 6px;font-size:12px;color:#64748b">Votre code d'activation :</p>
        <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:2px;color:#1e293b;font-family:monospace">${d.value}</p>
      </div>`
    }
    return `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:12px 0">
      <p style="margin:0 0 4px;font-size:12px;color:#2563eb;font-weight:600">PRODUIT : ${d.name}</p>
      <p style="margin:0 0 8px;font-size:12px;color:#64748b">Téléchargez votre fichier (lien valable 7 jours) :</p>
      <a href="${d.value}" style="display:inline-block;background:#2563EB;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Télécharger</a>
    </div>`
  }).join('')
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2563EB;padding:28px;text-align:center">
      <h1 style="color:#fff;margin:0">${shop}</h1>
      <p style="color:rgba(255,255,255,.75);margin:6px 0 0">Livraison de votre commande numérique</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:16px">Bonjour <strong>${customerName}</strong>,</p>
      <p style="color:#64748b">Voici vos produits numériques :</p>
      ${rows}
      <p style="color:#64748b;font-size:13px;margin-top:20px">Si vous avez des questions, n'hésitez pas à nous contacter. Merci pour votre confiance !</p>
    </div>
    <div style="background:#f8fafc;padding:14px;text-align:center;font-size:12px;color:#999">© ${new Date().getFullYear()} ${shop}</div>
  </div></body></html>`
}

async function deliverDigitalItems(order) {
  if (!order.customer_email || !order.items?.length) return
  const digitalDeliveries = []
  for (const item of order.items) {
    // Fetch product to get digital delivery info
    const products = await sbQuery('GET', `products?id=eq.${item.id}&select=product_type,digital_delivery_type,digital_file_path`)
    const product = products?.[0]
    if (!product || product.product_type !== 'digital') continue

    if (product.digital_delivery_type === 'codes') {
      const code = await claimCode(item.id, order.id)
      if (code) {
        for (let q = 0; q < item.quantity; q++) {
          const c = q === 0 ? code : await claimCode(item.id, order.id)
          if (c) digitalDeliveries.push({ type: 'codes', name: item.name, value: c })
        }
      }
    } else if (product.digital_delivery_type === 'file' && product.digital_file_path) {
      const url = await getSignedUrl('products', product.digital_file_path)
      if (url) digitalDeliveries.push({ type: 'file', name: item.name, value: url })
    }
  }
  if (digitalDeliveries.length > 0) {
    const shop = process.env.SHOP_NAME || 'Boutique'
    await sendMail(
      order.customer_email,
      `Votre commande numérique — ${shop}`,
      tplDigital(order.customer_name, digitalDeliveries)
    )
  }
}

/* ── Email templates ── */
function tplConfirm(o) {
  const shop = process.env.SHOP_NAME || 'Boutique'
  const rows = (o.items || []).map(i =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">x${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatXOF(i.price * i.quantity)}</td>
    </tr>`
  ).join('')
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2563EB;padding:28px;text-align:center">
      <h1 style="color:#fff;margin:0">${shop}</h1>
      <p style="color:rgba(255,255,255,.75);margin:6px 0 0">Confirmation de commande</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:16px">Bonjour <strong>${o.customer_name}</strong>,</p>
      <p style="color:#64748b">Merci pour votre commande !</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
        <thead><tr style="background:#f8fafc">
          <th style="padding:10px;text-align:left">Produit</th>
          <th style="padding:10px;text-align:center">Qté</th>
          <th style="padding:10px;text-align:right">Prix</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:12px;font-weight:700">Total</td>
          <td style="padding:12px;font-weight:700;text-align:right;color:#2563EB">${formatXOF(o.total)}</td>
        </tr></tfoot>
      </table>
      <div style="background:#eff6ff;border-radius:8px;padding:14px;margin:10px 0;font-size:14px">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px">LIVRAISON À</p>
        <p style="margin:0;font-weight:500">${o.customer_address}</p>
      </div>
      <div style="background:#eff6ff;border-radius:8px;padding:14px;margin:10px 0;font-size:14px">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px">PAIEMENT</p>
        <p style="margin:0;font-weight:500">${o.payment_method === 'delivery' ? 'À la livraison' : 'PayDunya'}</p>
      </div>
      <p style="color:#64748b;font-size:14px">Nous vous contacterons au <strong>${o.customer_phone}</strong>. Merci de nous faire confiance !</p>
    </div>
    <div style="background:#f8fafc;padding:14px;text-align:center;font-size:12px;color:#999">© ${new Date().getFullYear()} ${shop}</div>
  </div></body></html>`
}

function tplAdmin(o) {
  const shop = process.env.SHOP_NAME || 'Boutique'
  const items = (o.items || []).map(i => `• ${i.name} x${i.quantity} — ${formatXOF(i.price * i.quantity)}`).join('<br>')
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1e293b;padding:24px">
      <h2 style="color:#fff;margin:0">Nouvelle commande — ${shop}</h2>
    </div>
    <div style="padding:28px;font-size:14px">
      <table style="width:100%">
        <tr><td style="color:#64748b;padding:6px 0;width:130px">Client</td><td style="font-weight:600">${o.customer_name}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0">Email</td><td>${o.customer_email || '—'}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0">Téléphone</td><td>${o.customer_phone}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0">Adresse</td><td>${o.customer_address}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0">Paiement</td><td>${o.payment_method === 'delivery' ? 'À la livraison' : 'PayDunya'}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0">Total</td><td style="font-weight:700;color:#2563EB;font-size:16px">${formatXOF(o.total)}</td></tr>
      </table>
      <div style="background:#f8fafc;border-radius:8px;padding:14px;margin:16px 0">
        <p style="margin:0 0 8px;font-weight:600">Articles :</p>
        <p style="margin:0;line-height:1.8">${items}</p>
      </div>
      <a href="https://numerik360.com/admin/commandes" style="display:inline-block;background:#2563EB;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600">Voir dans l'admin</a>
    </div>
  </div></body></html>`
}

function tplStatus(o, st) {
  const shop = process.env.SHOP_NAME || 'Boutique'
  const info = {
    confirmed: { e: '✅', t: 'Commande confirmée', m: 'Votre commande est en cours de préparation.' },
    shipped:   { e: '🚚', t: 'Commande expédiée',  m: 'Votre commande est en route !' },
    delivered: { e: '🎉', t: 'Commande livrée',    m: 'Votre commande a bien été livrée. Merci !' },
    cancelled: { e: '❌', t: 'Commande annulée',   m: "Votre commande a été annulée. Contactez-nous pour plus d'informations." },
  }
  const i = info[st] || { e: 'ℹ️', t: 'Mise à jour', m: 'Statut : ' + st }
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2563EB;padding:28px;text-align:center">
      <div style="font-size:44px">${i.e}</div>
      <h1 style="color:#fff;margin:8px 0 0;font-size:20px">${i.t}</h1>
    </div>
    <div style="padding:28px">
      <p style="font-size:16px">Bonjour <strong>${o.customer_name}</strong>,</p>
      <p style="color:#64748b">${i.m}</p>
      <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:20px 0;text-align:center">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px">MONTANT</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#2563EB">${formatXOF(o.total)}</p>
      </div>
      <p style="color:#64748b;font-size:14px">L'équipe ${shop}</p>
    </div>
    <div style="background:#f8fafc;padding:14px;text-align:center;font-size:12px;color:#999">© ${new Date().getFullYear()} ${shop}</div>
  </div></body></html>`
}

/* ══ ROUTES ══ */

app.post('/api/openai', async (req, res) => {
  try {
    const { prompt, maxTokens = 300 } = req.body
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    })
    const d = await r.json()
    res.json({ result: d.choices[0].message.content.trim() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/generate-description', async (req, res) => {
  const { productName, keywords } = req.body
  const prompt = `Rédige une description produit commerciale courte (3-4 phrases), en français, pour : "${productName}". Mots-clés : ${keywords}. Style : direct, convaincant, sans bullet points, sans titre.`
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
    })
    const d = await r.json()
    res.json({ description: d.choices[0].message.content })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* Emails : nouvelle commande */
app.post('/api/notify-order', async (req, res) => {
  try {
    const { order } = req.body
    const shop = process.env.SHOP_NAME || 'Boutique'
    await Promise.all([
      order.customer_email && sendMail(order.customer_email, `Confirmation de commande — ${shop}`, tplConfirm(order)),
      sendMail(process.env.ADMIN_EMAIL, `Nouvelle commande — ${shop}`, tplAdmin(order)),
    ])
    // Livraison numérique immédiate pour les commandes à la livraison
    if (order.payment_method === 'delivery') {
      await deliverDigitalItems(order)
    }
    res.json({ ok: true })
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }) }
})

/* Emails : changement statut */
app.post('/api/notify-status', async (req, res) => {
  try {
    const { order, newStatus } = req.body
    if (!order.customer_email) return res.json({ ok: true, skipped: 'no email' })
    const shop = process.env.SHOP_NAME || 'Boutique'
    const labels = { confirmed: 'confirmée', shipped: 'expédiée', delivered: 'livrée', cancelled: 'annulée' }
    await sendMail(
      order.customer_email,
      `Votre commande a été ${labels[newStatus] || newStatus} — ${shop}`,
      tplStatus(order, newStatus)
    )
    res.json({ ok: true })
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }) }
})

/* PayDunya : créer facture */
app.post('/api/paydunya/checkout', async (req, res) => {
  try {
    const { orderId, total, customerEmail } = req.body
    const shop = process.env.SHOP_NAME || 'Boutique'
    const body = {
      invoice: { total_amount: Math.round(total), description: `Commande ${shop}` },
      store: { name: shop },
      actions: {
        cancel_url:   'https://numerik360.com/checkout?payment=annule',
        return_url:   'https://numerik360.com/commande-confirmee',
        callback_url: 'https://numerik360.com/api/paydunya-webhook',
      },
      custom_data: { order_id: orderId, customer_email: customerEmail },
    }
    const r = await fetch(`${PD_BASE}/checkout-invoice/create`, { method: 'POST', headers: PD_H, body: JSON.stringify(body) })
    const d = await r.json()
    if (d.response_code !== '00') return res.status(400).json({ error: d.description || 'Erreur PayDunya' })
    await sbQuery('PATCH', `orders?id=eq.${orderId}`, { paydunya_token: d.token, payment_status: 'pending' })
    res.json({ invoice_url: d.invoice_url, token: d.token })
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }) }
})

/* PayDunya : IPN Webhook */
app.post('/api/paydunya-webhook', async (req, res) => {
  try {
    const token = req.body?.data?.invoice?.token
    if (!token) return res.status(400).json({ error: 'Token manquant' })
    const vr = await fetch(`${PD_BASE}/checkout-invoice/confirm/${token}`, { headers: PD_H })
    const vd = await vr.json()
    if (vd.response_code !== '00') return res.status(400).json({ error: 'Vérification échouée' })
    if (vd.invoice?.status !== 'completed') return res.json({ ok: true, status: vd.invoice?.status })
    const orders = await sbQuery('GET', `orders?paydunya_token=eq.${token}&select=*`)
    const order = orders?.[0]
    if (!order) return res.status(404).json({ error: 'Commande introuvable' })
    await sbQuery('PATCH', `orders?id=eq.${order.id}`, { payment_status: 'paid', status: 'confirmed' })
    const shop = process.env.SHOP_NAME || 'Boutique'
    await Promise.all([
      order.customer_email && sendMail(order.customer_email, `Paiement confirmé — ${shop}`, tplConfirm({ ...order, payment_method: 'paydunya' })),
      sendMail(process.env.ADMIN_EMAIL, `Paiement reçu — ${shop}`, tplAdmin({ ...order, payment_method: 'paydunya' })),
    ])
    // Livraison numérique après confirmation du paiement PayDunya
    await deliverDigitalItems(order)
    res.json({ ok: true })
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }) }
})

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER
    await sendMail(
      adminEmail,
      `[Contact] ${subject || 'Message depuis le site'}`,
      `<p><strong>Nom :</strong> ${name}</p>
       <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
       <p><strong>Message :</strong><br>${message.replace(/\n/g, '<br>')}</p>`
    )
    res.json({ ok: true })
  } catch (e) {
    console.error('contact mail error', e)
    res.status(500).json({ error: e.message })
  }
})

app.listen(3005, () => console.log('API numerik360 port 3005'))
