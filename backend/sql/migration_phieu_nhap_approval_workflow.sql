-- =============================================================================
-- MIGRATION: Workflow phê duyệt + kiểm nhận phiếu nhập
--
-- Workflow mới:
--
-- PENDING_CONFIRMATION
--      ├── approve  -> PENDING_RECEIVING
--      ├── reject   -> REJECTED
--      └── cancel   -> CANCELLED
--
-- PENDING_RECEIVING
--      ├── startReceiving -> RECEIVING
--      └── cancel         -> CANCELLED
--
-- RECEIVING
--      ├── confirmReceiving -> COMPLETED
--      ├── cancelReceiving  -> PENDING_RECEIVING
--      └── cancel           -> CANCELLED
--
-- COMPLETED
--      └── pay nhiều lần, status vẫn COMPLETED
--
-- Lưu ý:
-- - COMPLETED = đã hoàn tất kiểm nhận hàng, KHÔNG có nghĩa đã thanh toán hết.
-- - Công nợ = grand_total - da_thanh_toan.
-- - Không cho so_luong_nhan > so_luong_dat.
-- - Hàng giao dư được lưu riêng bằng so_luong_thua.
-- - Hàng dư không được cộng vào giá trị công nợ.
-- - Trong trạng thái RECEIVING, hàng dư có thể tạm thời ở CHUA_XU_LY.
-- - Khi confirmReceiving, backend phải bắt buộc xử lý toàn bộ hàng dư.
-- =============================================================================


-- =============================================================================
-- 1. Mở rộng độ dài trạng thái
-- =============================================================================

ALTER TABLE phieu_nhap
ALTER COLUMN trang_thai TYPE VARCHAR(30);

ALTER TABLE phieu_nhap
    ALTER COLUMN trang_thai SET DEFAULT 'PENDING_CONFIRMATION';

-- SELECT column_default
-- FROM information_schema.columns
-- WHERE table_name = 'phieu_nhap'
--   AND column_name = 'trang_thai';


-- =============================================================================
-- 2. Xóa CHECK constraint trạng thái cũ
-- =============================================================================

ALTER TABLE phieu_nhap
DROP CONSTRAINT IF EXISTS phieu_nhap_trang_thai_check;


-- =============================================================================
-- 3. Migrate dữ liệu trạng thái cũ
-- =============================================================================
--
-- DRAFT           -> PENDING_CONFIRMATION
-- PENDING         -> PENDING_RECEIVING
-- PENDING_PAYMENT -> PENDING_RECEIVING
--
-- COMPLETED/CANCELLED giữ nguyên.
-- =============================================================================

UPDATE phieu_nhap
SET trang_thai = CASE
                     WHEN trang_thai = 'DRAFT'
                         THEN 'PENDING_CONFIRMATION'

                     WHEN trang_thai IN ('PENDING', 'PENDING_PAYMENT')
                         THEN 'PENDING_RECEIVING'

                     ELSE trang_thai
    END
WHERE trang_thai IN (
                     'DRAFT',
                     'PENDING',
                     'PENDING_PAYMENT'
    );


-- =============================================================================
-- 4. Thêm CHECK constraint trạng thái mới
-- =============================================================================

ALTER TABLE phieu_nhap
    ADD CONSTRAINT phieu_nhap_trang_thai_check
        CHECK (
            trang_thai IN (
                           'PENDING_CONFIRMATION',
                           'REJECTED',
                           'PENDING_RECEIVING',
                           'RECEIVING',
                           'COMPLETED',
                           'CANCELLED'
                )
            );


-- =============================================================================
-- 5. Audit người duyệt
-- =============================================================================

ALTER TABLE phieu_nhap
    ADD COLUMN IF NOT EXISTS id_nguoi_duyet UUID;

ALTER TABLE phieu_nhap
    ADD COLUMN IF NOT EXISTS ngay_duyet TIMESTAMP;

ALTER TABLE phieu_nhap
    ADD COLUMN IF NOT EXISTS ly_do_tu_choi TEXT;


-- =============================================================================
-- 6. Audit người kiểm nhận
-- =============================================================================

ALTER TABLE phieu_nhap
    ADD COLUMN IF NOT EXISTS id_nguoi_kiem_nhan UUID;

ALTER TABLE phieu_nhap
    ADD COLUMN IF NOT EXISTS ngay_kiem_nhan TIMESTAMP;

ALTER TABLE phieu_nhap
    ADD COLUMN IF NOT EXISTS ly_do_chenh_lech TEXT;


-- =============================================================================
-- 7. FK người duyệt
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_phieu_nhap_nguoi_duyet'
          AND conrelid = 'phieu_nhap'::regclass
    ) THEN

ALTER TABLE phieu_nhap
    ADD CONSTRAINT fk_phieu_nhap_nguoi_duyet
        FOREIGN KEY (id_nguoi_duyet)
            REFERENCES nhan_vien(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;

END IF;
END $$;


-- =============================================================================
-- 8. FK người kiểm nhận
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_phieu_nhap_nguoi_kiem_nhan'
          AND conrelid = 'phieu_nhap'::regclass
    ) THEN

ALTER TABLE phieu_nhap
    ADD CONSTRAINT fk_phieu_nhap_nguoi_kiem_nhan
        FOREIGN KEY (id_nguoi_kiem_nhan)
            REFERENCES nhan_vien(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;

END IF;
END $$;

-- =============================================================================
-- 8b. Xóa FK tự sinh trùng với FK có tên chuẩn
-- =============================================================================
--
-- phieu_nhap.sql khai FK inline nên PostgreSQL tự sinh:
--   phieu_nhap_id_nguoi_duyet_fkey
--   phieu_nhap_id_nguoi_kiem_nhan_fkey
--
-- Section 7/8 ở trên tạo FK có tên chuẩn:
--   fk_phieu_nhap_nguoi_duyet
--   fk_phieu_nhap_nguoi_kiem_nhan
--
-- Chỉ giữ FK có tên chuẩn để dễ quản lý/debug.
-- =============================================================================

DO $$
DECLARE
v_name TEXT;
BEGIN
    FOREACH v_name IN ARRAY ARRAY[
        'phieu_nhap_id_nguoi_duyet_fkey',
        'phieu_nhap_id_nguoi_kiem_nhan_fkey'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = v_name
              AND conrelid = 'phieu_nhap'::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE phieu_nhap DROP CONSTRAINT %I',
                v_name
            );

            RAISE NOTICE 'Đã xoá FK trùng: %', v_name;
END IF;
END LOOP;
END $$;


-- =============================================================================
-- 9. Thông tin hàng giao dư
-- =============================================================================

ALTER TABLE chi_tiet_phieu_nhap
    ADD COLUMN IF NOT EXISTS so_luong_thua INTEGER NOT NULL DEFAULT 0;

ALTER TABLE chi_tiet_phieu_nhap
    ADD COLUMN IF NOT EXISTS xu_ly_thua VARCHAR(20) NOT NULL DEFAULT 'CHUA_XU_LY';

ALTER TABLE chi_tiet_phieu_nhap
    ADD COLUMN IF NOT EXISTS don_gia_nhap_cu DECIMAL(12,0);

ALTER TABLE chi_tiet_phieu_nhap
    ADD COLUMN IF NOT EXISTS ly_do_chenh_lech_dong TEXT;


-- =============================================================================
-- 10. CHECK số lượng dư không âm
-- =============================================================================

ALTER TABLE chi_tiet_phieu_nhap
DROP CONSTRAINT IF EXISTS chk_so_luong_thua_khong_am;

ALTER TABLE chi_tiet_phieu_nhap
    ADD CONSTRAINT chk_so_luong_thua_khong_am
        CHECK (so_luong_thua >= 0);


-- =============================================================================
-- 11. CHECK cách xử lý hàng dư
-- =============================================================================

ALTER TABLE chi_tiet_phieu_nhap
DROP CONSTRAINT IF EXISTS chk_xu_ly_thua;

ALTER TABLE chi_tiet_phieu_nhap
    ADD CONSTRAINT chk_xu_ly_thua
        CHECK (
            xu_ly_thua IN (
                           'NHAP_KHO',
                           'TRA_LAI_NCC',
                           'CHUA_XU_LY'
                )
            );


-- =============================================================================
-- 12. CHECK quan hệ giữa số lượng dư và cách xử lý
-- =============================================================================
--
-- QUAN TRỌNG:
--
-- Không được bắt buộc:
--     so_luong_thua > 0 -> NHAP_KHO / TRA_LAI_NCC
--
-- vì trong trạng thái RECEIVING, thủ kho có thể vừa ghi nhận hàng dư
-- nhưng chưa quyết định cách xử lý.
--
-- Do đó DB cho phép:
--
--     so_luong_thua = 0
--         -> CHUA_XU_LY
--
--     so_luong_thua > 0
--         -> CHUA_XU_LY
--         -> NHAP_KHO
--         -> TRA_LAI_NCC
--
-- Tuy nhiên:
--     confirmReceiving PHẢI chặn nếu:
--         so_luong_thua > 0
--         AND xu_ly_thua = 'CHUA_XU_LY'
--
-- Việc này được enforce ở Service layer.
-- =============================================================================

ALTER TABLE chi_tiet_phieu_nhap
DROP CONSTRAINT IF EXISTS chk_thua_va_xu_ly_thua;

ALTER TABLE chi_tiet_phieu_nhap
    ADD CONSTRAINT chk_thua_va_xu_ly_thua
        CHECK (
            (
                so_luong_thua >= 0
                    AND xu_ly_thua IN (
                                       'NHAP_KHO',
                                       'TRA_LAI_NCC',
                                       'CHUA_XU_LY'
                    )
                )
            );


-- =============================================================================
-- 13. Dữ liệu cũ cho hàng dư
-- =============================================================================
--
-- Các phiếu COMPLETED cũ đã nhận hàng.
-- Chúng không có thông tin hàng dư nên mặc định:
--
--     so_luong_thua = 0
--     xu_ly_thua = CHUA_XU_LY
--
-- Các phiếu chưa hoàn thành cũng dùng mặc định trên.
-- =============================================================================

UPDATE chi_tiet_phieu_nhap
SET
    so_luong_thua = COALESCE(so_luong_thua, 0),
    xu_ly_thua = COALESCE(xu_ly_thua, 'CHUA_XU_LY')
WHERE so_luong_thua IS NULL
   OR xu_ly_thua IS NULL;


-- =============================================================================
-- 14. Index công nợ NCC
-- =============================================================================

DROP INDEX IF EXISTS idx_phieu_nhap_chua_thanh_toan;

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_cong_no
    ON phieu_nhap (
    id_ncc,
    ngay_nhan_thuc_te DESC
    )
    WHERE cong_no > 0
    AND trang_thai = 'COMPLETED';


-- =============================================================================
-- 15. Index workflow
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_trang_thai
    ON phieu_nhap (
    trang_thai,
    ngay_dat_hang DESC
    );


-- =============================================================================
-- 16. Index audit người duyệt
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_nguoi_duyet
    ON phieu_nhap (id_nguoi_duyet);


-- =============================================================================
-- 17. Index audit người kiểm nhận
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_nguoi_kiem_nhan
    ON phieu_nhap (id_nguoi_kiem_nhan);


-- =============================================================================
-- 18. Khóa chi tiết phiếu nhập sau COMPLETED
-- =============================================================================
--
-- Khi header phieu_nhap đã COMPLETED:
--
--     INSERT chi_tiet -> cấm
--     UPDATE chi_tiet -> cấm
--     DELETE chi_tiet -> cấm
--
-- Mục đích:
-- - Không thể thay đổi số lượng sau khi đã ghi nhận tồn kho.
-- - Không thể thay đổi giá trị công nợ sau khi hoàn tất.
-- - Không thể tạo lại side effect kho bằng cách sửa line.
--
-- Việc đổi trạng thái vẫn do Backend Service kiểm soát.
-- Trigger này chỉ bảo vệ dữ liệu chi tiết.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_khoa_chi_tiet_phieu_nhap_sau_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
v_id_phieu_nhap UUID;
    v_trang_thai VARCHAR(30);
BEGIN

    IF TG_OP = 'DELETE' THEN
        v_id_phieu_nhap := OLD.id_phieu_nhap;
ELSE
        v_id_phieu_nhap := NEW.id_phieu_nhap;
END IF;

SELECT trang_thai
INTO v_trang_thai
FROM phieu_nhap
WHERE id = v_id_phieu_nhap;

IF v_trang_thai = 'COMPLETED' THEN
        RAISE EXCEPTION
            'Không thể thay đổi chi tiết phiếu nhập đã COMPLETED';
END IF;

    -- Trường hợp UPDATE chuyển dòng từ một phiếu sang phiếu khác:
    -- kiểm tra thêm header cũ để không thể lấy dòng khỏi phiếu COMPLETED.
    IF TG_OP = 'UPDATE'
       AND OLD.id_phieu_nhap IS DISTINCT FROM NEW.id_phieu_nhap THEN

SELECT trang_thai
INTO v_trang_thai
FROM phieu_nhap
WHERE id = OLD.id_phieu_nhap;

IF v_trang_thai = 'COMPLETED' THEN
            RAISE EXCEPTION
                'Không thể di chuyển chi tiết khỏi phiếu nhập đã COMPLETED';
END IF;

END IF;

RETURN COALESCE(NEW, OLD);
END;
$$;


DROP TRIGGER IF EXISTS trg_chi_tiet_phieu_nhap_khoa_sau_completed
ON chi_tiet_phieu_nhap;

CREATE TRIGGER trg_chi_tiet_phieu_nhap_khoa_sau_completed
    BEFORE INSERT OR UPDATE OR DELETE
                     ON chi_tiet_phieu_nhap
                         FOR EACH ROW
                         EXECUTE FUNCTION fn_khoa_chi_tiet_phieu_nhap_sau_completed();


-- =============================================================================
-- 19. COMMENT
-- =============================================================================

COMMENT ON COLUMN phieu_nhap.id_nguoi_duyet IS
    'Nhân viên ADMIN/KE_TOAN xử lý phiếu nhập: duyệt '
    '(PENDING_RECEIVING) hoặc từ chối (REJECTED). '
    'Dùng chung cho hai trường hợp; phân biệt bằng trang_thai '
    'và ly_do_tu_choi.';

COMMENT ON COLUMN phieu_nhap.ngay_duyet IS
    'Thời điểm duyệt hoặc từ chối phiếu nhập.';

COMMENT ON COLUMN phieu_nhap.ly_do_tu_choi IS
    'Lý do từ chối phiếu nhập, bắt buộc khi chuyển sang REJECTED.';

COMMENT ON COLUMN phieu_nhap.id_nguoi_kiem_nhan IS
    'Nhân viên ADMIN/THU_KHO thực hiện kiểm nhận hàng.';

COMMENT ON COLUMN phieu_nhap.ngay_kiem_nhan IS
    'Thời điểm bắt đầu kiểm nhận hàng.';

COMMENT ON COLUMN phieu_nhap.ly_do_chenh_lech IS
    'Lý do chênh lệch tổng thể của phiếu khi kiểm nhận.';

COMMENT ON COLUMN chi_tiet_phieu_nhap.so_luong_thua IS
    'Số lượng NCC giao dư ngoài số lượng đặt. Không cộng vào giá trị công nợ.';

COMMENT ON COLUMN chi_tiet_phieu_nhap.xu_ly_thua IS
    'Cách xử lý hàng dư: NHAP_KHO, TRA_LAI_NCC hoặc CHUA_XU_LY.';

COMMENT ON COLUMN chi_tiet_phieu_nhap.don_gia_nhap_cu IS
    'Đơn giá cũ trước khi thay đổi trong quá trình kiểm nhận.';

COMMENT ON COLUMN chi_tiet_phieu_nhap.ly_do_chenh_lech_dong IS
    'Lý do chênh lệch riêng của dòng hàng.';


-- =============================================================================
-- 20. Kiểm tra dữ liệu sau migration
-- =============================================================================

DO $$
DECLARE
v_invalid INTEGER;
BEGIN

SELECT COUNT(*)
INTO v_invalid
FROM phieu_nhap
WHERE trang_thai NOT IN (
                         'PENDING_CONFIRMATION',
                         'REJECTED',
                         'PENDING_RECEIVING',
                         'RECEIVING',
                         'COMPLETED',
                         'CANCELLED'
    );

IF v_invalid > 0 THEN
        RAISE EXCEPTION
            'Migration workflow thất bại: còn % phiếu có trạng thái không hợp lệ.',
            v_invalid;
END IF;

END $$;


-- =============================================================================
-- 21. Kiểm tra dữ liệu hàng dư sau migration
-- =============================================================================
--
-- Ở đây CHUA_XU_LY với so_luong_thua > 0 vẫn hợp lệ.
-- Service confirmReceiving mới là nơi bắt buộc xử lý trước khi COMPLETED.
-- =============================================================================

DO $$
DECLARE
v_invalid INTEGER;
BEGIN

SELECT COUNT(*)
INTO v_invalid
FROM chi_tiet_phieu_nhap
WHERE
    so_luong_thua < 0
   OR xu_ly_thua NOT IN (
                         'NHAP_KHO',
                         'TRA_LAI_NCC',
                         'CHUA_XU_LY'
    );

IF v_invalid > 0 THEN
        RAISE EXCEPTION
            'Migration workflow thất bại: còn % dòng có thông tin hàng dư không hợp lệ.',
            v_invalid;
END IF;

END $$;


-- =============================================================================
-- KẾT THÚC MIGRATION
-- =============================================================================