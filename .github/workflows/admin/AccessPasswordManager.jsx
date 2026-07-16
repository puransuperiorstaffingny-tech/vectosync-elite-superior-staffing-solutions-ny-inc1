import { useState, useEffect } from "react";
import { getAccessPassword, setAccessPassword } from "@/components/EditAccessGate";
import { KeyRound, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AccessPasswordManager() {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => { setPwd(await getAccessPassword()); setLoading(false); })();
  }, []);

  const save = async () => {
    setSaving(true);
    await setAccessPassword(pwd);
    toast.success("Access password updated");
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Secure Editing Password</h3></div>
      <p className="text-xs text-muted-foreground">Required (with builder login) to unlock the Admin Control Center, Theme, and Template editing.</p>
      <div className="flex gap-2">
        <Input type="text" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Set an access password" className="text-sm" />
        <Button size="sm" onClick={save} disabled={saving} className="gap-1 shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </Button>
      </div>
    </div>
  );
}