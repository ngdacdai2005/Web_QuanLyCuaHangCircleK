package com.erp.cuahangtienloi.dto.request;

import lombok.Data;
import java.util.UUID;

@Data
public class DanhMucRequestDTO {
    private String maDanhMuc;
    private String tenDanhMuc;
    private UUID parentId;
    private String moTa;
    private String iconEmoji;
    private String imageUrl;
    private String mauHex;
    private Integer thuTuHienThi;
    private String skuPrefix;
    private Boolean dangHoatDong;
}