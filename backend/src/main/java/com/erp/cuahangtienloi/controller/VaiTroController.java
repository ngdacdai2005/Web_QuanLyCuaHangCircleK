package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.AssignPermissionsRequest;
import com.erp.cuahangtienloi.dto.request.VaiTroCreateRequest;
import com.erp.cuahangtienloi.dto.request.VaiTroUpdateRequest;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.VaiTroDTO;
import com.erp.cuahangtienloi.service.VaiTroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/roles", "/api/roles"})
@RequiredArgsConstructor
public class VaiTroController {

    private final VaiTroService vaiTroService;

    @GetMapping
    @PreAuthorize("hasAuthority('role:read') or hasRole('ADMIN')")
    public ResponseEntity<List<VaiTroDTO>> getAll() {
        return ResponseEntity.ok(vaiTroService.getAllVaiTro());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('role:read') or hasRole('ADMIN')")
    public ResponseEntity<VaiTroDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(vaiTroService.getVaiTroById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('role:create') or hasRole('ADMIN')")
    public ResponseEntity<VaiTroDTO> create(@Valid @RequestBody VaiTroCreateRequest request) {
        return ResponseEntity.ok(vaiTroService.createVaiTro(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('role:update') or hasRole('ADMIN')")
    public ResponseEntity<VaiTroDTO> update(@PathVariable Long id, @Valid @RequestBody VaiTroUpdateRequest request) {
        return ResponseEntity.ok(vaiTroService.updateVaiTro(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('role:delete') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> delete(@PathVariable Long id) {
        vaiTroService.deleteVaiTro(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xoá vai trò thành công."));
    }

    @GetMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('role:read') or hasAuthority('role:assign') or hasRole('ADMIN')")
    public ResponseEntity<List<Long>> getPermissions(@PathVariable Long id) {
        return ResponseEntity.ok(vaiTroService.getPermissionIdsByRoleId(id));
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('role:assign') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> assignPermissions(
            @PathVariable Long id,
            @RequestBody AssignPermissionsRequest request,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "ADMIN";
        vaiTroService.assignPermissions(id, request.getPermissionIds(), actor);
        return ResponseEntity.ok(ApiResponse.ok("Đã cập nhật danh sách quyền cho vai trò."));
    }
}
