package com.erp.cuahangtienloi.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TongQuanQuyChiNhanhDTO {
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private BigDecimal tongTienNganKeo;      // Tổng tiền mặt đang có trong các ngăn kéo POS mở
    private BigDecimal tongTienKetAnToan;    // Tổng tiền trong két sắt ngầm
    private int soQuayDangMo;
    private List<PhienThuNganResponseDTO> danhSachQuayDangMo;
}
