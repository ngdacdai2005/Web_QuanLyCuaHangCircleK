package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.ChiNhanhRequestDTO;
import com.erp.cuahangtienloi.dto.response.ChiNhanhResponseDTO;
import com.erp.cuahangtienloi.service.ChiNhanhService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-nhanh")
@RequiredArgsConstructor
public class ChiNhanhController {

    private final ChiNhanhService chiNhanhService;

    @GetMapping
    @PreAuthorize("hasAuthority('branch:read')")
    public ResponseEntity<List<ChiNhanhResponseDTO>> getAll() {
        return ResponseEntity.ok(chiNhanhService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('branch:read')")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return chiNhanhService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('branch:read')")
    public ResponseEntity<List<ChiNhanhResponseDTO>> getActive() {
        return ResponseEntity.ok(chiNhanhService.getActive());
    }

    @GetMapping("/by-loai/{loai}")
    @PreAuthorize("hasAuthority('branch:read')")
    public ResponseEntity<List<ChiNhanhResponseDTO>> getByLoai(@PathVariable String loai) {
        return ResponseEntity.ok(chiNhanhService.getByLoai(loai));
    }

    @GetMapping("/kho-tong")
    @PreAuthorize("hasAuthority('branch:read')")
    public ResponseEntity<List<ChiNhanhResponseDTO>> getKhoTong() {
        return ResponseEntity.ok(chiNhanhService.getKhoTong());
    }

    @GetMapping("/cua-hang")
    @PreAuthorize("hasAuthority('branch:read')")
    public ResponseEntity<List<ChiNhanhResponseDTO>> getCuaHang() {
        return ResponseEntity.ok(chiNhanhService.getCuaHang());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('branch:create')")
    public ResponseEntity<?> create(@RequestBody ChiNhanhRequestDTO request) {
        ChiNhanhResponseDTO created = chiNhanhService.create(request);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('branch:update')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ChiNhanhRequestDTO request) {
        return chiNhanhService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('branch:delete')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        return chiNhanhService.delete(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/quan-ly/{idQuanLy}")
    @PreAuthorize("hasAuthority('branch:update')")
    public ResponseEntity<?> assignQuanLy(@PathVariable UUID id, @PathVariable UUID idQuanLy) {
        return chiNhanhService.assignQuanLy(id, idQuanLy)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/quan-ly")
    @PreAuthorize("hasAuthority('branch:delete')")
    public ResponseEntity<?> clearQuanLy(@PathVariable UUID id) {
        return chiNhanhService.clearQuanLy(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
