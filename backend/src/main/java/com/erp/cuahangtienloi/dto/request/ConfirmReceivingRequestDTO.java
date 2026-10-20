package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class ConfirmReceivingRequestDTO {

    @PositiveOrZero(message = "Giảm giá không được âm")
    private BigDecimal giamGia;

    private String lyDoChenhLech;

    @NotEmpty(message = "Phiếu nhập phải có ít nhất một dòng kiểm nhận")
    @Valid
    private List<ReceivingLineDTO> lines;

    @Getter
    @Setter
    public static class ReceivingLineDTO {
        @NotNull
        private UUID idChiTiet;

        @NotNull
        @Min(0)
        private Integer soLuongNhan;

        @NotNull
        @Min(0)
        private Integer soLuongThua;

        @NotBlank
        private String xuLyThua; // NHAP_KHO, TRA_LAI_NCC, CHUA_XU_LY

        private String lyDoChenhLechDong;
    }
}
