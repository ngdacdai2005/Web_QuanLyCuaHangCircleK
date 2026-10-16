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
public class CheckoutLineDTO {
    @NotNull(message = "Sản phẩm bắt buộc chọn")
    private UUID idSanPham;

    @NotNull(message = "Số lượng bắt buộc nhập")
    @Min(1)
    private Integer soLuong;

    @DecimalMin(value = "0", message = "Giảm giá không được âm")
    private BigDecimal giamGiaDong;
}
