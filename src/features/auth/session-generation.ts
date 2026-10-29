let generation = 0

export function currentSessionGeneration(): number {
  return generation
}

export function bumpSessionGeneration(): number {
  generation += 1
  return generation
}
