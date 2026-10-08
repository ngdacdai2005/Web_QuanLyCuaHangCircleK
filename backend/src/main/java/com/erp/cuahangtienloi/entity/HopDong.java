package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hop_dong")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HopDong {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_hop_dong", unique = true)
    private String maHopDong;

    @Column(name = "ten_hop_dong")
    private String tenHopDong;

    @Column(name = "loai_hop_dong")
    private String loaiHopDong;

    @Column(name = "id_ncc")
    private UUID idNcc;

    @Column(name = "ngay_ky")
    private LocalDate ngayKy;

    @Column(name = "ngay_hieu_luc")
    private LocalDate ngayHieuLuc;

    @Column(name = "ngay_het_han")
    private LocalDate ngayHetHan;

    @Column(name = "gia_tri_hop_dong")
    private BigDecimal giaTriHopDong;

    @Column(columnDefinition = "TEXT")
    private String dieuKhoanThanhToan;

    @Column(name = "so_ngay_duoc_no")
    private Integer soNgayDuocNo;

    @Column(columnDefinition = "TEXT")
    private String noiDung;

    @Column(name = "file_ten_goc")
    private String fileTenGoc;

    @Column(name = "file_duong_dan")
    private String fileDuongDan;

    @Column(name = "file_loai")
    private String fileLoai;

    @Column(name = "file_kich_thuoc")
    private Long fileKichThuoc;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "ly_do_tu_choi", columnDefinition = "TEXT")
    private String lyDoTuChoi;

    @Column(name = "id_nguoi_duyet")
    private UUID idNguoiDuyet;

    @Column(name = "ngay_duyet")
    private LocalDateTime ngayDuyet;

    @Column(name = "so_lan_trinh")
    private Integer soLanTrinh;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;

    @Column(name = "nguoi_tao")
    private UUID nguoiTao;

    @Column(name = "nguoi_cap_nhat")
    private UUID nguoiCapNhat;
}