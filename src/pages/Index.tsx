import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyCard } from "@/components/property/PropertyCard";
import { BlockchainBadge } from "@/components/ui/blockchain-badge";
import { propertyAPI } from "@/services/api";
import { Property } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Shield, FileCheck, Users, ArrowRight, CheckCircle2, Lock, Zap } from "lucide-react";
import { motion } from "framer-motion";
const features = [{
  icon: <Shield className="h-6 w-6" />,
  title: "Blockchain Secured",
  description: "All agreements are immutably stored on the blockchain for maximum security and transparency."
}, {
  icon: <FileCheck className="h-6 w-6" />,
  title: "Smart Contracts",
  description: "Automated, tamper-proof rental agreements that execute exactly as programmed."
}, {
  icon: <Lock className="h-6 w-6" />,
  title: "Data Privacy",
  description: "Your personal and financial information is encrypted and protected at all times."
}, {
  icon: <Zap className="h-6 w-6" />,
  title: "Instant Verification",
  description: "Quick verification of property ownership and rental history through blockchain records."
}];
const steps = [{
  step: "01",
  title: "Browse Properties",
  description: "Explore our curated selection of verified rental properties."
}, {
  step: "02",
  title: "Submit Request",
  description: "Send a rental request to the landlord with your preferred terms."
}, {
  step: "03",
  title: "Negotiate Terms",
  description: "Discuss and finalize rent and conditions with the property owner."
}, {
  step: "04",
  title: "Sign & Secure",
  description: "Digitally sign the agreement, secured forever on the blockchain."
}];
const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);

  useEffect(() => {
    // Redirect logged-in users to their dashboard
    if (user) {
      const redirectPath = user.role === "admin" ? "/admin" : user.role === "landlord" ? "/landlord" : "/tenant";
      navigate(redirectPath, { replace: true });
      return;
    }

    const fetchProperties = async () => {
      try {
        const { properties } = await propertyAPI.getAll('approved');
        setFeaturedProperties(properties.slice(0, 3));
      } catch (error) {
        console.error('Error fetching featured properties:', error);
        // Silently fail for homepage - don't show error
      }
    };

    fetchProperties();
  }, [user, navigate]);

  // Don't render content if user is logged in (will redirect)
  if (user) {
    return null;
  }

  return <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRoLTEydi0yaC0ydjZoMTZ2LTZoLTJ2MnptLTEyLTZoMTJ2MkgyNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        
        <div className="container relative mx-auto px-4 py-24 lg:py-32">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary-foreground/80 backdrop-blur-sm border border-primary-foreground/10">
              <Shield className="h-4 w-4" />
              <span>Powered by Blockchain Technology</span>
            </div>
            
            <h1 className="mb-6 font-display text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
              Secure Property Rentals on the{" "}
              <span className="text-primary">Blockchain</span>
            </h1>
            
            <p className="mb-8 text-lg text-primary-foreground/70 sm:text-xl">
              Experience transparent, tamper-proof rental agreements. Connect landlords and tenants with trust, security, and smart contract automation.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button 
                size="lg" 
                variant="outline"
                className="bg-background text-foreground border-border hover:bg-primary hover:text-primary-foreground text-lg px-8" 
                onClick={() => navigate("/properties")}
              >
                Browse Properties
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {!user && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="bg-background text-foreground border-border hover:bg-primary hover:text-primary-foreground text-lg px-8" 
                  onClick={() => navigate("/register")}
                >
                  Get Started
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5
        }} className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-display text-3xl font-bold sm:text-4xl mb-4">
              Why Choose BlockRent?
            </h2>
            <p className="text-muted-foreground text-lg">
              We combine cutting-edge blockchain technology with a seamless user experience.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => <motion.div key={i} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.4,
            delay: 0.1 * i
          }}>
                <Card className="h-full card-hover border-border/50">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5
        }} className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-display text-3xl font-bold sm:text-4xl mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Get started in just four simple steps.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => <motion.div key={i} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.4,
            delay: 0.1 * i
          }} className="relative">
                <div className="text-6xl font-bold text-primary/10 mb-4">{step.step}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
                {i < steps.length - 1 && <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary/20 to-transparent -translate-x-8" />}
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5
        }} className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl mb-2">
                Featured Properties
              </h2>
              <p className="text-muted-foreground">
                Discover our handpicked selection of premium rentals.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/properties")}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map(property => <PropertyCard key={property.id} property={property} onView={() => navigate(`/properties/${property.id}`)} onRequest={() => navigate("/register")} />)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5
        }} className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl mb-4">
              Ready to Experience Secure Rentals?
            </h2>
            <p className="text-primary-foreground/70 text-lg mb-8">
              Join landlords and tenants who trust BlockRent for their property agreements.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button 
                size="lg" 
                variant="outline"
                className="bg-background text-foreground border-border hover:bg-primary hover:text-primary-foreground text-lg px-8" 
                onClick={() => navigate("/register")}
              >
                Create Account
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-background text-foreground border-border hover:bg-primary hover:text-primary-foreground text-lg px-8" 
                onClick={() => navigate("/properties")}
              >
                Browse Properties
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">BlockRent</span>
            </div>
            
            <BlockchainBadge compact />
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;