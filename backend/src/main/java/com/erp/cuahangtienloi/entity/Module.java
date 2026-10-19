package com.erp.cuahangtienloi.entity;

import com.erp.cuahangtienloi.constant.RecordStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "modules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Module extends BaseAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", unique = true, nullable = false, length = 100)
    private String name;

    @Column(name = "display_name_vi", length = 255)
    private String displayNameVi;

    @Column(name = "display_name_en", length = 255)
    private String displayNameEn;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "icon", length = 50)
    private String icon;

    @Column(name = "color", length = 50)
    private String color;

    @Column(name = "thu_tu")
    private Integer thuTu;

    @Enumerated(EnumType.ORDINAL)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RecordStatus status = RecordStatus.ACTIVE;

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private Integer deleted = 0;
}
