package com.erp.cuahangtienloi.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhienThuNganResponseDTO {
    private UUID id;
    private String maPhien;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private UUID idThuNgan;
    private String tenThuNgan;
    private String quaySo;
    private LocalDateTime gioMoCa;
    private LocalDateTime gioDongCa;

    // Quỹ đầu ca
    private BigDecimal quyDauCaDuKien;
    private BigDecimal quyDauCaThucTe;
    private BigDecimal lechDauCa;
    private UUID idNguoiGiaoDauCa;
    private String tenNguoiGiaoDauCa;
    private String ghiChuMoCa;
    private Map<String, Integer> bangKeMoCa;

    // Chốt ca & đối soát
    private BigDecimal tienDuKienCuoiCa;
    private BigDecimal tienThucDemCuoiCa;
    private BigDecimal lechCuoiCa;
    private String lyDoChenhLech;
    private Map<String, Integer> bangKeDongCa;

    // Bàn giao ca
    private UUID idNguoiNhanBanGiao;
    private String tenNguoiNhanBanGiao;
    private Boolean xacNhanBanGiao;
    private LocalDateTime thoiGianBanGiao;
    private String ghiChuBanGiao;

    private String trangThai; // DANG_MO, CHO_BAN_GIAO, DA_BAN_GIAO, DA_DONG
    private LocalDateTime ngayTao;
    private LocalDateTime ngayCapNhat;

    // Bổ sung tóm tắt doanh số
    private DoiSoatPhienThuNganDTO doiSoat;
}
