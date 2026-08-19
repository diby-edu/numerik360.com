// Optimise une image avant l'upload :
//  - recadrage en CARRÉ (centré, façon "cover") pour un rendu uniforme
//  - redimensionnement (par défaut 1000×1000)
//  - conversion en WebP (poids réduit d'environ 90%)
// Sans perte visible. Résilient : si le navigateur ne peut pas traiter
// l'image (très ancien, format exotique), on garde le fichier d'origine.

export async function optimizeImage(file, { size = 1000, quality = 0.82 } = {}) {
  // On ne touche pas aux GIF (animation) ni aux non-images
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') return file

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const { width, height } = bitmap
  const side = Math.min(width, height)     // côté du carré = plus petite dimension
  const sx = (width - side) / 2            // recadrage centré
  const sy = (height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close?.()

  const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', quality))
  if (!blob) return file // WebP non supporté → on garde l'original

  const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.webp'
  return new File([blob], name, { type: 'image/webp' })
}
