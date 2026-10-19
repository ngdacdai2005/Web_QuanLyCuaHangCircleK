package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.BangLuongRequestDTO;
import com.erp.cuahangtienloi.dto.request.BatchApproveRequestDTO;
import com.erp.cuahangtienloi.dto.request.HourAdjustmentRequestDTO;
import com.erp.cuahangtienloi.dto.response.BangLuongResponseDTO;
import com.erp.cuahangtienloi.service.BangLuongService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bang-luong")
@RequiredArgsConstructor
public class BangLuongController {

    private final BangLuongService bangLuongService;

    @PostMapping("/generate/{thangNam}")
    @PreAuthorize("hasAuthority('payroll:calculate')")
    public ResponseEntity<?> generateForMonth(@PathVariable String thangNam) {
        return bangLuongService.generateForMonth(thangNam);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('payroll:read')")
    public ResponseEntity<List<BangLuongResponseDTO>> getAll(
            @RequestParam(required = false) String period, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getAll(period, request));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BangLuongResponseDTO>> getMine(
            @RequestParam(required = false) String period, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getMine(period, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('payroll:read')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return bangLuongService.getById(id, request);
    }

    @GetMapping("/by-employee/{idNhanVien}")
    @PreAuthorize("hasAuthority('payroll:read')")
    public ResponseEntity<List<BangLuongResponseDTO>> getByNhanVien(@PathVariable UUID idNhanVien, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getByNhanVien(idNhanVien, request));
    }

    @GetMapping("/by-month/{thangNam}")
    @PreAuthorize("hasAuthority('payroll:read')")
    public ResponseEntity<List<BangLuongResponseDTO>> getByThangNam(@PathVariable String thangNam, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getByThangNam(thangNam, request));
    }

    @GetMapping("/by-branch/{idChiNhanh}/month/{thangNam}")
    @PreAuthorize("hasAuthority('payroll:read')")
    public ResponseEntity<List<BangLuongResponseDTO>> getByChiNhanhAndThangNam(
            @PathVariable UUID idChiNhanh, @PathVariable String thangNam, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getByChiNhanhAndThangNam(idChiNhanh, thangNam, request));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAuthority('payroll:read')")
    public ResponseEntity<List<BangLuongResponseDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getByStatus(trangThai, request));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('payroll:calculate')")
    public ResponseEntity<?> create(@RequestBody BangLuongRequestDTO request) {
        return bangLuongService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('payroll:calculate') or hasAuthority('payroll:approve')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody BangLuongRequestDTO request, HttpServletRequest httpRequest) {
        return bangLuongService.update(id, request, httpRequest);
    }

    @PatchMapping("/{id}/hours-adjustment")
    @PreAuthorize("hasAuthority('payroll:approve') or hasAuthority('payroll:calculate')")
    public ResponseEntity<?> adjustHours(@PathVariable UUID id,
                                         @RequestBody HourAdjustmentRequestDTO request,
                                         HttpServletRequest httpRequest) {
        return bangLuongService.adjustHours(id, request, httpRequest);
    }

    @PostMapping("/{id}/confirm-hours")
    @PreAuthorize("hasAuthority('payroll:approve') or hasAuthority('payroll:calculate')")
    public ResponseEntity<?> confirmHours(@PathVariable UUID id, HttpServletRequest request) {
        return bangLuongService.confirmHours(id, request);
    }

    @PostMapping("/{id}/approve-payment")
    @PreAuthorize("hasAuthority('payroll:approve')")
    public ResponseEntity<?> approvePayment(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.approvePayment(id, request));
    }

    @PostMapping("/approve-payment/batch")
    @PreAuthorize("hasAuthority('payroll:approve')")
    public ResponseEntity<?> approvePaymentBatch(@RequestBody BatchApproveRequestDTO request,
                                                  HttpServletRequest httpRequest) {
        return ResponseEntity.ok(bangLuongService.approvePaymentBatch(request, httpRequest));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('payroll:approve')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        return bangLuongService.delete(id);
    }
}
