import axios from 'axios';
import { User, Property, RentalRequest, Agreement, RegisterData } from '@/types';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include user ID from localStorage
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('blockrent_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.id) {
        config.headers['x-user-id'] = user.id;
      }
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
    }
  }
  return config;
});

// Auth APIs
export const authAPI = {
  login: async (email: string, password: string): Promise<{ user: User }> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: RegisterData | FormData): Promise<{ user: User; message: string }> => {
    const isFormData = data instanceof FormData;
    const response = await api.post('/auth/register', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  resubmitIdentity: async (formData: FormData): Promise<{ user: User; message: string }> => {
    const response = await api.post('/auth/resubmit-identity', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: { name: string; phone?: string }): Promise<{ user: User }> => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  },
};

// Property APIs
export const propertyAPI = {
  getAll: async (status?: string): Promise<{ properties: Property[] }> => {
    const params = status ? { status } : {};
    const response = await api.get('/properties', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ property: Property }> => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },

  getByLandlord: async (landlordId: string): Promise<{ properties: Property[] }> => {
    const response = await api.get(`/properties/landlord/${landlordId}`);
    return response.data;
  },

  create: async (propertyData: Partial<Property>): Promise<{ property: Property; message: string }> => {
    const response = await api.post('/properties', propertyData);
    return response.data;
  },

  update: async (id: string, propertyData: Partial<Property>): Promise<{ property: Property; message: string }> => {
    const response = await api.put(`/properties/${id}`, propertyData);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/properties/${id}`);
    return response.data;
  },

  updateAvailability: async (id: string, availability: 'available' | 'rented'): Promise<{ property: Property }> => {
    const response = await api.patch(`/properties/${id}/availability`, { availability });
    return response.data;
  },

  uploadImages: async (files: File[]): Promise<{ files: string[] }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post('/properties/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadOwnership: async (file: File): Promise<{ ownershipDocument: string; ownershipDocumentName: string; message: string }> => {
    const formData = new FormData();
    formData.append('ownershipDocument', file);

    const response = await api.post('/properties/upload-ownership', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Request APIs
export const requestAPI = {
  create: async (data: {
    propertyId: string;
    proposedRent: number;
    message?: string;
  }): Promise<{ request: RentalRequest }> => {
    const response = await api.post('/requests', data);
    return response.data;
  },

  getUserRequests: async (): Promise<{ requests: RentalRequest[] }> => {
    const response = await api.get('/requests/user');
    return response.data;
  },

  getLandlordRequests: async (): Promise<{ requests: RentalRequest[] }> => {
    const response = await api.get('/requests/landlord');
    return response.data;
  },

  respond: async (
    id: string,
    data: {
      action: 'accept' | 'reject' | 'counter';
      counterRent?: number;
      message?: string;
    }
  ): Promise<{ request: RentalRequest }> => {
    const response = await api.patch(`/requests/${id}/respond`, data);
    return response.data;
  },

  confirm: async (
    id: string,
    data: {
      action: 'accept' | 'reject';
    }
  ): Promise<{ request: RentalRequest }> => {
    const response = await api.patch(`/requests/${id}/confirm`, data);
    return response.data;
  },

  payRequest: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/requests/${id}/pay`);
    return response.data;
  },
};

// Agreement APIs
export const agreementAPI = {
  finalize: async (data: {
    requestId: string;
    startDate: string;
    endDate: string;
  }): Promise<{ agreement: Agreement }> => {
    const response = await api.post('/agreements/finalize', data);
    return response.data;
  },

  getUserAgreements: async (): Promise<{ agreements: Agreement[] }> => {
    const response = await api.get('/agreements/user');
    return response.data;
  },

  getLandlordAgreements: async (): Promise<{ agreements: Agreement[] }> => {
    const response = await api.get('/agreements/landlord');
    return response.data;
  },

  getHash: async (id: string): Promise<{ hash: string; timestamp: string }> => {
    const response = await api.get(`/agreements/${id}/hash`);
    return response.data;
  },
};

// Admin APIs
export const adminAPI = {
  getUsers: async (): Promise<{ users: User[] }> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  approveUser: async (id: string): Promise<{ user: User; message: string }> => {
    const response = await api.patch(`/admin/users/${id}/approve`);
    return response.data;
  },

  rejectUser: async (id: string, rejectionReason: string): Promise<{ user: User; message: string }> => {
    const response = await api.patch(`/admin/users/${id}/reject`, { rejectionReason });
    return response.data;
  },

  getProperties: async (status?: string): Promise<{ properties: Property[] }> => {
    const params = status ? { status } : {};
    const response = await api.get('/admin/properties', { params });
    return response.data;
  },

  approveProperty: async (id: string): Promise<{ property: Property; message: string }> => {
    const response = await api.patch(`/admin/properties/${id}/approve`);
    return response.data;
  },

  rejectProperty: async (id: string, rejectionReason: string): Promise<{ property: Property; message: string }> => {
    const response = await api.patch(`/admin/properties/${id}/reject`, { rejectionReason });
    return response.data;
  },

  viewIdentityDocument: async (userId: string): Promise<{ url: string; mimeType: string }> => {
    const response = await api.get(`/admin/documents/identity/${userId}`, {
      responseType: 'blob',
    });
    const headerType = response.headers?.['content-type'] || (typeof response.headers?.get === 'function' ? response.headers.get('content-type') : null);
    const mimeType = (headerType && headerType.split(';')[0].trim()) || response.data?.type || 'application/pdf';
    const blob = new Blob([response.data], { type: mimeType });
    return {
      url: URL.createObjectURL(blob),
      mimeType,
    };
  },

  viewOwnershipDocument: async (propertyId: string): Promise<{ url: string; mimeType: string }> => {
    const response = await api.get(`/admin/documents/ownership/${propertyId}`, {
      responseType: 'blob',
    });
    const headerType = response.headers?.['content-type'] || (typeof response.headers?.get === 'function' ? response.headers.get('content-type') : null);
    const mimeType = (headerType && headerType.split(';')[0].trim()) || response.data?.type || 'application/pdf';
    const blob = new Blob([response.data], { type: mimeType });
    return {
      url: URL.createObjectURL(blob),
      mimeType,
    };
  },

  getStats: async (): Promise<{
    stats: {
      totalUsers: number;
      pendingUsers: number;
      pendingTenants: number;
      verifiedTenants: number;
      totalProperties: number;
      pendingProperties: number;
      approvedProperties: number;
      totalAgreements: number;
      rentedProperties: number;
    };
  }> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getAllAgreements: async (): Promise<{ agreements: Agreement[] }> => {
    const response = await api.get('/admin/agreements');
    return response.data;
  },
};

export default api;
