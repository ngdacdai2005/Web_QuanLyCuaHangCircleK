package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "thong_bao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThongBao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tieu_de", nullable = false)
    private String tieuDe;

    @Column(name = "noi_dung", columnDefinition = "TEXT")
    private String noiDung;

    @Column(name = "loai_thong_bao", length = 50, nullable = false)
    private String loaiThongBao; // LICH_LAM, KHO_HANG, KIEM_KE, HOA_DON, HOP_DONG, HE_THONG

    @Column(name = "action_url")
    private String actionUrl;

    @Column(name = "muc_do", length = 20)
    private String mucDo; // INFO, WARNING, DANGER

    @Column(name = "nguoi_gui_ten", length = 100)
    private String nguoiGuiTen;

    @Column(name = "id_nhan_vien_nhan")
    private UUID idNhanVienNhan;

    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Builder.Default
    @Column(name = "da_doc", nullable = false)
    private Boolean daDoc = false;

    @Builder.Default
    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao = LocalDateTime.now();

    @Column(name = "ngay_doc")
    private LocalDateTime ngayDoc;

    @PrePersist
    public void prePersist() {
        if (this.ngayTao == null) {
            this.ngayTao = LocalDateTime.now();
        }
        if (this.daDoc == null) {
            this.daDoc = false;
        }
        if (this.mucDo == null) {
            this.mucDo = "INFO";
        }
    }
}
