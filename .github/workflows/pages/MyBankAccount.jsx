import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Landmark, Loader2, CheckCircle2, Trash2, Lock } from "lucide-react";

export default function MyBankAccount() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    account_number: "",
    routing_number: "",
    account_type: "checking",
    account_nickname: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const { data: accounts = [], refetch, isLoading } = useQuery({
    queryKey: ["my-bank-accounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 20),
    initialData: [],
  });

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === "string" ? v : v.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{9}$/.test(form.routing_number)) {
      toast({ title: "Invalid routing number", description: "Routing number must be 9 digits.", variant: "destructive" });
      return;
    }
    if (!/^\d{4,17}$/.test(form.account_number)) {
      toast({ title: "Invalid account number", description: "Enter a valid account number.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("dwollaTokenizeBankAccount", form);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Bank account added", description: `Securely saved (•••• ${res.data.last4}).` });
      setForm({ account_number: "", routing_number: "", account_type: "checking", account_nickname: "" });
      refetch();
    } catch (err) {
      toast({ title: "Could not add account", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (acct) => {
    if (!confirm("Remove this bank account?")) return;
    await base44.entities.BankAccount.delete(acct.id);
    refetch();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="My Bank Account" description="Securely add the bank account where you'd like to receive your pay." />

      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <Lock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Your account and routing numbers are sent directly to our secure payment provider for tokenization.
          We <strong>never</strong> store your raw bank numbers — only a secure token and the last 4 digits.
        </p>
      </div>

      {accounts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Saved Accounts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">
                      {a.account_nickname || `${a.account_type} account`} •••• {a.last4 || "----"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                      {a.account_type}
                      {a.is_verified
                        ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                        : <span className="text-amber-600">Pending verification</span>}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(a)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Add a Bank Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Account Nickname (optional)</Label>
              <Input placeholder="e.g. Main Checking" value={form.account_nickname} onChange={set("account_nickname")} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Routing Number</Label>
                <Input inputMode="numeric" maxLength={9} placeholder="9 digits" value={form.routing_number} onChange={set("routing_number")} required />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input inputMode="numeric" placeholder="Account number" value={form.account_number} onChange={set("account_number")} required />
              </div>
            </div>
            <div>
              <Label>Account Type</Label>
              <Select value={form.account_type} onValueChange={set("account_type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Securing...</> : <><ShieldCheck className="h-4 w-4" /> Securely Add Account</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}