package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "phien_thu_ngan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhienThuNgan {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_phien", unique = true, nullable = false)
    private String maPhien;

    @Column(name = "id_chi_nhanh", nullable = false)
    private UUID idChiNhanh;

    @Column(name = "id_thu_ngan", nullable = false)
    private UUID idThuNgan;

    @Column(name = "quay_so")
    private String quaySo;

    @Column(name = "gio_mo_ca", nullable = false)
    private LocalDateTime gioMoCa;

    @Column(name = "gio_dong_ca")
    private LocalDateTime gioDongCa;

    // Quỹ đầu ca
    @Column(name = "quy_dau_ca_du_kien")
    private BigDecimal quyDauCaDuKien;

    @Column(name = "quy_dau_ca_thuc_te")
    private BigDecimal quyDauCaThucTe;

    @Column(name = "lech_dau_ca")
    private BigDecimal lechDauCa;

    @Column(name = "id_nguoi_giao_dau_ca")
    private UUID idNguoiGiaoDauCa;

    @Column(name = "ghi_chu_mo_ca", columnDefinition = "TEXT")
    private String ghiChuMoCa;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "bang_ke_mo_ca", columnDefinition = "jsonb")
    private Map<String, Integer> bangKeMoCa;

    // Chốt ca & đối soát
    @Column(name = "tien_du_kien_cuoi_ca")
    private BigDecimal tienDuKienCuoiCa;

    @Column(name = "tien_thuc_dem_cuoi_ca")
    private BigDecimal tienThucDemCuoiCa;

    @Column(name = "lech_cuoi_ca")
    private BigDecimal lechCuoiCa;

    @Column(name = "ly_do_chenh_lech", columnDefinition = "TEXT")
    private String lyDoChenhLech;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "bang_ke_dong_ca", columnDefinition = "jsonb")
    private Map<String, Integer> bangKeDongCa;

    // Bàn giao ca
    @Column(name = "id_nguoi_nhan_ban_giao")
    private UUID idNguoiNhanBanGiao;

    @Column(name = "xac_nhan_ban_giao")
    private Boolean xacNhanBanGiao;

    @Column(name = "thoi_gian_ban_giao")
    private LocalDateTime thoiGianBanGiao;

    @Column(name = "ghi_chu_ban_giao", columnDefinition = "TEXT")
    private String ghiChuBanGiao;

    @Column(name = "trang_thai", nullable = false)
    private String trangThai; // DANG_MO, CHO_BAN_GIAO, DA_BAN_GIAO, DA_DONG

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;

    @PrePersist
    public void prePersist() {
        if (this.ngayTao == null) {
            this.ngayTao = LocalDateTime.now();
        }
        if (this.ngayCapNhat == null) {
            this.ngayCapNhat = LocalDateTime.now();
        }
        if (this.gioMoCa == null) {
            this.gioMoCa = LocalDateTime.now();
        }
        if (this.trangThai == null) {
            this.trangThai = "DANG_MO";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.ngayCapNhat = LocalDateTime.now();
    }
}
