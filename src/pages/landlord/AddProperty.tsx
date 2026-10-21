import { useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { propertyAPI } from "@/services/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Link as LinkIcon, ArrowLeft, X, FileText, ShieldCheck, AlertCircle } from "lucide-react";
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

const AddProperty = () => {
  const { user } = useAuth();
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [ownershipDocFile, setOwnershipDocFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!user || user.role !== "landlord") {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const response = await propertyAPI.uploadImages(files);
      setImages((prev) => [...prev, ...response.files]);
      setUploadedFiles((prev) => [...prev, ...files]);
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
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownershipDocFile) {
      toast({
        title: "Ownership Document Required",
        description: "Please upload an ownership document (title deed/tax receipt) for property verification.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Upload ownership document securely
      const uploadRes = await propertyAPI.uploadOwnership(ownershipDocFile);

      // 2. Create property record in pending status
      const res = await propertyAPI.create({
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
        ownershipDocument: uploadRes.ownershipDocument,
        ownershipDocumentName: uploadRes.ownershipDocumentName,
      });

      // Reset form
      setFormData({
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
      setImages([]);
      setUploadedFiles([]);
      setOwnershipDocFile(null);

      toast({
        title: "Property Submitted!",
        description: res.message || "Your property has been submitted and is pending administrator verification.",
      });

      navigate("/landlord");
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add property. Please try again.",
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
            onClick={() => navigate("/landlord/properties")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Button>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Plus className="h-8 w-8" />
            Add New Property
          </h1>
          <p className="text-muted-foreground">
            Fill in the details and provide ownership verification documents.
          </p>
        </motion.div>

        {/* Verification Info Notice */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Property Ownership Verification</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              To safeguard tenants, newly listed properties undergo admin verification of title deeds or property tax receipts before appearing on public search listings.
            </p>
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Modern Downtown Apartment"
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
                      placeholder="25000"
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
                      placeholder="123 Main St, Apartment 4B"
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
                      placeholder="2"
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
                      placeholder="2"
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
                      placeholder="1200"
                      value={formData.area}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Ownership Document Section */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Ownership Document *
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Upload title deed, property tax receipt, or utility bill (PDF, JPG, PNG, Max 10MB).
                      </p>
                    </div>
                  </div>

                  <input
                    ref={ownershipDocInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleOwnershipDocSelect}
                    className="hidden"
                    id="ownership-doc-upload"
                  />
                  <div
                    onClick={() => ownershipDocInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-sm font-medium text-foreground">
                      {ownershipDocFile ? ownershipDocFile.name : "Click to browse ownership document"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      PDF, JPEG, or PNG (Max 10 MB)
                    </p>
                  </div>
                </div>

                {/* Public Images Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-medium">Property Photos & Media</h3>

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
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/landlord/properties")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-primary hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Submitting for Verification..." : "Submit Property"}
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

export default AddProperty;
