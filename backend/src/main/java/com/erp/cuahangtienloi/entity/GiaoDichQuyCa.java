package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "giao_dich_quy_ca")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GiaoDichQuyCa {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_phien_thu_ngan", nullable = false)
    private UUID idPhienThuNgan;

    @Column(name = "loai_giao_dich", nullable = false)
    private String loaiGiaoDich; // NOP_KET, THU_BO_SUNG, CHI_TAM_UNG

    @Column(name = "so_tien", nullable = false)
    private BigDecimal soTien;

    @Column(name = "id_nguoi_thuc_hien", nullable = false)
    private UUID idNguoiThucHien;

    @Column(name = "id_nguoi_xac_nhan")
    private UUID idNguoiXacNhan;

    @Column(name = "ly_do", columnDefinition = "TEXT")
    private String lyDo;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @PrePersist
    public void prePersist() {
        if (this.ngayTao == null) {
            this.ngayTao = LocalDateTime.now();
        }
    }
}
