export function toScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const normalized = trimmed.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatScore(value: unknown, digits: number = 1): string {
  const score = toScore(value);
  return score === null ? "—" : score.toFixed(digits);
}

export function assertScoreRange(value: unknown): number | null {
  const score = toScore(value);
  if (score === null) {
    return null;
  }
  if (process.env.NODE_ENV !== "production" && (score < 0 || score > 5)) {
    console.warn("[score] Out of range:", score, { value });
  }
  return score;
}
