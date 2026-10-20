package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CreatePurchaseRequestDTO {
    private UUID idChiNhanh;

    @NotNull(message = "Nhà cung cấp bắt buộc chọn")
    private UUID idNcc;

    private UUID idHopDong;

    private LocalDate ngayDatHang;
    private LocalDate ngayDuKienGiao;
    private LocalDate ngayNhanThucTe;
    private BigDecimal giamGia;
    private BigDecimal daThanhToan;
    private String trangThai;
    private String ghiChu;

    @NotEmpty(message = "Phiếu nhập phải có ít nhất một dòng hàng")
    @Valid
    private List<PurchaseLineDTO> lines;
}
