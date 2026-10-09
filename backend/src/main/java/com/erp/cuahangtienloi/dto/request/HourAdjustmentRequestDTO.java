package com.erp.cuahangtienloi.dto.request;

import java.math.BigDecimal;

public record HourAdjustmentRequestDTO(BigDecimal hours, String reason) {}
