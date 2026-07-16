/**
 * Renders a sample invoice or timesheet at exactly 7 x 4.5 inches using a template's colors.
 * Used for previews and printing (add className="print-doc" to print this node only).
 */
export default function BillingDocPreview({ template, type, printable = false }) {
  const t = template;
  const headerStyle = { backgroundColor: t.accent, color: t.text };

  return (
    <div className={`doc-7x45 bg-white text-[9px] leading-tight ${printable ? "print-doc" : ""}`} style={{ color: t.body }}>
      {/* Header band */}
      <div className="px-4 py-3 flex items-start justify-between" style={headerStyle}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center font-black">S</div>
          <div>
            <div className="font-extrabold text-[12px] leading-none">Superior Staffing Solutions NY Inc</div>
            <div className="opacity-80 text-[8px] mt-0.5">132-18 Rockaway Blvd, Jamaica, NY 11420</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-black text-[14px] uppercase tracking-wide">{type === "invoice" ? "Invoice" : "Timesheet"}</div>
          <div className="opacity-85 text-[8px] mt-0.5">{type === "invoice" ? "INV-000123" : "Week of Jan 6, 2026"}</div>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-4 py-2 flex justify-between border-b border-slate-200">
        <div>
          <div className="font-semibold">{type === "invoice" ? "Bill To:" : "Employee:"}</div>
          <div>{type === "invoice" ? "Acme Corporation" : "Jane Smith — EMP-001"}</div>
          <div className="opacity-70">{type === "invoice" ? "billing@acme.com" : "Operations Dept."}</div>
        </div>
        <div className="text-right">
          <div><span className="opacity-70">Date: </span>Jan 15, 2026</div>
          <div><span className="opacity-70">{type === "invoice" ? "Due: " : "Period: "}</span>{type === "invoice" ? "Feb 14, 2026" : "Jan 6–12"}</div>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 py-2">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: t.tableHead, color: t.tableHeadText }}>
              {(type === "invoice"
                ? ["Description", "Hours", "Rate", "Amount"]
                : ["Date", "In", "Out", "Break", "Hours"]
              ).map(h => (
                <th key={h} className="px-2 py-1 text-left font-semibold border border-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {type === "invoice" ? (
              [
                ["Regular Staffing — Pay Code REG", "80.0", "$28.00", "$2,240.00"],
                ["Overtime — Pay Code OT", "6.0", "$42.00", "$252.00"],
                ["Weekend Coverage", "12.0", "$32.00", "$384.00"],
              ].map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className="px-2 py-1 border border-slate-200">{c}</td>)}</tr>
              ))
            ) : (
              [
                ["Mon Jan 6", "08:00", "17:00", "30m", "8.5"],
                ["Tue Jan 7", "08:00", "16:30", "30m", "8.0"],
                ["Wed Jan 8", "08:00", "17:15", "45m", "8.5"],
                ["Thu Jan 9", "08:00", "17:00", "30m", "8.5"],
              ].map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className="px-2 py-1 border border-slate-200">{c}</td>)}</tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-4 pb-3 flex justify-end">
        <div className="w-48 text-[9px]">
          {type === "invoice" ? (
            <>
              <div className="flex justify-between"><span className="opacity-70">Subtotal</span><span>$2,876.00</span></div>
              <div className="flex justify-between"><span className="opacity-70">Tax (0%)</span><span>$0.00</span></div>
              <div className="flex justify-between font-black mt-1 px-2 py-1 rounded" style={{ backgroundColor: t.accent, color: t.text }}>
                <span>Total Due</span><span>$2,876.00</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between font-black px-2 py-1 rounded" style={{ backgroundColor: t.accent, color: t.text }}>
              <span>Total Hours</span><span>33.5h</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-2 text-[7px] opacity-50 border-t border-slate-100 pt-1">
        Computer-generated document · Superior Staffing Solutions NY Inc · Powered by VectoSync Elite+
      </div>
    </div>
  );
}