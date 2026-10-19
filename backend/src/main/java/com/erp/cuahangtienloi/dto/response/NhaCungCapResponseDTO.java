package com.erp.cuahangtienloi.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class NhaCungCapResponseDTO {

    private UUID id;

    private String maNcc;

    private String tenNcc;

    private String maSoThue;

    private String soDienThoai;

    private String email;

    private String diaChi;

    private String nguoiLienHe;

    private String chucDanhLienHe;

    private String sdtLienHe;

    private String dieuKhoanThanhToan;

    private Integer soNgayDuocNo;

    private BigDecimal tongCongNo;

    private Integer tongDonHang;

    private Boolean dangHoatDong;

    private String ghiChu;

    private LocalDateTime ngayTao;

    private LocalDateTime ngayCapNhat;

    /**
     * Danh sách danh mục đầy đủ để frontend hiển thị.
     */
    private List<DanhMucSummary> categories;

    private List<UUID> categoryIds;

    @Data
    public static class DanhMucSummary {

        private UUID id;

        private String tenDanhMuc;

        private String iconEmoji;

        private String mauHex;
    }
}