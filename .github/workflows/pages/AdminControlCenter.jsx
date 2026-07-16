import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import EditAccessGate from "@/components/EditAccessGate";
import PermissionsManager from "@/components/admin/PermissionsManager";
import IntegrationMarketplace from "@/components/admin/IntegrationMarketplace";
import BuilderAuditLog from "@/components/admin/BuilderAuditLog";
import AccessPasswordManager from "@/components/admin/AccessPasswordManager";
import AdminHelperChat from "@/components/admin/AdminHelperChat";
import BuilderAccess from "@/components/BuilderAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Users, Plug, History, Lock, Bot, Palette, Layers, ArrowRight } from "lucide-react";

export default function AdminControlCenter() {
  return (
    <EditAccessGate title="Admin Control Center — Restricted">
      <div className="space-y-6">
        <PageHeader title="Admin Control Center" description="Authorized-only hub for permissions, security, integrations, AI help, and builder audit." />

        <Tabs defaultValue="permissions">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="permissions" className="gap-2"><Users className="h-4 w-4" /> Permissions</TabsTrigger>
            <TabsTrigger value="security" className="gap-2"><Lock className="h-4 w-4" /> Security</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2"><Plug className="h-4 w-4" /> Integrations</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Bot className="h-4 w-4" /> AI Helper</TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" /> Theme & Layout</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="mt-4">
            <PermissionsManager />
          </TabsContent>

          <TabsContent value="security" className="mt-4 space-y-4">
            <AccessPasswordManager />
            <BuilderAccess />
          </TabsContent>

          <TabsContent value="integrations" className="mt-4">
            <IntegrationMarketplace />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <AdminHelperChat />
          </TabsContent>

          <TabsContent value="appearance" className="mt-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <ShortcutCard to="/theme" icon={Palette} title="Theme & Branding" desc="System-wide logo, colors & header." />
              <ShortcutCard to="/my-appearance" icon={Palette} title="My View & Appearance" desc="Your personal color scheme." />
              <ShortcutCard to="/billing-templates" icon={Layers} title="Invoice & Timesheet Templates" desc="Document layout library." />
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <BuilderAuditLog />
          </TabsContent>
        </Tabs>
      </div>
    </EditAccessGate>
  );
}

function ShortcutCard({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-primary/50 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="bg-primary/10 rounded-lg p-2"><Icon className="h-5 w-5 text-primary" /></div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}