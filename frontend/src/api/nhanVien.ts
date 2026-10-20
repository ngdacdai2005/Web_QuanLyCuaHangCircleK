import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';
import { parseApiError } from '@/utils/apiError';

export interface NhanVienDTO {
  id: string;
  maNhanVien?: string;
  tenDangNhap?: string;
  hoTen: string;
  email?: string;
  soDienThoai?: string;
  vaiTro?: string;
  viTri?: string;
  loaiHopDong?: string;
  caMacDinh?: string;
  luongTheoGio?: number;
  luongCung?: number;
  idChiNhanh?: string | null;
  trangThai?: string;
  soTaiKhoan?: string;
  tenNganHang?: string;
  ngayVaoLam?: string;
  ngayTao?: string;
  ngayCapNhat?: string;
  // Extended fields
  anhDaiDien?: string;
  gioiTinh?: string;
  ngaySinh?: string;
  soCccd?: string;
  ngayCapCccd?: string;
  noiCapCccd?: string;
  diaChiThuongTru?: string;
  diaChiHienTai?: string;
  ghiChu?: string;
  // Account info
  hasTaiKhoan?: boolean;
  taiKhoanTrangThai?: string;
  // Account create request
  taoTaiKhoan?: boolean;
  matKhau?: string;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

export const nhanVienApi = {
  getAll: async (): Promise<NhanVienDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch nhân viên');
    return response.json();
  },

  getById: async (id: string): Promise<NhanVienDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch nhân viên');
    return response.json();
  },

  create: async (data: NhanVienDTO): Promise<NhanVienDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể tạo nhân viên');
    return response.json();
  },

  update: async (id: string, data: Partial<NhanVienDTO>): Promise<NhanVienDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể cập nhật nhân viên');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể xóa nhân viên');
  },

  resetPassword: async (id: string, newPassword?: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ newPassword: newPassword || '' }),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể đặt lại mật khẩu');
    return response.json();
  },

  toggleAccount: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}/toggle-account`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể cập nhật trạng thái tài khoản');
    return response.json();
  },

  createAccount: async (id: string, username?: string, password?: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}/create-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ username: username || '', password: password || '' }),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể cấp tài khoản');
    return response.json();
  },
};
