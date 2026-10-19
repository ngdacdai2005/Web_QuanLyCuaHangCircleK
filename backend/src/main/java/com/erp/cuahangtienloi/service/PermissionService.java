package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.PermissionCreateRequest;
import com.erp.cuahangtienloi.dto.request.PermissionUpdateRequest;
import com.erp.cuahangtienloi.dto.response.PermissionDTO;

import java.util.List;
import java.util.Map;

public interface PermissionService {
    List<PermissionDTO> getAllPermissions();

    List<PermissionDTO> getPermissionsByModule(String module);

    Map<String, List<PermissionDTO>> getGroupedByModule();

    PermissionDTO getPermissionById(Long id);

    PermissionDTO createPermission(PermissionCreateRequest request);

    PermissionDTO updatePermission(Long id, PermissionUpdateRequest request);

    void deletePermission(Long id);

    void deleteBulk(List<Long> ids);
}
