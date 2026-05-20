// Progressive-overload math for the Plan feature. Pure functions, weights in kg.

const COMPOUND_RE = /(bench|squat|deadlift|\brow\b|press|ohp|military|pull[- ]?up|chin[- ]?up|dip)/i

/** Default weekly weight increment (kg) based on exercise name. */
export function classifyIncrement(exerciseName) {
  if (!exerciseName) return 1.25
  return COMPOUND_RE.test(exerciseName) ? 2.5 : 1.25
}

/**
 * Prescribed weight in kg for the given week (1-indexed).
 * Rounds to nearest 0.5 kg for plate-friendly numbers.
 */
export function prescribedWeight(baselineKg, incrementKg, weekNumber) {
  const w    = Math.max(1, Number(weekNumber) || 1)
  const base = Number(baselineKg) || 0
  const inc  = Number(incrementKg) || 0
  const raw  = base + (w - 1) * inc
  return Math.round(raw * 2) / 2
}
