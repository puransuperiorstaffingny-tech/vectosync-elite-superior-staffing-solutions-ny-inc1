import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, DollarSign, FileText, User } from 'lucide-react';
import { format } from 'date-fns';

export default function EmployeeSelfService() {
  const { user } = useAuth();
  const [payrollItems, setPayrollItems] = useState([]);
  const [employeeData, setEmployeeData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Resolve the user even if AuthContext hasn't populated it yet
        const me = user?.email ? user : await base44.auth.me();
        if (me?.email) {
          const employees = await base44.entities.Employee.filter({ email: me.email });
          const emp = employees[0] || null;
          setEmployeeData(emp);

          if (emp) {
            // Fetch payroll items for this employee
            const payroll = await base44.entities.PayrollItem.filter({ employee_id: emp.id });
            setPayrollItems(payroll.sort((a, b) => new Date(b.period_end) - new Date(a.period_end)));

            // Fetch HR documents assigned to this employee or all employees
            const allDocs = await base44.entities.HRDocument.filter({ is_active: true });
            setDocuments(allDocs.filter(d => d.assigned_to_all || (d.assigned_employee_ids || []).includes(emp.id)));
          }
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Portal"
          description="View your payroll, documents, and personal information"
        />
        <Card>
          <CardContent className="text-center py-12 space-y-3">
            <User className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="font-medium">Your profile isn't set up yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Head to <strong>My Dashboard</strong> to set up your employee profile, then your payroll and documents will appear here.
            </p>
            <a
              href="/employee-portal"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to My Dashboard
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Portal" 
        description="View your payroll, documents, and personal information"
      />

      <Tabs defaultValue="payroll" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payroll">Payroll History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="details">Personal Details</TabsTrigger>
        </TabsList>

        {/* Payroll History Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Latest Gross Pay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  ${payrollItems[0]?.gross_pay?.toFixed(2) || '0.00'}
                </div>
                {payrollItems[0] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(payrollItems[0].period_end), 'MMM d, yyyy')}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Latest Net Pay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  ${payrollItems[0]?.net_pay?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Take-home</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Latest Deductions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  ${payrollItems[0]?.total_deductions?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total deductions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pay Period History</CardTitle>
              <CardDescription>Your last 12 months of payroll records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payrollItems.length > 0 ? (
                  payrollItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {format(new Date(item.period_start), 'MMM d')} - {format(new Date(item.period_end), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Gross: ${item.gross_pay?.toFixed(2) || '0.00'} | Net: ${item.net_pay?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        <DollarSign className="w-3 h-3 mr-1" />
                        View
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No payroll records found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax & HR Documents</CardTitle>
              <CardDescription>Access your tax forms, pay stubs, and important documents</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{doc.title || doc.document_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.created_date && format(new Date(doc.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          download
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No documents available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your employment and contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-foreground font-medium mt-1">
                    {employeeData.first_name} {employeeData.last_name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground font-medium mt-1">{employeeData.email}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-foreground font-medium mt-1">{employeeData.phone || 'Not provided'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Employee ID</label>
                  <p className="text-foreground font-medium mt-1">{employeeData.employee_id_number || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Position</label>
                  <p className="text-foreground font-medium mt-1">{employeeData.position || 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="text-foreground font-medium mt-1">{employeeData.department || 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hire Date</label>
                  <p className="text-foreground font-medium mt-1">
                    {employeeData.hire_date ? format(new Date(employeeData.hire_date), 'MMM d, yyyy') : 'Not specified'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pay Type</label>
                  <p className="text-foreground font-medium mt-1 capitalize">{employeeData.pay_type || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {employeeData.bank_account_number && (
            <Card>
              <CardHeader>
                <CardTitle>Bank Information</CardTitle>
                <CardDescription>Direct deposit details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                    <p className="text-foreground font-medium mt-1">{employeeData.bank_name}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                    <p className="text-foreground font-medium mt-1 capitalize">{employeeData.bank_account_type}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                    <p className="text-foreground font-medium mt-1">
                      ••••••••{employeeData.bank_account_number?.slice(-4)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account Holder</label>
                    <p className="text-foreground font-medium mt-1">{employeeData.bank_account_name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}