import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminAPI } from "@/services/api";
import { Agreement } from "@/types";
import { Search, FileText, Loader2, Download, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminAgreements = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [agreements, setAgreements] = useState<Agreement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAgreements = async () => {
            if (!user || user.role !== "admin") return;

            try {
                setIsLoading(true);
                const { agreements: fetchedAgreements } = await adminAPI.getAllAgreements();
                setAgreements(fetchedAgreements);
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

    if (!user || user.role !== "admin") {
        return <Navigate to="/login" replace />;
    }

    const filteredAgreements = agreements.filter(
        (a) =>
            a.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.landlordName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDownloadPDF = (pdfPath: string) => {
        // Check if pdfPath already contains /uploads/ or starts with it
        const baseUrl = 'http://localhost:5000';
        let finalPath = '';

        if (pdfPath.startsWith('/uploads/')) {
            finalPath = `${baseUrl}${pdfPath}`;
        } else if (pdfPath.startsWith('uploads/')) {
            finalPath = `${baseUrl}/${pdfPath}`;
        } else {
            finalPath = `${baseUrl}/uploads/${pdfPath}`;
        }

        window.open(finalPath, '_blank');
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
                            <FileText className="h-8 w-8" />
                            Agreements Management
                        </h1>
                        <p className="text-muted-foreground">
                            View all rental agreements secured on the blockchain.
                        </p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search agreements..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </motion.div>

                {/* Agreements List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>All Agreements ({filteredAgreements.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredAgreements.map((a) => (
                                        <div
                                            key={a.id}
                                            className="flex flex-col gap-4 p-4 rounded-lg border border-border/50 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{a.propertyTitle}</p>
                                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                                        <span>Tenant: {a.tenantName}</span>
                                                        <span>Landlord: {a.landlordName}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                                                        Hash: {a.blockchainHash?.substring(0, 10)}...{a.blockchainHash?.substring(a.blockchainHash.length - 8)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="text-right mr-4 hidden md:block">
                                                    <p className="font-medium">₹{a.finalRent.toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(a.startDate).toLocaleDateString()} - {new Date(a.endDate).toLocaleDateString()}
                                                    </p>
                                                </div>

                                                {a.pdfPath && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDownloadPDF(a.pdfPath!)}
                                                    >
                                                        <Download className="mr-1 h-4 w-4" />
                                                        PDF
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {filteredAgreements.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {isLoading ? "Loading agreements..." : "No agreements found matching your search."}
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

export default AdminAgreements;
