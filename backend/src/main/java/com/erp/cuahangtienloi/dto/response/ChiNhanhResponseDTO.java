package com.erp.cuahangtienloi.dto.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ChiNhanhResponseDTO {
    private UUID id;
    private String maChiNhanh;
    private String tenChiNhanh;
    private String diaChi;
    private String diaChiChiTiet;
    private String tinhThanh;
    private String quanHuyen;
    private String vungMien;
    private String soDienThoai;
    private String gioMoCua;
    private BigDecimal dienTichM2;
    private Long doanhThuThang;
    private LocalDate ngayKhaiTruong;
    private String loai;
    private String loaiChiNhanh;
    private UUID idQuanLy;
    private Boolean dangHoatDong;
    private String trangThai;
    private String tenQuanLy;
    private LocalDateTime ngayTao;
    private String nguoiTao;
    private LocalDateTime ngayCapNhat;
    private String nguoiCapNhat;
}