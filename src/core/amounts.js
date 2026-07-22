export function parseAmount(value, decimals) {
  const input = String(value).replaceAll(",", "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(input)) throw new Error("Amount must be a positive number.");
  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > decimals) throw new Error(`Amount supports at most ${decimals} decimal places.`);
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
  if (units <= 0n) throw new Error("Amount must be greater than zero.");
  return units;
}

export function formatAmount(units, decimals) {
  const value = BigInt(units);
  if (decimals === 0) return value.toString();
  const scale = 10n ** BigInt(decimals);
  const fraction = (value % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${value / scale}.${fraction}` : (value / scale).toString();
}
