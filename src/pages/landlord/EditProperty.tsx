import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { propertyAPI } from "@/services/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link as LinkIcon, ArrowLeft, Loader2, Upload, X, FileText, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod"
];

const EditProperty = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownershipDocInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rent: "",
    location: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
    district: "",
    youtubeUrl: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("pending");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [existingDocName, setExistingDocName] = useState<string | null>(null);
  const [ownershipDocFile, setOwnershipDocFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;

      try {
        setIsFetching(true);
        const { property } = await propertyAPI.getById(id);

        // Check if user owns this property
        if (property.landlordId !== user?.id && user?.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You can only edit your own properties.",
            variant: "destructive",
          });
          navigate("/landlord");
          return;
        }

        // Populate form with existing data
        setFormData({
          title: property.title || "",
          description: property.description || "",
          rent: property.rent?.toString() || "",
          location: property.location || "",
          bedrooms: property.bedrooms?.toString() || "",
          bathrooms: property.bathrooms?.toString() || "",
          area: property.area?.toString() || "",
          district: property.district || "",
          youtubeUrl: property.youtubeUrl || "",
        });
        setImages(property.images || []);
        setStatus(property.status || "pending");
        setRejectionReason(property.rejectionReason || null);
        setExistingDocName(property.ownershipDocumentName || null);
      } catch (error: any) {
        console.error('Error fetching property:', error);
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to load property. Please try again.",
          variant: "destructive",
        });
        navigate("/landlord");
      } finally {
        setIsFetching(false);
      }
    };

    if (user && id) {
      fetchProperty();
    }
  }, [id, user, navigate, toast]);

  if (!user || user.role !== "landlord") {
    return <Navigate to="/login" replace />;
  }

  if (isFetching) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleOwnershipDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Ownership document must be under 10 MB in size.",
        variant: "destructive",
      });
      if (ownershipDocInputRef.current) ownershipDocInputRef.current.value = "";
      return;
    }

    const allowed = /\.(pdf|jpg|jpeg|png)$/i;
    if (!allowed.test(file.name)) {
      toast({
        title: "Invalid file format",
        description: "Only PDF, JPEG, and PNG files are allowed.",
        variant: "destructive",
      });
      if (ownershipDocInputRef.current) ownershipDocInputRef.current.value = "";
      return;
    }

    setOwnershipDocFile(file);
    toast({
      title: "Document selected",
      description: `${file.name} ready for upload. Submitting will send the property for admin re-verification.`,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const response = await propertyAPI.uploadImages(files);
      setImages((prev) => [...prev, ...response.files]);
      toast({
        title: "Images uploaded!",
        description: `${files.length} file(s) uploaded successfully.`,
      });
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload failed",
        description: error.response?.data?.error || "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsLoading(true);

    try {
      let newDocKey: string | undefined = undefined;
      let newDocName: string | undefined = undefined;

      // If a new ownership document was selected, upload it securely first
      if (ownershipDocFile) {
        const uploadRes = await propertyAPI.uploadOwnership(ownershipDocFile);
        newDocKey = uploadRes.ownershipDocument;
        newDocName = uploadRes.ownershipDocumentName;
      }

      await propertyAPI.update(id, {
        title: formData.title,
        description: formData.description,
        rent: Number(formData.rent),
        location: formData.location,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
        area: formData.area ? Number(formData.area) : undefined,
        district: formData.district || undefined,
        youtubeUrl: formData.youtubeUrl || undefined,
        images: images,
        ...(newDocKey && { ownershipDocument: newDocKey, ownershipDocumentName: newDocName }),
      });

      toast({
        title: "Property updated!",
        description: status === "rejected" || ownershipDocFile
          ? "Property updated and resubmitted for admin verification."
          : "Your property has been updated successfully.",
      });

      navigate("/landlord");
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate("/landlord")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            Edit Property
          </h1>
          <p className="text-muted-foreground">
            Update your property details.
          </p>
        </motion.div>

        {/* Status Notification Banner */}
        {status === 'approved' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-emerald-400" />
            <div>
              <p className="font-medium text-sm">Property Approved & Live</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This property is verified and visible to tenants in search and discovery listings.
              </p>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-start gap-3">
            <Clock className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-400" />
            <div>
              <p className="font-medium text-sm">Under Review (Pending Approval)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This property is pending administrative verification and is hidden from public listings until approved.
              </p>
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-sm">Verification Rejected</p>
              <p className="text-xs text-red-300 mt-0.5">
                <strong>Reason:</strong> {rejectionReason || "Ownership documents could not be verified."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please update the property details or upload a valid ownership document below. Submitting will reset your property status to <strong>Pending</strong> for administrator re-review.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>
                Note: Updating a rejected property or uploading a new ownership document will automatically reset status to Pending for admin re-approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Enter property title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your property in detail..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rent">Monthly Rent (₹) *</Label>
                    <Input
                      id="rent"
                      name="rent"
                      type="number"
                      placeholder="Enter monthly rent"
                      value={formData.rent}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Building/Street Location *</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Enter property location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District *</Label>
                    <Select
                      value={formData.district}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, district: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICTS.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      name="bedrooms"
                      type="number"
                      placeholder="Number of bedrooms"
                      value={formData.bedrooms}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      name="bathrooms"
                      type="number"
                      placeholder="Number of bathrooms"
                      value={formData.bathrooms}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">Area (sq ft)</Label>
                    <Input
                      id="area"
                      name="area"
                      type="number"
                      placeholder="Property area"
                      value={formData.area}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-medium">Media</h3>

                  <div className="space-y-2">
                    <Label>Property Images</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Drag and drop images/videos here, or click to browse
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? "Uploading..." : "Upload Images/Videos"}
                      </Button>
                    </div>

                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={`http://localhost:5000${image}`}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl">YouTube Video URL (Optional)</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="youtubeUrl"
                        name="youtubeUrl"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={formData.youtubeUrl}
                        onChange={handleChange}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Ownership Verification Document
                      </h3>
                      {existingDocName && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          Current: {existingDocName}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Upload title deed, property tax receipt, or municipal ownership proof. Supported formats: PDF, JPEG, PNG (max 10MB).
                      {existingDocName && " Leave unselected to keep your existing document on file."}
                    </p>

                    <input
                      ref={ownershipDocInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleOwnershipDocSelect}
                      className="hidden"
                      id="ownership-doc-upload"
                    />

                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => ownershipDocInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {ownershipDocFile ? "Change Selected Document" : (existingDocName ? "Replace Ownership Document" : "Upload Ownership Document")}
                      </Button>
                      {ownershipDocFile && (
                        <span className="text-sm text-primary font-medium flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" />
                          New file selected: {ownershipDocFile.name}
                        </span>
                      )}
                    </div>
                    {ownershipDocFile && (
                      <p className="text-xs text-amber-400">
                        ⚠️ Uploading a replacement ownership document will reset this property's verification status to Pending.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/landlord")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-primary hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Property"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default EditProperty;
