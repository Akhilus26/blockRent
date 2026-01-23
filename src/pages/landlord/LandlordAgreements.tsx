import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlockchainBadge } from "@/components/ui/blockchain-badge";
import { agreementAPI } from "@/services/api";
import { Agreement } from "@/types";
import { FileText, Download, Calendar, DollarSign, User, Home, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const LandlordAgreements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myAgreements, setMyAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAgreements = async () => {
      if (!user || user.role !== "landlord") return;

      try {
        setIsLoading(true);
        const { agreements } = await agreementAPI.getLandlordAgreements();
        console.log('Fetched agreements:', agreements);
        setMyAgreements(agreements || []);
      } catch (error: any) {
        console.error('Error fetching agreements:', error);
        toast({
          title: "Error",
          description: "Failed to load agreements. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgreements();
  }, [user, toast]);

  if (!user || user.role !== "landlord") {
    return <Navigate to="/login" replace />;
  }

  const handleDownload = (pdfPath: string | null) => {
    if (pdfPath) {
      const fullUrl = `http://localhost:5000${pdfPath}`;
      window.open(fullUrl, '_blank');
    } else {
      toast({
        title: "PDF not available",
        description: "The PDF for this agreement is not available.",
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
            <FileText className="h-8 w-8" />
            My Agreements
          </h1>
          <p className="text-muted-foreground">
            View your finalized, blockchain-secured rental agreements.
          </p>
        </motion.div>

        {/* Agreements List */}
        {myAgreements.length > 0 ? (
          <div className="space-y-6">
            {myAgreements.map((agreement, index) => (
              <motion.div
                key={agreement.id}
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
                          {agreement.propertyTitle}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Agreement ID: {agreement.id}
                        </p>
                      </div>
                      <BlockchainBadge
                        hash={agreement.blockchainHash}
                        timestamp={new Date(agreement.blockchainTimestamp).toLocaleString()}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Agreement Details */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Rent</p>
                          <p className="font-semibold">₹{agreement.finalRent.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                          <Calendar className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <p className="font-semibold">
                            {new Date(agreement.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                          <Calendar className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">End Date</p>
                          <p className="font-semibold">
                            {new Date(agreement.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tenant</p>
                          <p className="font-semibold">{agreement.tenantName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Blockchain Info */}
                    <BlockchainBadge
                      hash={agreement.blockchainHash}
                      timestamp={new Date(agreement.blockchainTimestamp).toLocaleString()}
                    />

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        className="bg-gradient-primary hover:opacity-90"
                        onClick={() => handleDownload(agreement.pdfPath || null)}
                        disabled={!agreement.pdfPath}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button variant="outline">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Agreements Yet</h3>
              <p className="text-muted-foreground mb-4">
                Once you finalize a rental, your blockchain-secured agreement will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LandlordAgreements;
