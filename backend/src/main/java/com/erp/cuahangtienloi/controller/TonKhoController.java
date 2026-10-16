package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.TonKhoResponseDTO;
import com.erp.cuahangtienloi.dto.request.TonKhoAdjustmentRequestDTO;
import com.erp.cuahangtienloi.dto.request.TonKhoRequestDTO;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.TonKhoService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ton-kho")
@RequiredArgsConstructor
public class TonKhoController {

    private final TonKhoService tonKhoService;
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoResponseDTO>> getAll(HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(tonKhoService.getAll(employee));
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<TonKhoResponseDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(tonKhoService.getByChiNhanh(idChiNhanh, employee));
    }

    @GetMapping("/by-product/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoResponseDTO>> getBySanPham(@PathVariable UUID idSanPham, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(tonKhoService.getBySanPham(idSanPham, employee));
    }

    @GetMapping("/available-for-transfer")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoResponseDTO>> getAvailableForTransfer() {
        return ResponseEntity.ok(tonKhoService.getAvailableForTransfer());
    }

    @GetMapping("/detail/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> getDetail(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return tonKhoService.getDetail(idSanPham, idChiNhanh, employee)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody TonKhoRequestDTO request) {
        return ResponseEntity.ok(tonKhoService.create(request));
    }

    @PutMapping("/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh, @RequestBody TonKhoRequestDTO request) {
        return tonKhoService.update(idSanPham, idChiNhanh, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> adjust(@RequestBody TonKhoAdjustmentRequestDTO request, HttpServletRequest httpRequest) {
        var employee = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return tonKhoService.adjust(request, employee)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh) {
        tonKhoService.delete(idSanPham, idChiNhanh);
        return ResponseEntity.ok(ApiResponse.ok("Xóa tồn kho thành công"));
    }
}
