import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Download, Trash2, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";

export default function DocumentUploadPortal() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await base44.entities.HRDocument.list("-created_date", 100);
        setDocuments(docs);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });
      
      const newDoc = {
        title: file.name,
        description: `Uploaded on ${new Date().toLocaleDateString()}`,
        category: "other",
        file_url: uploadedFile.file_url,
        requires_signature: false,
        is_active: true,
        assigned_to_all: false,
        assigned_employee_ids: [],
      };

      const created = await base44.entities.HRDocument.create(newDoc);
      setDocuments(prev => [created, ...prev]);
      alert("Document uploaded successfully!");
    } catch (err) {
      console.error("Error uploading document:", err);
      alert("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await base44.entities.HRDocument.delete(id);
        setDocuments(prev => prev.filter(d => d.id !== id));
      } catch (err) {
        console.error("Error deleting document:", err);
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Document Upload Portal" description="Manage and share HR documents with employees" />

      {/* Upload Area */}
      <Card className="p-8 bg-card border-2 border-dashed border-border rounded-xl">
        <label className="flex flex-col items-center gap-3 cursor-pointer">
          <Upload className="h-8 w-8 text-primary" />
          <div className="text-center">
            <p className="text-sm font-semibold">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">PDF, DOC, DOCX supported</p>
          </div>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept=".pdf,.doc,.docx"
          />
        </label>
      </Card>

      {/* Documents List */}
      <Card className="p-6 bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Documents ({documents.length})</h3>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-lg hover:bg-muted/60 transition">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}