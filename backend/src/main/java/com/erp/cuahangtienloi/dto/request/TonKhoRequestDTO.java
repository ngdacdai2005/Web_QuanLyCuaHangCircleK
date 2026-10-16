package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class TonKhoRequestDTO {
    private UUID idSanPham;
    private UUID idChiNhanh;
    private Integer tonToiThieu;
    private Integer tonToiDa;
    private LocalDate hanSuDungGanNhat;
}
