package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class SaleLineDTO {
    @NotNull(message = "Sản phẩm bắt buộc chọn")
    private UUID idSanPham;

    @NotNull(message = "Số lượng bắt buộc nhập")
    @Min(value = 1, message = "Số lượng bán phải lớn hơn 0")
    private Integer soLuong;

    @NotNull(message = "Đơn giá bắt buộc nhập")
    @DecimalMin(value = "0", message = "Đơn giá phải lớn hơn hoặc bằng 0")
    private BigDecimal donGia;

    private BigDecimal giamGiaDong;
    private Integer vatPhantram;
    private BigDecimal thanhTien;
    private BigDecimal donGiaVon;
}
