const API_BASE_URL = 'http://localhost:8000'; // Docker backend

export interface Company {
  id: string;
  name: string;
  domain?: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription_plan?: string;
  max_locations?: number;
  max_devices_per_location?: number;
  settings?: Record<string, any>;
  locations_count: number;
  devices_count: number;
  active_visitors_count: number;
  users_count?: number;
  active_users_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Location {
  id: string;
  company_id: string;
  company_name?: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  status: 'active' | 'inactive' | 'maintenance';
  settings?: Record<string, any>;
  working_hours?: Record<string, any>;
  contact_info?: {
    phone?: string;
    email?: string;
    manager?: string;
    [key: string]: any;
  };
  devices_count: number;
  active_visitors_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface Device {
  id: string;
  company_id: string;
  company_name?: string;
  location_id: string;
  location_name?: string;
  name: string;
  device_type: 'tablet' | 'desktop' | 'mobile' | 'kiosk';
  device_id: string;
  status: 'active' | 'inactive' | 'offline' | 'maintenance';
  is_online: boolean;
  last_heartbeat?: string;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  company_id: string;
  company_name?: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'employee' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface Visitor {
  id: string;
  form_id: string;
  data: Record<string, any>;
  check_in_time: string;
  check_out_time?: string;
  status: 'checked_in' | 'checked_out' | 'expired';
  host_notified: boolean;
  notes?: string;
  full_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  host_name?: string;
  visit_purpose?: string;
}

export interface AnalyticsSummary {
  total_visitors: number;
  active_visitors: number;
  today_visitors: number;
  timestamp: string;
}

export interface CompanyAnalytics {
  company_id: string;
  total_visitors: number;
  active_visitors: number;
  today_visitors: number;
  total_locations: number;
  total_devices: number;
  online_devices: number;
  total_users?: number;
  active_users?: number;
}

class ApiService {
  private async fetchWithErrorHandling(url: string, options?: RequestInit) {
    try {
      // Ensure Content-Type is always set correctly for JSON requests
      const headers = {
        ...options?.headers,
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        console.error(`HTTP ${response.status} error for ${url}:`, await response.text());
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${url}:`, error);
      throw error;
    }
  }

  // Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return this.fetchWithErrorHandling('/analytics/summary');
  }

  async getCompanyAnalytics(): Promise<CompanyAnalytics> {
    return this.fetchWithErrorHandling('/analytics/company');
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    try {
      return this.fetchWithErrorHandling('/companies');
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }

  // Locations
  async getLocations(): Promise<Location[]> {
    try {
      const locations = await this.fetchWithErrorHandling('/locations');
      return Array.isArray(locations) ? locations : [locations];
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  async getCompanyLocations(companyId: string): Promise<Location[]> {
    try {
      const locations = await this.fetchWithErrorHandling(`/companies/${companyId}/locations`);
      return Array.isArray(locations) ? locations : [locations];
    } catch (error) {
      console.error('Error fetching company locations:', error);
      return [];
    }
  }

  async createLocation(companyId: string, data: Partial<Location>): Promise<Location> {
    return this.fetchWithErrorHandling(`/companies/${companyId}/locations`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getLocation(id: string): Promise<Location> {
    return this.fetchWithErrorHandling(`/locations/${id}`);
  }

  async deleteLocation(id: string): Promise<void> {
    await this.fetchWithErrorHandling(`/locations/${id}`, {
      method: 'DELETE'
    });
  }

  async createCompany(data: Partial<Company>): Promise<Company> {
    return this.fetchWithErrorHandling('/companies', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Devices
  async getDevices(locationId?: string): Promise<Device[]> {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId);
    
    try {
      const devices = await this.fetchWithErrorHandling(`/devices?${params}`);
      return Array.isArray(devices) ? devices : [devices];
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }

  // Visitors
  async getVisitors(status?: string, limit = 100, skip = 0): Promise<Visitor[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());

    return this.fetchWithErrorHandling(`/visitors?${params}`);
  }

  async getActiveVisitors(): Promise<Visitor[]> {
    return this.fetchWithErrorHandling('/visitors/active');
  }

  // Users
  async getUsers(): Promise<User[]> {
    try {
      const users = await this.fetchWithErrorHandling('/users');
      return Array.isArray(users) ? users : [users];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async getUser(id: string): Promise<User> {
    return this.fetchWithErrorHandling(`/users/${id}`);
  }

  async createUser(data: Partial<User>): Promise<User> {
    return this.fetchWithErrorHandling('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createDevice(locationId: string, data: Partial<Device>): Promise<Device> {
    return this.fetchWithErrorHandling(`/locations/${locationId}/devices`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getDevice(id: string): Promise<Device> {
    return this.fetchWithErrorHandling(`/devices/${id}`);
  }

  async deleteDevice(id: string): Promise<void> {
    await this.fetchWithErrorHandling(`/devices/${id}`, {
      method: 'DELETE'
    });
  }

  // Device heartbeat
  async sendDeviceHeartbeat(deviceId: string): Promise<void> {
    await this.fetchWithErrorHandling(`/devices/${deviceId}/heartbeat`, {
      method: 'POST'
    });
  }

  // Update methods
  async updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    console.log('Updating company with data:', data);
    console.log('JSON stringified data:', JSON.stringify(data));
    
    return this.fetchWithErrorHandling(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateLocation(id: string, data: Partial<Location>): Promise<Location> {
    console.log('Updating location with data:', data);
    console.log('JSON stringified data:', JSON.stringify(data));
    
    return this.fetchWithErrorHandling(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateDevice(id: string, data: Partial<Device>): Promise<Device> {
    return this.fetchWithErrorHandling(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.fetchWithErrorHandling(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.fetchWithErrorHandling(`/users/${id}`, {
      method: 'DELETE'
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; database: string }> {
    return this.fetchWithErrorHandling('/health');
  }
}

export const apiService = new ApiService();