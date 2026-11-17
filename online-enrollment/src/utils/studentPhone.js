export function normalizePhilippineMobileNumber(value) {
  const compact = String(value ?? "").trim().replace(/[\s()-]/g, "");
  const localNumber = compact.replace(/^(?:\+?63)(9\d{9})$/, "0$1");
  return /^09\d{9}$/.test(localNumber) ? localNumber : null;
}
