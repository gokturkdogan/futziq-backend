export const RANDOM_SCOPE_CODE = 'RANDOM';

export function isRandomScopeCode(code: string): boolean {
  return code === RANDOM_SCOPE_CODE;
}

export function pickRandomPlayableScopeRule<T extends { scope: { code: string } }>(
  rules: T[],
): T | null {
  const playable = rules.filter((rule) => !isRandomScopeCode(rule.scope.code));
  if (playable.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * playable.length);
  return playable[index] ?? null;
}
