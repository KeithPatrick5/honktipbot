export function parseTip(text, registry) {
  const normalized = String(text || "").trim();
  const explicit = normalized.match(/(?:^|\s)([0-9][0-9,]*(?:\.[0-9]+)?)\s+([A-Za-z][A-Za-z0-9]{1,11})(?:\s|$)/);
  if (explicit) {
    const token = registry.get(explicit[2]);
    return token ? { amount: explicit[1], token } : null;
  }

  for (const [emoji, token] of registry.byEmoji) {
    const count = [...normalized].filter(character => character === emoji).length;
    if (count > 0) return { amount: String(count), token };
  }
  return null;
}
