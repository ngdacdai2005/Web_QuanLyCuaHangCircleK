package com.erp.cuahangtienloi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceResolutionDTO {
    private UUID idSanPham;
    private UUID idNcc;
    private UUID idHopDong;
    private BigDecimal donGiaDeXuat;
    private Integer vatPhantram;
    private String nguonGia;
    private String maHopDong;
    private String tenHopDong;
    private String ghiChu;
}
