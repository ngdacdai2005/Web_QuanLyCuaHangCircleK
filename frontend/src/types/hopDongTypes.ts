import type { VND } from '@/types/commonTypes';

export const HOP_DONG_LOAI = {
    NGUYEN_TAC: 'NGUYEN_TAC',
    MUA_HANG: 'MUA_HANG',
    DICH_VU: 'DICH_VU',
    VAN_CHUYEN: 'VAN_CHUYEN',
    KHAC: 'KHAC',
} as const;
export type HopDongLoai = (typeof HOP_DONG_LOAI)[keyof typeof HOP_DONG_LOAI];

export const HOP_DONG_LOAI_LABEL: Record<HopDongLoai, string> = {
    NGUYEN_TAC: 'Hợp đồng nguyên tắc',
    MUA_HANG: 'Mua bán hàng hóa (Có bảng giá)',
    DICH_VU: 'Dịch vụ',
    VAN_CHUYEN: 'Vận chuyển',
    KHAC: 'Khác',
};

export const HOP_DONG_STATUS = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    ACTIVE: 'ACTIVE',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
} as const;
export type HopDongStatus = (typeof HOP_DONG_STATUS)[keyof typeof HOP_DONG_STATUS];

export const HOP_DONG_STATUS_LABEL: Record<HopDongStatus, string> = {
    DRAFT: 'Nháp',
    PENDING_APPROVAL: 'Chờ duyệt',
    ACTIVE: 'Hiệu lực',
    REJECTED: 'Đã từ chối',
    EXPIRED: 'Hết hạn',
    CANCELLED: 'Đã hủy',
};

export const HOP_DONG_STATUS_COLOR: Record<HopDongStatus, string> = {
    DRAFT: 'default',
    PENDING_APPROVAL: 'gold',
    ACTIVE: 'green',
    REJECTED: 'red',
    EXPIRED: 'red',
    CANCELLED: 'default',
};

export interface HopDongChiTiet {
    id?: string;
    idHopDong?: string;
    idSanPham: string;
    tenSanPham?: string;
    sku?: string;
    donVi?: string;
    donGiaCamKet: VND;
    soLuongCamKet?: number;
    soLuongDaNhap?: number;
    vatPhantram?: number;
    ngayHieuLucTu?: string;
    ngayHetHan?: string;
    ghiChu?: string;
}

export interface HopDong {
    id: string;
    maHopDong: string;
    tenHopDong: string;
    loaiHopDong: HopDongLoai;
    idNcc: string;
    maNcc: string;
    tenNcc: string;
    ngayKy: string;
    ngayHieuLuc: string;
    ngayHetHan?: string | null;
    giaTriHopDong?: VND | null;
    hanMucHopDong?: VND | null;
    giaTriDaSuDung?: VND;
    dieuKhoanThanhToan?: string;
    soNgayDuocNo?: number;
    noiDung?: string;
    lines?: HopDongChiTiet[];
    fileTenGoc?: string;
    fileCo: boolean;
    trangThai: HopDongStatus;
    lyDoTuChoi?: string;
    idNguoiDuyet?: string;
    ngayDuyet?: string;
    soLanTrinh?: number;
    createdAt: string;
    updatedAt?: string;
}

export type HopDongFormValues = {
    tenHopDong: string;
    loaiHopDong: HopDongLoai;
    idNcc: string;
    ngayKy: string;
    ngayHieuLuc: string;
    ngayHetHan?: string;
    giaTriHopDong?: string;
    hanMucHopDong?: string;
    dieuKhoanThanhToan?: string;
    soNgayDuocNo?: string;
    noiDung?: string;
    lines?: HopDongChiTiet[];
};

export interface HopDongFilter {
    idNcc?: string;
    trangThai?: HopDongStatus | null;
}

/** Derive EXPIRED phía client — cùng quy tắc backend: ACTIVE && ngayHetHan < hôm nay. */
export const effectiveStatus = (hd: HopDong): HopDongStatus => {
    if (
        hd.trangThai === HOP_DONG_STATUS.ACTIVE &&
        hd.ngayHetHan &&
        hd.ngayHetHan < new Date().toISOString().slice(0, 10)
    ) {
        return HOP_DONG_STATUS.EXPIRED;
    }
    return hd.trangThai;
};

/** Còn N ngày nữa hết hạn (ACTIVE), để bôi Tag "Sắp hết hạn". */
export const daysToExpiry = (hd: HopDong): number => {
    if (!hd.ngayHetHan) return Number.POSITIVE_INFINITY;
    return Math.ceil((new Date(hd.ngayHetHan).getTime() - Date.now()) / 86400000);
};