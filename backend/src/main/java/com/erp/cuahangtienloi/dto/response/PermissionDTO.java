package com.erp.cuahangtienloi.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionDTO {
    private Long id;
    private String name;
    private String description;
    private String displayNameVi;
    private String displayNameEn;
    private String module;
    private Integer status;
}
