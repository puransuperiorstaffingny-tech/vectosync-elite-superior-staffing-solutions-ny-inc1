import { useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ─────────────────────────── Scientific Calculator ─────────────────────────── */
function ScientificCalc() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [memory, setMemory] = useState(0);
  const [isRad, setIsRad] = useState(true);
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [history, setHistory] = useState([]);

  const toRad = (x) => isRad ? x : (x * Math.PI) / 180;

  const press = useCallback((val) => {
    if (val === "C") { setDisplay("0"); setExpression(""); setJustEvaluated(false); return; }
    if (val === "⌫") {
      setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
      return;
    }
    if (val === "=") {
      try {
        let expr = expression + display;
        // Replace scientific tokens
        expr = expr
          .replace(/sin\(/g, `Math.sin(`)
          .replace(/cos\(/g, `Math.cos(`)
          .replace(/tan\(/g, `Math.tan(`)
          .replace(/asin\(/g, `Math.asin(`)
          .replace(/acos\(/g, `Math.acos(`)
          .replace(/atan\(/g, `Math.atan(`)
          .replace(/log\(/g, `Math.log10(`)
          .replace(/ln\(/g, `Math.log(`)
          .replace(/√\(/g, `Math.sqrt(`)
          .replace(/π/g, `Math.PI`)
          .replace(/e/g, `Math.E`)
          .replace(/\^/g, `**`);
        // Wrap trig args in toRad if needed
        if (!isRad) {
          expr = expr.replace(/Math\.(sin|cos|tan)\(([^)]+)\)/g, (_, fn, arg) => `Math.${fn}(${arg}*Math.PI/180)`);
        }
        const result = eval(expr); // eslint-disable-line
        const rounded = parseFloat(result.toPrecision(12)).toString();
        setHistory(h => [`${expression}${display} = ${rounded}`, ...h.slice(0, 9)]);
        setDisplay(rounded);
        setExpression("");
        setJustEvaluated(true);
      } catch {
        setDisplay("Error");
        setExpression("");
        setJustEvaluated(true);
      }
      return;
    }

    const isOp = ["+", "-", "×", "÷", "^"].includes(val);
    const opMap = { "×": "*", "÷": "/" };

    if (val === "±") { setDisplay(prev => prev.startsWith("-") ? prev.slice(1) : "-" + prev); return; }
    if (val === "%") { setDisplay(prev => String(parseFloat(prev) / 100)); return; }
    if (val === "x²") { setDisplay(prev => { const n = parseFloat(prev) ** 2; return String(n); }); return; }
    if (val === "1/x") { setDisplay(prev => { const n = 1 / parseFloat(prev); return String(n); }); return; }
    if (val === "MC") { setMemory(0); return; }
    if (val === "MR") { setDisplay(String(memory)); setJustEvaluated(true); return; }
    if (val === "M+") { setMemory(m => m + parseFloat(display)); return; }
    if (val === "M-") { setMemory(m => m - parseFloat(display)); return; }

    // Functions that append with open paren
    if (["sin(", "cos(", "tan(", "asin(", "acos(", "atan(", "log(", "ln(", "√("].includes(val)) {
      if (justEvaluated) { setExpression(display + val); setDisplay("0"); setJustEvaluated(false); return; }
      setExpression(prev => prev + display + val);
      setDisplay("0");
      return;
    }

    if (val === "π") { setDisplay(String(Math.PI)); setJustEvaluated(true); return; }
    if (val === "e") { setDisplay(String(Math.E)); setJustEvaluated(true); return; }

    if (isOp) {
      const op = opMap[val] || val;
      if (justEvaluated) { setExpression(display + op); setDisplay("0"); setJustEvaluated(false); return; }
      setExpression(prev => prev + display + op);
      setDisplay("0");
      return;
    }

    if (val === ")") { setExpression(prev => prev + display + ")"); setDisplay("0"); return; }

    if (justEvaluated) { setDisplay(val === "." ? "0." : val); setJustEvaluated(false); return; }
    if (val === "." && display.includes(".")) return;
    setDisplay(prev => prev === "0" && val !== "." ? val : prev + val);
  }, [display, expression, memory, isRad, justEvaluated]);

  const btn = (label, extra = "") => (
    <button
      key={label}
      onClick={() => press(label)}
      className={`flex items-center justify-center rounded-xl text-sm font-semibold h-11 transition-all active:scale-95 select-none ${extra}`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg w-full max-w-md mx-auto">
      {/* Display */}
      <div className="bg-gray-950 px-4 py-3 min-h-[90px] flex flex-col justify-end">
        <p className="text-gray-500 text-xs h-5 truncate text-right">{expression || " "}</p>
        <p className="text-white text-3xl font-bold text-right truncate tracking-tight">{display}</p>
        <div className="flex gap-3 mt-1">
          <button onClick={() => setIsRad(v => !v)} className="text-xs text-amber-400 font-bold border border-amber-400/40 rounded px-1.5 py-0.5">{isRad ? "RAD" : "DEG"}</button>
          {memory !== 0 && <span className="text-xs text-green-400 font-bold">M={memory}</span>}
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-5 gap-1 p-2 bg-gray-900">
        {/* Row 1 */}
        {btn("MC", "bg-gray-700 text-amber-300 hover:bg-gray-600")}
        {btn("MR", "bg-gray-700 text-amber-300 hover:bg-gray-600")}
        {btn("M+", "bg-gray-700 text-amber-300 hover:bg-gray-600")}
        {btn("M-", "bg-gray-700 text-amber-300 hover:bg-gray-600")}
        {btn("C", "bg-red-800 hover:bg-red-700 text-white")}

        {/* Row 2 */}
        {btn("sin(", "bg-gray-700 text-blue-300 hover:bg-gray-600 text-xs")}
        {btn("cos(", "bg-gray-700 text-blue-300 hover:bg-gray-600 text-xs")}
        {btn("tan(", "bg-gray-700 text-blue-300 hover:bg-gray-600 text-xs")}
        {btn("log(", "bg-gray-700 text-blue-300 hover:bg-gray-600 text-xs")}
        {btn("ln(", "bg-gray-700 text-blue-300 hover:bg-gray-600 text-xs")}

        {/* Row 3 */}
        {btn("asin(", "bg-gray-700 text-purple-300 hover:bg-gray-600 text-xs")}
        {btn("acos(", "bg-gray-700 text-purple-300 hover:bg-gray-600 text-xs")}
        {btn("atan(", "bg-gray-700 text-purple-300 hover:bg-gray-600 text-xs")}
        {btn("√(", "bg-gray-700 text-green-300 hover:bg-gray-600")}
        {btn("x²", "bg-gray-700 text-green-300 hover:bg-gray-600")}

        {/* Row 4 */}
        {btn("π", "bg-gray-700 text-yellow-300 hover:bg-gray-600")}
        {btn("e", "bg-gray-700 text-yellow-300 hover:bg-gray-600")}
        {btn("^", "bg-gray-700 text-orange-300 hover:bg-gray-600")}
        {btn("(", "bg-gray-700 text-gray-200 hover:bg-gray-600")}
        {btn(")", "bg-gray-700 text-gray-200 hover:bg-gray-600")}

        {/* Row 5 */}
        {btn("7", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("8", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("9", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("÷", "bg-amber-600 hover:bg-amber-500 text-white")}
        {btn("⌫", "bg-gray-700 text-red-300 hover:bg-gray-600")}

        {/* Row 6 */}
        {btn("4", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("5", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("6", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("×", "bg-amber-600 hover:bg-amber-500 text-white")}
        {btn("1/x", "bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs")}

        {/* Row 7 */}
        {btn("1", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("2", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("3", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("-", "bg-amber-600 hover:bg-amber-500 text-white")}
        {btn("%", "bg-gray-700 text-gray-200 hover:bg-gray-600")}

        {/* Row 8 */}
        {btn("±", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("0", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn(".", "bg-gray-800 text-white hover:bg-gray-700")}
        {btn("+", "bg-amber-600 hover:bg-amber-500 text-white")}
        <button
          onClick={() => press("=")}
          className="flex items-center justify-center rounded-xl text-sm font-bold h-11 bg-green-600 hover:bg-green-500 text-white transition-all active:scale-95 select-none"
        >=</button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border-t border-border p-3 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground mb-1">History</p>
          <div className="space-y-0.5 max-h-28 overflow-y-auto">
            {history.map((h, i) => (
              <p key={i} className="text-xs text-muted-foreground font-mono">{h}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Financial Calculators ─────────────────────────── */
function FinRow({ label, value, bold }) {
  return (
    <div className={`flex justify-between items-center py-1.5 border-b border-border last:border-0 ${bold ? "pt-2" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm font-mono ${bold ? "font-extrabold text-green-700 text-base" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function LoanCalc() {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("5");
  const [result, setResult] = useState(null);

  const calc = () => {
    const P = parseFloat(principal);
    const r = parseFloat(rate) / 100 / 12;
    const n = parseFloat(years) * 12;
    if (!P || !r || !n) return;
    const monthly = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    const interest = total - P;
    setResult({ monthly, total, interest });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><Label>Loan Amount ($)</Label><Input value={principal} onChange={e => setPrincipal(e.target.value)} type="number" /></div>
        <div><Label>Annual Interest Rate (%)</Label><Input value={rate} onChange={e => setRate(e.target.value)} type="number" step="0.01" /></div>
        <div><Label>Loan Term (Years)</Label><Input value={years} onChange={e => setYears(e.target.value)} type="number" /></div>
      </div>
      <Button onClick={calc} className="w-full">Calculate</Button>
      {result && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <FinRow label="Monthly Payment" value={`$${result.monthly.toFixed(2)}`} bold />
          <FinRow label="Total Payment" value={`$${result.total.toFixed(2)}`} />
          <FinRow label="Total Interest Paid" value={`$${result.interest.toFixed(2)}`} />
          <FinRow label="Principal" value={`$${parseFloat(principal).toFixed(2)}`} />
        </div>
      )}
    </div>
  );
}

function CompoundInterestCalc() {
  const [principal, setPrincipal] = useState("5000");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("10");
  const [freq, setFreq] = useState("12");
  const [contrib, setContrib] = useState("0");
  const [result, setResult] = useState(null);

  const calc = () => {
    const P = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const t = parseFloat(years);
    const n = parseFloat(freq);
    const c = parseFloat(contrib);
    if (!P || !r || !t || !n) return;
    const futureValue = P * Math.pow(1 + r / n, n * t) +
      (c > 0 ? c * ((Math.pow(1 + r / n, n * t) - 1) / (r / n)) : 0);
    const totalContrib = P + c * n * t;
    const earned = futureValue - totalContrib;
    setResult({ futureValue, totalContrib, earned });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label>Initial Principal ($)</Label><Input value={principal} onChange={e => setPrincipal(e.target.value)} type="number" /></div>
        <div><Label>Annual Interest Rate (%)</Label><Input value={rate} onChange={e => setRate(e.target.value)} type="number" step="0.01" /></div>
        <div><Label>Time Period (Years)</Label><Input value={years} onChange={e => setYears(e.target.value)} type="number" /></div>
        <div>
          <Label>Compound Frequency</Label>
          <select value={freq} onChange={e => setFreq(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1">
            <option value="1">Annually</option>
            <option value="4">Quarterly</option>
            <option value="12">Monthly</option>
            <option value="365">Daily</option>
          </select>
        </div>
        <div className="sm:col-span-2"><Label>Monthly Contribution ($)</Label><Input value={contrib} onChange={e => setContrib(e.target.value)} type="number" /></div>
      </div>
      <Button onClick={calc} className="w-full">Calculate</Button>
      {result && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <FinRow label="Future Value" value={`$${result.futureValue.toFixed(2)}`} bold />
          <FinRow label="Total Contributed" value={`$${result.totalContrib.toFixed(2)}`} />
          <FinRow label="Interest Earned" value={`$${result.earned.toFixed(2)}`} />
        </div>
      )}
    </div>
  );
}

function PercentageCalc() {
  const [mode, setMode] = useState("pct_of");
  const [a, setA] = useState(""); const [b, setB] = useState(""); const [result, setResult] = useState(null);

  const calc = () => {
    const x = parseFloat(a), y = parseFloat(b);
    if (isNaN(x) || isNaN(y)) return;
    let res = "";
    if (mode === "pct_of") res = `${((x / 100) * y).toFixed(4)} (${x}% of ${y})`;
    else if (mode === "what_pct") res = `${((x / y) * 100).toFixed(4)}% (${x} is what % of ${y})`;
    else if (mode === "pct_change") res = `${(((y - x) / x) * 100).toFixed(4)}% change (from ${x} to ${y})`;
    else if (mode === "markup") res = `Sell at $${(x * (1 + y / 100)).toFixed(2)} (cost $${x}, markup ${y}%)`;
    setResult(res);
  };

  const labels = {
    pct_of: ["Percentage (%)", "Of Number"],
    what_pct: ["Value (X)", "Total (Y)"],
    pct_change: ["From Value", "To Value"],
    markup: ["Cost Price ($)", "Markup (%)"],
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Calculation Type</Label>
        <select value={mode} onChange={e => { setMode(e.target.value); setResult(null); }} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1">
          <option value="pct_of">What is X% of Y?</option>
          <option value="what_pct">X is what % of Y?</option>
          <option value="pct_change">% Change from X to Y</option>
          <option value="markup">Price Markup Calculator</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{labels[mode][0]}</Label><Input value={a} onChange={e => setA(e.target.value)} type="number" /></div>
        <div><Label>{labels[mode][1]}</Label><Input value={b} onChange={e => setB(e.target.value)} type="number" /></div>
      </div>
      <Button onClick={calc} className="w-full">Calculate</Button>
      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 font-semibold text-sm">{result}</div>
      )}
    </div>
  );
}

function ROICalc() {
  const [initial, setInitial] = useState(""); const [final, setFinal] = useState(""); const [years, setYears] = useState("1");
  const [result, setResult] = useState(null);

  const calc = () => {
    const inv = parseFloat(initial), ret = parseFloat(final), y = parseFloat(years);
    if (!inv || !ret) return;
    const roi = ((ret - inv) / inv) * 100;
    const annualized = y > 0 ? (Math.pow(ret / inv, 1 / y) - 1) * 100 : roi;
    setResult({ roi, annualized, netGain: ret - inv });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><Label>Initial Investment ($)</Label><Input value={initial} onChange={e => setInitial(e.target.value)} type="number" /></div>
        <div><Label>Final Value / Return ($)</Label><Input value={final} onChange={e => setFinal(e.target.value)} type="number" /></div>
        <div><Label>Time Period (Years)</Label><Input value={years} onChange={e => setYears(e.target.value)} type="number" step="0.1" /></div>
      </div>
      <Button onClick={calc} className="w-full">Calculate ROI</Button>
      {result && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <FinRow label="Total ROI" value={`${result.roi.toFixed(2)}%`} bold />
          <FinRow label="Net Gain / Loss" value={`$${result.netGain.toFixed(2)}`} />
          <FinRow label="Annualized ROI" value={`${result.annualized.toFixed(2)}%`} />
        </div>
      )}
    </div>
  );
}

function TaxCalc() {
  const [income, setIncome] = useState("75000");
  const [filing, setFiling] = useState("single");
  const [result, setResult] = useState(null);

  const BRACKETS_2024 = {
    single: [
      [11600, 0.10], [47150 - 11600, 0.12], [100525 - 47150, 0.22],
      [191950 - 100525, 0.24], [243725 - 191950, 0.32], [609350 - 243725, 0.35], [Infinity, 0.37]
    ],
    married: [
      [23200, 0.10], [94300 - 23200, 0.12], [201050 - 94300, 0.22],
      [383900 - 201050, 0.24], [487450 - 383900, 0.32], [731200 - 487450, 0.35], [Infinity, 0.37]
    ],
  };

  const calc = () => {
    const inc = parseFloat(income);
    if (!inc) return;
    let remaining = inc, tax = 0;
    const brackets = BRACKETS_2024[filing] || BRACKETS_2024.single;
    for (const [size, rate] of brackets) {
      if (remaining <= 0) break;
      const taxable = Math.min(remaining, size);
      tax += taxable * rate;
      remaining -= taxable;
    }
    const effective = (tax / inc) * 100;
    const afterTax = inc - tax;
    setResult({ tax, effective, afterTax, marginal: brackets.find((_, i, a) => a.slice(0, i + 1).reduce((s, [sz]) => s + sz, 0) >= inc)?.[1] || 0.37 });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">2024 US Federal Income Tax Brackets (simplified, pre-deduction)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label>Taxable Income ($)</Label><Input value={income} onChange={e => setIncome(e.target.value)} type="number" /></div>
        <div>
          <Label>Filing Status</Label>
          <select value={filing} onChange={e => setFiling(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1">
            <option value="single">Single</option>
            <option value="married">Married Filing Jointly</option>
          </select>
        </div>
      </div>
      <Button onClick={calc} className="w-full">Estimate Tax</Button>
      {result && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <FinRow label="Estimated Federal Tax" value={`$${result.tax.toFixed(2)}`} bold />
          <FinRow label="Effective Tax Rate" value={`${result.effective.toFixed(2)}%`} />
          <FinRow label="Marginal Rate" value={`${(result.marginal * 100).toFixed(0)}%`} />
          <FinRow label="After-Tax Income" value={`$${result.afterTax.toFixed(2)}`} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Main Page ─────────────────────────── */
const TABS = [
  { id: "scientific", label: "Scientific" },
  { id: "loan", label: "Loan / Mortgage" },
  { id: "compound", label: "Compound Interest" },
  { id: "percentage", label: "Percentage" },
  { id: "roi", label: "ROI" },
  { id: "tax", label: "Income Tax" },
];

export default function AdminCalculator() {
  const [tab, setTab] = useState("scientific");

  return (
    <div className="space-y-6">
      <PageHeader title="Calculator Suite" description="Scientific & financial calculators for payroll, finance, and analysis." />

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 bg-muted/40 rounded-xl p-1 border border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-card shadow-sm text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={tab === "scientific" ? "" : "bg-card border border-border rounded-2xl p-6 max-w-2xl"}>
        {tab === "scientific" && <ScientificCalc />}
        {tab === "loan" && <LoanCalc />}
        {tab === "compound" && <CompoundInterestCalc />}
        {tab === "percentage" && <PercentageCalc />}
        {tab === "roi" && <ROICalc />}
        {tab === "tax" && <TaxCalc />}
      </div>
    </div>
  );
}