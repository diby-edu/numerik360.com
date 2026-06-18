export async function generateProductDescription(productName, keywords) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Rédige une description produit commerciale courte (3-4 phrases), en français, pour : "${productName}". Mots-clés : ${keywords}. Style : direct, convaincant, sans bullet points, sans titre.`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la génération de la description')
  }

  const data = await response.json()
  return data.choices[0].message.content
}
