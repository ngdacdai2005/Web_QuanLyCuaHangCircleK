import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';

export interface CashDenominations {
  [key: string]: number; // "500000": 2, "200000": 5, ...
}

export interface MoPhienThuNganRequest {
  idChiNhanh?: string;
  quaySo?: string;
  quyDauCaDuKien: number;
  quyDauCaThucTe: number;
  idNguoiGiaoDauCa?: string;
  ghiChuMoCa?: string;
  bangKeMoCa?: CashDenominations;
}

export interface ChotPhienThuNganRequest {
  tienThucDemCuoiCa: number;
  lyDoChenhLech?: string;
  bangKeDongCa?: CashDenominations;
}

export interface BanGiaoPhienThuNganRequest {
  idNguoiNhanBanGiao: string;
  soTienBanGiao?: number;
  ghiChuBanGiao?: string;
}

export interface GiaoDichQuyCaRequest {
  idPhienThuNgan: string;
  loaiGiaoDich: 'NOP_KET' | 'THU_BO_SUNG' | 'CHI_TAM_UNG';
  soTien: number;
  idNguoiXacNhan?: string;
  lyDo?: string;
}

export interface DoiSoatPhienDTO {
  idPhienThuNgan: string;
  maPhien: string;
  quyDauCaThucTe: number;
  tongTienMatBanHang: number;
  soDonTienMat: number;
  tongDoanhThuThe: number;
  soDonThe: number;
  tongDoanhThuQr: number;
  soDonQr: number;
  tongDoanhThuKhongTienMat: number;
  tongThuBoSung: number;
  tongHoanTienMat: number;
  soDonHoanTienMat: number;
  tongChiHopLe: number;
  tongNopKet: number;
  tienDuKienCuoiCa: number;
  tienThucDemCuoiCa?: number;
  lechCuoiCa?: number;
  lyDoChenhLech?: string;
}

export interface PhienThuNganRecord {
  id: string;
  maPhien: string;
  idChiNhanh: string;
  tenChiNhanh?: string;
  idThuNgan: string;
  tenThuNgan?: string;
  quaySo: string;
  gioMoCa: string;
  gioDongCa?: string;
  quyDauCaDuKien: number;
  quyDauCaThucTe: number;
  lechDauCa: number;
  idNguoiGiaoDauCa?: string;
  tenNguoiGiaoDauCa?: string;
  ghiChuMoCa?: string;
  bangKeMoCa?: CashDenominations;
  tienDuKienCuoiCa: number;
  tienThucDemCuoiCa?: number;
  lechCuoiCa?: number;
  lyDoChenhLech?: string;
  bangKeDongCa?: CashDenominations;
  idNguoiNhanBanGiao?: string;
  tenNguoiNhanBanGiao?: string;
  xacNhanBanGiao?: boolean;
  thoiGianBanGiao?: string;
  ghiChuBanGiao?: string;
  trangThai: 'DANG_MO' | 'CHO_BAN_GIAO' | 'DA_BAN_GIAO' | 'DA_DONG';
  ngayTao: string;
  doiSoat?: DoiSoatPhienDTO;
}

export const phienThuNganApi = {
  // Lấy phiên ca đang mở của thu ngân
  getHienTai: async (): Promise<PhienThuNganRecord | null> => {
    const res = await fetch(`${API_BASE_URL}/api/phien-thu-ngan/hien-tai`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data || null;
  },

  // Mở ca & nhận quỹ
  moCa: async (data: MoPhienThuNganRequest): Promise<PhienThuNganRecord> => {
    const res = await fetch(`${API_BASE_URL}/api/phien-thu-ngan/mo-ca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể mở ca');
    }
    return res.json();
  },

  // Lấy dữ liệu đối soát tự động
  getDoiSoat: async (idPhien: string): Promise<DoiSoatPhienDTO> => {
    const res = await fetch(`${API_BASE_URL}/api/phien-thu-ngan/${idPhien}/doi-soat`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Không thể tải dữ liệu đối soát ca');
    return res.json();
  },

  // Chốt ca & nhập tiền thực đếm
  chotCa: async (idPhien: string, data: ChotPhienThuNganRequest): Promise<PhienThuNganRecord> => {
    const res = await fetch(`${API_BASE_URL}/api/phien-thu-ngan/${idPhien}/chot-ca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể chốt ca');
    }
    return res.json();
  },

  // Bàn giao ca
  banGiao: async (idPhien: string, data: BanGiaoPhienThuNganRequest): Promise<PhienThuNganRecord> => {
    const res = await fetch(`${API_BASE_URL}/api/phien-thu-ngan/${idPhien}/ban-giao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể bàn giao ca');
    }
    return res.json();
  },

  // Người nhận xác nhận
  xacNhanNhanBanGiao: async (idPhien: string): Promise<PhienThuNganRecord> => {
    const res = await fetch(`${API_BASE_URL}/api/phien-thu-ngan/${idPhien}/xac-nhan-ban-giao`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Không thể xác nhận bàn giao');
    return res.json();
  },

  // Nộp két hoặc thu chi quỹ ca
  themGiaoDichQuy: async (data: GiaoDichQuyCaRequest): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/phien-thu-ngan/giao-dich-quy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể thực hiện giao dịch quỹ ca');
    }
    return res.json();
  },

  // Danh sách lịch sử ca
  getDanhSachPhien: async (branchId?: string): Promise<PhienThuNganRecord[]> => {
    const url = `${API_BASE_URL}/api/phien-thu-ngan${branchId ? `?branchId=${branchId}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể tải danh sách phiên ca');
    return res.json();
  },

  // Danh sách nhân viên cùng chi nhánh để bàn giao ca
  getNhanVienBanGiao: async (): Promise<{ id: string; hoTen: string; viTri?: string; chucVu?: string; vaiTro?: string }[]> => {
    const res = await fetch(`${API_BASE_URL}/api/phien-thu-ngan/nhan-vien-ban-giao`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },
};
