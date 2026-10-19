export type NotificationType =
  | 'LICH_LAM'
  | 'KHO_HANG'
  | 'KIEM_KE'
  | 'HOA_DON'
  | 'HOP_DONG'
  | 'HE_THONG';

export type NotificationLevel = 'INFO' | 'WARNING' | 'DANGER';

export interface NotificationItem {
  id: number;
  tieuDe: string;
  noiDung: string;
  loaiThongBao: NotificationType;
  actionUrl?: string;
  mucDo: NotificationLevel;
  nguoiGuiTen?: string;
  idNhanVienNhan?: string;
  idChiNhanh?: string | null;
  daDoc: boolean;
  ngayTao: string;
  ngayDoc?: string;
}

export interface NotificationFilterParams {
  unreadOnly?: boolean;
  loai?: string;
}
