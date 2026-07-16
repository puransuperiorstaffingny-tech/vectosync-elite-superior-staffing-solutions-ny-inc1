import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Pencil } from "lucide-react";

// Read-only display of the company funding bank account stored in Company Profile.
// This is the account you SEND money FROM. It is reference only — nothing is pulled automatically.
export default function FundingBankCard({ funding }) {
  const hasBank = funding?.funding_bank_name;
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" /> Your funding bank account
          </span>
          <Link to="/company-profile" className="text-xs font-medium text-primary inline-flex items-center gap-1">
            <Pencil className="h-3 w-3" /> Edit
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {hasBank ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest">Sends Funds To Rapid</p>
                <p className="text-sm font-semibold mt-1">{funding.funding_bank_name}</p>
              </div>
              <Landmark className="h-6 w-6 text-white/40" />
            </div>
            <p className="text-lg font-mono tracking-widest mb-1">
              •••• •••• •••• {(funding.funding_account_number || "").slice(-4) || "????"}
            </p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-white/50">Account Holder</p>
                <p className="text-sm font-medium">{funding.funding_account_holder || funding.company_legal_name || "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">Type</p>
                <p className="text-sm capitalize">{funding.funding_account_type || "checking"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            No funding bank account set yet. Add it in{" "}
            <Link to="/company-profile" className="font-medium underline">Company Profile → Payroll Funding</Link>.
          </p>
        )}
      </CardContent>
    </Card>
  );
}