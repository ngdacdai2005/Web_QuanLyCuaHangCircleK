package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class MoPhienThuNganRequestDTO {
    @NotNull(message = "Chi nhánh không được để trống")
    private UUID idChiNhanh;

    private String quaySo = "Quầy 1";

    // Số tiền dự kiến bàn giao từ ca trước (nếu có)
    private BigDecimal quyDauCaDuKien = BigDecimal.ZERO;

    // Số tiền thực đếm khi nhận ca
    @NotNull(message = "Số tiền thực tế đầu ca không được để trống")
    private BigDecimal quyDauCaThucTe;

    // Người giao ca trước (nếu có)
    private UUID idNguoiGiaoDauCa;

    private String ghiChuMoCa;

    // Bảng kê chi tiết mệnh giá (vd: {"500000": 2, "200000": 5, ...})
    private Map<String, Integer> bangKeMoCa;
}
