package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class BanGiaoPhienThuNganRequestDTO {
    @NotNull(message = "Người nhận bàn giao không được để trống")
    private UUID idNguoiNhanBanGiao;

    // Số tiền bàn giao thực tế sang cho ca sau
    private BigDecimal soTienBanGiao;

    private String ghiChuBanGiao;
}
