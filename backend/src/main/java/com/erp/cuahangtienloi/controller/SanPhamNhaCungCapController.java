package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.SaveSanPhamNccRequest;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.SanPhamNhaCungCapDTO;
import com.erp.cuahangtienloi.service.SanPhamNhaCungCapService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1", "/api"})
@RequiredArgsConstructor
public class SanPhamNhaCungCapController {

    private final SanPhamNhaCungCapService sanPhamNccService;

    @GetMapping("/products/{productId}/suppliers")
    @PreAuthorize("hasAuthority('product:read') or hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'KE_TOAN')")
    public ResponseEntity<List<SanPhamNhaCungCapDTO>> getSuppliersOfProduct(@PathVariable UUID productId) {
        return ResponseEntity.ok(sanPhamNccService.getSuppliersOfProduct(productId));
    }

    @PostMapping("/products/{productId}/suppliers")
    @PreAuthorize("hasAuthority('product:update') or hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<SanPhamNhaCungCapDTO> saveSupplierForProduct(
            @PathVariable UUID productId,
            @Valid @RequestBody SaveSanPhamNccRequest request
    ) {
        return ResponseEntity.ok(sanPhamNccService.saveSupplierForProduct(productId, request));
    }

    @DeleteMapping("/products/{productId}/suppliers/{nccId}")
    @PreAuthorize("hasAuthority('product:update') or hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<ApiResponse> removeSupplierFromProduct(
            @PathVariable UUID productId,
            @PathVariable UUID nccId
    ) {
        sanPhamNccService.removeSupplierFromProduct(productId, nccId);
        return ResponseEntity.ok(new ApiResponse(true, "Đã xoá liên kết nhà cung cấp khỏi sản phẩm"));
    }

    @PutMapping("/products/{productId}/suppliers/{nccId}/set-primary")
    @PreAuthorize("hasAuthority('product:update') or hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<ApiResponse> setPrimarySupplier(
            @PathVariable UUID productId,
            @PathVariable UUID nccId
    ) {
        sanPhamNccService.setPrimarySupplier(productId, nccId);
        return ResponseEntity.ok(new ApiResponse(true, "Đã đặt nhà cung cấp làm mặc định cho sản phẩm"));
    }

    @GetMapping("/suppliers/{nccId}/supplied-products")
    @PreAuthorize("hasAuthority('purchase:read') or hasAuthority('product:read') or hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'KE_TOAN')")
    public ResponseEntity<List<Map<String, Object>>> getProductsSuppliedBy(@PathVariable UUID nccId) {
        return ResponseEntity.ok(sanPhamNccService.getProductsSuppliedBy(nccId));
    }

    @GetMapping("/products/{productId}/suppliers/{nccId}/price-history")
    @PreAuthorize("hasAuthority('purchase:read') or hasAuthority('product:read') or hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'KE_TOAN')")
    public ResponseEntity<List<com.erp.cuahangtienloi.entity.GiaNhapNcc>> getPriceHistory(
            @PathVariable UUID productId,
            @PathVariable UUID nccId) {
        return ResponseEntity.ok(sanPhamNccService.getPriceHistory(productId, nccId));
    }
}
