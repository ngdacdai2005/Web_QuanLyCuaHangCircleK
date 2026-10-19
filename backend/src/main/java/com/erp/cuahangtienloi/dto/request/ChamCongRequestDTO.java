package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class ChamCongRequestDTO {
    private UUID idNhanVien;
    private LocalDate workDate;
    private String caLamViec;
    private LocalDateTime checkInAt;
    private LocalDateTime checkOutAt;
    private LocalDateTime clockInAt;
    private LocalDateTime clockOutAt;
    private Integer diTrePhut;
    private BigDecimal overtimeHours;
    private BigDecimal breakHours;
    private BigDecimal tongGioLam;
    private String trangThai;
    private Boolean daThanhToan;
    private String ghiChu;
}
