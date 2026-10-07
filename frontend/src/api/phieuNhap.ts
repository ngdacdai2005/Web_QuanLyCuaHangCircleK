import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';
import { parseApiError } from '@/utils/apiError';

export interface PhieuNhapDTO {
  id: string;
  maPhieu: string;
  idChiNhanh?: string;
  idNcc?: string;
  idNguoiNhap?: string;
  tenNguoiNhap?: string;
  ngayDatHang?: string;
  ngayDuKienGiao?: string;
  ngayNhanThucTe?: string;
  subTotal?: number;
  vatTotal?: number;
  giamGia?: number;
  grandTotal?: number;
  daThanhToan?: number;
  congNo?: number;
  trangThai?: string;
  ghiChu?: string;
  ngayTao?: string;
  ngayCapNhat?: string;
  tenChiNhanh?: string;
  tenNcc?: string;

  idNguoiDuyet?: string;
  ngayDuyet?: string;
  lyDoTuChoi?: string;

  idNguoiKiemNhan?: string;
  ngayKiemNhan?: string;
  lyDoChenhLech?: string;

  giaTriDuKien?: number | null;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

/** Dòng hàng trong request /with-lines. */
export interface PurchaseLineDTO {
  idSanPham: string;
  soLuong: number;
  donGiaNhap: number;
  vatPhantram?: number;
  hanSuDung?: string | null;
}

/** Header + lines cho POST /with-lines — backend lưu 1 transaction. */
export interface CreatePurchaseWithLinesDTO {
  idChiNhanh?: string | null;
  idNcc: string;
  ngayDatHang?: string;
  ngayDuKienGiao?: string;
  ngayNhanThucTe?: string;
  giamGia?: number;
  daThanhToan?: number;
  trangThai?: string;
  ghiChu?: string;
  lines: PurchaseLineDTO[];
}

export interface ReceivingLineDTO {
  idChiTiet: string;
  soLuongNhan: number;
  soLuongThua: number;
  xuLyThua: 'NHAP_KHO' | 'TRA_LAI_NCC' | 'CHUA_XU_LY';
  lyDoChenhLechDong?: string;
}

export interface ConfirmReceivingRequest {
  giamGia?: number;
  lyDoChenhLech?: string;
  lines: ReceivingLineDTO[];
}

export interface ChangePriceRequest {
  donGiaNhapMoi: number;
  lyDo: string;
}

export const phieuNhapApi = {
  getAll: async (): Promise<PhieuNhapDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-nhap`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi tải danh sách phiếu nhập');
    }

    return response.json();
  },

  getById: async (id: string): Promise<PhieuNhapDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-nhap/${id}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi tải phiếu nhập');
    }

    return response.json();
  },

  getByStatus: async (status: string): Promise<PhieuNhapDTO[]> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/by-status/${encodeURIComponent(status)}`,
        {
          headers: getHeaders(),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi tải phiếu nhập theo trạng thái');
    }

    return response.json();
  },

  getByBranch: async (idChiNhanh: string): Promise<PhieuNhapDTO[]> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/by-branch/${idChiNhanh}`,
        {
          headers: getHeaders(),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi tải phiếu nhập theo chi nhánh');
    }

    return response.json();
  },

  getByNcc: async (idNcc: string): Promise<PhieuNhapDTO[]> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/by-ncc/${idNcc}`,
        {
          headers: getHeaders(),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi tải phiếu nhập theo nhà cung cấp');
    }

    return response.json();
  },

  createWithLines: async (
      data: CreatePurchaseWithLinesDTO,
  ): Promise<PhieuNhapDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-nhap/with-lines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi tạo phiếu nhập');
    }

    return response.json();
  },

  update: async (
      id: string,
      data: Partial<CreatePurchaseWithLinesDTO>,
  ): Promise<PhieuNhapDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-nhap/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi cập nhật phiếu nhập');
    }

    return response.json();
  },

  remove: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-nhap/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi xóa phiếu nhập');
    }
  },

  approve: async (id: string): Promise<PhieuNhapDTO> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/${id}/approve`,
        {
          method: 'PUT',
          headers: getHeaders(),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi duyệt phiếu nhập');
    }

    return response.json();
  },

  reject: async (
      id: string,
      lyDo: string,
  ): Promise<PhieuNhapDTO> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/${id}/reject`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(lyDo),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi từ chối phiếu nhập');
    }

    return response.json();
  },

  startReceiving: async (id: string): Promise<PhieuNhapDTO> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/${id}/start-receiving`,
        {
          method: 'PUT',
          headers: getHeaders(),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi bắt đầu kiểm nhận');
    }

    return response.json();
  },

  receive: async (
      id: string,
      request: ConfirmReceivingRequest,
  ): Promise<PhieuNhapDTO> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/${id}/confirm-receiving`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(request),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi kiểm nhận phiếu nhập');
    }

    return response.json();
  },

  cancel: async (id: string): Promise<PhieuNhapDTO> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/${id}/cancel`,
        {
          method: 'PUT',
          headers: getHeaders(),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi hủy phiếu nhập');
    }

    return response.json();
  },

  cancelReceiving: async (id: string): Promise<PhieuNhapDTO> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/${id}/cancel-receiving`,
        {
          method: 'PUT',
          headers: getHeaders(),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi hủy kiểm nhận');
    }

    return response.json();
  },

  pay: async (
      id: string,
      payload?: {
        daThanhToan?: number;
        hinhThucTt?: string;
      },
  ): Promise<PhieuNhapDTO> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/${id}/pay`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload ?? {}),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi thanh toán phiếu nhập');
    }

    return response.json();
  },

  updatePrice: async (
      idPhieu: string,
      idChiTiet: string,
      request: ChangePriceRequest,
  ): Promise<PhieuNhapDTO> => {
    const response = await fetch(
        `${API_BASE_URL}/api/phieu-nhap/${idPhieu}/lines/${idChiTiet}/price`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(request),
        },
    );

    if (!response.ok) {
      throw await parseApiError(response, 'Lỗi cập nhật giá nhập');
    }

    return response.json();
  },
};
