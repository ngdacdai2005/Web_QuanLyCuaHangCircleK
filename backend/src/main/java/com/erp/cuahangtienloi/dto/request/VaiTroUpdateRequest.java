package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VaiTroUpdateRequest {
    @NotBlank(message = "Tên vai trò không được để trống")
    private String tenVaiTro;

    private String moTa;

    private Integer status;
}
