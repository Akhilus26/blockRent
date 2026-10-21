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
import { adminAPI } from "@/services/api";
import { User } from "@/types";
import { Search, CheckCircle, XCircle, Users, Loader2, Trash2, FileText, ShieldCheck, AlertCircle, Clock, Eye, Download, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending_tenants" | "verified_tenants" | "rejected_tenants" | "landlords">("all");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject dialog state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Document viewing modal state
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    fileName: string;
    title: string;
    userName: string;
    isPdf: boolean;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || user.role !== "admin") return;

      try {
        setIsLoading(true);
        const { users: fetchedUsers } = await adminAPI.getUsers();
        setUsers(fetchedUsers);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [user, toast]);

  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  // Filter users by search term and tab
  const filteredUsers = users.filter((u) => {
    if (u.role === 'admin') return false; // Hide admins from user management

    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm)) ||
      (u.rejectionReason && u.rejectionReason.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "pending_tenants") {
      return u.role === "tenant" && (u.verificationStatus === "pending" || u.status === "pending");
    }
    if (activeTab === "verified_tenants") {
      return u.role === "tenant" && u.verificationStatus === "verified";
    }
    if (activeTab === "rejected_tenants") {
      return u.role === "tenant" && (u.verificationStatus === "rejected" || u.status === "rejected");
    }
    if (activeTab === "landlords") {
      return u.role === "landlord";
    }

    return true;
  });

  const pendingTenantsCount = users.filter(
    (u) => u.role === "tenant" && (u.verificationStatus === "pending" || u.status === "pending")
  ).length;

  const handleApprove = async (userId: string) => {
    try {
      await adminAPI.approveUser(userId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: "approved" as const, verificationStatus: "verified" as const, rejectionReason: undefined }
            : u
        )
      );
      toast({
        title: "User Approved",
        description: "The user identity has been verified and their account is now approved.",
      });
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to approve user.",
        variant: "destructive",
      });
    }
  };

  const openRejectModal = (u: User) => {
    setSelectedUser(u);
    setRejectionReason(u.rejectionReason || "");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedUser) return;
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a clear reason for rejecting this user.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReject(true);
    try {
      await adminAPI.rejectUser(selectedUser.id, rejectionReason.trim());
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                status: "rejected" as const,
                verificationStatus: "rejected" as const,
                rejectionReason: rejectionReason.trim(),
              }
            : u
        )
      );
      toast({
        title: "User Rejected",
        description: "The user has been marked as rejected with the specified reason.",
      });
      setRejectModalOpen(false);
      setSelectedUser(null);
      setRejectionReason("");
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to reject user.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleViewIdentityDocument = async (targetUser: User) => {
    try {
      setViewingDocId(targetUser.id);
      const { url, mimeType } = await adminAPI.viewIdentityDocument(targetUser.id);
      const fileName = targetUser.identityDocumentName || targetUser.identityDocument || 'document';
      const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');

      setPreviewDoc({
        url,
        fileName,
        title: targetUser.identityDocumentType || 'Identity Document',
        userName: targetUser.name,
        isPdf,
      });
      setIsPreviewOpen(true);
    } catch (error: any) {
      console.error('Error viewing identity document:', error);
      toast({
        title: "Access Error",
        description: error.response?.data?.error || "Could not retrieve document. Unauthorized or file not found.",
        variant: "destructive",
      });
    } finally {
      setViewingDocId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await adminAPI.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast({
        title: (res as any)?.softDeleted ? "User Deactivated" : "User Deleted",
        description: (res as any)?.message || "The user account has been processed successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete user.",
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
              <Users className="h-8 w-8 text-primary" />
              User & Identity Verification
            </h1>
            <p className="text-muted-foreground">
              Review tenant identity documents, verify registrations, and manage platform users.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
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
            All Users ({users.filter((u) => u.role !== 'admin').length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "pending_tenants" ? "default" : "outline"}
            className="relative"
            onClick={() => setActiveTab("pending_tenants")}
          >
            Pending Verification
            {pendingTenantsCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 text-black px-2 py-0.5 text-xs font-bold">
                {pendingTenantsCount}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "verified_tenants" ? "default" : "outline"}
            onClick={() => setActiveTab("verified_tenants")}
          >
            Verified Tenants ({users.filter((u) => u.role === "tenant" && u.verificationStatus === "verified").length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "rejected_tenants" ? "default" : "outline"}
            onClick={() => setActiveTab("rejected_tenants")}
          >
            Rejected ({users.filter((u) => u.role === "tenant" && (u.verificationStatus === "rejected" || u.status === "rejected")).length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "landlords" ? "default" : "outline"}
            onClick={() => setActiveTab("landlords")}
          >
            Landlords ({users.filter((u) => u.role === "landlord").length})
          </Button>
        </div>

        {/* Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Tenant identity documents are strictly protected and can only be accessed by platform administrators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((u) => {
                    const isPending = (u.verificationStatus === "pending" || u.status === "pending");
                    const isVerified = (u.verificationStatus === "verified");
                    const isRejected = (u.verificationStatus === "rejected" || u.status === "rejected");

                    return (
                      <div
                        key={u.id}
                        className={`flex flex-col gap-4 p-4 rounded-xl border transition-all ${
                          isPending
                            ? "border-amber-500/40 bg-amber-500/[0.02]"
                            : isRejected
                            ? "border-red-500/30 bg-red-500/[0.02]"
                            : "border-border/60 hover:border-border"
                        } md:flex-row md:items-center md:justify-between`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full font-semibold text-lg flex-shrink-0 ${
                            isVerified
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isPending
                              ? "bg-amber-500/20 text-amber-400"
                              : isRejected
                              ? "bg-red-500/20 text-red-400"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{u.name}</p>
                              <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-secondary font-medium text-muted-foreground">
                                {u.role}
                              </span>
                              {u.role === "tenant" && (
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 border ${
                                  isVerified
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : isPending
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                    : "bg-red-500/10 text-red-400 border-red-500/30"
                                }`}>
                                  {isVerified && <ShieldCheck className="h-3 w-3" />}
                                  {isPending && <Clock className="h-3 w-3" />}
                                  {isRejected && <AlertCircle className="h-3 w-3" />}
                                  {isVerified ? "Identity Verified" : isPending ? "Pending Verification" : "Identity Rejected"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                            {u.phone && (
                              <p className="text-xs text-muted-foreground">Phone: {u.phone}</p>
                            )}

                            {/* Identity Document Details for Tenants */}
                            {u.role === "tenant" && (
                              <div className="pt-1 flex flex-wrap items-center gap-2">
                                {u.identityDocument ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/40">
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    <span>
                                      {u.identityDocumentType ? `${u.identityDocumentType.toUpperCase()}: ` : "ID: "}
                                      <strong>{u.identityDocumentName || "Uploaded Document"}</strong>
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-1.5 text-primary hover:text-primary hover:bg-primary/10 ml-1"
                                      disabled={viewingDocId === u.id}
                                      onClick={() => handleViewIdentityDocument(u)}
                                      title="Inspect document preview"
                                    >
                                      {viewingDocId === u.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : (
                                        <Eye className="h-3 w-3 mr-1" />
                                      )}
                                      Inspect
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-amber-400/80 italic">
                                    No document on file (registered prior to document verification requirement)
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Rejection Reason Display */}
                            {isRejected && u.rejectionReason && (
                              <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 mt-1 max-w-xl">
                                <strong>Rejection Reason:</strong> {u.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                          {/* Approve Button */}
                          {(!isVerified || u.status !== "approved") && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleApprove(u.id)}
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
                              onClick={() => openRejectModal(u)}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          )}

                          {/* If already rejected, allow editing reason or re-reviewing */}
                          {isRejected && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => openRejectModal(u)}
                            >
                              Edit Reason
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete User"
                            onClick={() => handleDelete(u.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      {isLoading ? "Loading users..." : "No users found matching your filters."}
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
              Reject {selectedUser?.role === "tenant" ? "Tenant Identity" : "User Account"}
            </DialogTitle>
            <DialogDescription>
              Provide an explicit rejection reason for <strong>{selectedUser?.name}</strong>. The tenant will see this reason on their dashboard and can resubmit with corrected documentation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason" className="text-sm font-medium">
                Rejection Reason *
              </Label>
              <Textarea
                id="rejectionReason"
                rows={4}
                placeholder="e.g. Identity document photo is illegible, Aadhaar number does not match registered name, or invalid document type uploaded."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for all tenant rejections. Clear reasons ensure the user knows what to fix.
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

      {/* Document Inspection Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-4 md:p-6">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {previewDoc?.title} — {previewDoc?.userName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                File: <span className="font-mono text-foreground">{previewDoc?.fileName}</span>
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
                  download={previewDoc?.fileName || 'document'}
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
                title="Document PDF Preview"
              />
            ) : (
              <div className="h-full w-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={previewDoc?.url}
                  alt="Document Preview"
                  className="max-h-[66vh] max-w-full object-contain rounded-md shadow-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border flex sm:justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Official identity verification document under administrative review.
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

export default AdminUsers;
