package com.erp.cuahangtienloi.dto.response;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NhanVienResponseDTO {
    private UUID id;
    private String maNhanVien;
    private String tenDangNhap;
    private String hoTen;
    private String email;
    private String soDienThoai;
    private String vaiTro;
    private String viTri;
    private String loaiHopDong;
    private String caMacDinh;
    private Integer luongTheoGio;
    private Integer luongCung;
    private String soTaiKhoan;
    private String tenNganHang;
    private LocalDate ngayVaoLam;
    private UUID idChiNhanh;
    private Boolean dangHoatDong;
    private String trangThai;
    private LocalDateTime ngayTao;
    private String nguoiTao;
    private LocalDateTime ngayCapNhat;
    private String nguoiCapNhat;

    // Extended personal fields
    private String anhDaiDien;
    private String gioiTinh;
    private LocalDate ngaySinh;
    private String soCccd;
    private LocalDate ngayCapCccd;
    private String noiCapCccd;
    private String diaChiThuongTru;
    private String diaChiHienTai;
    private String ghiChu;

    // Account link info
    private Boolean hasTaiKhoan;
    private String taiKhoanTrangThai;
}