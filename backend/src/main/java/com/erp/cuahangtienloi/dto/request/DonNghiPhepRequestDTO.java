package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class DonNghiPhepRequestDTO {
    private UUID idNhanVien;
    private UUID idChiNhanh;
    private String loaiNghi; // ANNUAL, UNPAID, SICK, PERSONAL
    private LocalDate tuNgay;
    private LocalDate denNgay;
    private BigDecimal soNgayNghi;
    private String lyDo;
}
