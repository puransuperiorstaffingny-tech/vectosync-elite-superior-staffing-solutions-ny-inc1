import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Banknote, CreditCard, Plus, Edit2, Trash2, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "./StatusBadge";

export default function BankingPaycardManager({ employee }) {
  const [bankingDetails, setBankingDetails] = useState(null);
  const [portalAccess, setPortalAccess] = useState(null);
  const [bankingModal, setBankingModal] = useState(false);
  const [bankingForm, setBankingForm] = useState({});
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);
  const [editingBanking, setEditingBanking] = useState(null);

  const load = async () => {
    try {
      const portalData = await base44.entities.EmployeePortalAccess.filter({ employee_id: employee.id });
      if (portalData.length > 0) {
        setPortalAccess(portalData[0]);
      }
    } catch (err) {
      console.log("Error loading portal access:", err);
    }
  };

  useEffect(() => {
    load();
    // Set initial banking form data from employee
    if (employee) {
      setBankingDetails({
        bank_account_name: employee.bank_account_name,
        bank_name: employee.bank_name,
        bank_account_number: employee.bank_account_number,
        bank_routing_number: employee.bank_routing_number,
        bank_account_type: employee.bank_account_type,
      });
    }
  }, [employee]);

  const saveBankingDetails = async () => {
    try {
      await base44.entities.Employee.update(employee.id, bankingForm);
      setBankingDetails(bankingForm);
      setBankingModal(false);
      setBankingForm({});
      setEditingBanking(null);
    } catch (err) {
      console.error("Error saving banking details:", err);
      alert("Failed to save banking details");
    }
  };

  const openBankingModal = () => {
    if (bankingDetails) {
      setBankingForm({ ...bankingDetails });
      setEditingBanking(true);
    } else {
      setBankingForm({
        bank_account_name: "",
        bank_name: "",
        bank_account_number: "",
        bank_routing_number: "",
        bank_account_type: "checking",
      });
    }
    setBankingModal(true);
  };

  const maskNumber = (num) => num ? `****${num.slice(-4)}` : "—";

  return (
    <div className="space-y-6">
      {/* Direct Deposit Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Direct Deposit</h3>
          </div>
          <Button 
            onClick={openBankingModal} 
            variant={bankingDetails?.bank_account_name ? "outline" : "default"}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> {bankingDetails?.bank_account_name ? "Update" : "Add Details"}
          </Button>
        </div>

        {bankingDetails?.bank_account_name ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Account Holder</p>
                <p className="font-medium mt-1">{bankingDetails.bank_account_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Bank Name</p>
                <p className="font-medium mt-1">{bankingDetails.bank_name || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Account Number</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono">{showAccountNumber ? bankingDetails.bank_account_number : maskNumber(bankingDetails.bank_account_number)}</p>
                  <button onClick={() => setShowAccountNumber(!showAccountNumber)} className="text-muted-foreground hover:text-foreground">
                    {showAccountNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Routing Number</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono">{showRoutingNumber ? bankingDetails.bank_routing_number : maskNumber(bankingDetails.bank_routing_number)}</p>
                  <button onClick={() => setShowRoutingNumber(!showRoutingNumber)} className="text-muted-foreground hover:text-foreground">
                    {showRoutingNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Account Type</p>
              <p className="font-medium mt-1 capitalize">{bankingDetails.bank_account_type || "—"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No banking details added yet</p>
        )}
      </div>

      {/* Paycard Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Paycard (Rapid Pay)</h3>
          </div>
          {portalAccess?.paycard_last_four && (
            <StatusBadge status={portalAccess?.direct_deposit_verified ? "active" : "pending"} />
          )}
        </div>

        {portalAccess?.paycard_last_four ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Card Number</p>
              <p className="font-mono mt-1">•••• •••• •••• {portalAccess.paycard_last_four}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Employee can access their paycard portal and manage funds from their employee dashboard.
            </p>
            <a href="https://superior-boss-app-39e23b94.base44.app/PayrollPayouts" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1">
                <CreditCard className="h-3.5 w-3.5" /> View Paycard Portal
              </Button>
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">No paycard linked yet. Employee can link their paycard from their self-service portal.</p>
            <a href="https://superior-boss-app-39e23b94.base44.app/PayrollPayouts" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1">
                <CreditCard className="h-3.5 w-3.5" /> Open Paycard Portal
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Banking Modal */}
      <Dialog open={bankingModal} onOpenChange={setBankingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBanking ? "Update Direct Deposit" : "Add Direct Deposit Details"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="account_holder">Account Holder Name</Label>
              <Input
                id="account_holder"
                value={bankingForm.bank_account_name || ""}
                onChange={(e) => setBankingForm(p => ({ ...p, bank_account_name: e.target.value }))}
                placeholder="Full name on account"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={bankingForm.bank_name || ""}
                onChange={(e) => setBankingForm(p => ({ ...p, bank_name: e.target.value }))}
                placeholder="e.g., Chase Bank"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  type="password"
                  value={bankingForm.bank_account_number || ""}
                  onChange={(e) => setBankingForm(p => ({ ...p, bank_account_number: e.target.value }))}
                  placeholder="Account number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="routing_number">Routing Number</Label>
                <Input
                  id="routing_number"
                  type="password"
                  value={bankingForm.bank_routing_number || ""}
                  onChange={(e) => setBankingForm(p => ({ ...p, bank_routing_number: e.target.value }))}
                  placeholder="Routing number"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="account_type">Account Type</Label>
              <Select value={bankingForm.bank_account_type || "checking"} onValueChange={(v) => setBankingForm(p => ({ ...p, bank_account_type: v }))}>
                <SelectTrigger id="account_type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankingModal(false)}>Cancel</Button>
            <Button 
              onClick={saveBankingDetails}
              disabled={!bankingForm.bank_account_name || !bankingForm.bank_account_number}
            >
              <Check className="h-4 w-4 mr-1" /> Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}