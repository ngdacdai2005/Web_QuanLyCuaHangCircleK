package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.PermissionCreateRequest;
import com.erp.cuahangtienloi.dto.request.PermissionUpdateRequest;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.PermissionDTO;
import com.erp.cuahangtienloi.dto.response.PermissionSyncResult;
import com.erp.cuahangtienloi.service.PermissionService;
import com.erp.cuahangtienloi.service.PermissionSyncService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/permissions", "/api/permissions"})
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;
    private final PermissionSyncService permissionSyncService;

    @GetMapping
    @PreAuthorize("hasAuthority('role:read') or hasAuthority('role:assign') or hasRole('ADMIN')")
    public ResponseEntity<List<PermissionDTO>> getAll() {
        permissionSyncService.syncIfNeeded();
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('role:read') or hasAuthority('role:assign') or hasRole('ADMIN')")
    public ResponseEntity<PermissionDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(permissionService.getPermissionById(id));
    }

    @GetMapping("/grouped")
    @PreAuthorize("hasAuthority('role:read') or hasAuthority('role:assign') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, List<PermissionDTO>>> getGrouped() {
        permissionSyncService.syncIfNeeded();
        return ResponseEntity.ok(permissionService.getGroupedByModule());
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAuthority('role:assign') or hasRole('ADMIN')")
    public ResponseEntity<PermissionSyncResult> forceSync() {
        return ResponseEntity.ok(permissionSyncService.syncPermissions());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('role:create') or hasRole('ADMIN')")
    public ResponseEntity<PermissionDTO> create(@Valid @RequestBody PermissionCreateRequest request) {
        return ResponseEntity.ok(permissionService.createPermission(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('role:update') or hasRole('ADMIN')")
    public ResponseEntity<PermissionDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody PermissionUpdateRequest request
    ) {
        return ResponseEntity.ok(permissionService.updatePermission(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('role:delete') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> delete(@PathVariable Long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xoá quyền thành công."));
    }

    @PostMapping("/bulk-delete")
    @PreAuthorize("hasAuthority('role:delete') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteBulk(@RequestBody List<Long> ids) {
        permissionService.deleteBulk(ids);
        return ResponseEntity.ok(ApiResponse.ok("Đã xoá hàng loạt quyền thành công."));
    }
}
