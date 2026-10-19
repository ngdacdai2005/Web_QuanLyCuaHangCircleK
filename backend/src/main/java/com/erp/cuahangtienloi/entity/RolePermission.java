package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "role_permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RolePermission {
    @EmbeddedId
    private RolePermissionId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", insertable = false, updatable = false)
    private VaiTro vaiTro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", insertable = false, updatable = false)
    private Permission permission;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "created_by", length = 50)
    private String createdBy = "SYSTEM";

    public RolePermission(RolePermissionId id) {
        this.id = id;
        this.createdAt = LocalDateTime.now();
        this.createdBy = "SYSTEM";
    }

    public RolePermission(Long roleId, Long permissionId) {
        this.id = new RolePermissionId(roleId, permissionId);
        this.createdAt = LocalDateTime.now();
        this.createdBy = "SYSTEM";
    }

    // Helper methods for backwards compatibility
    public LocalDateTime getNgayGan() {
        return createdAt;
    }

    public void setNgayGan(LocalDateTime ngayGan) {
        this.createdAt = ngayGan;
    }

    public String getNguoiGan() {
        return createdBy;
    }

    public void setNguoiGan(String nguoiGan) {
        this.createdBy = nguoiGan;
    }
}
