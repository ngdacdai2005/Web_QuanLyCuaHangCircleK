package com.erp.cuahangtienloi.dto.request;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class NhanVienRequestDTO {
    private String maNhanVien;
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
    private String trangThai;
    private String nguoiTao;
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

    // Account creation fields
    private Boolean taoTaiKhoan;
    private String tenDangNhap;
    private String matKhau;
}