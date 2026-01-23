import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackButton } from "@/components/ui/back-button";
import { propertyAPI } from "@/services/api";
import { Property } from "@/types";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
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

const Properties = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [bedroomFilter, setBedroomFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching properties from API...');
        const { properties: fetchedProperties } = await propertyAPI.getAll('approved');
        console.log(`Received ${fetchedProperties.length} properties from API:`, fetchedProperties);
        setProperties(fetchedProperties || []);
      } catch (error: any) {
        console.error('Error fetching properties:', error);
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to load properties. Please try again.",
          variant: "destructive",
        });
        setProperties([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [toast]);

  const approvedProperties = properties;

  const filteredProperties = approvedProperties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "under10000" && property.rent < 10000) ||
      (priceFilter === "10000-15000" && property.rent >= 10000 && property.rent <= 15000) ||
      (priceFilter === "15000-20000" && property.rent >= 15000 && property.rent <= 20000) ||
      (priceFilter === "over20000" && property.rent > 20000);

    const matchesBedrooms =
      bedroomFilter === "all" ||
      (bedroomFilter === "1" && property.bedrooms === 1) ||
      (bedroomFilter === "2" && property.bedrooms === 2) ||
      (bedroomFilter === "3+" && property.bedrooms && property.bedrooms >= 3);

    const matchesDistrict =
      districtFilter === "all" || property.district === districtFilter;

    return matchesSearch && matchesPrice && matchesBedrooms && matchesDistrict;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <BackButton className="mb-4" />

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold mb-2">Browse Properties</h1>
            <p className="text-muted-foreground">
              Discover verified rental properties secured by blockchain technology.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8 flex flex-col gap-4 md:flex-row md:items-center"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-3">
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under10000">Under ₹10,000</SelectItem>
                  <SelectItem value="10000-15000">₹10,000 - ₹15,000</SelectItem>
                  <SelectItem value="15000-20000">₹15,000 - ₹20,000</SelectItem>
                  <SelectItem value="over20000">Over ₹20,000</SelectItem>
                </SelectContent>
              </Select>

              <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bedrooms</SelectItem>
                  <SelectItem value="1">1 Bedroom</SelectItem>
                  <SelectItem value="2">2 Bedrooms</SelectItem>
                  <SelectItem value="3+">3+ Bedrooms</SelectItem>
                </SelectContent>
              </Select>

              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {DISTRICTS.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Results Count */}
          {!isLoading && (
            <div className="mb-6 text-sm text-muted-foreground">
              Showing {filteredProperties.length} of {properties.length} properties
              {(searchTerm || priceFilter !== "all" || bedroomFilter !== "all" || districtFilter !== "all") && (
                <span className="ml-2 text-xs">
                  (filtered)
                </span>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading properties from database...</p>
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 * index }}
                >
                  <PropertyCard
                    property={property}
                    onView={() => navigate(`/properties/${property.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-16">
              <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties in database</h3>
              <p className="text-muted-foreground mb-4">
                There are no approved properties available at the moment.
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties match your filters</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or filters.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setPriceFilter("all");
                  setBedroomFilter("all");
                  setDistrictFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Properties;
