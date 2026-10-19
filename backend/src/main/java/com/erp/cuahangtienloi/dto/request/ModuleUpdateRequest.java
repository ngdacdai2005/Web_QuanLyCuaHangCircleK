package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModuleUpdateRequest {
    @NotBlank(message = "Tên hiển thị tiếng Việt không được để trống")
    private String displayNameVi;

    @NotBlank(message = "Tên hiển thị tiếng Anh không được để trống")
    private String displayNameEn;

    private String description;

    private String icon;

    private String color;

    private Integer thuTu;

    private Integer status;
}
