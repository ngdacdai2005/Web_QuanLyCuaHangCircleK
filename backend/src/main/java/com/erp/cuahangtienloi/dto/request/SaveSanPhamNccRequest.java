package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveSanPhamNccRequest {

    @NotNull(message = "Thiếu id nhà cung cấp")
    private UUID idNhaCungCap;

    private String maSanPhamNcc;

    private BigDecimal giaNhap;

    private Boolean laNccChinh;

    private String ghiChu;
}
