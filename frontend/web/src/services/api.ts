/**
 * ITF - Income. Tax. Financials
 * API Service Layer
 *
 * Centralized API client with:
 * - JWT authentication
 * - Token refresh
 * - Request/response interceptors
 * - Error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Token storage keys
const TOKEN_KEY = 'itf_auth_token';
const REFRESH_TOKEN_KEY = 'itf_refresh_token';
const USER_KEY = 'itf_user';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  mfaEnabled?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  consent7216: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TaxReturn {
  id: string;
  userId: string;
  taxYear: number;
  status: 'draft' | 'pending' | 'submitted' | 'accepted' | 'rejected';
  filingType: 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household';
  personalInfo?: PersonalInfo;
  income?: Income;
  deductions?: Deductions;
  dependents?: Dependent[];
  calculations?: TaxCalculations;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  address: Address;
  phone: string;
  email: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Income {
  wages: number;
  tips: number;
  overtime: number;
  interest: number;
  dividends: number;
  capitalGains: number;
  businessIncome: number;
  rentalIncome: number;
  otherIncome: number;
}

export interface Deductions {
  standardDeduction: number;
  itemizedDeductions?: {
    medical: number;
    stateLocalTaxes: number;
    mortgageInterest: number;
    charitableContributions: number;
    other: number;
  };
  aboveTheLine: {
    studentLoanInterest: number;
    hsaContributions: number;
    iraContributions: number;
    selfEmploymentTax: number;
  };
}

export interface Dependent {
  id: string;
  firstName: string;
  lastName: string;
  ssn: string;
  relationship: string;
  dateOfBirth: string;
  monthsLived: number;
}

export interface TaxCalculations {
  grossIncome: number;
  adjustedGrossIncome: number;
  taxableIncome: number;
  federalTax: number;
  stateTax: number;
  selfEmploymentTax: number;
  totalTax: number;
  totalWithheld: number;
  refundOrOwed: number;
  effectiveRate: number;
  credits: {
    childTaxCredit: number;
    earnedIncomeCredit: number;
    educationCredits: number;
    otherCredits: number;
  };
}

export interface Document {
  id: string;
  userId: string;
  taxReturnId?: string;
  name: string;
  type: 'W2' | '1099-NEC' | '1099-INT' | '1099-DIV' | '1099-MISC' | '1098' | 'K1' | 'Other';
  status: 'uploading' | 'processing' | 'ready' | 'error';
  fileUrl?: string;
  extractedData?: Record<string, unknown>;
  createdAt: string;
}

// API Error class
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Token management
export const tokenManager = {
  getAccessToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setAccessToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string): void => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  getUser: (): User | null => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: User): void => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isAuthenticated: (): boolean => !!localStorage.getItem(TOKEN_KEY),
};

// Request helper with auth
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = tokenManager.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle token refresh on 401
  if (response.status === 401 && tokenManager.getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${tokenManager.getAccessToken()}`;
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        throw new ApiError(
          'Authentication failed',
          retryResponse.status,
          'AUTH_FAILED'
        );
      }
      return retryResponse.json();
    }
    // Refresh failed, clear tokens and redirect to login
    tokenManager.clearTokens();
    window.location.href = '/login';
    throw new ApiError('Session expired', 401, 'SESSION_EXPIRED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || errorData.detail || 'Request failed',
      response.status,
      errorData.code
    );
  }

  return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    tokenManager.setAccessToken(data.accessToken);
    if (data.refreshToken) {
      tokenManager.setRefreshToken(data.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<{ user: User; tokens: AuthTokens; mfaRequired?: boolean }> => {
    const response = await request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: User;
      mfa_required?: boolean;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        remember_me: data.rememberMe,
        mfa_code: data.mfaCode,
      }),
    });

    if (response.mfa_required) {
      return { user: {} as User, tokens: {} as AuthTokens, mfaRequired: true };
    }

    const tokens: AuthTokens = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
    };

    tokenManager.setAccessToken(tokens.accessToken);
    tokenManager.setRefreshToken(tokens.refreshToken);
    tokenManager.setUser(response.user);

    return { user: response.user, tokens };
  },

  register: async (data: RegisterRequest): Promise<{ user: User; message: string }> => {
    const response = await request<{ user_id: string; email: string; message: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          confirm_password: data.confirmPassword,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          accept_terms: data.acceptTerms,
          accept_privacy: data.acceptPrivacy,
          consent_7216: data.consent7216,
        }),
      }
    );

    return {
      user: {
        id: response.user_id,
        email: response.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'taxpayer',
      },
      message: response.message,
    };
  },

  logout: async (): Promise<void> => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      tokenManager.clearTokens();
    }
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    return request(`/auth/verify-email?token=${token}`);
  },

  getProfile: async (): Promise<User> => {
    return request('/auth/profile');
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    return request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  },

  enableMfa: async (): Promise<{ secret: string; qrCode: string }> => {
    return request('/auth/mfa/enable', { method: 'POST' });
  },

  verifyMfa: async (code: string): Promise<{ message: string }> => {
    return request('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  disableMfa: async (code: string): Promise<{ message: string }> => {
    return request('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
};

// Tax Returns API
export const taxReturnsApi = {
  list: async (params?: { year?: number; status?: string }): Promise<TaxReturn[]> => {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.set('year', params.year.toString());
    if (params?.status) queryParams.set('status', params.status);
    const query = queryParams.toString();
    return request(`/tax-returns${query ? `?${query}` : ''}`);
  },

  get: async (id: string): Promise<TaxReturn> => {
    return request(`/tax-returns/${id}`);
  },

  create: async (data: Partial<TaxReturn>): Promise<TaxReturn> => {
    return request('/tax-returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<TaxReturn>): Promise<TaxReturn> => {
    return request(`/tax-returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await request(`/tax-returns/${id}`, { method: 'DELETE' });
  },

  calculate: async (id: string): Promise<TaxCalculations> => {
    return request(`/tax-returns/${id}/calculate`, { method: 'POST' });
  },

  submit: async (id: string): Promise<{ message: string; confirmationNumber: string }> => {
    return request(`/tax-returns/${id}/submit`, { method: 'POST' });
  },

  getStatus: async (id: string): Promise<{ status: string; lastUpdated: string; details?: string }> => {
    return request(`/tax-returns/${id}/status`);
  },
};

// Documents API
export const documentsApi = {
  list: async (taxReturnId?: string): Promise<Document[]> => {
    const query = taxReturnId ? `?tax_return_id=${taxReturnId}` : '';
    return request(`/documents${query}`);
  },

  get: async (id: string): Promise<Document> => {
    return request(`/documents/${id}`);
  },

  upload: async (file: File, type: string, taxReturnId?: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (taxReturnId) formData.append('tax_return_id', taxReturnId);

    const token = tokenManager.getAccessToken();
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Upload failed',
        response.status,
        errorData.code
      );
    }

    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    await request(`/documents/${id}`, { method: 'DELETE' });
  },

  getExtractedData: async (id: string): Promise<Record<string, unknown>> => {
    return request(`/documents/${id}/extracted-data`);
  },
};

// Tax Calculator API
export const calculatorApi = {
  quickCalculate: async (data: {
    income: number;
    filingStatus: string;
    dependents: number;
    deductions?: number;
    tips?: number;
    overtime?: number;
    age?: number;
  }): Promise<TaxCalculations> => {
    return request('/calculator/quick', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  estimateRefund: async (data: {
    wages: number;
    withheld: number;
    filingStatus: string;
    dependents: number;
  }): Promise<{ estimatedRefund: number; breakdown: TaxCalculations }> => {
    return request('/calculator/estimate-refund', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Optimizer API
export const optimizerApi = {
  analyze: async (taxReturnId: string): Promise<{
    recommendations: Array<{
      id: string;
      category: string;
      name: string;
      estimatedSavings: number;
      confidence: number;
      requirements: string[];
    }>;
    totalPotentialSavings: number;
  }> => {
    return request(`/optimizer/analyze/${taxReturnId}`, { method: 'POST' });
  },

  applyRecommendation: async (
    taxReturnId: string,
    recommendationId: string
  ): Promise<{ success: boolean; newCalculations: TaxCalculations }> => {
    return request(`/optimizer/apply/${taxReturnId}/${recommendationId}`, {
      method: 'POST',
    });
  },
};

// Compliance API (for consent management)
export const complianceApi = {
  getConsents: async (): Promise<Array<{
    type: string;
    grantedAt: string;
    expiresAt?: string;
    revoked: boolean;
  }>> => {
    return request('/compliance/consents');
  },

  grantConsent: async (type: string, scope?: string): Promise<{ message: string }> => {
    return request('/compliance/consents', {
      method: 'POST',
      body: JSON.stringify({ type, scope }),
    });
  },

  revokeConsent: async (type: string): Promise<{ message: string }> => {
    return request(`/compliance/consents/${type}`, { method: 'DELETE' });
  },

  getPrivacySettings: async (): Promise<Record<string, boolean>> => {
    return request('/compliance/privacy-settings');
  },

  updatePrivacySettings: async (settings: Record<string, boolean>): Promise<{ message: string }> => {
    return request('/compliance/privacy-settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};

// Export default API object
const api = {
  auth: authApi,
  taxReturns: taxReturnsApi,
  documents: documentsApi,
  calculator: calculatorApi,
  optimizer: optimizerApi,
  compliance: complianceApi,
  tokenManager,
};

export default api;
