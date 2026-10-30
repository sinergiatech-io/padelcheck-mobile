export interface Category { id: string; code: string; name: string; rankOrder: number }
export interface CategoryPolicy { clubId: string; allowedHigherCategoriesCount: number }

export function parseCatalog(value: unknown): Category[] {
  if (!Array.isArray(value) || value.length !== 8) throw new Error('Catálogo no disponible')
  const result = value as Category[]
  if (result.some(c => !c || typeof c.id !== 'string' || !c.id || typeof c.code !== 'string' ||
    typeof c.name !== 'string' || !c.name || !Number.isInteger(c.rankOrder) || c.rankOrder < 1 || c.rankOrder > 8) ||
    new Set(result.map(c => c.id)).size !== 8 || new Set(result.map(c => c.rankOrder)).size !== 8) {
    throw new Error('Catálogo no disponible')
  }
  return [...result].sort((a, b) => a.rankOrder - b.rankOrder)
}

export function parsePolicy(value: unknown, clubId: string): CategoryPolicy {
  const policy = value as CategoryPolicy | null
  if (!policy || policy.clubId !== clubId || !Number.isInteger(policy.allowedHigherCategoriesCount) ||
    policy.allowedHigherCategoriesCount < 0 || policy.allowedHigherCategoriesCount > 7) {
    throw new Error('Política no disponible')
  }
  return policy
}
export function optionLabel(count: number) {
  return count === 0 ? '0 — Solo su categoría' : count === 1 ? '1 categoría superior' : `${count} categorías superiores`
}
export function example(categories: Category[], count: number) {
  const levels = categories.filter(c => c.rankOrder <= 7 && c.rankOrder >= Math.max(1, 7 - count))
    .reverse().map(c => c.name)
  const list = levels.length <= 1 ? levels[0] : `${levels.slice(0, -1).join(', ')} o ${levels.at(-1)}`
  return `Ejemplo en Simple: un jugador de 7ma puede jugar en ${list}.`
}
export const EFFECTIVE_HELP = 'Se toma su categoría local en este club; si no tiene una, la base. Se evalúa a ambos jugadores.'
export const TYPE_HELP = 'En Simple no se permite jugar en categorías de menor nivel. En Suma el límite se aplica a cada jugador; Combinado exige la combinación exacta y OPEN no restringe categorías.'
