package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VaiTroCreateRequest {
    @NotBlank(message = "Mã vai trò không được để trống")
    private String maVaiTro;

    @NotBlank(message = "Tên vai trò không được để trống")
    private String tenVaiTro;

    private String moTa;
}
