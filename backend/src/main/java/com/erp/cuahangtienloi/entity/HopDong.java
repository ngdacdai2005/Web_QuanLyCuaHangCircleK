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

    @Column(name = "han_muc_hop_dong")
    private BigDecimal hanMucHopDong;

    @Column(name = "gia_tri_da_su_dung")
    private BigDecimal giaTriDaSuDung;

    @Column(columnDefinition = "TEXT")
    private String dieuKhoanThanhToan;

    @Column(name = "so_ngay_duoc_no")
    private Integer soNgayDuocNo;

    @Column(columnDefinition = "TEXT")
    private String noiDung;

    @Column(name = "so_hop_dong_doi_tac")
    private String soHopDongDoiTac;

    @Column(name = "nguoi_dai_dien_ncc")
    private String nguoiDaiDienNcc;

    @Column(name = "chuc_vu_ncc")
    private String chucVuNcc;

    @Column(name = "nguoi_dai_dien_ben_mua")
    private String nguoiDaiDienBenMua;

    @Column(name = "dia_diem_giao_hang")
    private String diaDiemGiaoHang;

    @Column(name = "thoi_gian_giao_hang")
    private String thoiGianGiaoHang;

    @Column(name = "chiet_khau_phantram")
    private BigDecimal chietKhauPhantram;

    @Column(name = "chinh_sach_doi_tra", columnDefinition = "TEXT")
    private String chinhSachDoiTra;

    @Column(name = "tu_dong_gia_han")
    private Boolean tuDongGiaHan;

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