-- =============================================================================
-- Migration: Quản lý NCC — audit người tạo / người sửa
-- Mục đích: Ghi lại ai tạo NCC, ai sửa NCC gần nhất để phục vụ rà soát định kỳ
--           ("NCC lâu không có phiếu nhập" → quyết định giữ / ngừng).
-- Tham chiếu: seed_database.js — chèn ngay sau 'nha_cung_cap.sql';
--             Entity NhaCungCap.java (field createdBy / updatedBy).
-- Lưu ý: nha_cung_cap.sql đang mô tả "bảng nền, không FK tới bảng khác".
--        Đây là NGOẠI LỆ chủ ý: chỉ thêm FK tới nhan_vien cho audit.
-- =============================================================================

-- 1) Cột audit: UUID của nhân viên (FK tới nhan_vien, SET NULL khi NV bị xoá)
ALTER TABLE nha_cung_cap
    ADD COLUMN IF NOT EXISTS nguoi_tao      UUID
    REFERENCES nhan_vien(id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD COLUMN IF NOT EXISTS nguoi_cap_nhat UUID
        REFERENCES nhan_vien(id) ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON COLUMN nha_cung_cap.nguoi_tao IS
    'UUID nhân viên tạo NCC. FK tới nhan_vien, SET NULL nếu nhân viên bị xoá. Không sửa trực tiếp từ frontend.';
COMMENT ON COLUMN nha_cung_cap.nguoi_cap_nhat IS
    'UUID nhân viên sửa NCC gần nhất. Cập nhật ở tầng service khi UPDATE. Không sửa trực tiếp từ frontend.';

-- 2) Backfill dữ liệu mẫu: gán 8 NCC seed cho admin đầu tiên (ng_tao = ng_cập_nhật)
UPDATE nha_cung_cap
SET nguoi_tao = (SELECT id FROM nhan_vien WHERE vai_tro = 'ADMIN' ORDER BY ngay_tao ASC LIMIT 1)
WHERE nguoi_tao IS NULL;