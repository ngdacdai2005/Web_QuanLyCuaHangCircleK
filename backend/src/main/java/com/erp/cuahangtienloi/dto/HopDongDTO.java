package com.erp.cuahangtienloi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class HopDongDTO {

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private UUID id;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String maHopDong;

    @NotBlank(message = "Tên hợp đồng không được rỗng")
    @Size(max = 200, message = "Tên hợp đồng tối đa 200 ký tự")
    private String tenHopDong;

    private String loaiHopDong;

    @NotNull(message = "Chưa chọn nhà cung cấp")
    private UUID idNcc;

    @NotNull(message = "Ngày ký không được để trống")
    private LocalDate ngayKy;

    @NotNull(message = "Ngày hiệu lực không được để trống")
    private LocalDate ngayHieuLuc;

    private LocalDate ngayHetHan;
    private BigDecimal giaTriHopDong;
    private String dieuKhoanThanhToan;
    private Integer soNgayDuocNo;
    private String noiDung;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String fileTenGoc;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Boolean fileCo;

    private String trangThai;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String maNcc;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String tenNcc;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String lyDoTuChoi;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private UUID idNguoiDuyet;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime ngayDuyet;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Integer soLanTrinh;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime ngayTao;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime ngayCapNhat;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private UUID nguoiTao;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private UUID nguoiCapNhat;
}