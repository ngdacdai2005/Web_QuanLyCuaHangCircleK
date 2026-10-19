package com.erp.cuahangtienloi.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ChiTietPhieuXuatRequestDTO {
    private UUID idPhieuXuat;
    private UUID idSanPham;
    private Integer soLuongYeuCau;
    private Integer soLuongXuat;
    private Integer soLuongNhan;
    private BigDecimal donGiaVon;
    private BigDecimal thanhTien;
    private LocalDate hanSuDung;
    private Integer thuTu;
}