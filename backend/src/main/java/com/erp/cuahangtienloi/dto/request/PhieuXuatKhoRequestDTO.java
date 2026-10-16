package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class PhieuXuatKhoRequestDTO {
    private String maPhieu;
    private UUID idChiNhanhXuat;
    private UUID idChiNhanhNhan;
    private String loaiXuat;
    private LocalDate ngayXuat;
    private LocalDate ngayYeuCau;
    private BigDecimal tongTien;
    private String trangThai;
    private String ghiChu;
}
