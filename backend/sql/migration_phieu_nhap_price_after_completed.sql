-- =============================================================================
-- MIGRATION: Cho phép sửa ĐƠN GIÁ dòng phiếu nhập đã COMPLETED
--
-- Bối cảnh:
-- - Approval workflow trước đây khóa 100% INSERT/UPDATE/DELETE trên
--   chi_tiet_phieu_nhap khi header = COMPLETED.
-- - Sau khi COMPLETED, nghiệp vụ vẫn cho phép ADMIN/KE_TOAN điều chỉnh
--   đơn giá để xử lý chênh lệch tài chính với NCC.
--
-- Quy tắc:
--   INSERT : CẤM
--   DELETE : CẤM
--   UPDATE : chỉ được thay đổi:
--            - don_gia_nhap
--            - don_gia_nhap_cu
--            - ly_do_chenh_lech_dong
--            - thanh_tien
--
-- thanh_tien được allowlist vì trigger
-- chi_tiet_phieu_nhap_tinh_tien chạy trước trigger này theo thứ tự tên
-- trigger và tự tính lại:
--
--     thanh_tien = so_luong_nhan * don_gia_nhap
--
-- Các dữ liệu nghiệp vụ khác vẫn bị khóa:
--   id
--   id_phieu_nhap
--   id_san_pham
--   so_luong_dat
--   so_luong_nhan
--   so_luong_thua
--   xu_ly_thua
--   vat_phantram
--   han_su_dung
--   thu_tu
--   ngay_tao
--
-- Sửa giá sau COMPLETED:
--   - Chỉ điều chỉnh tài chính/công nợ NCC.
--   - KHÔNG định giá lại ton_kho.gia_von.
--   - KHÔNG định giá lại lo_hang.gia_von.
--   - grand_total/cong_no/nha_cung_cap.tong_cong_no được đồng bộ qua trigger.
--
-- Service phải kiểm tra:
--   grand_total_moi >= da_thanh_toan
--
-- Nếu giá mới làm tổng phải trả nhỏ hơn số tiền đã thanh toán thì phải
-- trả lỗi 400 trước khi UPDATE.
-- =============================================================================


-- =============================================================================
-- 0. Tripwire chống workflow legacy PENDING_PAYMENT
-- =============================================================================

DO $$
DECLARE
v_def TEXT;
BEGIN
SELECT pg_get_constraintdef(oid)
INTO v_def
FROM pg_constraint
WHERE conname = 'phieu_nhap_trang_thai_check'
  AND conrelid = 'phieu_nhap'::regclass;

IF v_def IS NOT NULL
       AND v_def LIKE '%PENDING_PAYMENT%' THEN

        RAISE EXCEPTION
            'phieu_nhap_trang_thai_check đang ở trạng thái LEGACY '
            '(có PENDING_PAYMENT). Workflow 6 trạng thái đã thay thế nó. '
            'Kiểm tra lại thứ tự file trong seed_database.js.';
END IF;
END $$;


-- =============================================================================
-- 1. Function khóa chi tiết sau COMPLETED
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_khoa_chi_tiet_phieu_nhap_sau_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
v_id_phieu_nhap UUID;
    v_trang_thai    VARCHAR(30);
BEGIN

    -- Với DELETE phải kiểm tra header cũ.
    IF TG_OP = 'DELETE' THEN
        v_id_phieu_nhap := OLD.id_phieu_nhap;
ELSE
        v_id_phieu_nhap := NEW.id_phieu_nhap;
END IF;

SELECT trang_thai
INTO v_trang_thai
FROM phieu_nhap
WHERE id = v_id_phieu_nhap;


-- =========================================================================
-- Header COMPLETED
-- =========================================================================

IF v_trang_thai = 'COMPLETED' THEN

        -- INSERT / DELETE: cấm tuyệt đối.
        IF TG_OP <> 'UPDATE' THEN
            RAISE EXCEPTION
                'Không thể % chi tiết phiếu nhập đã COMPLETED. '
                'Chỉ được điều chỉnh đơn giá.',
                TG_OP
                USING ERRCODE = 'check_violation';
END IF;


        -- UPDATE:
        -- Chỉ cho phép thay đổi allowlist.
        --
        -- to_jsonb(record) - text[] loại bỏ các cột được phép thay đổi.
        -- Nếu phần còn lại khác OLD => có cột bị khóa đã thay đổi.
        --
        -- thanh_tien phải được loại khỏi phép so sánh vì trigger
        -- chi_tiet_phieu_nhap_tinh_tien đã tính lại NEW.thanh_tien trước
        -- khi trigger khóa này chạy.

        IF (
            to_jsonb(NEW) - ARRAY[
                'don_gia_nhap',
                'don_gia_nhap_cu',
                'ly_do_chenh_lech_dong',
                'thanh_tien'
            ]
        ) IS DISTINCT FROM (
            to_jsonb(OLD) - ARRAY[
                'don_gia_nhap',
                'don_gia_nhap_cu',
                'ly_do_chenh_lech_dong',
                'thanh_tien'
            ]
        ) THEN

            RAISE EXCEPTION
                'Phiếu nhập đã COMPLETED: chỉ được sửa đơn giá và '
                'lý do chênh lệch. Không được sửa số lượng, hàng dư, '
                'VAT, HSD, sản phẩm hoặc chuyển dòng sang phiếu khác.'
                USING ERRCODE = 'check_violation';
END IF;


        -- Không cho chuyển dòng ra khỏi phiếu COMPLETED.
        IF OLD.id_phieu_nhap IS DISTINCT FROM NEW.id_phieu_nhap THEN
            RAISE EXCEPTION
                'Không thể di chuyển chi tiết khỏi phiếu nhập đã COMPLETED'
                USING ERRCODE = 'check_violation';
END IF;

RETURN NEW;
END IF;


    -- =========================================================================
    -- Header không phải COMPLETED
    --
    -- Vẫn phải bảo vệ trường hợp UPDATE lấy một dòng ra khỏi phiếu
    -- COMPLETED rồi chuyển sang phiếu khác.
    -- =========================================================================

    IF TG_OP = 'UPDATE'
       AND OLD.id_phieu_nhap IS DISTINCT FROM NEW.id_phieu_nhap THEN

SELECT trang_thai
INTO v_trang_thai
FROM phieu_nhap
WHERE id = OLD.id_phieu_nhap;

IF v_trang_thai = 'COMPLETED' THEN
            RAISE EXCEPTION
                'Không thể di chuyển chi tiết khỏi phiếu nhập đã COMPLETED'
                USING ERRCODE = 'check_violation';
END IF;

END IF;


RETURN COALESCE(NEW, OLD);
END;
$$;


-- =============================================================================
-- 2. Recreate trigger
-- =============================================================================

DROP TRIGGER IF EXISTS trg_chi_tiet_phieu_nhap_khoa_sau_completed
    ON chi_tiet_phieu_nhap;

CREATE TRIGGER trg_chi_tiet_phieu_nhap_khoa_sau_completed
    BEFORE INSERT OR UPDATE OR DELETE
                     ON chi_tiet_phieu_nhap
                         FOR EACH ROW
                         EXECUTE FUNCTION fn_khoa_chi_tiet_phieu_nhap_sau_completed();


-- =============================================================================
-- 3. Documentation
-- =============================================================================

COMMENT ON FUNCTION fn_khoa_chi_tiet_phieu_nhap_sau_completed() IS
    'Khoá chi tiết phiếu nhập đã COMPLETED. INSERT/DELETE bị cấm tuyệt đối. '
    'UPDATE chỉ được đổi don_gia_nhap, don_gia_nhap_cu và '
    'ly_do_chenh_lech_dong; thanh_tien được trigger tinh_tien tính lại. '
    'Sửa giá sau COMPLETED chỉ điều chỉnh tài chính/công nợ NCC, '
    'không định giá lại ton_kho.gia_von hoặc lo_hang.gia_von.';