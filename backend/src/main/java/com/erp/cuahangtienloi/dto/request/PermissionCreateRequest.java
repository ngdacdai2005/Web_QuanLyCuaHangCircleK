package com.erp.cuahangtienloi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionCreateRequest {
    @NotBlank(message = "Tên quyền không được để trống")
    private String name;

    @NotBlank(message = "Tên hiển thị tiếng Việt không được để trống")
    private String displayNameVi;

    @NotBlank(message = "Tên hiển thị tiếng Anh không được để trống")
    private String displayNameEn;

    private String description;

    @NotBlank(message = "Module không được để trống")
    private String module;

    @Builder.Default
    private Integer status = 0;
}
