import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getBuilderEmails } from "@/components/BuilderAccess";
import { useAuth } from "@/lib/AuthContext";
import { Shield, UserPlus, Loader2, Crown, UserCog, Trash2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BUILDER_KEY = "builder_emails";
const AUTH_KEY = "authorized_admins";

async function getSetting(key) {
  const r = await base44.entities.AppSetting.filter({ key });
  return r.length ? { id: r[0].id, value: r[0].value } : { id: null, value: null };
}
async function saveSetting(key, value, existingId) {
  if (existingId) return base44.entities.AppSetting.update(existingId, { key, value });
  return base44.entities.AppSetting.create({ key, value });
}

export default function PermissionsManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [builders, setBuilders] = useState([]);
  const [builderId, setBuilderId] = useState(null);
  const [authorized, setAuthorized] = useState([]);
  const [authId, setAuthId] = useState(null);
  const [newBuilder, setNewBuilder] = useState("");
  const [newAuth, setNewAuth] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);

  const isBuilder = builders.includes(user?.email?.toLowerCase());

  const load = async () => {
    setLoading(true);
    const [b, a] = await Promise.all([getSetting(BUILDER_KEY), getSetting(AUTH_KEY)]);
    setBuilderId(b.id); setBuilders(b.value ? JSON.parse(b.value) : []);
    setAuthId(a.id); setAuthorized(a.value ? JSON.parse(a.value) : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addBuilder = async () => {
    const e = newBuilder.trim().toLowerCase();
    if (!e || builders.includes(e)) { setNewBuilder(""); return; }
    const next = [...builders, e];
    await saveSetting(BUILDER_KEY, JSON.stringify(next), builderId);
    setNewBuilder(""); load();
  };
  const removeBuilder = async (e) => {
    await saveSetting(BUILDER_KEY, JSON.stringify(builders.filter(x => x !== e)), builderId);
    load();
  };
  const addAuth = async () => {
    const e = newAuth.trim().toLowerCase();
    if (!e || authorized.includes(e)) { setNewAuth(""); return; }
    await saveSetting(AUTH_KEY, JSON.stringify([...authorized, e]), authId);
    setNewAuth(""); load();
  };
  const removeAuth = async (e) => {
    await saveSetting(AUTH_KEY, JSON.stringify(authorized.filter(x => x !== e)), authId);
    load();
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim().toLowerCase(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
      setInviteEmail("");
    } catch (err) {
      toast.error("Invite failed: " + (err?.message || "unknown error"));
    }
    setInviting(false);
  };

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Builders */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /><h3 className="font-semibold text-sm">Builders (full control)</h3></div>
        <p className="text-xs text-muted-foreground">Builders can edit themes, templates, security settings, and invite/create accounts.</p>
        <div className="space-y-2">
          {builders.length === 0 && <p className="text-xs italic text-muted-foreground">No builders assigned.</p>}
          {builders.map(e => (
            <div key={e} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">{e}</span>
              <button onClick={() => removeBuilder(e)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newBuilder} onChange={e => setNewBuilder(e.target.value)} onKeyDown={e => e.key === "Enter" && addBuilder()} placeholder="builder@company.com" className="text-sm" />
          <Button size="sm" onClick={addBuilder} disabled={!newBuilder.trim()} className="gap-1 shrink-0"><Plus className="h-3.5 w-3.5" /> Add</Button>
        </div>
      </div>

      {/* Authorized admins */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">Authorized Admins</h3></div>
        <p className="text-xs text-muted-foreground">Authorized admins can access the Admin Control Center and integration settings.</p>
        <div className="space-y-2">
          {authorized.length === 0 && <p className="text-xs italic text-muted-foreground">No authorized admins yet.</p>}
          {authorized.map(e => (
            <div key={e} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">{e}</span>
              <button onClick={() => removeAuth(e)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newAuth} onChange={e => setNewAuth(e.target.value)} onKeyDown={e => e.key === "Enter" && addAuth()} placeholder="admin@company.com" className="text-sm" />
          <Button size="sm" onClick={addAuth} disabled={!newAuth.trim()} className="gap-1 shrink-0"><Plus className="h-3.5 w-3.5" /> Add</Button>
        </div>
      </div>

      {/* Invite / create account (builders only) */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-accent" /><h3 className="font-semibold text-sm">Create / Invite Account</h3></div>
        {isBuilder ? (
          <>
            <p className="text-xs text-muted-foreground">Send an invitation to create a new account with the selected role.</p>
            <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="new.user@company.com" className="text-sm" />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={invite} disabled={inviting || !inviteEmail.trim()} className="gap-1 shrink-0">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />} Invite
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">Only builders can create or invite accounts.</p>
        )}
      </div>
    </div>
  );
}