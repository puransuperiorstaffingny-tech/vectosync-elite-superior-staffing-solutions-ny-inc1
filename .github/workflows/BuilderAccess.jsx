import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, X, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SETTING_KEY = "builder_emails";

export async function getBuilderEmails() {
  try {
    const results = await base44.entities.AppSetting.filter({ key: SETTING_KEY });
    if (results.length > 0) {
      return JSON.parse(results[0].value || "[]");
    }
  } catch {}
  return [];
}

export async function isBuilder(email) {
  const emails = await getBuilderEmails();
  return emails.includes(email);
}

export default function BuilderAccess() {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [settingId, setSettingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const results = await base44.entities.AppSetting.filter({ key: SETTING_KEY });
      if (results.length > 0) {
        setSettingId(results[0].id);
        setEmails(JSON.parse(results[0].value || "[]"));
      } else {
        setSettingId(null);
        setEmails([]);
      }
    } catch {}
    setLoading(false);
  };

  const save = async (updatedEmails) => {
    setSaving(true);
    try {
      const value = JSON.stringify(updatedEmails);
      if (settingId) {
        await base44.entities.AppSetting.update(settingId, { key: SETTING_KEY, value });
      } else {
        const created = await base44.entities.AppSetting.create({ key: SETTING_KEY, value });
        setSettingId(created.id);
      }
      setEmails(updatedEmails);
    } catch {}
    setSaving(false);
  };

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || emails.includes(trimmed)) { setNewEmail(""); return; }
    const updated = [...emails, trimmed];
    setNewEmail("");
    save(updated);
  };

  const removeEmail = (email) => {
    save(emails.filter(e => e !== email));
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Builder Access</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Only users listed here can edit Theme & Branding settings. Admins can manage this list but cannot edit the theme unless their email is added below.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {emails.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No builders assigned yet — nobody can edit the theme.</p>
            ) : (
              emails.map(email => (
                <div key={email} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEmail()}
              placeholder="user@example.com"
              className="text-sm"
            />
            <Button size="sm" onClick={addEmail} disabled={saving || !newEmail.trim()} className="gap-1 shrink-0">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </Button>
          </div>
        </>
      )}
    </div>
  );
}