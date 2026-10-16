package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateStocktakeLineDTO {
    @NotNull(message = "Sản phẩm kiểm kê bắt buộc chọn")
    private UUID idSanPham;

    @NotNull(message = "Tồn thực tế bắt buộc nhập")
    @Min(value = 0, message = "Tồn thực tế phải lớn hơn hoặc bằng 0")
    private Integer tonThucTe;

    private String lyDoLech;
}
