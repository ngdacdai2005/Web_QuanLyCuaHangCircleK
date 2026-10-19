package com.erp.cuahangtienloi.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ChiNhanhRequestDTO {
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
    private UUID idQuanLy;        // giữ để phát hiện client gửi (create/update đều chặn)
    private Boolean dangHoatDong;
    private String nguoiTao;
    private String nguoiCapNhat;
}