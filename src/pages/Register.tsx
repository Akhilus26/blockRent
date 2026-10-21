import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackButton } from "@/components/ui/back-button";
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Loader2,
  Home,
  Users,
  Upload,
  FileText,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const DOCUMENT_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Voter ID",
  "Passport"
];

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("tenant");
  const [identityDocumentType, setIdentityDocumentType] = useState("Aadhaar Card");
  const [identityDocumentFile, setIdentityDocumentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Identity documents must be under 5 MB in size.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate extension
    const allowed = /\.(pdf|jpg|jpeg|png)$/i;
    if (!allowed.test(file.name)) {
      toast({
        title: "Invalid file format",
        description: "Only PDF, JPEG, and PNG files are allowed.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIdentityDocumentFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === "tenant" && !identityDocumentFile) {
      toast({
        title: "Document Required",
        description: "Please upload an identity document for tenant verification.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (role === "tenant" && identityDocumentFile) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("role", role);
        if (phone) formData.append("phone", phone);
        formData.append("identityDocumentType", identityDocumentType);
        formData.append("identityDocument", identityDocumentFile);

        await register(formData);
      } else {
        await register({ name, email, password, role, phone });
      }

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setIdentityDocumentFile(null);
      setRole("tenant");

      toast({
        title: "Account created!",
        description: role === "tenant"
          ? "Registration successful! Your identity document is pending admin approval."
          : "Registration successful! Please login to continue.",
      });

      // Redirect to login page
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    const redirectPath = user.role === "admin" ? "/admin" : user.role === "landlord" ? "/landlord" : "/tenant";
    navigate(redirectPath);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRoLTEydi0yaC0ydjZoMTZ2LTZoLTJ2MnptLTEyLTZoMTJ2MkgyNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />

        <div className="relative z-10 flex flex-col justify-center p-12">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-primary-foreground">BlockRent</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-4xl font-bold text-primary-foreground mb-4">
              Join BlockRent
            </h1>
            <p className="text-primary-foreground/70 text-lg max-w-md">
              Create your account with secure identity and property verification, powered by blockchain integrity.
            </p>
          </motion.div>

          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-primary-foreground/80">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span>Admin-verified tenant identity</span>
            </div>
            <div className="flex items-center gap-3 text-primary-foreground/80">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </div>
              <span>Verified landlord property listings</span>
            </div>
            <div className="flex items-center gap-3 text-primary-foreground/80">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </div>
              <span>Tamper-evident blockchain agreements</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <BackButton className="mb-4" />

          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">BlockRent</span>
            </Link>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-display">Create Account</CardTitle>
              <CardDescription>
                Choose your role and enter your details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Role Selection */}
                <div className="space-y-3">
                  <Label>I am a</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) => setRole(value as UserRole)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="tenant" id="tenant" className="peer sr-only" />
                      <Label
                        htmlFor="tenant"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <Users className="mb-2 h-6 w-6" />
                        <span className="font-medium">Tenant</span>
                        <span className="text-xs text-muted-foreground">Looking to rent</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="landlord" id="landlord" className="peer sr-only" />
                      <Label
                        htmlFor="landlord"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <Home className="mb-2 h-6 w-6" />
                        <span className="font-medium">Landlord</span>
                        <span className="text-xs text-muted-foreground">List properties</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Tenant Identity Document Upload Section */}
                {role === "tenant" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-2 border-t border-border/50"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 font-medium">
                        <FileText className="h-4 w-4 text-primary" />
                        Identity Document Verification *
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="docType" className="text-xs text-muted-foreground">Document Type</Label>
                      <Select
                        value={identityDocumentType}
                        onValueChange={setIdentityDocumentType}
                      >
                        <SelectTrigger id="docType">
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
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                        id="identity-doc-upload"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-sm font-medium text-foreground">
                          {identityDocumentFile ? identityDocumentFile.name : "Click to select document"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          PDF, JPG, or PNG (Max 5 MB)
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
