import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';
import { parseApiError } from '@/utils/apiError';

export interface SanPhamDTO {
  id: string;
  idDanhMuc?: string;
  tenDanhMuc?: string;
  sku?: string;
  maVach?: string;
  tenSanPham: string;
  donVi?: string;
  imageUrl?: string;
  moTa?: string;
  dangHoatDong?: boolean;
  giaVon?: number;
  giaBan: number;
  vatPhantram?: number;
  idNhaCungCap?: string;
  tenNhaCungCap?: string;
  tonToiThieu?: number;
  tonToiDa?: number;
  deHong?: boolean;
  hanSuDungNgay?: number;
  ngayTao?: string;
  ngayCapNhat?: string;
}

export interface SanPhamNhaCungCapDTO {
  id: string;
  idSanPham: string;
  idNhaCungCap: string;
  maNcc?: string;
  tenNcc?: string;
  maSanPhamNcc?: string;
  giaNhap: number;
  laNccChinh: boolean;
  ghiChu?: string;
  ngayCapNhat?: string;
}

export interface SaveSanPhamNccRequest {
  idNhaCungCap: string;
  maSanPhamNcc?: string;
  giaNhap?: number;
  laNccChinh?: boolean;
  ghiChu?: string;
}

export interface SuppliedProductDTO {
  id: string;
  sku: string;
  maVach: string;
  tenSanPham: string;
  donVi: string;
  vatPhantram: number;
  imageUrl?: string;
  giaNhapNcc: number;
  maSanPhamNcc?: string;
  laNccChinh: boolean;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

export const sanPhamApi = {
  getAll: async (): Promise<SanPhamDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getActive: async (): Promise<SanPhamDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham/active`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  create: async (data: SanPhamDTO): Promise<SanPhamDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể tạo sản phẩm');
    return response.json();
  },

  update: async (id: string, data: Partial<SanPhamDTO>): Promise<SanPhamDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể cập nhật sản phẩm');
    return response.json();
  },

  delete: async (id: string, permanent: boolean = false): Promise<any> => {
    const url = `${API_BASE_URL}/api/san-pham/${id}${permanent ? '?permanent=true' : ''}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể xóa sản phẩm');
    return response.json();
  },

  restore: async (id: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham/${id}/restore`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể khôi phục sản phẩm');
    return response.json();
  },

  getSuppliers: async (productId: string): Promise<SanPhamNhaCungCapDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/suppliers`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể tải danh sách nhà cung cấp của sản phẩm');
    return response.json();
  },

  saveSupplier: async (productId: string, data: SaveSanPhamNccRequest): Promise<SanPhamNhaCungCapDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể lưu nhà cung cấp cho sản phẩm');
    return response.json();
  },

  removeSupplier: async (productId: string, nccId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/suppliers/${nccId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể xoá liên kết nhà cung cấp');
    return response.json();
  },

  setPrimarySupplier: async (productId: string, nccId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/suppliers/${nccId}/set-primary`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể đặt nhà cung cấp làm mặc định');
    return response.json();
  },

  getSuppliedProducts: async (nccId: string): Promise<SuppliedProductDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/suppliers/${nccId}/supplied-products`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể tải danh sách sản phẩm của nhà cung cấp');
    return response.json();
  },
};
