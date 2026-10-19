package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.CheckoutRequestDTO;
import com.erp.cuahangtienloi.dto.request.CreateSaleRequestDTO;
import com.erp.cuahangtienloi.dto.request.HoaDonRequestDTO;
import com.erp.cuahangtienloi.dto.request.RefundRequestDTO;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.HoaDonResponseDTO;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.mapper.ChiTietHoaDonMapper;
import com.erp.cuahangtienloi.mapper.HoaDonMapper;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.HoaDonService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hoa-don")
@RequiredArgsConstructor(onConstructor_ = @Autowired)
public class HoaDonController {

    private final HoaDonService hoaDonService;
    private final NhanVienRepository nhanVienRepository;

    public HoaDonController(
            HoaDonRepository hoaDonRepository,
            ChiNhanhRepository chiNhanhRepository,
            NhanVienRepository nhanVienRepository,
            ChiTietHoaDonRepository chiTietHoaDonRepository,
            SanPhamRepository sanPhamRepository,
            TonKhoRepository tonKhoRepository,
            SoQuyRepository soQuyRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this(new HoaDonService(hoaDonRepository, chiNhanhRepository, nhanVienRepository,
                chiTietHoaDonRepository, sanPhamRepository, tonKhoRepository, soQuyRepository,
                jdbcTemplate, null, new HoaDonMapper(chiNhanhRepository, nhanVienRepository),
                new ChiTietHoaDonMapper()), nhanVienRepository);
    }

    private UUID resolveAuthenticatedIdNhanVien(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");
        if (attr instanceof String value) {
            try {
                return UUID.fromString(value);
            } catch (IllegalArgumentException ignored) {}
        }
        return null;
    }

    private NhanVien requireAuthenticatedEmployee(HttpServletRequest request) {
        UUID employeeId = resolveAuthenticatedIdNhanVien(request);
        if (employeeId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản chưa liên kết nhân viên");
        }
        return nhanVienRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nhân viên đăng nhập không tồn tại"));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<HoaDonResponseDTO>> getAll(HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getAll(requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return hoaDonService.getById(id, requireAuthenticatedEmployee(request))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<HoaDonResponseDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByChiNhanh(idChiNhanh, requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/by-cashier/{idThuNgan}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<HoaDonResponseDTO>> getByThuNgan(@PathVariable UUID idThuNgan, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByThuNgan(idThuNgan, requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<HoaDonResponseDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByStatus(trangThai, requireAuthenticatedEmployee(request)));
    }

    public record RefundRequest(String lyDoHoan) {}

    @PostMapping
    @PreAuthorize("hasAuthority('order:create')")
    public ResponseEntity<?> create(@RequestBody HoaDonRequestDTO request) {
        return ResponseEntity.ok(hoaDonService.create(request));
    }

    public ResponseEntity<?> create(HoaDon request) {
        return ResponseEntity.ok(hoaDonService.create(request));
    }

    @PostMapping("/with-lines")
    @PreAuthorize("hasAuthority('order:create')")
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreateSaleRequestDTO request, HttpServletRequest httpRequest) {
        UUID authenticatedCashierId = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(hoaDonService.createWithLines(request, authenticatedCashierId));
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasAuthority('order:create')")
    public ResponseEntity<?> checkout(@Valid @RequestBody CheckoutRequestDTO request, HttpServletRequest httpRequest) {
        UUID cashierId = resolveAuthenticatedIdNhanVien(httpRequest);
        if (cashierId == null) {
            return ResponseEntity.status(401).body(ApiResponse.err("Không xác định được nhân viên đăng nhập"));
        }
        NhanVien cashier = nhanVienRepository.findById(cashierId).orElseThrow();
        HoaDonResponseDTO created = hoaDonService.checkout(request, cashierId, cashier);
        return ResponseEntity.status(201).body(created);
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAuthority('order:cancel')")
    public ResponseEntity<HoaDonResponseDTO> refund(@PathVariable UUID id,
                                                    @RequestBody(required = false) RefundRequestDTO body,
                                                    HttpServletRequest httpRequest) {
        NhanVien actor = requireAuthenticatedEmployee(httpRequest);
        String lyDo = (body != null) ? body.lyDoHoan() : null;
        return ResponseEntity.ok(hoaDonService.refund(id, lyDo, actor));
    }

    public ResponseEntity<HoaDonResponseDTO> refund(UUID id, RefundRequest body, HttpServletRequest httpRequest) {
        NhanVien actor = requireAuthenticatedEmployee(httpRequest);
        String lyDo = (body != null) ? body.lyDoHoan() : null;
        return ResponseEntity.ok(hoaDonService.refund(id, lyDo, actor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('order:update')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody HoaDonRequestDTO request) {
        return hoaDonService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('order:delete')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (hoaDonService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa hóa đơn thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
