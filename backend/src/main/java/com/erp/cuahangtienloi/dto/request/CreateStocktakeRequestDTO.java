package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CreateStocktakeRequestDTO {
    @NotNull(message = "Chi nhánh bắt buộc chọn")
    private UUID idChiNhanh;

    private LocalDate ngayKiemKe;
    private String ghiChu;

    @NotEmpty(message = "Phiếu kiểm kê phải có ít nhất một sản phẩm")
    @Valid
    private List<CreateStocktakeLineDTO> lines;
}
