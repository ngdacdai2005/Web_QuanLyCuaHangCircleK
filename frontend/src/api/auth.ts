import type { LoginFormValues, LoginResult } from '@/types/authTypes';
import { normalizeRecordStatus } from '@/types/commonTypes';
import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';

export const authApi = {
  login: async (values: LoginFormValues): Promise<LoginResult> => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username?.trim(),
          password: values.password,
        }),
      });
    } catch {
      throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc đảm bảo máy chủ Backend đang hoạt động.');
    }

    const rawText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { message: rawText };
    }

    if (!response.ok) {
      throw new Error(data.message || 'Tài khoản hoặc mật khẩu không chính xác.');
    }

    return {
      user: {
        id: data.user.id,
        idNhanVien: data.user.idNhanVien || null,
        employeeCode: data.user.tenDangNhap || '',
        fullName: data.user.hoTen || data.user.tenDangNhap,
        email: data.user.email || '',
        phone: data.user.soDienThoai || '',
        role: data.user.vaiTro || 'THU_NGAN',
        branchId: data.user.idChiNhanh,
        allowedBranchIds: [],
        avatarText: (data.user.hoTen || data.user.tenDangNhap)?.charAt(0) || 'U',
        status: normalizeRecordStatus(data.user.trangThai),
      },
      token: data.token,
      expiresAt: data.expiresAt,
    };
  },

  getMe: async (): Promise<LoginResult['user']> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Không thể lấy thông tin tài khoản hiện tại');
    }
    const data = await response.json();
    return {
      id: data.id,
      idNhanVien: data.idNhanVien || null,
      employeeCode: data.tenDangNhap || '',
      fullName: data.hoTen || data.tenDangNhap,
      email: data.email || '',
      phone: data.soDienThoai || '',
      role: data.vaiTro || 'THU_NGAN',
      branchId: data.idChiNhanh,
      allowedBranchIds: [],
      avatarText: (data.hoTen || data.tenDangNhap)?.charAt(0) || 'U',
      status: normalizeRecordStatus(data.trangThai),
    };
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Bỏ qua lỗi mạng khi logout
    }
  },
};
