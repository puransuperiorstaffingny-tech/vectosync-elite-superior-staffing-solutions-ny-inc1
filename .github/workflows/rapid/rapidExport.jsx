// Rapid Paycard "Instant Issue Limited" upload-file builder.
// Produces a CSV matching the official Rapid template column order:
// Card ID | Last Name | First Name | Address Line 1 | Address Line 2 |
// City | State | Zip | Date of Birth | Social Security # | Phone | Reserved

export const RAPID_COLUMNS = [
  "Card ID",
  "Last Name",
  "First Name",
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "Zip",
  "Date of Birth",
  "Social Security #",
  "Phone",
  "Reserved",
];

// Required fields per Rapid for a successful instant-issue.
export const RAPID_REQUIRED = ["First Name", "Last Name", "Address Line 1", "City", "State", "Zip", "Date of Birth", "Social Security #"];

function csvCell(v) {
  const s = v === undefined || v === null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Format helpers per Rapid SFTP spec.
// DOB -> YYYYMMDD (accepts ISO dates like 1990-04-21 or already-compact values).
function fmtDob(v) {
  if (!v) return "";
  const digits = String(v).replace(/\D/g, "");
  return digits.slice(0, 8);
}
// SSN -> digits only, no dashes.
function fmtSsn(v) {
  if (!v) return "";
  return String(v).replace(/\D/g, "").slice(0, 9);
}
// Zip -> 5 or 9 digits, no hyphen.
function fmtZip(v) {
  if (!v) return "";
  const digits = String(v).replace(/\D/g, "");
  return digits.length > 5 ? digits.slice(0, 9) : digits.slice(0, 5);
}

// Map an Employee record -> a row object keyed by RAPID_COLUMNS.
export function employeeToRapidRow(emp) {
  return {
    "Card ID": emp.paycard_id || "",
    "Last Name": emp.last_name || "",
    "First Name": emp.first_name || "",
    "Address Line 1": emp.address_line1 || "",
    "Address Line 2": emp.address_line2 || "",
    "City": emp.city || "",
    "State": emp.state || "",
    "Zip": fmtZip(emp.zip_code),
    "Date of Birth": fmtDob(emp.dob),
    "Social Security #": fmtSsn(emp.ssn_full || emp.ssn_last4),
    "Phone": emp.phone || "",
    "Reserved": "",
  };
}

// Which required columns are missing (or invalid) for a given row.
export function missingRequired(row) {
  return RAPID_REQUIRED.filter((c) => {
    const val = String(row[c] || "").trim();
    if (!val) return true;
    // SSN must be a full 9 digits; a 4-digit "last 4" is not enough for card issuance.
    if (c === "Social Security #") return val.replace(/\D/g, "").length !== 9;
    // DOB must be a complete YYYYMMDD.
    if (c === "Date of Birth") return val.replace(/\D/g, "").length !== 8;
    return false;
  });
}

// Build the full CSV text (header row + data rows).
export function buildRapidCsv(rows) {
  const header = RAPID_COLUMNS.map(csvCell).join(",");
  const body = rows
    .map((r) => RAPID_COLUMNS.map((c) => csvCell(r[c])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

// Unique filename per upload, e.g. SuperiorStaffing_InstantIssue_20260615_143022_ab12.csv
export function rapidFileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6);
  return `SuperiorStaffing_InstantIssue_${stamp}_${rand}.csv`;
}

// Trigger a browser download of the CSV.
export function downloadCsv(csvText, fileName) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}