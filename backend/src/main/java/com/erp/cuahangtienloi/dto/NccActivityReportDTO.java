package com.erp.cuahangtienloi.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class NccActivityReportDTO {
    private UUID id;
    private String maNcc;
    private String tenNcc;
    private LocalDate ngayPhieuGanNhat; // null = chưa từng nhập
    private Integer tongDonHang;
    private BigDecimal tongCongNo;
    private Boolean dangHoatDong;
}
