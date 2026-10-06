-- =============================================================================
-- Migration: Sinh mã lô hàng bằng SEQUENCE + TRIGGER
-- Mục đích:
--   - Loại bỏ rủi ro trùng ma_lo do Math.random()
--   - Đảm bảo mã lô tự sinh là duy nhất trên toàn hệ thống
--   - Vẫn cho phép backend/người dùng truyền ma_lo thủ công
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_lo_hang_ma
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO CYCLE;


CREATE OR REPLACE FUNCTION trg_fn_lo_hang_sinh_ma()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
v_next BIGINT;
BEGIN
    -- Nếu backend/người dùng đã truyền mã lô thì giữ nguyên.
    IF NEW.ma_lo IS NULL OR BTRIM(NEW.ma_lo) = '' THEN

        v_next := nextval('seq_lo_hang_ma');

        NEW.ma_lo :=
            'LOT-'
            || TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
            || '-'
            || LPAD(v_next::TEXT, 4, '0');

ELSE
        -- Chuẩn hóa khoảng trắng với mã lô do người dùng truyền vào.
        NEW.ma_lo := BTRIM(NEW.ma_lo);
END IF;

RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_lo_hang_sinh_ma ON lo_hang;

CREATE TRIGGER trg_lo_hang_sinh_ma
    BEFORE INSERT ON lo_hang
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_lo_hang_sinh_ma();