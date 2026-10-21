package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;

@Entity
@Table(name = "tai_khoan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaiKhoan {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ten_dang_nhap", unique = true)
    private String tenDangNhap;

    @Column(name = "mat_khau_hash")
    private String matKhauHash;

    @Column(name = "id_nhan_vien")
    private UUID idNhanVien;

    @Column(name = "trang_thai")
    @Builder.Default
    private String trangThai = "ACTIVE";

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "failed_login_count", nullable = false)
    @Builder.Default
    private Integer failedLoginCount = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @PrePersist
    public void prePersist() {
        if (failedLoginCount == null) {
            failedLoginCount = 0;
        }
        if (trangThai == null || trangThai.isBlank()) {
            trangThai = "ACTIVE";
        }
        if (ngayTao == null) {
            ngayTao = LocalDateTime.now();
        }
    }
}
