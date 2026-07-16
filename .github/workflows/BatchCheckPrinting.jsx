import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { Printer, Palette } from 'lucide-react';
import { format } from 'date-fns';

export default function BatchCheckPrinting({ open, onOpenChange, payrollRunId }) {
  const [payrollItems, setPayrollItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [startNumber, setStartNumber] = useState('1001');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (open && payrollRunId) {
      loadPayrollItems();
    }
  }, [open, payrollRunId]);

  const loadPayrollItems = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.PayrollItem.filter({ payroll_run_id: payrollRunId });
      setPayrollItems(items);
    } catch (err) {
      console.error('Error loading payroll items:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelected(newSet);
  };

  const selectAll = () => {
    if (selected.size === payrollItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(payrollItems.map(p => p.id)));
    }
  };

  const generateCheckHTML = (items) => {
    const checksHTML = items.map((item, idx) => `
      <div style="page-break-inside: avoid; margin-bottom: 1.5in; border: 1px solid #ccc; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: right; margin-bottom: 20px;">
          <strong>Check #${parseInt(startNumber) + idx}</strong>
        </div>
        <div style="margin-bottom: 30px;">
          <strong>PAY TO THE ORDER OF</strong>
          <div style="font-size: 18px; font-weight: bold; margin-top: 10px;">${item.employee_name}</div>
        </div>
        <div style="margin-bottom: 30px;">
          <div style="font-size: 24px; font-weight: bold;">$ ${item.net_pay.toFixed(2)}</div>
        </div>
        <div style="margin-bottom: 20px; font-size: 12px;">
          <p><strong>Date:</strong> ${format(new Date(), 'MM/dd/yyyy')}</p>
          <p><strong>Period:</strong> ${item.period_start} to ${item.period_end}</p>
        </div>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #000; font-size: 11px;">
          <table style="width: 100%; font-size: 10px;">
            <tr>
              <td><strong>Gross:</strong> $${item.gross_pay.toFixed(2)}</td>
              <td><strong>Federal Tax:</strong> $${item.federal_tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>State Tax:</strong> $${item.state_tax.toFixed(2)}</td>
              <td><strong>Deductions:</strong> $${item.total_deductions.toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payroll Checks</title>
        <style>
          body { margin: 0; padding: 0.5in; }
          @media print {
            body { margin: 0; padding: 0.5in; }
          }
        </style>
      </head>
      <body>${checksHTML}</body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (selected.size === 0) {
      alert('Please select at least one check to print');
      return;
    }

    const itemsToPrint = payrollItems.filter(item => selected.has(item.id));
    const html = generateCheckHTML(itemsToPrint);
    
    const newWindow = window.open('', '', 'width=800,height=600');
    newWindow.document.write(html);
    newWindow.document.close();
    
    setTimeout(() => {
      newWindow.print();
    }, 250);
  };

  const selectedItems = payrollItems.filter(item => selected.has(item.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Checks - 3 Per Page</DialogTitle>
          <DialogDescription>Select employees and configure check printing</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="select" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="select">Select</TabsTrigger>
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              <Checkbox
                checked={selected.size === payrollItems.length}
                onCheckedChange={selectAll}
              />
              <label className="text-sm font-medium cursor-pointer flex-1">
                Select All ({selected.size}/{payrollItems.length})
              </label>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {payrollItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50">
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.employee_name}</p>
                    <p className="text-xs text-muted-foreground">${item.net_pay.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="configure" className="space-y-4">
            <div>
              <Label>Starting Check Number</Label>
              <Input
                type="number"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Print Settings</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ 3 checks per page (standard 8.5" × 11")</li>
                <li>✓ Check size: 6" × 2.5"</li>
                <li>✓ Selected checks: {selected.size}</li>
                <li>✓ Check numbers: {startNumber} - {parseInt(startNumber) + selected.size - 1}</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={handlePrint} disabled={selected.size === 0} className="gap-2">
                <Printer className="w-4 h-4" /> Print {selected.size} Checks
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">Custom Check Design</h4>
                  <p className="text-xs text-muted-foreground">
                    Go to Document Designer to create custom check templates with your company branding and layout preferences.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => window.open('/document-designer', '_blank')}
                  >
                    Open Designer
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}