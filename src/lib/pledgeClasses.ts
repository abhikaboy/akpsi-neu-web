// Class order mirrors the Sanity schema: Greek alphabet, then doubles after
// Omega (Alpha Alpha, ...). Keep in sync with sanity/schemaTypes/memberType.ts.
const GREEK = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho',
  'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
]

export const PLEDGE_CLASS_ORDER: Record<string, number> = Object.fromEntries(
  [...GREEK, ...GREEK.map((l) => `Alpha ${l}`)].map((c, i) => [c, i + 1]),
)

// Latest pledge class first; unknown classes (order 0) sink to the end.
export function sortByClassOrder([a]: [string, unknown], [b]: [string, unknown]): number {
  const orderA = PLEDGE_CLASS_ORDER[a] || 0
  const orderB = PLEDGE_CLASS_ORDER[b] || 0
  return orderB - orderA
}
