package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class PhieuNhapRequestDTO {
    private String maPhieu;
    private UUID idChiNhanh;
    private UUID idNcc;
    private LocalDate ngayDatHang;
    private LocalDate ngayDuKienGiao;
    private LocalDate ngayNhanThucTe;
    private BigDecimal subTotal;
    private BigDecimal vatTotal;
    private BigDecimal giamGia;
    private BigDecimal grandTotal;
    private BigDecimal daThanhToan;
    private BigDecimal congNo;
    private String trangThai;
    private String ghiChu;
}
