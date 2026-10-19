package com.erp.cuahangtienloi.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SanPhamNhaCungCapDTO {
    private UUID id;
    private UUID idSanPham;
    private UUID idNhaCungCap;
    private String maNcc;
    private String tenNcc;
    private String maSanPhamNcc;
    private BigDecimal giaNhap;
    private Boolean laNccChinh;
    private String ghiChu;
    private LocalDateTime ngayCapNhat;
}
