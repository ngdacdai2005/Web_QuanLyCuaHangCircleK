import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';
import type { HopDongFilter, HopDongFormValues } from '@/types';

export interface HopDongDTO {
    id: string; maHopDong: string; tenHopDong: string;
    loaiHopDong: string; idNcc: string; maNcc?: string; tenNcc?: string;
    ngayKy?: string; ngayHieuLuc?: string; ngayHetHan?: string | null;
    giaTriHopDong?: number | null; dieuKhoanThanhToan?: string;
    soNgayDuocNo?: number; noiDung?: string;
    fileTenGoc?: string; fileCo?: boolean;
    trangThai: string; lyDoTuChoi?: string; idNguoiDuyet?: string;
    ngayDuyet?: string; soLanTrinh?: number;
    ngayTao?: string; ngayCapNhat?: string; nguoiTao?: string; nguoiCapNhat?: string;
}

const headers = (): HeadersInit => getAuthHeaders();

const parseError = async (response: Response, fallback: string): Promise<Error> => {
    try {
        const body = await response.json();
        return new Error(body?.message || fallback);
    } catch {
        return new Error(fallback);
    }
};

const toQuery = (filter: HopDongFilter): string => {
    const p = new URLSearchParams();
    if (filter.idNcc) p.set('idNcc', filter.idNcc);
    if (filter.trangThai) p.set('trangThai', filter.trangThai);
    const qs = p.toString();
    return qs ? `?${qs}` : '';
};

export const hopDongApi = {
    list: async (filter: HopDongFilter = {}): Promise<HopDongDTO[]> => {
        const res = await fetch(`${API_BASE_URL}/api/hop-dong${toQuery(filter)}`, { headers: headers() });
        if (!res.ok) throw await parseError(res, 'Lỗi tải danh sách hợp đồng');
        return res.json();
    },
    sapHetHan: async (days = 30): Promise<HopDongDTO[]> => {
        const res = await fetch(`${API_BASE_URL}/api/hop-dong/sap-het-han?days=${days}`, { headers: headers() });
        if (!res.ok) throw await parseError(res, 'Lỗi tải cảnh báo hết hạn');
        return res.json();
    },
    detail: async (id: string): Promise<HopDongDTO> => {
        const res = await fetch(`${API_BASE_URL}/api/hop-dong/${id}`, { headers: headers() });
        if (!res.ok) throw await parseError(res, 'Lỗi tải chi tiết hợp đồng');
        return res.json();
    },
    create: async (values: Omit<HopDongFormValues, 'ngayKy' | 'ngayHieuLuc'> & { ngayKy: string; ngayHieuLuc: string }, file?: File): Promise<HopDongDTO> => {
        const form = new FormData();
        form.append('hopDong', new Blob([JSON.stringify(values)], { type: 'application/json' }), 'hopDong.json');
        if (file) form.append('file', file);
        const res = await fetch(`${API_BASE_URL}/api/hop-dong`, {
            method: 'POST', headers: headers(), body: form,
        });
        if (!res.ok) throw await parseError(res, 'Lỗi tạo hợp đồng');
        return res.json();
    },
    update: async (id: string, values: unknown, file?: File): Promise<HopDongDTO> => {
        const form = new FormData();
        form.append('hopDong', new Blob([JSON.stringify(values)], { type: 'application/json' }), 'hopDong.json');
        if (file) form.append('file', file);
        const res = await fetch(`${API_BASE_URL}/api/hop-dong/${id}`, {
            method: 'PUT', headers: headers(), body: form,
        });
        if (!res.ok) throw await parseError(res, 'Lỗi sửa hợp đồng');
        return res.json();
    },
    submit: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/api/hop-dong/${id}/trinh`, { method: 'POST', headers: headers() });
        if (!res.ok) throw await parseError(res, 'Chưa trình được hợp đồng');
    },
    approve: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/api/hop-dong/${id}/duyet`, { method: 'POST', headers: headers() });
        if (!res.ok) throw await parseError(res, 'Chưa duyệt được hợp đồng');
    },
    reject: async (id: string, lyDo: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/api/hop-dong/${id}/tu-choi`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() },
            body: JSON.stringify({ lyDo }),
        });
        if (!res.ok) throw await parseError(res, 'Chưa từ chối được hợp đồng');
    },
    cancel: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/api/hop-dong/${id}/huy`, { method: 'POST', headers: headers() });
        if (!res.ok) throw await parseError(res, 'Chưa hủy được hợp đồng');
    },
    remove: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/api/hop-dong/${id}`, { method: 'DELETE', headers: headers() });
        if (!res.ok) throw await parseError(res, 'Chưa xóa được hợp đồng');
    },
    downloadUrl: (id: string): string => `${API_BASE_URL}/api/hop-dong/${id}/file`,
};