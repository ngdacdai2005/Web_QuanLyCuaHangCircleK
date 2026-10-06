-- =============================================================================
-- MIGRATION: Đồng bộ thống kê đơn hàng + công nợ nhà cung cấp
--
-- Quy tắc:
--
-- 1. tong_don_hang
--    = số phiếu nhập đã tạo cho NCC.
--
-- 2. tong_cong_no
--    = tổng cong_no của các phiếu COMPLETED thuộc NCC.
--
-- 3. Khi phiếu:
--      non-COMPLETED -> COMPLETED
--          + NEW.cong_no
--
-- 4. Khi phiếu:
--      COMPLETED -> COMPLETED
--          + (NEW.cong_no - OLD.cong_no)
--
--    Ví dụ:
--      công nợ 100tr -> trả 30tr -> còn 70tr
--      NCC.tong_cong_no giảm 30tr.
--
-- 5. Khi:
--      COMPLETED -> non-COMPLETED
--          - OLD.cong_no
--
-- 6. Nếu id_ncc thay đổi:
--      - hoàn tác số liệu khỏi NCC cũ
--      - áp dụng số liệu cho NCC mới.
--
-- 7. Không cập nhật trực tiếp từ frontend.
-- =============================================================================


-- =============================================================================
-- 1. Function cập nhật thống kê NCC khi INSERT phiếu nhập
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_phieu_nhap_ncc_after_insert()
RETURNS TRIGGER AS $$
BEGIN

UPDATE nha_cung_cap
SET
    tong_don_hang = COALESCE(tong_don_hang, 0) + 1,

    tong_cong_no = COALESCE(tong_cong_no, 0)
        + CASE
              WHEN NEW.trang_thai = 'COMPLETED'
                  THEN COALESCE(NEW.cong_no, 0)
              ELSE 0
                       END

WHERE id = NEW.id_ncc;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. Trigger INSERT
-- =============================================================================

DROP TRIGGER IF EXISTS phieu_nhap_ncc_after_insert
ON phieu_nhap;

CREATE TRIGGER phieu_nhap_ncc_after_insert
    AFTER INSERT ON phieu_nhap
    FOR EACH ROW
    EXECUTE FUNCTION trg_phieu_nhap_ncc_after_insert();


-- =============================================================================
-- 3. Function đồng bộ công nợ + thống kê NCC khi UPDATE phiếu
-- =============================================================================
--
-- Xử lý:
--
-- A. non-COMPLETED -> COMPLETED
-- B. COMPLETED -> COMPLETED
-- C. COMPLETED -> non-COMPLETED
-- D. id_ncc thay đổi
--
-- Nếu id_ncc thay đổi, phải cập nhật cả NCC cũ và NCC mới.
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_phieu_nhap_ncc_sync_cong_no()
RETURNS TRIGGER AS $$
DECLARE
v_delta DECIMAL(15,0) := 0;
BEGIN

    -- =========================================================================
    -- TRƯỜNG HỢP 1:
    -- NCC KHÔNG thay đổi
    -- =========================================================================

    IF OLD.id_ncc = NEW.id_ncc THEN

        -- ---------------------------------------------------------------------
        -- 1A. non-COMPLETED -> COMPLETED
        -- ---------------------------------------------------------------------

        IF OLD.trang_thai <> 'COMPLETED'
           AND NEW.trang_thai = 'COMPLETED' THEN

            v_delta := COALESCE(NEW.cong_no, 0);

        -- ---------------------------------------------------------------------
        -- 1B. COMPLETED -> COMPLETED
        --
        -- Thanh toán từng đợt hoặc điều chỉnh cong_no.
        -- ---------------------------------------------------------------------

        ELSIF OLD.trang_thai = 'COMPLETED'
              AND NEW.trang_thai = 'COMPLETED' THEN

            v_delta :=
                COALESCE(NEW.cong_no, 0)
                - COALESCE(OLD.cong_no, 0);

        -- ---------------------------------------------------------------------
        -- 1C. COMPLETED -> non-COMPLETED
        -- ---------------------------------------------------------------------

        ELSIF OLD.trang_thai = 'COMPLETED'
              AND NEW.trang_thai <> 'COMPLETED' THEN

            v_delta := -COALESCE(OLD.cong_no, 0);

END IF;


        -- ---------------------------------------------------------------------
        -- Cập nhật NCC nếu công nợ thực sự thay đổi.
        -- ---------------------------------------------------------------------

        IF v_delta <> 0 THEN

UPDATE nha_cung_cap
SET tong_cong_no =
        COALESCE(tong_cong_no, 0) + v_delta
WHERE id = NEW.id_ncc;

END IF;


    -- =========================================================================
    -- TRƯỜNG HỢP 2:
    -- id_ncc thay đổi
    -- =========================================================================

ELSE

        -- ---------------------------------------------------------------------
        -- 2A. Hoàn tác số liệu khỏi NCC cũ
        -- ---------------------------------------------------------------------

UPDATE nha_cung_cap
SET
    tong_don_hang =
        GREATEST(
                COALESCE(tong_don_hang, 0) - 1,
                0
        ),

    tong_cong_no =
        GREATEST(
                COALESCE(tong_cong_no, 0)
                    - CASE
                          WHEN OLD.trang_thai = 'COMPLETED'
                              THEN COALESCE(OLD.cong_no, 0)
                          ELSE 0
                    END,
                0
        )

WHERE id = OLD.id_ncc;


-- ---------------------------------------------------------------------
-- 2B. Cộng số liệu sang NCC mới
-- ---------------------------------------------------------------------

UPDATE nha_cung_cap
SET
    tong_don_hang =
        COALESCE(tong_don_hang, 0) + 1,

    tong_cong_no =
        COALESCE(tong_cong_no, 0)
            + CASE
                  WHEN NEW.trang_thai = 'COMPLETED'
                      THEN COALESCE(NEW.cong_no, 0)
                  ELSE 0
            END

WHERE id = NEW.id_ncc;

END IF;


RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 4. Trigger đồng bộ công nợ / thống kê NCC
-- =============================================================================
--
-- AFTER UPDATE để đảm bảo NEW.cong_no đã được tính bởi trigger:
--
--     cong_no = grand_total - da_thanh_toan
--
-- của phieu_nhap.
-- =============================================================================

DROP TRIGGER IF EXISTS phieu_nhap_ncc_sync_cong_no
ON phieu_nhap;

CREATE TRIGGER phieu_nhap_ncc_sync_cong_no
    AFTER UPDATE OF trang_thai, grand_total, da_thanh_toan, id_ncc
    ON phieu_nhap
    FOR EACH ROW
    EXECUTE FUNCTION trg_phieu_nhap_ncc_sync_cong_no();


-- =============================================================================
-- 5. Backfill / đồng bộ lại tong_cong_no
-- =============================================================================
--
-- Không cộng thêm vào số seed cũ.
-- Tính lại hoàn toàn từ phieu_nhap.
-- =============================================================================

UPDATE nha_cung_cap ncc
SET tong_cong_no = COALESCE(
        (
            SELECT SUM(pn.cong_no)
            FROM phieu_nhap pn
            WHERE pn.id_ncc = ncc.id
              AND pn.trang_thai = 'COMPLETED'
        ),
        0
                   );


-- =============================================================================
-- 6. Backfill / đồng bộ lại tong_don_hang
-- =============================================================================
--
-- tong_don_hang = số phiếu nhập đã tạo cho NCC.
-- =============================================================================

UPDATE nha_cung_cap ncc
SET tong_don_hang = (
    SELECT COUNT(*)
    FROM phieu_nhap pn
    WHERE pn.id_ncc = ncc.id
);


-- =============================================================================
-- 7. Index hỗ trợ query công nợ / NCC
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_ncc_status_cong_no
    ON phieu_nhap (
    id_ncc,
    trang_thai,
    cong_no
    );


-- =============================================================================
-- 8. Kiểm tra tính nhất quán công nợ
-- =============================================================================

DO $$
DECLARE
v_invalid INTEGER;
BEGIN

SELECT COUNT(*)
INTO v_invalid
FROM nha_cung_cap ncc
WHERE ncc.tong_cong_no <> COALESCE(
        (
            SELECT SUM(pn.cong_no)
            FROM phieu_nhap pn
            WHERE pn.id_ncc = ncc.id
              AND pn.trang_thai = 'COMPLETED'
        ),
        0
                          );

IF v_invalid > 0 THEN

        RAISE EXCEPTION
            'Đồng bộ công nợ NCC thất bại: còn % NCC không khớp tong_cong_no.',
            v_invalid;

END IF;


-- =============================================================================
-- 9. Kiểm tra tính nhất quán số đơn hàng
-- =============================================================================

SELECT COUNT(*)
INTO v_invalid
FROM nha_cung_cap ncc
WHERE ncc.tong_don_hang <> (
    SELECT COUNT(*)
    FROM phieu_nhap pn
    WHERE pn.id_ncc = ncc.id
);

IF v_invalid > 0 THEN

        RAISE EXCEPTION
            'Đồng bộ đơn hàng NCC thất bại: còn % NCC không khớp tong_don_hang.',
            v_invalid;

END IF;

END $$;


-- =============================================================================
-- 10. COMMENT
-- =============================================================================

COMMENT ON COLUMN nha_cung_cap.tong_cong_no IS
    'Tổng công nợ hiện tại của NCC = SUM(cong_no) các phiếu nhập COMPLETED. '
    'Được đồng bộ tự động bởi trigger phieu_nhap_ncc_after_insert và '
    'phieu_nhap_ncc_sync_cong_no. Không cập nhật trực tiếp từ frontend.';

COMMENT ON COLUMN nha_cung_cap.tong_don_hang IS
    'Tổng số phiếu nhập đã tạo cho NCC. Được đồng bộ tự động bởi trigger '
    'phieu_nhap_ncc_after_insert và phieu_nhap_ncc_sync_cong_no khi đổi NCC. '
    'Không cập nhật trực tiếp từ frontend.';