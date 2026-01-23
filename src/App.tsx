import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminAgreements from "./pages/admin/AdminAgreements";
import LandlordDashboard from "./pages/landlord/LandlordDashboard";
import AddProperty from "./pages/landlord/AddProperty";
import EditProperty from "./pages/landlord/EditProperty";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantAgreements from "./pages/tenant/TenantAgreements";
import TenantRequests from "./pages/tenant/TenantRequests";
import LandlordRequests from "./pages/landlord/LandlordRequests";
import LandlordAgreements from "./pages/landlord/LandlordAgreements";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/profile" element={<Profile />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/properties"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminProperties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/agreements"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAgreements />
                </ProtectedRoute>
              }
            />

            {/* Landlord Routes */}
            <Route
              path="/landlord"
              element={
                <ProtectedRoute allowedRoles={['landlord']}>
                  <LandlordDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/landlord/properties"
              element={
                <ProtectedRoute allowedRoles={['landlord']}>
                  <LandlordDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/landlord/properties/add"
              element={
                <ProtectedRoute allowedRoles={['landlord']}>
                  <AddProperty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/landlord/properties/edit/:id"
              element={
                <ProtectedRoute allowedRoles={['landlord']}>
                  <EditProperty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/landlord/requests"
              element={
                <ProtectedRoute allowedRoles={['landlord']}>
                  <LandlordRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/landlord/agreements"
              element={
                <ProtectedRoute allowedRoles={['landlord']}>
                  <LandlordAgreements />
                </ProtectedRoute>
              }
            />

            {/* Tenant Routes */}
            <Route
              path="/tenant"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <TenantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/properties"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Properties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/requests"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <TenantRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/agreements"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <TenantAgreements />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
