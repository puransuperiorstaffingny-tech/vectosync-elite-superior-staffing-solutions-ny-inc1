import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inspectPublicKey } from "@/components/rapid/pgpEncrypt";
import { Loader2, KeyRound } from "lucide-react";

export default function PgpKeyForm({ onSaved }) {
  const [label, setLabel] = useState("");
  const [armored, setArmored] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError("");
    const key = armored.trim();
    if (!label.trim() || !key) {
      setError("Label and public key are both required.");
      return;
    }
    if (!key.includes("BEGIN PGP PUBLIC KEY BLOCK")) {
      setError("That doesn't look like an ASCII-armored PGP public key.");
      return;
    }
    setSaving(true);
    try {
      const meta = await inspectPublicKey(key);
      await base44.entities.PgpKey.create({
        label: label.trim(),
        public_key: key,
        fingerprint: meta.fingerprint,
        key_user_ids: meta.userIds,
        notes: notes.trim(),
        is_active: false,
      });
      setLabel("");
      setArmored("");
      setNotes("");
      onSaved?.();
    } catch (e) {
      setError("Could not read this key: " + (e.message || "invalid key"));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Key Label</Label>
        <Input
          placeholder="e.g. Rapid Integration Tool (0x0A0CB414)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>PGP Public Key (ASCII-armored)</Label>
        <Textarea
          placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;...&#10;-----END PGP PUBLIC KEY BLOCK-----"
          value={armored}
          onChange={(e) => setArmored(e.target.value)}
          className="font-mono text-xs h-40"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where this key is used" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Add Key
      </Button>
    </div>
  );
}