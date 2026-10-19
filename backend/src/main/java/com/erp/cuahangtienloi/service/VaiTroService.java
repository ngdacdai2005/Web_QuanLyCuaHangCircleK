package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.VaiTroCreateRequest;
import com.erp.cuahangtienloi.dto.request.VaiTroUpdateRequest;
import com.erp.cuahangtienloi.dto.response.VaiTroDTO;

import java.util.List;

public interface VaiTroService {
    List<VaiTroDTO> getAllVaiTro();

    VaiTroDTO getVaiTroById(Long id);

    VaiTroDTO createVaiTro(VaiTroCreateRequest request);

    VaiTroDTO updateVaiTro(Long id, VaiTroUpdateRequest request);

    void deleteVaiTro(Long id);

    List<Long> getPermissionIdsByRoleId(Long roleId);

    void assignPermissions(Long roleId, List<Long> permissionIds, String currentUser);
}
