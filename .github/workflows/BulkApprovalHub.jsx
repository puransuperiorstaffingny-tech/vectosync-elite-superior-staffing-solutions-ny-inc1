import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function BulkApprovalHub({ open, onOpenChange }) {
  const [timeEntries, setTimeEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeEntries, setSelectedTimeEntries] = useState(new Set());
  const [selectedExpenses, setSelectedExpenses] = useState(new Set());
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [te, exp, req] = await Promise.all([
        base44.entities.TimeEntry.filter({ status: 'pending' }),
        base44.entities.ExpenseReport.filter({ status: 'submitted' }),
        base44.entities.EmployeeRequest.filter({ status: 'pending' })
      ]);
      setTimeEntries(te);
      setExpenses(exp);
      setRequests(req);
    } catch (error) {
      console.error('Failed to load approval data:', error);
    }
    setLoading(false);
  };

  const toggleTimeEntry = (id) => {
    const newSet = new Set(selectedTimeEntries);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedTimeEntries(newSet);
  };

  const toggleExpense = (id) => {
    const newSet = new Set(selectedExpenses);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedExpenses(newSet);
  };

  const toggleRequest = (id) => {
    const newSet = new Set(selectedRequests);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedRequests(newSet);
  };

  const approveTimeEntries = async () => {
    setProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedTimeEntries).map(id =>
          base44.entities.TimeEntry.update(id, { status: 'approved' })
        )
      );
      setSelectedTimeEntries(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to approve time entries:', error);
    }
    setProcessing(false);
  };

  const approveExpenses = async () => {
    setProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedExpenses).map(id =>
          base44.entities.ExpenseReport.update(id, { status: 'approved' })
        )
      );
      setSelectedExpenses(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to approve expenses:', error);
    }
    setProcessing(false);
  };

  const approveRequests = async () => {
    setProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedRequests).map(id =>
          base44.entities.EmployeeRequest.update(id, { status: 'approved' })
        )
      );
      setSelectedRequests(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to approve requests:', error);
    }
    setProcessing(false);
  };

  const rejectTimeEntries = async () => {
    setProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedTimeEntries).map(id =>
          base44.entities.TimeEntry.update(id, { status: 'rejected' })
        )
      );
      setSelectedTimeEntries(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to reject time entries:', error);
    }
    setProcessing(false);
  };

  const rejectExpenses = async () => {
    setProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedExpenses).map(id =>
          base44.entities.ExpenseReport.update(id, { status: 'rejected' })
        )
      );
      setSelectedExpenses(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to reject expenses:', error);
    }
    setProcessing(false);
  };

  const rejectRequests = async () => {
    setProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedRequests).map(id =>
          base44.entities.EmployeeRequest.update(id, { status: 'denied' })
        )
      );
      setSelectedRequests(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to reject requests:', error);
    }
    setProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Approval Center</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : (
          <Tabs defaultValue="timeentries" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeentries">
                Time Entries ({timeEntries.length})
              </TabsTrigger>
              <TabsTrigger value="expenses">
                Expenses ({expenses.length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                Requests ({requests.length})
              </TabsTrigger>
            </TabsList>

            {/* Time Entries Tab */}
            <TabsContent value="timeentries" className="space-y-4">
              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {timeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending time entries</p>
                ) : (
                  timeEntries.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                      <Checkbox
                        checked={selectedTimeEntries.has(entry.id)}
                        onCheckedChange={() => toggleTimeEntry(entry.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{entry.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{entry.date} • {entry.total_hours} hours</p>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
              {timeEntries.length > 0 && (
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rejectTimeEntries}
                    disabled={selectedTimeEntries.size === 0 || processing}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={approveTimeEntries}
                    disabled={selectedTimeEntries.size === 0 || processing}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve ({selectedTimeEntries.size})
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4">
              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending expenses</p>
                ) : (
                  expenses.map(expense => (
                    <div key={expense.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                      <Checkbox
                        checked={selectedExpenses.has(expense.id)}
                        onCheckedChange={() => toggleExpense(expense.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{expense.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{expense.description} • ${expense.amount.toFixed(2)}</p>
                      </div>
                      <StatusBadge status={expense.category} className="text-xs" />
                    </div>
                  ))
                )}
              </div>
              {expenses.length > 0 && (
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rejectExpenses}
                    disabled={selectedExpenses.size === 0 || processing}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={approveExpenses}
                    disabled={selectedExpenses.size === 0 || processing}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve ({selectedExpenses.size})
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {requests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
                ) : (
                  requests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                      <Checkbox
                        checked={selectedRequests.has(req.id)}
                        onCheckedChange={() => toggleRequest(req.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{req.employee_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{req.request_type.replace('_', ' ')} • {req.start_date}</p>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
              {requests.length > 0 && (
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rejectRequests}
                    disabled={selectedRequests.size === 0 || processing}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Deny
                  </Button>
                  <Button
                    size="sm"
                    onClick={approveRequests}
                    disabled={selectedRequests.size === 0 || processing}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve ({selectedRequests.size})
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}