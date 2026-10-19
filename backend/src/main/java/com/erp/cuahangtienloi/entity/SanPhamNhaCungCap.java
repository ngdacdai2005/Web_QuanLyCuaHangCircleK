package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "san_pham_nha_cung_cap", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"id_san_pham", "id_nha_cung_cap"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SanPhamNhaCungCap {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_san_pham", nullable = false)
    private UUID idSanPham;

    @Column(name = "id_nha_cung_cap", nullable = false)
    private UUID idNhaCungCap;

    @Column(name = "ma_san_pham_ncc", length = 100)
    private String maSanPhamNcc;

    @Column(name = "gia_nhap", precision = 15, scale = 2, nullable = false)
    private BigDecimal giaNhap;

    @Builder.Default
    @Column(name = "la_ncc_chinh", nullable = false)
    private Boolean laNccChinh = false;

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
        if (this.giaNhap == null) this.giaNhap = BigDecimal.ZERO;
        if (this.laNccChinh == null) this.laNccChinh = false;
    }

    @PreUpdate
    public void preUpdate() {
        this.ngayCapNhat = LocalDateTime.now();
    }
}
