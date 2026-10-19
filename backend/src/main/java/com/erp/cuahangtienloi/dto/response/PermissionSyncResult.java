package com.erp.cuahangtienloi.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionSyncResult {
    private int createdPermissions;
    private int createdModules;
    private int totalPermissions;
}
