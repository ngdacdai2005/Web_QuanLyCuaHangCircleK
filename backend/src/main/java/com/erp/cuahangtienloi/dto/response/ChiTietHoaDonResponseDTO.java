package com.erp.cuahangtienloi.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ChiTietHoaDonResponseDTO {
    private UUID id;
    private UUID idHoaDon;
    private UUID idSanPham;
    private Integer soLuong;
    private BigDecimal donGia;
    private BigDecimal giamGiaDong;
    private Integer vatPhantram;
    private BigDecimal thanhTien;
    private BigDecimal donGiaVon;
    private Integer thuTu;
    private LocalDateTime ngayTao;
}