import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';
import type { LeaveRequestRecord } from '@/types/employeeTypes';

export interface CreateLeaveRequestDTO {
  idNhanVien?: string;
  idChiNhanh?: string;
  loaiNghi: string;
  tuNgay: string;
  denNgay: string;
  soNgayNghi: number;
  lyDo: string;
}

export const donNghiPhepApi = {
  create: async (data: CreateLeaveRequestDTO): Promise<LeaveRequestRecord> => {
    const response = await fetch(`${API_BASE_URL}/api/don-nghi-phep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'Không thể tạo đơn xin nghỉ phép');
    }
    return response.json();
  },

  getMyRequests: async (): Promise<LeaveRequestRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/api/don-nghi-phep/my-requests`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Không thể tải danh sách đơn nghỉ phép của bạn');
    return response.json();
  },

  getAll: async (params?: { trangThai?: string; idChiNhanh?: string }): Promise<LeaveRequestRecord[]> => {
    const query = new URLSearchParams();
    if (params?.trangThai) query.append('trangThai', params.trangThai);
    if (params?.idChiNhanh) query.append('idChiNhanh', params.idChiNhanh);

    const url = `${API_BASE_URL}/api/don-nghi-phep${query.toString() ? `?${query.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Không thể tải danh sách đơn nghỉ phép');
    return response.json();
  },

  approve: async (id: string): Promise<LeaveRequestRecord> => {
    const response = await fetch(`${API_BASE_URL}/api/don-nghi-phep/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'Không thể duyệt đơn nghỉ phép');
    }
    return response.json();
  },

  reject: async (id: string, lyDo?: string): Promise<LeaveRequestRecord> => {
    const query = new URLSearchParams();
    if (lyDo) query.append('lyDo', lyDo);

    const url = `${API_BASE_URL}/api/don-nghi-phep/${id}/reject${query.toString() ? `?${query.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'Không thể từ chối đơn nghỉ phép');
    }
    return response.json();
  },
};
