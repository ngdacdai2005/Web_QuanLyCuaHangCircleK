package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class GiaoDichQuyCaRequestDTO {
    @NotNull(message = "ID phiên thu ngân không được để trống")
    private UUID idPhienThuNgan;

    @NotBlank(message = "Loại giao dịch không được để trống (NOP_KET, THU_BO_SUNG, CHI_TAM_UNG)")
    private String loaiGiaoDich;

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền phải lớn hơn 0")
    private BigDecimal soTien;

    private UUID idNguoiXacNhan;

    private String lyDo;
}
