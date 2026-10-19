package com.erp.cuahangtienloi.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ChiTietHoaDonRequestDTO {
    private UUID idHoaDon;
    private UUID idSanPham;
    private Integer soLuong;
    private BigDecimal donGia;
    private BigDecimal giamGiaDong;
    private Integer vatPhantram;
    private BigDecimal thanhTien;
    private BigDecimal donGiaVon;
    private Integer thuTu;
}