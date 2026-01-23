import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestAPI, agreementAPI } from "@/services/api";
import { RentalRequest, Agreement } from "@/types";
import { MessageSquare, Loader2, CheckCircle2, XCircle, DollarSign, FileText, Download } from "lucide-react";
import { BlockchainBadge } from "@/components/ui/blockchain-badge";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/ui/status-badge";

const LandlordRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'accept' | 'reject' | 'counter' | null>(null);
  const [counterRent, setCounterRent] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user || user.role !== "landlord") return;

      try {
        setIsLoading(true);
        const [requestsRes, agreementsRes] = await Promise.all([
          requestAPI.getLandlordRequests(),
          agreementAPI.getLandlordAgreements().catch(() => ({ agreements: [] }))
        ]);
        setRequests(requestsRes.requests);
        setAgreements(agreementsRes.agreements);
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

    fetchRequests();
  }, [user, toast]);

  const handleAction = (request: RentalRequest, action: 'accept' | 'reject' | 'counter') => {
    setSelectedRequest(request);
    setDialogAction(action);
    // Set counter rent to middle value between proposed and original
    const minRent = Math.min(request.proposedRent, request.originalRent);
    const maxRent = Math.max(request.proposedRent, request.originalRent);
    const middleRent = Math.round((minRent + maxRent) / 2);
    setCounterRent(middleRent.toString());
    setMessage("");
    setShowDialog(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;

    try {
      if (dialogAction === 'counter') {
        const rentValue = parseFloat(counterRent);
        if (isNaN(rentValue) || rentValue <= 0) {
          toast({
            title: "Invalid rent",
            description: "Please enter a valid counter rent amount.",
            variant: "destructive",
          });
          return;
        }

        // Validate counter rent is between proposed and original
        const minRent = Math.min(selectedRequest.proposedRent, selectedRequest.originalRent);
        const maxRent = Math.max(selectedRequest.proposedRent, selectedRequest.originalRent);

        if (rentValue < minRent || rentValue > maxRent) {
          toast({
            title: "Invalid counter rent",
            description: `Counter rent must be between ₹${minRent.toLocaleString()} and ₹${maxRent.toLocaleString()}.`,
            variant: "destructive",
          });
          return;
        }

        await requestAPI.respond(selectedRequest.id, {
          action: 'counter',
          counterRent: rentValue,
          message: message || undefined,
        });

        toast({
          title: "Counter-offer sent!",
          description: "Your counter-offer has been sent to the tenant.",
        });
      } else {
        await requestAPI.respond(selectedRequest.id, {
          action: dialogAction!,
          message: message || undefined,
        });

        toast({
          title: dialogAction === 'accept' ? "Request accepted!" : "Request rejected",
          description: `The request has been ${dialogAction === 'accept' ? 'accepted' : 'rejected'}.`,
        });
      }

      // Refresh requests
      const { requests: updatedRequests } = await requestAPI.getLandlordRequests();
      setRequests(updatedRequests);
      setShowDialog(false);
      setSelectedRequest(null);
      setDialogAction(null);
      setCounterRent("");
      setMessage("");
    } catch (error: any) {
      console.error('Error responding to request:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to respond to request. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user || user.role !== "landlord") {
    return <Navigate to="/login" replace />;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const counteredRequests = requests.filter(r => r.status === 'countered');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl font-bold">Property Requests</h1>
          <p className="text-muted-foreground">
            Manage rental requests for your properties.
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
                <DollarSign className="h-8 w-8 text-accent" />
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
        <Card>
          <CardHeader>
            <CardTitle>All Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border border-border/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{request.propertyTitle}</h3>
                        <p className="text-sm text-muted-foreground">
                          From: {request.tenantName}
                        </p>
                        {request.message && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {request.message}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={request.status} />
                        {request.status === 'approved' && (
                          <span className="text-xs text-info font-medium">Payment Pending</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Original Rent</p>
                        <p className="font-semibold">₹{request.originalRent.toLocaleString()}/mo</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Proposed Rent</p>
                        <p className="font-semibold">₹{request.proposedRent.toLocaleString()}/mo</p>
                      </div>
                      {request.counterRent && (
                        <div>
                          <p className="text-muted-foreground">Counter Rent</p>
                          <p className="font-semibold">₹{request.counterRent.toLocaleString()}/mo</p>
                        </div>
                      )}
                      {request.finalRent && (
                        <div>
                          <p className="text-muted-foreground">Final Rent</p>
                          <p className="font-semibold text-success">₹{request.finalRent.toLocaleString()}/mo</p>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAction(request, 'accept')}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        {request.proposedRent !== request.originalRent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleAction(request, 'counter')}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Counter
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleAction(request, 'reject')}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {request.status === 'accepted' && request.blockchainHash && (
                      <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold">Agreement Created</h4>
                        </div>
                        <BlockchainBadge
                          hash={request.blockchainHash}
                          timestamp={request.blockchainTimestamp ? new Date(request.blockchainTimestamp).toLocaleString() : undefined}
                        />
                        {request.pdfPath && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const fullUrl = `http://localhost:5000${request.pdfPath}`;
                              window.open(fullUrl, '_blank');
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </Button>
                        )}
                        {agreements.find(a => a.propertyId === request.propertyId && a.tenantId === request.tenantId) && (
                          <div className="text-sm text-muted-foreground">
                            Finalized agreement available in Agreements page
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No rental requests yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogAction === 'accept' && 'Accept Request'}
                {dialogAction === 'reject' && 'Reject Request'}
                {dialogAction === 'counter' && 'Send Counter-Offer'}
              </DialogTitle>
              <DialogDescription>
                {dialogAction === 'accept' && 'Accept the tenant\'s proposed rent.'}
                {dialogAction === 'reject' && 'Reject this rental request.'}
                {dialogAction === 'counter' && 'Propose a different rent amount to the tenant.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedRequest && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedRequest.propertyTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    Tenant: {selectedRequest.tenantName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Proposed: ₹{selectedRequest.proposedRent.toLocaleString()}/mo
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Original: ₹{selectedRequest.originalRent.toLocaleString()}/mo
                  </p>
                </div>
              )}

              {dialogAction === 'counter' && selectedRequest && (
                <div className="space-y-2">
                  <Label htmlFor="counterRent">
                    Counter Rent (₹/month)
                    <span className="text-xs text-muted-foreground ml-2">
                      (Between ₹{Math.min(selectedRequest.proposedRent, selectedRequest.originalRent).toLocaleString()} and ₹{Math.max(selectedRequest.proposedRent, selectedRequest.originalRent).toLocaleString()})
                    </span>
                  </Label>
                  <Input
                    id="counterRent"
                    type="number"
                    value={counterRent}
                    onChange={(e) => setCounterRent(e.target.value)}
                    min={Math.min(selectedRequest.proposedRent, selectedRequest.originalRent)}
                    max={Math.max(selectedRequest.proposedRent, selectedRequest.originalRent)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setSelectedRequest(null);
                    setDialogAction(null);
                    setCounterRent("");
                    setMessage("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitAction}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  {dialogAction === 'accept' && 'Accept'}
                  {dialogAction === 'reject' && 'Reject'}
                  {dialogAction === 'counter' && 'Send Counter-Offer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default LandlordRequests;
