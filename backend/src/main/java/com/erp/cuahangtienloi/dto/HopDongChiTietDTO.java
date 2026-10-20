package com.erp.cuahangtienloi.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HopDongChiTietDTO {
    private UUID id;
    private UUID idHopDong;

    @NotNull(message = "Chưa chọn sản phẩm")
    private UUID idSanPham;

    private String tenSanPham;
    private String sku;
    private String donVi;

    @NotNull(message = "Đơn giá cam kết không được để trống")
    @DecimalMin(value = "0.0", inclusive = true, message = "Đơn giá không được âm")
    private BigDecimal donGiaCamKet;

    private Integer soLuongCamKet;
    private Integer soLuongDaNhap;
    private Integer vatPhantram;
    private LocalDate ngayHieuLucTu;
    private LocalDate ngayHetHan;
    private String ghiChu;
}
