package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class SoQuyRequestDTO {
    private String maChungTu;
    private String maChungTuLienQuan;
    private UUID idChiNhanh;
    private UUID idNguoiTao;
    private String direction;
    private String hangMuc;
    private String hinhThucTt;
    private LocalDate entryDate;
    private BigDecimal soTien;
    private String doiTuong;
    private String dienGiai;
    private BigDecimal runningBalance;
    private String trangThai;
}
