package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.ChiTietPhieuNhapRequestDTO;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.ChiTietPhieuNhapResponseDTO;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuNhapService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-phieu-nhap")
@RequiredArgsConstructor
public class ChiTietPhieuNhapController {

    private final PhieuNhapService phieuNhapService;
    private final BranchAccessService branchAccessService;

    @GetMapping("/by-phieu/{idPhieuNhap}")
    @PreAuthorize("hasAuthority('purchase:read')")
    public ResponseEntity<List<ChiTietPhieuNhapResponseDTO>> getByPhieuNhap(@PathVariable UUID idPhieuNhap, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getLinesByPhieuNhap(idPhieuNhap, actor));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    @PreAuthorize("hasAuthority('purchase:read')")
    public ResponseEntity<List<ChiTietPhieuNhapResponseDTO>> getBySanPham(@PathVariable UUID idSanPham, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getLinesBySanPham(idSanPham, actor));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('purchase:create')")
    public ResponseEntity<?> create(@RequestBody ChiTietPhieuNhapRequestDTO request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuNhapService.createLine(request, actor));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAuthority('purchase:create')")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietPhieuNhapRequestDTO> requests, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        phieuNhapService.createBatchLines(requests, actor);
        return ResponseEntity.ok(ApiResponse.ok("Tạo chi tiết phiếu nhập thành công"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('purchase:delete')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        if (phieuNhapService.deleteLine(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuNhap}")
    @PreAuthorize("hasAuthority('purchase:delete')")
    public ResponseEntity<?> deleteByPhieuNhap(@PathVariable UUID idPhieuNhap, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        phieuNhapService.deleteLinesByPhieuNhap(idPhieuNhap, actor);
        return ResponseEntity.ok(ApiResponse.ok("Xóa tất cả chi tiết phiếu nhập"));
    }
}