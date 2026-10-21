import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { adminAPI, propertyAPI } from "@/services/api";
import { Property } from "@/types";
import { Search, Home, Loader2, Trash2, ExternalLink, CheckCircle, XCircle, FileText, AlertCircle, Clock, Eye, ShieldCheck, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminProperties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Document viewing modal state
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    fileName: string;
    title: string;
    landlordName: string;
    isPdf: boolean;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user || user.role !== "admin") return;

      try {
        setIsLoading(true);
        // Call admin endpoint to get all properties including pending/rejected
        const { properties: fetchedProperties } = await adminAPI.getProperties();
        setProperties(fetchedProperties);
      } catch (error: any) {
        console.error('Error fetching admin properties:', error);
        toast({
          title: "Error",
          description: "Failed to load properties. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [user, toast]);

  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  // Filter properties by search term and status tab
  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.district && p.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.landlordName && p.landlordName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.rejectionReason && p.rejectionReason.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "pending") return p.status === "pending";
    if (activeTab === "approved") return p.status === "approved";
    if (activeTab === "rejected") return p.status === "rejected";

    return true;
  });

  const pendingCount = properties.filter((p) => p.status === "pending").length;

  const handleApprove = async (propertyId: string) => {
    try {
      await adminAPI.approveProperty(propertyId);
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId
            ? { ...p, status: "approved" as const, rejectionReason: undefined }
            : p
        )
      );
      toast({
        title: "Property Approved",
        description: "The property has been verified and is now live on the public listings.",
      });
    } catch (error: any) {
      console.error('Error approving property:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to approve property.",
        variant: "destructive",
      });
    }
  };

  const openRejectModal = (p: Property) => {
    setSelectedProperty(p);
    setRejectionReason(p.rejectionReason || "");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedProperty) return;
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please specify why the ownership document or property details were rejected.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReject(true);
    try {
      await adminAPI.rejectProperty(selectedProperty.id, rejectionReason.trim());
      setProperties((prev) =>
        prev.map((p) =>
          p.id === selectedProperty.id
            ? { ...p, status: "rejected" as const, rejectionReason: rejectionReason.trim() }
            : p
        )
      );
      toast({
        title: "Property Rejected",
        description: "The property has been rejected and the landlord notified of the reason.",
      });
      setRejectModalOpen(false);
      setSelectedProperty(null);
      setRejectionReason("");
    } catch (error: any) {
      console.error('Error rejecting property:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to reject property.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleViewOwnershipDocument = async (property: Property) => {
    try {
      setViewingDocId(property.id);
      const { url, mimeType } = await adminAPI.viewOwnershipDocument(property.id);
      const fileName = property.ownershipDocumentName || property.ownershipDocument || 'deed';
      const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');

      setPreviewDoc({
        url,
        fileName,
        title: property.title,
        landlordName: property.landlordName || 'Landlord',
        isPdf,
      });
      setIsPreviewOpen(true);
    } catch (error: any) {
      console.error('Error viewing ownership document:', error);
      toast({
        title: "Access Error",
        description: error.response?.data?.error || "Could not retrieve ownership document. Unauthorized or file not found.",
        variant: "destructive",
      });
    } finally {
      setViewingDocId(null);
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await propertyAPI.delete(propertyId);
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
      toast({
        title: (res as any)?.softDeleted ? "Property Deactivated" : "Property Deleted",
        description: (res as any)?.message || "The property has been processed successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete property.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Home className="h-8 w-8 text-primary" />
              Property & Ownership Verification
            </h1>
            <p className="text-muted-foreground">
              Review landlord ownership deeds, verify listings, and ensure tenant safety.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search properties, landlords, locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <Button
            size="sm"
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
          >
            All Properties ({properties.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "pending" ? "default" : "outline"}
            className="relative"
            onClick={() => setActiveTab("pending")}
          >
            Pending Verification
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 text-black px-2 py-0.5 text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "approved" ? "default" : "outline"}
            onClick={() => setActiveTab("approved")}
          >
            Approved ({properties.filter((p) => p.status === "approved").length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "rejected" ? "default" : "outline"}
            onClick={() => setActiveTab("rejected")}
          >
            Rejected ({properties.filter((p) => p.status === "rejected").length})
          </Button>
        </div>

        {/* Properties List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Properties ({filteredProperties.length})</CardTitle>
              <CardDescription>
                Only approved properties are visible to tenants and available for rental requests. Ownership documents are stored securely outside public directories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProperties.map((p) => {
                    const isPending = p.status === "pending";
                    const isApproved = p.status === "approved";
                    const isRejected = p.status === "rejected";

                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col gap-4 p-4 rounded-xl border transition-all ${
                          isPending
                            ? "border-amber-500/40 bg-amber-500/[0.02]"
                            : isRejected
                            ? "border-red-500/30 bg-red-500/[0.02]"
                            : "border-border/60 hover:border-border"
                        } md:flex-row md:items-center md:justify-between`}
                      >
                        <div className="flex items-start gap-4">
                          {p.images && p.images.length > 0 ? (
                            <img
                              src={`http://localhost:5000${p.images[0]}`}
                              alt={p.title}
                              className="w-20 h-20 object-cover rounded-lg border border-border/50 flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/100?text=No+Image";
                              }}
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-secondary text-muted-foreground flex-shrink-0">
                              <Home className="h-8 w-8" />
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-base">{p.title}</p>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 border ${
                                isApproved
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : isPending
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-red-500/10 text-red-400 border-red-500/30"
                              }`}>
                                {isApproved && <ShieldCheck className="h-3 w-3" />}
                                {isPending && <Clock className="h-3 w-3" />}
                                {isRejected && <AlertCircle className="h-3 w-3" />}
                                {isApproved ? "Approved & Live" : isPending ? "Pending Review" : "Rejected"}
                              </span>

                              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                p.availability === 'available'
                                  ? 'bg-success/10 text-success border-success/20'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}>
                                {p.availability === 'available' ? 'Available' : 'Rented'}
                              </span>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              {p.location}{p.district ? `, ${p.district}` : ""} • <strong className="text-foreground">₹{p.rent?.toLocaleString()}/mo</strong>
                              {p.bedrooms ? ` • ${p.bedrooms} BHK` : ""}
                              {p.area ? ` • ${p.area} sq ft` : ""}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Landlord: <span className="font-medium text-foreground">{p.landlordName || "Unknown"}</span>
                            </p>

                            {/* Ownership Document Inspection Section */}
                            <div className="pt-1 flex flex-wrap items-center gap-2">
                              {p.ownershipDocument ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/40">
                                  <FileText className="h-3.5 w-3.5 text-primary" />
                                  <span>
                                    Deed: <strong>{p.ownershipDocumentName || "Uploaded Ownership Document"}</strong>
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1.5 text-primary hover:text-primary hover:bg-primary/10 ml-1"
                                    disabled={viewingDocId === p.id}
                                    onClick={() => handleViewOwnershipDocument(p)}
                                    title="Inspect ownership deed preview"
                                  >
                                    {viewingDocId === p.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <Eye className="h-3 w-3 mr-1" />
                                    )}
                                    Inspect Deed
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-amber-400/80 italic">
                                  No ownership deed on file (legacy listing)
                                </span>
                              )}
                            </div>

                            {/* Rejection Reason Display */}
                            {isRejected && p.rejectionReason && (
                              <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 mt-1 max-w-xl">
                                <strong>Rejection Reason:</strong> {p.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                          {/* Approve Button */}
                          {!isApproved && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleApprove(p.id)}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                          )}

                          {/* Reject Button */}
                          {!isRejected && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectModal(p)}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          )}

                          {/* If already rejected, allow editing reason */}
                          {isRejected && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => openRejectModal(p)}
                            >
                              Edit Reason
                            </Button>
                          )}

                          {isApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                            >
                              <a href={`/properties/${p.id}`} target="_blank" rel="noopener noreferrer" title="View Property Detail">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Property"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredProperties.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      {isLoading ? "Loading properties..." : "No properties found matching your filters."}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Rejection Dialog with Required Reason */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Reject Property Verification
            </DialogTitle>
            <DialogDescription>
              Provide an explicit rejection reason for <strong>{selectedProperty?.title}</strong>. The landlord will see this reason on their dashboard and can update details or upload a new deed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="propRejectionReason" className="text-sm font-medium">
                Rejection Reason *
              </Label>
              <Textarea
                id="propRejectionReason"
                rows={4}
                placeholder="e.g. Ownership deed is unreadable, title deed name does not match landlord account, or missing municipal tax receipt."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for all property rejections. Clear reasons ensure landlords can resolve ownership issues.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={isSubmittingReject}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmittingReject || !rejectionReason.trim()}
              onClick={handleConfirmReject}
            >
              {isSubmittingReject ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ownership Deed Inspection Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-4 md:p-6">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Ownership Deed — {previewDoc?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Landlord: <span className="font-semibold text-foreground">{previewDoc?.landlordName}</span> • File: <span className="font-mono text-foreground">{previewDoc?.fileName}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 mr-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (previewDoc?.url) {
                    window.open(previewDoc.url, '_blank');
                  }
                }}
                title="Open in new browser tab"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                New Tab
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <a
                  href={previewDoc?.url}
                  download={previewDoc?.fileName || 'ownership_deed'}
                  title="Download document"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </a>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 w-full min-h-[460px] max-h-[70vh] overflow-hidden rounded-lg border border-border bg-muted/20 my-2 flex items-center justify-center">
            {previewDoc?.isPdf ? (
              <iframe
                src={previewDoc.url}
                className="w-full h-[68vh] border-0 rounded-lg"
                title="Property Ownership Deed PDF"
              />
            ) : (
              <div className="h-full w-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={previewDoc?.url}
                  alt="Ownership Deed Preview"
                  className="max-h-[66vh] max-w-full object-contain rounded-md shadow-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border flex sm:justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Official property ownership verification document under administrative review.
            </p>
            <Button
              variant="secondary"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminProperties;
