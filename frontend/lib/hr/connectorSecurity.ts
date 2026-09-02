export const CONNECTOR_ADMIN_ROLES = new Set(["CEO", "IK", "HR_ADMIN"]);

export function normalizeConnectorRole(role: unknown) {
  return String(role || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function canManageConnectors(role: unknown) {
  return CONNECTOR_ADMIN_ROLES.has(normalizeConnectorRole(role));
}

export function canPersistConnectorDomain(domain: unknown) {
  return String(domain || "").trim().toLowerCase() === "employees";
}

export function maskIdentifier(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.length <= 4 ? "••••" : `${"•".repeat(Math.min(6, raw.length - 4))}${raw.slice(-4)}`;
}

export function maskName(value: unknown) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1)}${part.length > 1 ? "•••" : ""}`)
    .join(" ");
}

export function maskEmail(value: unknown) {
  const raw = String(value || "").trim();
  const at = raw.indexOf("@");
  if (at <= 0) return raw ? "••••" : "";
  return `${raw.slice(0, 1)}•••${raw.slice(at)}`;
}
