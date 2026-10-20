package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ChangePriceRequestDTO {

    @NotNull(message = "Đơn giá mới bắt buộc nhập")
    @DecimalMin(value = "0.01", message = "Đơn giá mới phải lớn hơn 0")
    private BigDecimal donGiaNhapMoi;

    @NotBlank(message = "Lý do thay đổi giá bắt buộc nhập")
    private String lyDo;
}
