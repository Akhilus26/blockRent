import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlockchainBadge } from "@/components/ui/blockchain-badge";
import { requestAPI } from "@/services/api";
import { RentalRequest } from "@/types";
import { MessageSquare, Download, Calendar, IndianRupee, User, Home, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { PaymentModal } from "@/components/payment/PaymentModal";
// Timer component removed


const TenantRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myRequests, setMyRequests] = useState<RentalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<RentalRequest | null>(null);

  useEffect(() => {
    fetchData();
  }, [user, toast]);

  const fetchData = async () => {
    if (!user || user.role !== "tenant") return;

    try {
      setIsLoading(true);
      const { requests } = await requestAPI.getUserRequests();
      setMyRequests(requests);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== "tenant") {
    return <Navigate to="/login" replace />;
  }

  const handleConfirm = (request: RentalRequest) => {
    setSelectedRequest(request);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async (action: 'accept' | 'reject') => {
    if (!selectedRequest) return;

    try {
      await requestAPI.confirm(selectedRequest.id, { action });

      if (action === 'accept') {
        toast({
          title: "Counter-offer accepted!",
          description: "Please proceed with payment to generate the agreement.",
        });
      } else {
        toast({
          title: "Counter-offer rejected",
          description: "You have rejected the landlord's counter-offer.",
        });
      }

      await fetchData();
      setShowConfirmDialog(false);
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error confirming request:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to confirm request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectCounter = async (request: RentalRequest) => {
    try {
      await requestAPI.confirm(request.id, { action: 'reject' });

      toast({
        title: "Counter-offer rejected",
        description: "You have rejected the landlord's counter-offer.",
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error rejecting counter:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to reject counter-offer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (pdfPath: string | null) => {
    if (pdfPath) {
      const fullUrl = `http://localhost:5000${pdfPath}`;
      window.open(fullUrl, '_blank');
    } else {
      toast({
        title: "PDF not available",
        description: "The PDF for this request is not available yet.",
        variant: "destructive",
      });
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

  const pendingRequests = myRequests.filter(r => r.status === 'pending');
  const counteredRequests = myRequests.filter(r => r.status === 'countered');
  const acceptedRequests = myRequests.filter(r => r.status === 'accepted');

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            My Rental Requests
          </h1>
          <p className="text-muted-foreground">
            View and manage your rental requests to landlords.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Countered</p>
                  <p className="text-2xl font-bold">{counteredRequests.length}</p>
                </div>
                <IndianRupee className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold">{acceptedRequests.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        {myRequests.length > 0 ? (
          <div className="space-y-6">
            {myRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Home className="h-5 w-5" />
                          {request.propertyTitle}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Request ID: {request.id}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Request Details */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <IndianRupee className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Original Rent</p>
                          <p className="font-semibold">₹{request.originalRent.toLocaleString()}/mo</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                          <IndianRupee className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Proposed Rent</p>
                          <p className="font-semibold">₹{request.proposedRent.toLocaleString()}/mo</p>
                        </div>
                      </div>
                      {request.counterRent && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                            <IndianRupee className="h-5 w-5 text-warning" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Counter Rent</p>
                            <p className="font-semibold">₹{request.counterRent.toLocaleString()}/mo</p>
                          </div>
                        </div>
                      )}
                      {request.finalRent && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                            <IndianRupee className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Final Rent</p>
                            <p className="font-semibold">₹{request.finalRent.toLocaleString()}/mo</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {request.message && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Message:</p>
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}

                    {/* Blockchain Info (if accepted) */}
                    {request.status === 'accepted' && request.blockchainHash && (
                      <div className="space-y-4">
                        <BlockchainBadge
                          hash={request.blockchainHash}
                          timestamp={request.blockchainTimestamp ? new Date(request.blockchainTimestamp).toLocaleString() : undefined}
                        />
                        {request.pdfPath && (
                          <Button
                            className="w-full sm:w-auto bg-gradient-primary hover:opacity-90"
                            onClick={() => handleDownload(request.pdfPath || null)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Agreement PDF
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      {/* Counter Actions */}
                      {request.status === 'countered' && (
                        <>
                          <Button
                            className="bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none"
                            onClick={() => handleConfirm(request)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Accept Counter
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1 sm:flex-none"
                            onClick={() => handleRejectCounter(request)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject Counter
                          </Button>
                        </>
                      )}

                      {/* Payment Action */}
                      {request.status === 'approved' && (
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          <Button
                            className="bg-success text-success-foreground hover:bg-success/90 w-full sm:w-auto"
                            onClick={() => {
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
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Requests Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't made any rental requests yet. Browse properties to get started.
              </p>
              <Button onClick={() => window.location.href = "/tenant/properties"}>
                Browse Properties
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Confirm Dialog */}
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
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedRequest.propertyTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    Counter Rent: ₹{selectedRequest.counterRent?.toLocaleString()}/mo
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
                    onClick={() => handleConfirmAction('accept')}
                    className="bg-gradient-primary hover:opacity-90"
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

export default TenantRequests;
