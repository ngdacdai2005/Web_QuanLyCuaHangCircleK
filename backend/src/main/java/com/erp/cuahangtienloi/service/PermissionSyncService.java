package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.response.PermissionSyncResult;

public interface PermissionSyncService {
    PermissionSyncResult syncPermissions();

    void syncIfNeeded();
}
