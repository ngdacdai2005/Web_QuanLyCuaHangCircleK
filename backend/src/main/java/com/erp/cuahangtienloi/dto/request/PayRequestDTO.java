package com.erp.cuahangtienloi.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PayRequestDTO {
    private BigDecimal daThanhToan;
    private String hinhThucTt;
}
