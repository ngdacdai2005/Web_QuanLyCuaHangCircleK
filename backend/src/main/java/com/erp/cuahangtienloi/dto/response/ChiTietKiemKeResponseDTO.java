package com.erp.cuahangtienloi.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ChiTietKiemKeResponseDTO {
    private UUID id;
    private UUID idPhieuKiemKe;
    private UUID idSanPham;
    private Integer tonHeThong;
    private Integer tonThucTe;
    private Integer soLuongLech;
    private String lyDoLech;
    private BigDecimal donGiaVon;
    private BigDecimal giaTriLech;
    private LocalDateTime ngayTao;
}