package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.ChangePasswordRequestDTO;
import com.erp.cuahangtienloi.dto.request.CreateTaiKhoanRequestDTO;
import com.erp.cuahangtienloi.dto.response.NhanVienOption;
import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.TaiKhoanResponseDTO;
import com.erp.cuahangtienloi.dto.request.UpdateTaiKhoanRequestDTO;
import com.erp.cuahangtienloi.service.TaiKhoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tai-khoan")
@RequiredArgsConstructor
public class TaiKhoanController {

    private final TaiKhoanService taiKhoanService;

    @GetMapping
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<List<TaiKhoanResponseDTO>> getAllTaiKhoan() {
        return ResponseEntity.ok(taiKhoanService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<?> getTaiKhoanById(@PathVariable UUID id) {
        return taiKhoanService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('user:create')")
    public ResponseEntity<?> createTaiKhoan(@Valid @RequestBody CreateTaiKhoanRequestDTO request) {
        taiKhoanService.create(request);
        return ResponseEntity.ok(ApiResponse.ok("Tạo tài khoản thành công"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('user:update')")
    public ResponseEntity<?> updateTaiKhoan(@PathVariable UUID id, @Valid @RequestBody UpdateTaiKhoanRequestDTO request) {
        return taiKhoanService.update(id, request)
                .map(tk -> ResponseEntity.ok(ApiResponse.ok("Cập nhật thành công")))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('user:delete')")
    public ResponseEntity<?> deleteTaiKhoan(@PathVariable UUID id) {
        if (taiKhoanService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa tài khoản thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/nhan-vien")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<List<NhanVienOption>> getNhanVienChuaCoTaiKhoan() {
        return ResponseEntity.ok(taiKhoanService.getNhanVienChuaCoTaiKhoan());
    }

    @PutMapping("/{id}/change-password")
    @PreAuthorize("hasAuthority('user:update') or authentication.name == #id.toString()")
    public ResponseEntity<?> changePassword(
            @PathVariable UUID id,
            @Valid @RequestBody ChangePasswordRequestDTO request) {
        if (taiKhoanService.changePassword(id, request)) {
            return ResponseEntity.ok(ApiResponse.ok("Đổi mật khẩu thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
