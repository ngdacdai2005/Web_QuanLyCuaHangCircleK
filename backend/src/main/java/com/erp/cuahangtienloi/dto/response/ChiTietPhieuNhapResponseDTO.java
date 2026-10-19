package com.erp.cuahangtienloi.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ChiTietPhieuNhapResponseDTO {
    private UUID id;
    private UUID idPhieuNhap;
    private UUID idSanPham;
    private Integer soLuongDat;
    private Integer soLuongNhan;
    private BigDecimal donGiaNhap;
    private Integer vatPhantram;
    private BigDecimal thanhTien;
    private LocalDate hanSuDung;
    private Integer thuTu;
    private LocalDateTime ngayTao;
}