package com.erp.cuahangtienloi.dto.request;

import java.math.BigDecimal;

public record HourAdjustmentRequest(BigDecimal hours, String reason) {}
