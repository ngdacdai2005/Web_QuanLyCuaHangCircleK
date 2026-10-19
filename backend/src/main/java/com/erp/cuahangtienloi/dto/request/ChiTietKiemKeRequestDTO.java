package com.erp.cuahangtienloi.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ChiTietKiemKeRequestDTO {
    private UUID idPhieuKiemKe;
    private UUID idSanPham;
    private Integer tonHeThong;
    private Integer tonThucTe;
    private Integer soLuongLech;
    private String lyDoLech;
    private BigDecimal donGiaVon;
    private BigDecimal giaTriLech;
}