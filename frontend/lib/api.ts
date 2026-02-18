import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// リクエストインターセプター（トークン自動付与）
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ikaruRoute_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ===== 型定義 =====
export interface Staff {
    staff_id: string;
    name: string;
    email: string;
    role: 'admin' | 'coordinator' | 'staff';
    skill_types: string[];
    max_hours_day: number;
    hourly_rate: number;
    home_address?: string;
    is_active: boolean;
}

export interface Client {
    client_id: string;
    name: string;
    address: string;
    care_level: string;
    service_type: string;
    visit_duration: number;
    preferred_time_start?: string;
    requires_two_staff: boolean;
    preferred_staff_ids: string[];
    notes?: string;
}

export interface Visit {
    visit_id: string;
    client_id: string;
    staff_id?: string;
    companion_staff_id?: string;
    route_id?: string;
    scheduled_start: string;
    scheduled_end: string;
    actual_start?: string;
    actual_end?: string;
    service_type: string;
    visit_type: string;
    status: string;
    visit_note?: string;
    date: string;
    client?: { client_id: string; name: string; address: string; service_type: string };
    staff?: { staff_id: string; name: string; role: string };
    companion_staff?: { staff_id: string; name: string; role: string };
}

export interface RevenueSummary {
    staff_id: string;
    staff_name: string;
    today_revenue: number;
    visit_count: number;
    target_amount: number;
    achievement_rate: number;
}

export interface ProgressData {
    date: string;
    total_visits: number;
    completed_visits: number;
    cancelled_visits: number;
    progress_rate: number;
    staff_progress: Array<{
        staff_id: string;
        staff_name: string;
        total: number;
        completed: number;
        rate: number;
    }>;
}

// ===== API関数 =====
export const staffApi = {
    list: () => api.get<Staff[]>('/api/v1/staff/'),
    create: (data: any) => api.post<Staff>('/api/v1/staff/', data),
    update: (id: string, data: any) => api.put<Staff>(`/api/v1/staff/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/staff/${id}`),
};

export const clientApi = {
    list: () => api.get<Client[]>('/api/v1/clients/'),
    create: (data: any) => api.post<Client>('/api/v1/clients/', data),
    update: (id: string, data: any) => api.put<Client>(`/api/v1/clients/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/clients/${id}`),
};

export const visitApi = {
    list: (date: string, staffId?: string, unassigned?: boolean) =>
        api.get<Visit[]>('/api/v1/visits/', { params: { target_date: date, staff_id: staffId, unassigned } }),
    create: (data: any) => api.post<Visit>('/api/v1/visits/', data),
    update: (id: string, data: any) => api.put<Visit>(`/api/v1/visits/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/visits/${id}`),
};

export const routeApi = {
    list: (date: string) => api.get('/api/v1/routes/', { params: { target_date: date } }),
    generate: (date: string, staffIds?: string[]) =>
        api.post('/api/v1/routes/generate', { date, staff_ids: staffIds }),
    progress: (date: string) => api.get<ProgressData>(`/api/v1/routes/progress/${date}`),
};

export const revenueApi = {
    summary: (date: string) => api.get<RevenueSummary[]>(`/api/v1/revenue/summary/${date}`),
    detail: (staffId: string, date: string) => api.get(`/api/v1/revenue/detail/${staffId}/${date}`),
    setTarget: (data: any) => api.post('/api/v1/revenue/targets', data),
    monthly: (month: string) => api.get(`/api/v1/revenue/monthly/${month}`),
};

export const reportApi = {
    downloadExcel: async (date: string) => {
        const response = await api.get(`/api/v1/reports/excel/${date}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ikaruRoute_${date}.xlsx`);
        document.appendChild(link);
        link.click();
        link.remove();
    },
};

export default api;
