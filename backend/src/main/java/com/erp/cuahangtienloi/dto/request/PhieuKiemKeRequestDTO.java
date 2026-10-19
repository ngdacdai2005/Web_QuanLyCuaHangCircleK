package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class PhieuKiemKeRequestDTO {
    private String maPhieu;
    private UUID idChiNhanh;
    private LocalDate ngayKiemKe;
    private Integer tongSoMatHang;
    private Integer tongLechTang;
    private Integer tongLechGiam;
    private BigDecimal giaTriLech;
    private String trangThai;
    private String ghiChu;
}
