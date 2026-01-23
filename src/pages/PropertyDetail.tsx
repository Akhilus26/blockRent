import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { propertyAPI, requestAPI } from "@/services/api";
import { Property } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Square,
  User,
  Calendar,
  Play,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [proposedRent, setProposedRent] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await propertyAPI.getById(id);
        setProperty(response.property);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load property details",
          variant: "destructive",
        });
        navigate("/tenant");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [id, navigate, toast]);

  const handleRequest = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "tenant") {
      toast({
        title: "Access Denied",
        description: "Only tenants can submit rental requests.",
        variant: "destructive",
      });
      return;
    }

    if (!property) return;

    // Open dialog for negotiation form
    setProposedRent(property.rent.toString());
    setShowRequestDialog(true);
  };

  const handleSubmitRequest = async () => {
    if (!property) return;

    const rentValue = proposedRent ? parseFloat(proposedRent) : property.rent;

    if (isNaN(rentValue) || rentValue <= 0) {
      toast({
        title: "Invalid rent",
        description: "Please enter a valid rent amount.",
        variant: "destructive",
      });
      return;
    }

    const minRent = property.rent * 0.75;
    const maxRent = property.rent;

    if (rentValue < minRent || rentValue > maxRent) {
      toast({
        title: "Invalid Offer",
        description: `Proposed rent must be between ₹${minRent.toLocaleString()} (75%) and ₹${maxRent.toLocaleString()} (100%) of the original rent.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await requestAPI.create({
        propertyId: property.id,
        proposedRent: rentValue,
        message: message || undefined,
      });

      toast({
        title: "Request submitted!",
        description: "Your rental request has been sent to the landlord.",
      });

      setShowRequestDialog(false);
      setProposedRent("");
      setMessage("");
      navigate("/tenant");
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Property Not Found</h2>
            <Button onClick={() => navigate('/tenant')}>Back to Dashboard</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <BackButton className="mb-6" />

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative aspect-[16/9] overflow-hidden rounded-xl"
              >
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
                <div className="absolute top-4 left-4">
                  <StatusBadge status={property.status} />
                </div>
              </motion.div>

              {/* Additional Images */}
              {property.images.length > 1 && (
                <div className="grid grid-cols-3 gap-4">
                  {property.images.slice(1, 4).map((image, i) => (
                    <div
                      key={i}
                      className="aspect-[4/3] overflow-hidden rounded-lg"
                    >
                      <img
                        src={
                          image.startsWith('/uploads/')
                            ? `http://localhost:5000${image}`
                            : image
                        }
                        alt={`${property.title} ${i + 2}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Property Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <h1 className="font-display text-3xl font-bold mb-2">
                  {property.title}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>{property.location}</span>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-6 mb-6">
                  {property.bedrooms && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Bed className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{property.bedrooms}</p>
                        <p className="text-xs text-muted-foreground">Bedrooms</p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Bath className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{property.bathrooms}</p>
                        <p className="text-xs text-muted-foreground">Bathrooms</p>
                      </div>
                    </div>
                  )}
                  {property.area && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Square className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{property.area}</p>
                        <p className="text-xs text-muted-foreground">Sq. Ft.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <h2 className="font-semibold text-lg mb-3">Description</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {property.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Video Section */}
              {property.youtubeUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Property Video
                      </h2>
                      <a
                        href={property.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        Watch on YouTube
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Price Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-border/50 sticky top-24">
                  <CardContent className="p-6">
                    <div className="mb-6">
                      <p className="text-3xl font-bold">
                        ₹{property.rent.toLocaleString()}
                        <span className="text-lg font-normal text-muted-foreground">
                          /month
                        </span>
                      </p>
                    </div>

                    <Button
                      className="w-full bg-gradient-primary hover:opacity-90 mb-4"
                      size="lg"
                      onClick={handleRequest}
                      disabled={isSubmitting || property.availability === 'rented'}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Request...
                        </>
                      ) : property.availability === 'rented' ? (
                        "Rented Out"
                      ) : (
                        "Send Rental Request"
                      )}
                    </Button>

                    <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Rental Request</DialogTitle>
                          <DialogDescription>
                            Enter your proposed rent and optional message to the landlord.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="proposedRent">Proposed Rent (₹/month)</Label>
                            <Input
                              id="proposedRent"
                              type="number"
                              value={proposedRent}
                              onChange={(e) => setProposedRent(e.target.value)}
                              placeholder={property.rent.toString()}
                              min="1"
                            />
                            <p className="text-xs text-muted-foreground">
                              Original rent: ₹{property.rent.toLocaleString()}/month
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="message">Message (Optional)</Label>
                            <Textarea
                              id="message"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Add any additional information or questions..."
                              rows={4}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => setShowRequestDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSubmitRequest}
                              className="bg-gradient-primary hover:opacity-90"
                            >
                              Submit Request
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {property.landlordName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Property Owner
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Listed on{" "}
                            {new Date(property.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Available Now
                          </p>
                        </div>
                      </div>

                      {property.landlordEmail && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {property.landlordEmail}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Email Address
                            </p>
                          </div>
                        </div>
                      )}

                      {property.landlordPhone && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {property.landlordPhone}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Phone Number
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PropertyDetail;
