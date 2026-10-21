import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { propertyAPI, requestAPI, agreementAPI } from "@/services/api";
import { Property, RentalRequest, Agreement } from "@/types";
import { Home, MessageSquare, FileText, DollarSign, TrendingUp, Loader2, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const LandlordDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [myRequests, setMyRequests] = useState<RentalRequest[]>([]);
  const [myAgreements, setMyAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "landlord") return;

      try {
        setIsLoading(true);
        const [propertiesRes, requestsRes, agreementsRes] = await Promise.all([
          propertyAPI.getByLandlord(user.id).catch(err => {
            console.error('Error fetching properties:', err);
            return { properties: [] };
          }),
          requestAPI.getLandlordRequests().catch(err => {
            console.error('Error fetching requests:', err);
            return { requests: [] };
          }),
          agreementAPI.getLandlordAgreements().catch(err => {
            console.error('Error fetching agreements:', err);
            return { agreements: [] };
          }),
        ]);

        setMyProperties(propertiesRes.properties || []);
        setMyRequests(requestsRes.requests || []);
        setMyAgreements(agreementsRes.agreements || []);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to load dashboard data. Please check if the backend server is running.",
          variant: "destructive",
        });
        // Set empty arrays to prevent blank page
        setMyProperties([]);
        setMyRequests([]);
        setMyAgreements([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  if (!user || user.role !== "landlord") {
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

  const pendingRequests = myRequests.filter((r) => r.status === "pending").length;
  const totalRent = myAgreements.reduce((sum, a) => sum + a.finalRent, 0);

  const stats = [
    {
      title: "My Properties",
      value: myProperties.length,
      icon: <Home className="h-5 w-5" />,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "My Properties",
      value: myProperties.length,
      icon: <Home className="h-5 w-5" />,
      color: "bg-primary/10 text-primary",
    },
    // Removed Pending Requests card as requested
    {
      title: "Active Agreements",
      value: myAgreements.length,
      icon: <FileText className="h-5 w-5" />,
      color: "bg-success/10 text-success",
    },
    {
      title: "Monthly Income",
      value: `₹${totalRent.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: "bg-accent/10 text-accent-foreground",
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
          <h1 className="font-display text-3xl font-bold">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">
            Here's an overview of your properties and rental activity.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent Properties */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Your Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {myProperties.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {myProperties.map((property) => (
                    <div
                      key={property.id}
                      className="relative overflow-hidden rounded-lg border border-border/50 group"
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
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              property.status === 'approved'
                                ? 'bg-success/15 text-success border border-success/30'
                                : property.status === 'rejected'
                                  ? 'bg-destructive/15 text-destructive border border-destructive/30'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {property.status === 'approved'
                              ? 'Approved'
                              : property.status === 'rejected'
                                ? 'Rejected'
                                : 'Pending Review'}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {property.location}
                        </p>
                        <p className="mt-2 font-bold text-primary">
                          ₹{property.rent.toLocaleString()}/mo
                        </p>
                        {property.availability === 'rented' && (
                          <p className="mt-1 text-xs text-warning font-medium">Rented Out</p>
                        )}
                        {property.status === 'rejected' && property.rejectionReason && (
                          <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                            <strong>Admin Feedback:</strong> {property.rejectionReason}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          {property.availability === 'rented' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={async () => {
                                if (window.confirm('Mark this property as available again?')) {
                                  try {
                                    await propertyAPI.updateAvailability(property.id, 'available');
                                    setMyProperties(prev => prev.map(p =>
                                      p.id === property.id ? { ...p, availability: 'available' } : p
                                    ));
                                    toast({
                                      title: "Property marked as available",
                                      description: "The property is now available for rent.",
                                    });
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.response?.data?.error || "Failed to update property.",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Mark Available
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate(`/landlord/properties/edit/${property.id}`)}
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this property?')) {
                                    try {
                                      await propertyAPI.delete(property.id);
                                      setMyProperties(prev => prev.filter(p => p.id !== property.id));
                                      toast({
                                        title: "Property deleted",
                                        description: "The property has been deleted successfully.",
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: "Error",
                                        description: error.response?.data?.error || "Failed to delete property.",
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No properties yet. Add your first property to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Requests</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/landlord/requests")}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {myRequests.length > 0 ? (
                <div className="space-y-4">
                  {myRequests.slice(0, 3).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                    >
                      <div>
                        <p className="font-medium">{request.propertyTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          From: {request.tenantName}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Proposed: ₹{request.proposedRent.toLocaleString()}/mo
                          {request.counterRent && (
                            <span className="ml-2">• Counter: ₹{request.counterRent.toLocaleString()}/mo</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${request.status === "pending"
                            ? "bg-warning/10 text-warning"
                            : request.status === "countered"
                              ? "bg-accent/10 text-accent-foreground"
                              : request.status === "approved"
                                ? "bg-info/10 text-info" // Or distinct color for payment pending
                                : request.status === "accepted" || request.status === "finalized"
                                  ? "bg-success/10 text-success"
                                  : "bg-muted text-muted-foreground"
                            }`}
                        >
                          {request.status === 'approved' ? 'Payment Pending' : request.status}
                        </span>
                      </div>
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
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default LandlordDashboard;
