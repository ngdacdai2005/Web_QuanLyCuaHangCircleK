-- =============================================================================
-- Bảng: hop_dong
-- Mục đích: Quản lý hợp đồng với nhà cung cấp.
--
-- Workflow:
--   DRAFT -> PENDING_APPROVAL -> ACTIVE
--                      |            |
--                      |            └─ EXPIRED (derived khi đọc)
--                      └─ REJECTED -> submit lại
--
-- EXPIRED không được ghi xuống DB.
-- Khi đọc:
--   trang_thai = ACTIVE
--   AND ngay_het_han < CURRENT_DATE
-- => DTO trả về EXPIRED.
-- =============================================================================

CREATE TABLE IF NOT EXISTS hop_dong (
                                        id UUID PRIMARY KEY,

                                        ma_hop_dong VARCHAR(30) NOT NULL UNIQUE,

    ten_hop_dong VARCHAR(200) NOT NULL,

    loai_hop_dong VARCHAR(30) NOT NULL DEFAULT 'MUA_HANG',

    id_ncc UUID NOT NULL,

    ngay_ky DATE NOT NULL,

    ngay_hieu_luc DATE NOT NULL,

    ngay_het_han DATE NULL,

    gia_tri_hop_dong DECIMAL(15,2) NULL,

    dieu_khoan_thanh_toan TEXT,

    so_ngay_duoc_no INTEGER NOT NULL DEFAULT 0,

    noi_dung TEXT,

    file_ten_goc VARCHAR(255),

    file_duong_dan VARCHAR(500),

    file_loai VARCHAR(100),

    file_kich_thuoc BIGINT,

    trang_thai VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

    ly_do_tu_choi TEXT,

    id_nguoi_duyet UUID,

    ngay_duyet TIMESTAMP,

    so_lan_trinh INTEGER NOT NULL DEFAULT 0,

    nguoi_tao UUID,

    nguoi_cap_nhat UUID,

    ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ngay_cap_nhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_hop_dong_ncc
    FOREIGN KEY (id_ncc)
    REFERENCES nha_cung_cap(id)
    ON DELETE RESTRICT,

    CONSTRAINT fk_hop_dong_nguoi_duyet
    FOREIGN KEY (id_nguoi_duyet)
    REFERENCES nhan_vien(id)
    ON DELETE SET NULL,

    CONSTRAINT fk_hop_dong_nguoi_tao
    FOREIGN KEY (nguoi_tao)
    REFERENCES nhan_vien(id)
    ON DELETE SET NULL,

    CONSTRAINT fk_hop_dong_nguoi_cap_nhat
    FOREIGN KEY (nguoi_cap_nhat)
    REFERENCES nhan_vien(id)
    ON DELETE SET NULL,

    CONSTRAINT chk_hop_dong_trang_thai
    CHECK (
              trang_thai IN (
              'DRAFT',
              'PENDING_APPROVAL',
              'ACTIVE',
              'REJECTED',
              'EXPIRED',
              'CANCELLED'
                            )
    ),

    CONSTRAINT chk_hop_dong_loai
    CHECK (
              loai_hop_dong IN (
              'MUA_HANG',
              'DICH_VU',
              'VAN_CHUYEN',
              'KHAC'
                               )
    ),

    CONSTRAINT chk_hop_dong_ngay
    CHECK (
              ngay_het_han IS NULL
              OR ngay_het_han >= ngay_hieu_luc
          ),

    CONSTRAINT chk_hop_dong_gia_tri
    CHECK (
              gia_tri_hop_dong IS NULL
              OR gia_tri_hop_dong >= 0
          ),

    CONSTRAINT chk_hop_dong_so_ngay_no
    CHECK (
              so_ngay_duoc_no >= 0
          )
    );

CREATE INDEX IF NOT EXISTS idx_hop_dong_id_ncc
    ON hop_dong(id_ncc);

CREATE INDEX IF NOT EXISTS idx_hop_dong_trang_thai
    ON hop_dong(trang_thai, ngay_het_han);

COMMENT ON TABLE hop_dong IS
    'Quản lý hợp đồng với nhà cung cấp';

COMMENT ON COLUMN hop_dong.ma_hop_dong IS
    'Mã hợp đồng dạng HD-XXXXXXXX';

COMMENT ON COLUMN hop_dong.trang_thai IS
    'DRAFT/PENDING_APPROVAL/ACTIVE/REJECTED/EXPIRED/CANCELLED';

COMMENT ON COLUMN hop_dong.file_duong_dan IS
    'Đường dẫn file scan trên filesystem, không trả trực tiếp cho frontend';

COMMENT ON COLUMN hop_dong.so_lan_trinh IS
    'Số lần hợp đồng được trình duyệt';

-- =============================================================================
-- SELF VERIFY
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'hop_dong'
    ) THEN
        RAISE EXCEPTION 'Migration hop_dong thất bại: không tìm thấy bảng hop_dong';
END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_hop_dong_id_ncc'
    ) THEN
        RAISE EXCEPTION 'Migration hop_dong thiếu index idx_hop_dong_id_ncc';
END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_hop_dong_trang_thai'
    ) THEN
        RAISE EXCEPTION 'Migration hop_dong thiếu index idx_hop_dong_trang_thai';
END IF;
END $$;