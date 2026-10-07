package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.NccActivityReportDTO;
import com.erp.cuahangtienloi.dto.NhaCungCapDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.NhaCungCapService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NhaCungCapDTO>> getAll() {
        return ResponseEntity.ok(nhaCungCapService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return nhaCungCapService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NhaCungCapDTO>> getActive() {
        return ResponseEntity.ok(nhaCungCapService.getActive());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody NhaCungCapDTO request,
                                    HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(nhaCungCapService.create(request, actor.getId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID id,
                                    @Valid @RequestBody NhaCungCapDTO request,
                                    HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return nhaCungCapService.update(id, request, actor.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/inactive-report")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NccActivityReportDTO>> getInactiveReport(
            @RequestParam(name = "months", defaultValue = "6") int months) {
        return ResponseEntity.ok(nhaCungCapService.reportInactive(months));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (nhaCungCapService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa NCC thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}