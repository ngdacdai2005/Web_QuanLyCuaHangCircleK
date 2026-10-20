package com.erp.cuahangtienloi.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PhieuNhapResponseDTO {
    private UUID id;
    private String maPhieu;

    private UUID idChiNhanh;
    private String tenChiNhanh;

    private UUID idNcc;
    private String tenNcc;

    private UUID idHopDong;
    private String maHopDong;
    private String tenHopDong;

    private UUID idNguoiNhap;
    private String tenNguoiNhap;

    private LocalDate ngayDatHang;
    private LocalDate ngayDuKienGiao;
    private LocalDate ngayNhanThucTe;

    private BigDecimal subTotal;
    private BigDecimal vatTotal;
    private BigDecimal giamGia;
    private BigDecimal grandTotal;
    private BigDecimal giaTriDuKien;

    private BigDecimal daThanhToan;
    private BigDecimal congNo;

    private String trangThai;

    private UUID idNguoiDuyet;
    private LocalDateTime ngayDuyet;
    private String lyDoTuChoi;

    private UUID idNguoiKiemNhan;
    private LocalDateTime ngayKiemNhan;

    private String lyDoChenhLech;
    private String ghiChu;
}