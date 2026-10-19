package com.erp.cuahangtienloi.entity;

import com.erp.cuahangtienloi.constant.RecordStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission extends BaseAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", unique = true, nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "display_name_vi", length = 255)
    private String displayNameVi;

    @Column(name = "display_name_en", length = 255)
    private String displayNameEn;

    @Column(name = "module", length = 100, nullable = false)
    private String module;

    @Enumerated(EnumType.ORDINAL)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RecordStatus status = RecordStatus.ACTIVE;

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private Integer deleted = 0;
}
