package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.CreateStocktakeRequestDTO;
import com.erp.cuahangtienloi.dto.request.PhieuKiemKeRequestDTO;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.PhieuKiemKeResponseDTO;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuKiemKeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-kiem-ke")
@RequiredArgsConstructor
public class PhieuKiemKeController {

    private final PhieuKiemKeService phieuKiemKeService;
    private final BranchAccessService branchAccessService;
    private final NhanVienRepository nhanVienRepository;

    private UUID resolveAuthenticatedIdNhanVien(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");
        if (attr instanceof String s) {
            try {
                UUID id = UUID.fromString(s);
                if (nhanVienRepository.existsById(id)) {
                    return id;
                }
            } catch (IllegalArgumentException ignored) {}
        }
        return null;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('stocktake:read')")
    public ResponseEntity<List<PhieuKiemKeResponseDTO>> getAll(HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuKiemKeService.getAll(actor));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('stocktake:read')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return phieuKiemKeService.getById(id, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-chi-nhanh/{idChiNhanh}")
    @PreAuthorize("hasAuthority('stocktake:read')")
    public ResponseEntity<List<PhieuKiemKeResponseDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuKiemKeService.getByChiNhanh(idChiNhanh, actor));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAuthority('stocktake:read')")
    public ResponseEntity<List<PhieuKiemKeResponseDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuKiemKeService.getByStatus(trangThai, actor));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('stocktake:create')")
    public ResponseEntity<?> create(@RequestBody PhieuKiemKeRequestDTO request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        UUID idNguoiTao = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.create(request, idNguoiTao, actor));
    }

    @PostMapping("/with-lines")
    @PreAuthorize("hasAuthority('stocktake:create')")
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreateStocktakeRequestDTO request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        UUID idNguoiTao = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.createWithLines(request, idNguoiTao, actor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('stocktake:update')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuKiemKeRequestDTO request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return phieuKiemKeService.update(id, request, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAuthority('stocktake:update')")
    public ResponseEntity<?> submit(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.submit(id, actor));
    }

    @PostMapping("/{id}/balance")
    @PreAuthorize("hasAuthority('stocktake:approve')")
    public ResponseEntity<?> balance(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.balance(id, actor));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('stocktake:update')")
    public ResponseEntity<?> cancel(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.cancel(id, actor));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('stocktake:delete')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        if (phieuKiemKeService.delete(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa phiếu kiểm kê thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
