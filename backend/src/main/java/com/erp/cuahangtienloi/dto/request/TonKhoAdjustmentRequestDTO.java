package com.erp.cuahangtienloi.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record TonKhoAdjustmentRequestDTO(
        UUID idSanPham,
        UUID idChiNhanh,
        Integer soLuong,
        BigDecimal donGia,
        String maChungTu,
        String nguoiThucHien,
        LocalDate hanSuDung,
        String ghiChu,
        LocalDateTime ngayPhatSinh
) {}
