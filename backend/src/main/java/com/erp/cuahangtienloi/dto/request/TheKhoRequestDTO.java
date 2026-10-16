package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class TheKhoRequestDTO {
    private UUID idSanPham;
    private UUID idChiNhanh;
    private String loaiGiaoDich;
    private String maChungTu;
    private LocalDateTime ngayPhatSinh;
    private Integer soLuongThayDoi;
    private Integer soLuongTonMoi;
    private BigDecimal donGia;
    private String nguoiThucHien;
    private String ghiChu;
}
