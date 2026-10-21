package com.erp.cuahangtienloi.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoiSoatPhienThuNganDTO {
    private UUID idPhienThuNgan;
    private String maPhien;

    // 1. Quỹ đầu ca
    private BigDecimal quyDauCaThucTe;

    // 2. Thu tiền mặt bán hàng
    private BigDecimal tongTienMatBanHang;
    private long soDonTienMat;

    // 3. Doanh thu không dùng tiền mặt (Thẻ, QR, Ví)
    private BigDecimal tongDoanhThuThe;
    private long soDonThe;
    private BigDecimal tongDoanhThuQr;
    private long soDonQr;
    private BigDecimal tongDoanhThuKhongTienMat;

    // 4. Tiền thu bổ sung
    private BigDecimal tongThuBoSung;

    // 5. Tiền hoàn khách bằng tiền mặt
    private BigDecimal tongHoanTienMat;
    private long soDonHoanTienMat;

    // 6. Tiền chi hợp lệ trong ca
    private BigDecimal tongChiHopLe;

    // 7. Tiền nộp két an toàn
    private BigDecimal tongNopKet;

    // 8. Tiền dự kiến cuối ca theo công thức chuẩn:
    // Tiền dự kiến = Quỹ đầu ca + Tiền mặt bán hàng + Thu bổ sung - Hoàn tiền mặt - Chi hợp lệ - Nộp két
    private BigDecimal tienDuKienCuoiCa;

    // 9. Thực đếm và chênh lệch
    private BigDecimal tienThucDemCuoiCa;
    private BigDecimal lechCuoiCa; // thuc_dem - du_kien
    private String lyDoChenhLech;
}
