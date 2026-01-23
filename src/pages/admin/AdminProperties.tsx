import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { propertyAPI } from "@/services/api";
import { Property } from "@/types";
import { Search, Home, Loader2, Trash2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminProperties = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            if (!user || user.role !== "admin") return;

            try {
                setIsLoading(true);
                // Use getAll to fetch all properties, status param optional but getAll fetches all if not specified (backend logic: if status is provided filter, else all)
                // However backend code shows: if status, filter, else all. Wait, line 63 in properties.js: const { status } = req.query; if (status) params.push(status);
                // So passing no status to propertyAPI.getAll() should return all properties.
                const { properties: fetchedProperties } = await propertyAPI.getAll();
                setProperties(fetchedProperties);
            } catch (error: any) {
                console.error('Error fetching properties:', error);
                toast({
                    title: "Error",
                    description: "Failed to load properties. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProperties();
    }, [user, toast]);

    if (!user || user.role !== "admin") {
        return <Navigate to="/login" replace />;
    }

    const filteredProperties = properties.filter(
        (p) =>
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.landlordName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (propertyId: string) => {
        if (!window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
            return;
        }

        try {
            await propertyAPI.delete(propertyId);
            setProperties((prev) => prev.filter((p) => p.id !== propertyId));
            toast({
                title: "Property deleted",
                description: "The property has been permanently deleted.",
            });
        } catch (error: any) {
            console.error('Error deleting property:', error);
            toast({
                title: "Error",
                description: error.response?.data?.error || "Failed to delete property.",
                variant: "destructive",
            });
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                >
                    <div>
                        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
                            <Home className="h-8 w-8" />
                            Property Management
                        </h1>
                        <p className="text-muted-foreground">
                            View and manage all properties on the platform.
                        </p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search properties..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </motion.div>

                {/* Properties List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>All Properties ({filteredProperties.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredProperties.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex flex-col gap-4 p-4 rounded-lg border border-border/50 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                {p.images && p.images.length > 0 ? (
                                                    <img
                                                        src={`http://localhost:5000${p.images[0]}`}
                                                        alt={p.title}
                                                        className="w-16 h-16 object-cover rounded-md"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "https://placehold.co/100?text=No+Image";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                                                        <Home className="h-6 w-6" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium">{p.title}</p>
                                                    <p className="text-sm text-muted-foreground">{p.location}</p>
                                                    <p className="text-sm text-muted-foreground">Landlord: {p.landlordName}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <StatusBadge status={p.status || 'unknown'} />
                                                <span className={`text-xs px-2 py-1 rounded-full border ${p.availability === 'available'
                                                        ? 'bg-success/10 text-success border-success/20'
                                                        : 'bg-muted text-muted-foreground border-border'
                                                    }`}>
                                                    {p.availability === 'available' ? 'Available' : 'Rented'}
                                                </span>

                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                    >
                                                        <a href={`/properties/${p.id}`} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        title="Delete Property"
                                                        onClick={() => handleDelete(p.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredProperties.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {isLoading ? "Loading properties..." : "No properties found matching your search."}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default AdminProperties;
