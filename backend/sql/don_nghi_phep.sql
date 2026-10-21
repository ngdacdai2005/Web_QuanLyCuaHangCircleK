-- Bảng đơn xin nghỉ phép của nhân viên Circle K
CREATE TABLE IF NOT EXISTS don_nghi_phep (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nhan_vien UUID NOT NULL REFERENCES nhan_vien(id) ON DELETE CASCADE,
    id_chi_nhanh UUID REFERENCES chi_nhanh(id) ON DELETE SET NULL,
    loai_nghi VARCHAR(50) NOT NULL, -- ANNUAL, UNPAID, SICK, PERSONAL
    tu_ngay DATE NOT NULL,
    den_ngay DATE NOT NULL,
    so_ngay_nghi NUMERIC(4, 1) DEFAULT 1.0,
    ly_do TEXT,
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    id_nguoi_duyet UUID REFERENCES nhan_vien(id) ON DELETE SET NULL,
    ly_do_tu_choi TEXT,
    ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ngay_duyet TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_don_nghi_phep_nv ON don_nghi_phep(id_nhan_vien);
CREATE INDEX IF NOT EXISTS idx_don_nghi_phep_cn ON don_nghi_phep(id_chi_nhanh);
CREATE INDEX IF NOT EXISTS idx_don_nghi_phep_status ON don_nghi_phep(trang_thai);
