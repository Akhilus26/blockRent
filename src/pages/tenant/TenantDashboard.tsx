import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { propertyAPI, requestAPI, agreementAPI, authAPI } from "@/services/api";
import { Property, RentalRequest, Agreement } from "@/types";
import {
  Home,
  FileText,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Upload,
  AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaymentModal } from "@/components/payment/PaymentModal";

const DOCUMENT_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Voter ID",
  "Passport"
];

const TenantDashboard = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [myRequests, setMyRequests] = useState<RentalRequest[]>([]);
  const [myAgreements, setMyAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<RentalRequest | null>(null);

  // Resubmission state
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitDocType, setResubmitDocType] = useState("Aadhaar Card");
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const resubmitFileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!user || user.role !== "tenant") return;

    try {
      setIsLoading(true);
      const [propertiesRes, requestsRes, agreementsRes] = await Promise.all([
        propertyAPI.getAll('approved'),
        requestAPI.getUserRequests(),
        agreementAPI.getUserAgreements(),
      ]);

      setAvailableProperties(propertiesRes.properties);
      setMyRequests(requestsRes.requests);
      setMyAgreements(agreementsRes.agreements);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, toast]);

  if (!user || user.role !== "tenant") {
    return <Navigate to="/login" replace />;
  }

  const handleResubmitFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Identity documents must be under 5 MB.",
        variant: "destructive",
      });
      if (resubmitFileRef.current) resubmitFileRef.current.value = "";
      return;
    }

    const allowed = /\.(pdf|jpg|jpeg|png)$/i;
    if (!allowed.test(file.name)) {
      toast({
        title: "Invalid file format",
        description: "Only PDF, JPEG, and PNG files are allowed.",
        variant: "destructive",
      });
      if (resubmitFileRef.current) resubmitFileRef.current.value = "";
      return;
    }

    setResubmitFile(file);
  };

  const handleResubmit = async () => {
    if (!resubmitFile) {
      toast({
        title: "Document required",
        description: "Please select an identity document to resubmit.",
        variant: "destructive",
      });
      return;
    }

    setIsResubmitting(true);
    try {
      const formData = new FormData();
      formData.append("identityDocumentType", resubmitDocType);
      formData.append("identityDocument", resubmitFile);

      const res = await authAPI.resubmitIdentity(formData);
      toast({
        title: "Document Resubmitted!",
        description: res.message || "Your identity document is now pending administrator verification.",
      });

      setShowResubmitModal(false);
      setResubmitFile(null);
      if (refreshUser) await refreshUser();
      await fetchData();
    } catch (error: any) {
      console.error("Resubmission error:", error);
      toast({
        title: "Resubmission Failed",
        description: error.response?.data?.error || "Could not resubmit document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const isVerified = user.verificationStatus === "verified";
  const isRejected = user.verificationStatus === "rejected";
  const isPending = !isVerified && !isRejected;

  const stats = [
    {
      title: "Available Properties",
      value: availableProperties.length,
      icon: <Home className="h-5 w-5" />,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Active Agreements",
      value: myAgreements.length,
      icon: <FileText className="h-5 w-5" />,
      color: "bg-success/10 text-success",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Verification Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isVerified && (
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 flex items-center justify-between text-success-foreground">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/20 text-success">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    Identity Verified
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">Verified Tenant</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Your identity document has been verified. You have full access to submit rental requests, negotiate rent, and finalize blockchain agreements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPending && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/20 text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    Verification In Progress
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 font-medium">Pending Review</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Your identity document is currently undergoing administrator verification. You may browse properties, but submitting rental requests and payments requires verified status.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/40 hover:bg-amber-500/20"
                onClick={() => setShowResubmitModal(true)}
              >
                Update Document
              </Button>
            </div>
          )}

          {isRejected && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/20 text-destructive">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    Identity Verification Rejected
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">Action Required</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Reason:</strong> {user.rejectionReason || "Please upload a clearer, valid test document."}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setShowResubmitModal(true)}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Resubmit Document
              </Button>
            </div>
          )}
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl font-bold">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground">
            Find your perfect rental property secured by blockchain.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                      {stat.icon}
                    </div>
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="bg-gradient-hero text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Start Your Search</h3>
                  <p className="text-primary-foreground/70">
                    Browse verified properties and find your new home.
                  </p>
                </div>
                <a
                  href="/tenant/properties"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-foreground px-6 py-3 font-medium text-primary hover:opacity-90 transition-opacity"
                >
                  <Search className="h-5 w-5" />
                  Browse Properties
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Featured Properties */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Featured Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableProperties.slice(0, 3).map((property) => (
                  <div
                    key={property.id}
                    className="relative overflow-hidden rounded-lg border border-border/50 card-hover"
                  >
                    <div className="aspect-[16/9]">
                      <img
                        src={
                          property.images[0]
                            ? property.images[0].startsWith('/uploads/')
                              ? `http://localhost:5000${property.images[0]}`
                              : property.images[0]
                            : "/placeholder.svg"
                        }
                        alt={property.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {property.location}
                      </p>
                      <p className="mt-2 font-bold text-primary">
                        ₹{property.rent.toLocaleString()}/mo
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/properties/${property.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Requests</CardTitle>
                {myRequests.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/tenant/requests")}
                  >
                    View All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {myRequests.length > 0 ? (
                <div className="space-y-4">
                  {myRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 rounded-lg border border-border/50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p
                            className="font-medium text-lg cursor-pointer hover:text-primary transition-colors"
                            onClick={() => navigate(`/properties/${request.propertyId}`)}
                          >
                            {request.propertyTitle}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Original: ₹{request.originalRent.toLocaleString()}/mo
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Proposed: ₹{request.proposedRent.toLocaleString()}/mo
                            </p>
                            {request.counterRent && (
                              <p className="text-sm font-semibold text-primary">
                                Counter-offer: ₹{request.counterRent.toLocaleString()}/mo
                              </p>
                            )}
                            {request.finalRent && (
                              <p className="text-sm font-semibold text-success">
                                Final: ₹{request.finalRent.toLocaleString()}/mo
                              </p>
                            )}
                          </div>
                          {request.message && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              "{request.message}"
                            </p>
                          )}
                        </div>
                        <StatusBadge status={request.status} />
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/properties/${request.propertyId}`)}
                        >
                          View Property
                        </Button>

                        {/* Counter Offer Actions */}
                        {request.status === 'countered' && (
                          <>
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-primary hover:opacity-90"
                              disabled={!isVerified}
                              title={!isVerified ? "Identity verification required to accept counter-offers" : ""}
                              onClick={() => {
                                if (!isVerified) {
                                  toast({
                                    title: "Verification Required",
                                    description: "You must be an identity-verified tenant to accept counter-offers.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setSelectedRequest(request);
                                setShowConfirmDialog(true);
                              }}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Accept Counter-Offer
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  await requestAPI.confirm(request.id, { action: 'reject' });
                                  toast({
                                    title: "Counter-offer rejected",
                                    description: "You have rejected the landlord's counter-offer.",
                                  });
                                  fetchData();
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.response?.data?.error || "Failed to reject counter-offer.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}

                        {/* Payment Button for Approved Requests */}
                        {request.status === 'approved' && (
                          <div className="flex flex-col gap-2 w-full mt-4">
                            <Button
                              className="bg-success text-success-foreground hover:bg-success/90 w-full"
                              disabled={!isVerified}
                              title={!isVerified ? "Identity verification required to make payments" : ""}
                              onClick={() => {
                                if (!isVerified) {
                                  toast({
                                    title: "Verification Required",
                                    description: "Your identity document must be verified before you can make payments.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setPaymentRequest(request);
                                setShowPaymentModal(true);
                              }}
                            >
                              <IndianRupee className="mr-2 h-4 w-4" />
                              Pay ₹{(request.finalRent || request.proposedRent).toLocaleString()} to Finalize
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No requests yet. Start browsing properties to make your first request!
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Resubmit Identity Document Dialog */}
        <Dialog open={showResubmitModal} onOpenChange={setShowResubmitModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Resubmit Identity Document
              </DialogTitle>
              <DialogDescription>
                Upload a corrected identity document. Your status will reset to pending for administrator review.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="resubmitDocType">Document Type</Label>
                <Select
                  value={resubmitDocType}
                  onValueChange={setResubmitDocType}
                >
                  <SelectTrigger id="resubmitDocType">
                    <SelectValue placeholder="Select Document Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <input
                  ref={resubmitFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleResubmitFileSelect}
                  className="hidden"
                  id="resubmit-file-input"
                />
                <div
                  onClick={() => resubmitFileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {resubmitFile ? resubmitFile.name : "Click to select document"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, or PNG (Max 5 MB)
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Resubmitting resets your status to <strong>pending</strong>. You will not be able to submit rental requests until an administrator verifies the document.
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResubmitModal(false);
                    setResubmitFile(null);
                  }}
                  disabled={isResubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={handleResubmit}
                  disabled={isResubmitting || !resubmitFile}
                >
                  {isResubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit for Review"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Counter-Offer Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept Counter-Offer</DialogTitle>
              <DialogDescription>
                Are you sure you want to accept the landlord's counter-offer?
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-medium">{selectedRequest.propertyTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    Your proposed: ₹{selectedRequest.proposedRent.toLocaleString()}/mo
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    Counter-offer: ₹{selectedRequest.counterRent?.toLocaleString()}/mo
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setSelectedRequest(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-primary hover:opacity-90"
                    onClick={async () => {
                      if (!selectedRequest) return;
                      try {
                        await requestAPI.confirm(selectedRequest.id, { action: 'accept' });
                        toast({
                          title: "Counter-offer accepted!",
                          description: "Please proceed with payment to generate the agreement.",
                        });
                        setShowConfirmDialog(false);
                        setSelectedRequest(null);
                        fetchData();
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.response?.data?.error || "Failed to accept counter-offer.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Accept Counter-Offer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Modal */}
        {paymentRequest && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setPaymentRequest(null);
            }}
            request={paymentRequest}
            onPaymentSuccess={fetchData}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default TenantDashboard;
