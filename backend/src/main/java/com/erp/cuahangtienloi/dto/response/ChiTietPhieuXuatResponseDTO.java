package com.erp.cuahangtienloi.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ChiTietPhieuXuatResponseDTO {
    private UUID id;
    private UUID idPhieuXuat;
    private UUID idSanPham;
    private Integer soLuongYeuCau;
    private Integer soLuongXuat;
    private Integer soLuongNhan;
    private BigDecimal donGiaVon;
    private BigDecimal thanhTien;
    private LocalDate hanSuDung;
    private Integer thuTu;
    private LocalDateTime ngayTao;
}