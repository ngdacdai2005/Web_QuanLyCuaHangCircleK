package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hop_dong_chi_tiet", uniqueConstraints = {
    @UniqueConstraint(name = "uq_hop_dong_san_pham", columnNames = {"id_hop_dong", "id_san_pham"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HopDongChiTiet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_hop_dong", nullable = false)
    private UUID idHopDong;

    @Column(name = "id_san_pham", nullable = false)
    private UUID idSanPham;

    @Column(name = "don_gia_cam_ket", precision = 15, scale = 2, nullable = false)
    private BigDecimal donGiaCamKet;

    @Builder.Default
    @Column(name = "so_luong_cam_ket", nullable = false)
    private Integer soLuongCamKet = 0;

    @Builder.Default
    @Column(name = "so_luong_da_nhap", nullable = false)
    private Integer soLuongDaNhap = 0;

    @Builder.Default
    @Column(name = "vat_phantram", nullable = false)
    private Integer vatPhantram = 8;

    @Column(name = "ngay_hieu_luc_tu")
    private LocalDate ngayHieuLucTu;

    @Column(name = "ngay_hieu_luc_den")
    private LocalDate ngayHetHan;

    @Column(columnDefinition = "TEXT")
    private String ghiChu;

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
        if (this.soLuongCamKet == null) this.soLuongCamKet = 0;
        if (this.soLuongDaNhap == null) this.soLuongDaNhap = 0;
        if (this.vatPhantram == null) this.vatPhantram = 8;
        if (this.donGiaCamKet == null) this.donGiaCamKet = BigDecimal.ZERO;
    }

    @PreUpdate
    public void preUpdate() {
        this.ngayCapNhat = LocalDateTime.now();
    }
}
