package com.erp.cuahangtienloi.dto.response;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class DanhMucResponseDTO {
    private UUID id;
    private String maDanhMuc;
    private String tenDanhMuc;
    private UUID parentId;
    private String moTa;
    private String iconEmoji;
    private String imageUrl;
    private String mauHex;
    private Integer thuTuHienThi;
    private Integer productCount;
    private Boolean dangHoatDong;
    private LocalDateTime ngayTao;
    private LocalDateTime ngayCapNhat;
}