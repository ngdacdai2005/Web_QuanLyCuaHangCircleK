package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.ModuleCreateRequest;
import com.erp.cuahangtienloi.dto.request.ModuleUpdateRequest;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.ModuleDTO;
import com.erp.cuahangtienloi.service.ModuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/permission-modules", "/api/permission-modules"})
@RequiredArgsConstructor
public class ModuleController {

    private final ModuleService moduleService;

    @GetMapping
    @PreAuthorize("hasAuthority('role:read') or hasAuthority('role:assign') or hasRole('ADMIN')")
    public ResponseEntity<List<ModuleDTO>> getAll() {
        return ResponseEntity.ok(moduleService.getAllModules());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('role:read') or hasAuthority('role:assign') or hasRole('ADMIN')")
    public ResponseEntity<ModuleDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(moduleService.getModuleById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('role:create') or hasRole('ADMIN')")
    public ResponseEntity<ModuleDTO> create(@Valid @RequestBody ModuleCreateRequest request) {
        return ResponseEntity.ok(moduleService.createModule(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('role:update') or hasRole('ADMIN')")
    public ResponseEntity<ModuleDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody ModuleUpdateRequest request
    ) {
        return ResponseEntity.ok(moduleService.updateModule(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('role:delete') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> delete(@PathVariable Long id) {
        moduleService.deleteModule(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xoá module thành công."));
    }
}
