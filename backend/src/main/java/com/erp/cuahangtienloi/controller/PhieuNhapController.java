package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.CreatePurchaseRequestDTO;
import com.erp.cuahangtienloi.dto.request.PayRequestDTO;
import com.erp.cuahangtienloi.dto.request.PhieuNhapRequestDTO;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.PhieuNhapResponseDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuNhapService;
import com.erp.cuahangtienloi.service.RequestDeduplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-nhap")
@RequiredArgsConstructor
public class PhieuNhapController {

    private final PhieuNhapService phieuNhapService;
    private final BranchAccessService branchAccessService;
    private final RequestDeduplicationService requestDeduplicationService;
    private final com.erp.cuahangtienloi.service.PriceResolutionService priceResolutionService;

    @GetMapping("/resolve-price")
    @PreAuthorize("hasAuthority('purchase:read')")
    public ResponseEntity<?> resolvePrice(
            @RequestParam("idNcc") UUID idNcc,
            @RequestParam("idSanPham") UUID idSanPham,
            @RequestParam(value = "idHopDong", required = false) UUID idHopDong) {
        return ResponseEntity.ok(priceResolutionService.resolvePurchasePrice(idNcc, idSanPham, idHopDong));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('purchase:read')")
    public ResponseEntity<List<PhieuNhapResponseDTO>> getAll(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getAll(actor));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('purchase:read')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return phieuNhapService.getById(id, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAuthority('purchase:read')")
    public ResponseEntity<List<PhieuNhapResponseDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getByChiNhanh(idChiNhanh, actor));
    }

    @GetMapping("/by-ncc/{idNcc}")
    @PreAuthorize("hasAuthority('purchase:read')")
    public ResponseEntity<List<PhieuNhapResponseDTO>> getByNcc(@PathVariable UUID idNcc, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getByNcc(idNcc, actor));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAuthority('purchase:read')")
    public ResponseEntity<List<PhieuNhapResponseDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getByStatus(trangThai, actor));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('purchase:create')")
    @Deprecated
    public ResponseEntity<?> create(@RequestBody(required = false) PhieuNhapRequestDTO request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE).body(
                ApiResponse.err("Endpoint cũ đã ngừng sử dụng. Hãy dùng POST /api/phieu-nhap/with-lines."));
    }

    @PostMapping("/with-lines")
    @PreAuthorize("hasAuthority('purchase:create')")
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreatePurchaseRequestDTO request, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);

        String linesFingerprint = request.getLines() != null
                ? request.getLines().stream()
                        .filter(l -> l.getIdSanPham() != null)
                        .map(l -> l.getIdSanPham() + ":" + l.getSoLuong() + ":" + l.getDonGiaNhap())
                        .sorted()
                        .collect(java.util.stream.Collectors.joining(";"))
                : "";
        String dedupKey = "PURCHASE_ORDER:" + actor.getId() + ":" + request.getIdChiNhanh() + ":" + request.getIdNcc() + ":" + linesFingerprint;

        if (!requestDeduplicationService.tryAcquire(dedupKey, 6)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.err("Yêu cầu tạo phiếu nhập đang được xử lý hoặc vừa được gửi. Vui lòng không thao tác liên tục."));
        }

        try {
            return ResponseEntity.ok(phieuNhapService.createWithLines(request, actor));
        } catch (IllegalArgumentException e) {
            requestDeduplicationService.release(dedupKey);
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        } catch (Exception e) {
            requestDeduplicationService.release(dedupKey);
            throw e;
        }
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('purchase:approve') or hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> approve(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.approve(id, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('purchase:approve') or hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> reject(@PathVariable UUID id, @RequestBody(required = false) String lyDo, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.reject(id, lyDo, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/start-receiving")
    @PreAuthorize("hasAuthority('purchase:update') or hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> startReceiving(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.startReceiving(id, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/cancel-receiving")
    @PreAuthorize("hasAuthority('purchase:update') or hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> cancelReceiving(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.cancelReceiving(id, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/confirm-receiving")
    @PreAuthorize("hasAuthority('purchase:update') or hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> confirmReceiving(
            @PathVariable UUID id,
            @Valid @RequestBody com.erp.cuahangtienloi.dto.request.ConfirmReceivingRequestDTO request,
            HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.confirmReceiving(id, request, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('purchase:update') or hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> cancel(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.cancel(id, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/lines/{idChiTiet}/price")
    @PreAuthorize("hasAuthority('purchase:approve') or hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> changePrice(
            @PathVariable UUID id,
            @PathVariable UUID idChiTiet,
            @Valid @RequestBody com.erp.cuahangtienloi.dto.request.ChangePriceRequestDTO request,
            HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.changePrice(id, idChiTiet, request, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAuthority('purchase:approve') or hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> pay(@PathVariable UUID id,
                                 @RequestBody(required = false) PayRequestDTO request,
                                 HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.pay(id, request, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/receive")
    @PreAuthorize("hasAuthority('purchase:update')")
    public ResponseEntity<?> receive(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.receive(id, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('purchase:update')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuNhapRequestDTO request, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return phieuNhapService.update(id, request, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('purchase:delete')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        if (phieuNhapService.delete(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa phiếu nhập thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
