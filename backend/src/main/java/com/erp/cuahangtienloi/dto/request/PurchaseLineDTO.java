package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class PurchaseLineDTO {
    @NotNull(message = "Sản phẩm bắt buộc chọn")
    private UUID idSanPham;

    @NotNull(message = "Số lượng bắt buộc nhập")
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    private Integer soLuong;

    @Min(value = 1, message = "Số lượng nhận phải lớn hơn 0")
    private Integer soLuongNhan;

    @NotNull(message = "Đơn giá nhập bắt buộc nhập")
    @DecimalMin(value = "0.01", message = "Đơn giá nhập phải lớn hơn 0")
    private BigDecimal donGiaNhap;

    @Min(value = 0, message = "VAT phải từ 0 đến 100")
    @Max(value = 100, message = "VAT phải từ 0 đến 100")
    private Integer vatPhantram;

    private LocalDate hanSuDung;
}
