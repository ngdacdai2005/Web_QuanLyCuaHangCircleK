package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CheckoutRequestDTO {
    private String clientRequestId;

    @NotNull(message = "Chi nhánh bắt buộc chọn")
    private UUID idChiNhanh;

    private String caLamViec;
    private String hinhThucTt;
    private String sdtThanhVien;

    @DecimalMin(value = "0", message = "Giảm giá không được âm")
    private BigDecimal giamGia;

    private BigDecimal tienKhachDua;

    private UUID idPhienThuNgan;

    @NotEmpty(message = "Giỏ hàng không được để trống")
    @Valid
    private List<CheckoutLineDTO> lines;
}
