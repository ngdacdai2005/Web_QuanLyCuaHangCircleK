package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class HoaDonRequestDTO {
    private String maHoaDon;
    private UUID idChiNhanh;
    private UUID idThuNgan;
    private String caLamViec;
    private LocalDateTime ngayBan;
    private String hinhThucTt;
    private String sdtThanhVien;
    private BigDecimal subTotal;
    private BigDecimal giamGia;
    private BigDecimal vatTotal;
    private BigDecimal grandTotal;
    private BigDecimal tienKhachDua;
    private BigDecimal tienThoi;
    private String trangThai;
    private String ghiChu;
}
