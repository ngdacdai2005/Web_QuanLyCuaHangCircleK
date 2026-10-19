package com.erp.cuahangtienloi.entity;

import com.erp.cuahangtienloi.constant.RecordStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vai_tro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VaiTro extends BaseAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_vai_tro", unique = true, nullable = false, length = 50)
    private String maVaiTro;

    @Column(name = "ten_vai_tro", unique = true, nullable = false, length = 100)
    private String tenVaiTro;

    @Column(name = "mo_ta", columnDefinition = "TEXT")
    private String moTa;

    @Enumerated(EnumType.ORDINAL)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RecordStatus status = RecordStatus.ACTIVE;

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private Integer deleted = 0;
}
