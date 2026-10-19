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
@PreAuthorize("hasRole('ADMIN')")
public class ModuleController {

    private final ModuleService moduleService;

    @GetMapping
    public ResponseEntity<List<ModuleDTO>> getAll() {
        return ResponseEntity.ok(moduleService.getAllModules());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ModuleDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(moduleService.getModuleById(id));
    }

    @PostMapping
    public ResponseEntity<ModuleDTO> create(@Valid @RequestBody ModuleCreateRequest request) {
        return ResponseEntity.ok(moduleService.createModule(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ModuleDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody ModuleUpdateRequest request
    ) {
        return ResponseEntity.ok(moduleService.updateModule(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> delete(@PathVariable Long id) {
        moduleService.deleteModule(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xoá module thành công."));
    }
}
