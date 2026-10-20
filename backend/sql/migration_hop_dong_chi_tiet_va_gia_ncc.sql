-- =============================================================================
-- Migration: Hợp đồng chi tiết, Giá nhập NCC theo thời hạn và Liên kết Phiếu nhập
-- Mục đích:
--   1. Phân biệt Hợp đồng nguyên tắc (NGUYEN_TAC) và Hợp đồng mua hàng có bảng giá (MUA_HANG).
--   2. Bổ sung bảng `hop_dong_chi_tiet` lưu sản phẩm, đơn giá cam kết, số lượng cam kết.
--   3. Bổ sung bảng `gia_nhap_ncc` lưu lịch sử và thời gian hiệu lực giá nhập NCC.
--   4. Bổ sung cột `id_hop_dong` vào `phieu_nhap` để gắn chứng từ nhập hàng với hợp đồng.
--   5. Bổ sung trường hạn mức `han_muc_hop_dong`, `gia_tri_da_su_dung` cho `hop_dong`.
-- =============================================================================

-- 1) Cập nhật loại hợp đồng và hạn mức cho bảng hop_dong
ALTER TABLE hop_dong DROP CONSTRAINT IF EXISTS chk_hop_dong_loai;
ALTER TABLE hop_dong ADD CONSTRAINT chk_hop_dong_loai
    CHECK (loai_hop_dong IN ('MUA_HANG', 'NGUYEN_TAC', 'DICH_VU', 'VAN_CHUYEN', 'KHAC'));

ALTER TABLE hop_dong
    ADD COLUMN IF NOT EXISTS han_muc_hop_dong DECIMAL(15,2) NULL,
    ADD COLUMN IF NOT EXISTS gia_tri_da_su_dung DECIMAL(15,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN hop_dong.han_muc_hop_dong IS 'Hạn mức giá trị mua tối đa của hợp đồng (nếu có)';
COMMENT ON COLUMN hop_dong.gia_tri_da_su_dung IS 'Giá trị tiền hàng thực tế đã xuất phiếu nhập theo hợp đồng';

-- 2) Liên kết phieu_nhap với hop_dong
ALTER TABLE phieu_nhap
    ADD COLUMN IF NOT EXISTS id_hop_dong UUID
    REFERENCES hop_dong(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_id_hop_dong ON phieu_nhap(id_hop_dong);
COMMENT ON COLUMN phieu_nhap.id_hop_dong IS 'FK tới hop_dong tham chiếu khi lập phiếu nhập';

-- 3) Tạo bảng hop_dong_chi_tiet
CREATE TABLE IF NOT EXISTS hop_dong_chi_tiet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hop_dong UUID NOT NULL REFERENCES hop_dong(id) ON DELETE CASCADE,
    id_san_pham UUID NOT NULL REFERENCES san_pham(id) ON DELETE RESTRICT,
    don_gia_cam_ket DECIMAL(15,2) NOT NULL CHECK (don_gia_cam_ket >= 0),
    so_luong_cam_ket INTEGER NOT NULL DEFAULT 0 CHECK (so_luong_cam_ket >= 0),
    so_luong_da_nhap INTEGER NOT NULL DEFAULT 0 CHECK (so_luong_da_nhap >= 0),
    vat_phantram INTEGER NOT NULL DEFAULT 8 CHECK (vat_phantram >= 0 AND vat_phantram <= 100),
    ngay_hieu_luc_tu DATE NULL,
    ngay_hieu_luc_den DATE NULL,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hop_dong_san_pham UNIQUE (id_hop_dong, id_san_pham)
);

CREATE INDEX IF NOT EXISTS idx_hdct_id_hop_dong ON hop_dong_chi_tiet(id_hop_dong);
CREATE INDEX IF NOT EXISTS idx_hdct_id_san_pham ON hop_dong_chi_tiet(id_san_pham);

COMMENT ON TABLE hop_dong_chi_tiet IS 'Chi tiết các mặt hàng cam kết theo hợp đồng mua bán';
COMMENT ON COLUMN hop_dong_chi_tiet.don_gia_cam_ket IS 'Đơn giá mua thỏa thuận cố định trong hợp đồng';
COMMENT ON COLUMN hop_dong_chi_tiet.so_luong_cam_ket IS 'Số lượng thỏa thuận mua trong kỳ (0 = không cam kết số lượng)';
COMMENT ON COLUMN hop_dong_chi_tiet.so_luong_da_nhap IS 'Số lượng thực tế đã nhập kho qua các phiếu nhập gắn hợp đồng';

-- 4) Tạo bảng gia_nhap_ncc (Lịch sử & Hiệu lực bảng giá NCC)
CREATE TABLE IF NOT EXISTS gia_nhap_ncc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_san_pham UUID NOT NULL REFERENCES san_pham(id) ON DELETE CASCADE,
    id_nha_cung_cap UUID NOT NULL REFERENCES nha_cung_cap(id) ON DELETE CASCADE,
    id_hop_dong_chi_tiet UUID REFERENCES hop_dong_chi_tiet(id) ON DELETE SET NULL,
    gia_nhap DECIMAL(15,2) NOT NULL CHECK (gia_nhap >= 0),
    ngay_hieu_luc_tu DATE NOT NULL DEFAULT CURRENT_DATE,
    ngay_hieu_luc_den DATE NULL,
    dang_ap_dung BOOLEAN NOT NULL DEFAULT TRUE,
    ghi_chu TEXT,
    nguoi_tao UUID REFERENCES nhan_vien(id) ON DELETE SET NULL,
    ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gia_nhap_ncc_lookup ON gia_nhap_ncc(id_san_pham, id_nha_cung_cap, dang_ap_dung);
CREATE INDEX IF NOT EXISTS idx_gia_nhap_ncc_hieu_luc ON gia_nhap_ncc(ngay_hieu_luc_tu, ngay_hieu_luc_den);

COMMENT ON TABLE gia_nhap_ncc IS 'Bảng giá mua và lịch sử thay đổi giá nhập của từng sản phẩm theo nhà cung cấp';
COMMENT ON COLUMN gia_nhap_ncc.dang_ap_dung IS 'Đánh dấu bảng giá này có đang được ưu tiên áp dụng hay không';

-- 5) Backfill dữ liệu ban đầu cho gia_nhap_ncc từ san_pham_nha_cung_cap (nếu có)
INSERT INTO gia_nhap_ncc (id, id_san_pham, id_nha_cung_cap, gia_nhap, ngay_hieu_luc_tu, dang_ap_dung, ghi_chu)
SELECT 
    gen_random_uuid(), 
    spncc.id_san_pham, 
    spncc.id_nha_cung_cap, 
    spncc.gia_nhap, 
    COALESCE(spncc.ngay_tao::date, CURRENT_DATE), 
    TRUE, 
    'Khởi tạo tự động từ bảng san_pham_nha_cung_cap'
FROM san_pham_nha_cung_cap spncc
WHERE NOT EXISTS (
    SELECT 1 FROM gia_nhap_ncc g 
    WHERE g.id_san_pham = spncc.id_san_pham 
      AND g.id_nha_cung_cap = spncc.id_nha_cung_cap
);
