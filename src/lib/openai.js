async function callOpenAI(prompt, maxTokens = 300) {
  if (import.meta.env.PROD) {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens }),
    })
    if (!response.ok) throw new Error('Erreur lors de la génération')
    const data = await response.json()
    return data.result
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) throw new Error('Erreur lors de la génération')
  const data = await response.json()
  return data.choices[0].message.content.trim()
}

export async function generateProductDescription(productName, keywords) {
  return callOpenAI(
    `Rédige une description produit commerciale courte (3-4 phrases), en français, pour : "${productName}". Mots-clés : ${keywords}. Style : direct, convaincant, sans bullet points, sans titre.`,
    300
  )
}

export async function generateProductSEO(productName, description) {
  const prompt = `Pour un produit e-commerce en français nommé "${productName}"${description ? ` (${description.slice(0, 100)}...)` : ''}, génère exactement :
1. Un titre SEO (max 60 caractères, accrocheur, inclut le nom du produit)
2. Une meta description SEO (max 155 caractères, incite au clic, inclut un bénéfice clé)

Réponds UNIQUEMENT au format JSON strict :
{"title": "...", "description": "..."}`

  const raw = await callOpenAI(prompt, 200)
  try {
    const json = raw.match(/\{[\s\S]*\}/)
    if (!json) throw new Error('Format invalide')
    return JSON.parse(json[0])
  } catch {
    throw new Error('La réponse OpenAI n\'était pas au format attendu. Réessayez.')
  }
}
