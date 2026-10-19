package com.erp.cuahangtienloi.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VaiTroDTO {
    private Long id;
    private String maVaiTro;
    private String tenVaiTro;
    private String moTa;
    private Integer status;
    private long userCount;
}
