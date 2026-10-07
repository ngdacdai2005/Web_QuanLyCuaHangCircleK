package com.erp.cuahangtienloi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class NhaCungCapDTO {

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private UUID id;

    @Size(max = 20, message = "Mã NCC tối đa 20 ký tự")
    private String maNcc;

    @NotBlank(message = "Tên NCC không được rỗng")
    @Size(max = 255, message = "Tên NCC tối đa 255 ký tự")
    private String tenNcc;

    private String maSoThue;

    @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ")
    private String soDienThoai;

    @Email(message = "Email không đúng định dạng")
    private String email;

    private String diaChi;

    private String nguoiLienHe;

    private String chucDanhLienHe;

    @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại liên hệ không hợp lệ")
    private String sdtLienHe;

    private String dieuKhoanThanhToan;

    // Do trigger tự tính từ dieuKhoanThanhToan
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Integer soNgayDuocNo;

    // Do trigger đồng bộ từ phiếu nhập
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private BigDecimal tongCongNo;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Integer tongDonHang;

    private Boolean dangHoatDong;

    private String ghiChu;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime ngayTao;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime ngayCapNhat;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private UUID nguoiTao;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private UUID nguoiCapNhat;

    /** Dùng khi CREATE / UPDATE: frontend gửi danh sách UUID danh mục. */
    private List<UUID> categoryIds;

    /** Dùng khi GET: backend trả thông tin danh mục để hiển thị. */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private List<DanhMucSummary> categories;

    @Data
    public static class DanhMucSummary {
        private UUID id;
        private String tenDanhMuc;
        private String iconEmoji;
        private String mauHex;
    }
}