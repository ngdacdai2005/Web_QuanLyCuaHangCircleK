package com.erp.cuahangtienloi.dto.request;

import java.util.List;
import java.util.UUID;

public record BatchApproveRequest(List<UUID> ids) {}
