export function sanitizeInput(str: string): string {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#x3D;')
}

export function detectAttack(str: string): string | null {
  const patterns = [
    { re: /<script/i, label: 'XSS script injection' },
    { re: /javascript:/i, label: 'JavaScript protocol injection' },
    { re: /on\w+\s*=/i, label: 'HTML event handler injection' },
    { re: /union\s+select/i, label: 'SQL UNION injection' },
    { re: /drop\s+table/i, label: 'SQL DROP injection' },
    { re: /insert\s+into/i, label: 'SQL INSERT injection' },
    { re: /eval\s*\(/i, label: 'eval() injection' },
    { re: /document\.cookie/i, label: 'Cookie theft attempt' },
    { re: /window\.location/i, label: 'Redirect injection' },
    { re: /<iframe/i, label: 'iframe injection' },
  ]
  for (const p of patterns) {
    if (p.re.test(str)) return p.label
  }
  return null
}
