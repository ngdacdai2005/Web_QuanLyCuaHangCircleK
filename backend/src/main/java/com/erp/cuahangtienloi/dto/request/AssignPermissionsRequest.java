package com.erp.cuahangtienloi.dto.request;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignPermissionsRequest {
    private List<Long> permissionIds;
}
