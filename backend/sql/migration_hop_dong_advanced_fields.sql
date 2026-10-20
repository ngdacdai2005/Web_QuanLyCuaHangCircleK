-- Migration bổ sung các trường nâng cao cho quản lý Hợp đồng mua hàng
ALTER TABLE hop_dong
    ADD COLUMN IF NOT EXISTS so_hop_dong_doi_tac VARCHAR(100),
    ADD COLUMN IF NOT EXISTS nguoi_dai_dien_ncc VARCHAR(150),
    ADD COLUMN IF NOT EXISTS chuc_vu_ncc VARCHAR(100),
    ADD COLUMN IF NOT EXISTS nguoi_dai_dien_ben_mua VARCHAR(150),
    ADD COLUMN IF NOT EXISTS dia_diem_giao_hang VARCHAR(255),
    ADD COLUMN IF NOT EXISTS thoi_gian_giao_hang VARCHAR(255),
    ADD COLUMN IF NOT EXISTS chiet_khau_phantram NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS chinh_sach_doi_tra TEXT,
    ADD COLUMN IF NOT EXISTS tu_dong_gia_han BOOLEAN DEFAULT FALSE;

ALTER TABLE hop_dong_chi_tiet
    ADD COLUMN IF NOT EXISTS moq INTEGER DEFAULT 1;
