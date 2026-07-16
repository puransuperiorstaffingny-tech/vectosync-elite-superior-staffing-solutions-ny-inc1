import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Info } from "lucide-react";

// How money reaches the cards: you send funds to Rapid; Rapid loads the cards on their side.
// These are the remittance details Rapid provides during onboarding. Update via env/config when confirmed.
export default function RapidRemittanceCard({ siteId }) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" /> How to fund your Rapid cards
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3 text-muted-foreground">
        <p>
          Rapid funds the paycards. You send money to <strong>Rapid's settlement account</strong> (ACH or wire),
          and Rapid loads the funds onto your employees' cards. The app does not pull funds from your bank —
          it tracks the transfers you send.
        </p>
        <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-1 text-foreground">
          <div>Your Rapid Site ID: {siteId || "—"}</div>
          <div>Settlement account: provided by Rapid at onboarding</div>
          <div>Reference each transfer with your Site ID + payroll period</div>
        </div>
        <p className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          Confirm the exact bank, routing, and account number with your Rapid implementation contact before sending.
          Log every transfer below so funding stays reconciled against each payroll run.
        </p>
      </CardContent>
    </Card>
  );
}