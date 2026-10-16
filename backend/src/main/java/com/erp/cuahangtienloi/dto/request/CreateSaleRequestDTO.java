package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CreateSaleRequestDTO {
    @NotNull(message = "Chi nhánh bắt buộc chọn")
    private UUID idChiNhanh;
    private UUID idThuNgan;
    private String caLamViec;
    private LocalDateTime ngayBan;
    private String hinhThucTt;
    private String sdtThanhVien;
    private BigDecimal subTotal;
    private BigDecimal giamGia;
    private BigDecimal vatTotal;
    private BigDecimal grandTotal;
    private BigDecimal tienKhachDua;
    private BigDecimal tienThoi;

    @NotEmpty(message = "Giỏ hàng không được để trống")
    @Valid
    private List<SaleLineDTO> lines;
}
