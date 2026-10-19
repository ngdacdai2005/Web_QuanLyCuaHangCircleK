package com.erp.cuahangtienloi.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModuleDTO {
    private Long id;
    private String name;
    private String displayNameVi;
    private String displayNameEn;
    private String description;
    private String icon;
    private String color;
    private Integer thuTu;
    private Integer status;
    private long permissionCount;
}
