package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.NhaCungCapRequestDTO;
import com.erp.cuahangtienloi.dto.response.NhaCungCapResponseDTO;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.service.NhaCungCapService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nha-cung-cap")
@RequiredArgsConstructor
public class NhaCungCapController {

    private final NhaCungCapService nhaCungCapService;

    @GetMapping
    @PreAuthorize("hasAuthority('supplier:read')")
    public ResponseEntity<List<NhaCungCapResponseDTO>> getAll() {
        return ResponseEntity.ok(nhaCungCapService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('supplier:read')")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return nhaCungCapService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('supplier:read')")
    public ResponseEntity<List<NhaCungCapResponseDTO>> getActive() {
        return ResponseEntity.ok(nhaCungCapService.getActive());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('supplier:create')")
    public ResponseEntity<?> create(@Valid @RequestBody NhaCungCapRequestDTO request) {
        return ResponseEntity.ok(nhaCungCapService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('supplier:update')")
    public ResponseEntity<?> update(@PathVariable UUID id, @Valid @RequestBody NhaCungCapRequestDTO request) {
        return nhaCungCapService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('supplier:delete')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (nhaCungCapService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa NCC thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
