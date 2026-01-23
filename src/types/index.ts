export type UserRole = 'admin' | 'landlord' | 'tenant';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  avatar?: string;
  phone?: string;
  createdAt: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  rent: number;
  location: string;
  images: string[];
  videoUrl?: string;
  youtubeUrl?: string;
  landlordId: string;
  landlordName: string;
  landlordEmail?: string;
  landlordPhone?: string;
  status: 'pending' | 'approved' | 'rejected';
  availability?: 'available' | 'rented';
  district?: string;
  createdAt: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
}

export interface RentalRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  tenantId: string;
  tenantName: string;
  landlordId: string;
  status: 'pending' | 'countered' | 'approved' | 'accepted' | 'rejected' | 'finalized';
  paymentStatus?: 'pending' | 'completed';
  proposedRent: number;
  originalRent: number;
  advanceAmount?: number;
  approvalTimestamp?: string;
  counterRent?: number | null;
  finalRent?: number | null;
  message?: string;
  blockchainHash?: string | null;
  blockchainTimestamp?: string | null;
  pdfPath?: string | null;
  createdAt: string;
}

export interface Agreement {
  id: string;
  propertyId: string;
  propertyTitle: string;
  tenantId: string;
  tenantName: string;
  landlordId: string;
  landlordName: string;
  finalRent: number;
  startDate: string;
  endDate: string;
  blockchainHash: string;
  blockchainTimestamp: string;
  pdfPath?: string | null;
  status: 'finalized';
  createdAt: string;
}

export interface NegotiationMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  proposedRent?: number;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ user: User }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}
