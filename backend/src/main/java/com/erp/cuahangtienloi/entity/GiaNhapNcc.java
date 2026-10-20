package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "gia_nhap_ncc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GiaNhapNcc {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_san_pham", nullable = false)
    private UUID idSanPham;

    @Column(name = "id_nha_cung_cap", nullable = false)
    private UUID idNhaCungCap;

    @Column(name = "id_hop_dong_chi_tiet")
    private UUID idHopDongChiTiet;

    @Column(name = "gia_nhap", precision = 15, scale = 2, nullable = false)
    private BigDecimal giaNhap;

    @Column(name = "ngay_hieu_luc_tu", nullable = false)
    private LocalDate ngayHieuLucTu;

    @Column(name = "ngay_hieu_luc_den")
    private LocalDate ngayHieuLucDen;

    @Builder.Default
    @Column(name = "dang_ap_dung", nullable = false)
    private Boolean dangApDung = true;

    @Column(columnDefinition = "TEXT")
    private String ghiChu;

    @Column(name = "nguoi_tao")
    private UUID nguoiTao;

    @Builder.Default
    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao = LocalDateTime.now();

    @Builder.Default
    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (this.ngayTao == null) this.ngayTao = LocalDateTime.now();
        if (this.ngayCapNhat == null) this.ngayCapNhat = LocalDateTime.now();
        if (this.ngayHieuLucTu == null) this.ngayHieuLucTu = LocalDate.now();
        if (this.dangApDung == null) this.dangApDung = true;
        if (this.giaNhap == null) this.giaNhap = BigDecimal.ZERO;
    }

    @PreUpdate
    public void preUpdate() {
        this.ngayCapNhat = LocalDateTime.now();
    }
}
