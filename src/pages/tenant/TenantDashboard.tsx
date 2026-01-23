import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { propertyAPI, requestAPI, agreementAPI } from "@/services/api";
import { Property, RentalRequest, Agreement } from "@/types";
import { Home, MessageSquare, FileText, Search, TrendingUp, Loader2, CheckCircle2, XCircle, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/ui/status-badge";

import { PaymentModal } from "@/components/payment/PaymentModal";
// Timer component removed

const TenantDashboard = () => {
  const { user } = useAuth();
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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

                        {/* Status Actions */}

                        {/* Counter Offer Actions */}
                        {request.status === 'countered' && (
                          <>
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-primary hover:opacity-90"
                              onClick={() => {
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

                        {/* Payment Action */}
                        {/* Payment Button for Approved Requests */}
                        {request.status === 'approved' && (
                          <div className="flex flex-col gap-2 w-full mt-4">
                            <Button
                              className="bg-success text-success-foreground hover:bg-success/90 w-full"
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
