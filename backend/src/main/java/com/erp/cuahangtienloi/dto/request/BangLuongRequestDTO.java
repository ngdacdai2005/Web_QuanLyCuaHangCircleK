package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class BangLuongRequestDTO {
    private UUID idNhanVien;
    private UUID idChiNhanh;
    private String loaiHopDong;
    private String thangNam;
    private BigDecimal tongGioLam;
    private BigDecimal overtimeHours;
    private Integer tongSoCa;
    private BigDecimal luongTheoGio;
    private BigDecimal luongCung;
    private BigDecimal luongCungThucTe;
    private BigDecimal tienCongTheoGio;
    private BigDecimal tienOt;
    private BigDecimal thuong;
    private BigDecimal khauTru;
    private BigDecimal tongTienLuong;
    private String trangThai;
    private String ghiChu;
}
