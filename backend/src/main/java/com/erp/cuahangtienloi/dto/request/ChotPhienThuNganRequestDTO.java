package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
public class ChotPhienThuNganRequestDTO {
    @NotNull(message = "Số tiền thực đếm cuối ca không được để trống")
    private BigDecimal tienThucDemCuoiCa;

    private String lyDoChenhLech;

    // Bảng kê chi tiết mệnh giá khi kết ca
    private Map<String, Integer> bangKeDongCa;
}
