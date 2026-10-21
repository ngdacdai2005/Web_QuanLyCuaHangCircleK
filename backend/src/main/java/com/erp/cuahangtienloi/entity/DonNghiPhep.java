package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "don_nghi_phep")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DonNghiPhep {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_nhan_vien", nullable = false)
    private UUID idNhanVien;

    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Column(name = "loai_nghi", nullable = false)
    private String loaiNghi; // ANNUAL, UNPAID, SICK, PERSONAL

    @Column(name = "tu_ngay", nullable = false)
    private LocalDate tuNgay;

    @Column(name = "den_ngay", nullable = false)
    private LocalDate denNgay;

    @Column(name = "so_ngay_nghi")
    private BigDecimal soNgayNghi;

    @Column(name = "ly_do", columnDefinition = "TEXT")
    private String lyDo;

    @Column(name = "trang_thai", nullable = false)
    private String trangThai; // PENDING, APPROVED, REJECTED

    @Column(name = "id_nguoi_duyet")
    private UUID idNguoiDuyet;

    @Column(name = "ly_do_tu_choi", columnDefinition = "TEXT")
    private String lyDoTuChoi;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_duyet")
    private LocalDateTime ngayDuyet;
}
