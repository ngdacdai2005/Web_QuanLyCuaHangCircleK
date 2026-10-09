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
}