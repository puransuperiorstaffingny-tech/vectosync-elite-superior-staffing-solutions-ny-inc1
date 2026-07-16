const VALID_PAYMENT_METHODS = new Set(["direct_deposit", "paycard", "check"]);

export function normalizePaymentMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (VALID_PAYMENT_METHODS.has(normalized)) return normalized;
  return "";
}

export function getEmployeePaymentMethod(employee) {
  const explicit = normalizePaymentMethod(employee?.payment_method);
  if (explicit) return explicit;

  if (employee?.paycard_id) return "paycard";
  if (employee?.bank_account_number || employee?.bank_routing_number) return "direct_deposit";
  return "";
}

export function isPaycardEmployee(employee) {
  const method = getEmployeePaymentMethod(employee);
  return method === "paycard" || (!method && !!employee?.paycard_id);
}

export function isCheckEmployee(employee) {
  return getEmployeePaymentMethod(employee) === "check";
}