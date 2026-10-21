package com.erp.cuahangtienloi.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class DonNghiPhepResponseDTO {
    private UUID id;
    private UUID idNhanVien;
    private String tenNhanVien;
    private String maNhanVien;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private String loaiNghi; // ANNUAL, UNPAID, SICK, PERSONAL
    private LocalDate tuNgay;
    private LocalDate denNgay;
    private BigDecimal soNgayNghi;
    private String lyDo;
    private String trangThai; // PENDING, APPROVED, REJECTED
    private UUID idNguoiDuyet;
    private String tenNguoiDuyet;
    private String lyDoTuChoi;
    private LocalDateTime ngayTao;
    private LocalDateTime ngayDuyet;
}
