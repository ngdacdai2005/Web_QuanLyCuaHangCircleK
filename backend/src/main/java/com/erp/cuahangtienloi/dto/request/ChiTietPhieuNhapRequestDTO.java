package com.erp.cuahangtienloi.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ChiTietPhieuNhapRequestDTO {
    private UUID idPhieuNhap;
    private UUID idSanPham;
    private Integer soLuongDat;
    private Integer soLuongNhan;
    private BigDecimal donGiaNhap;
    private Integer vatPhantram;
    private BigDecimal thanhTien;
    private LocalDate hanSuDung;
    private Integer thuTu;
}