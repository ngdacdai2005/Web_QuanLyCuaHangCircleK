package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.DonNghiPhepRequestDTO;
import com.erp.cuahangtienloi.dto.response.DonNghiPhepResponseDTO;
import com.erp.cuahangtienloi.service.DonNghiPhepService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/don-nghi-phep")
@RequiredArgsConstructor
public class DonNghiPhepController {

    private final DonNghiPhepService donNghiPhepService;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody DonNghiPhepRequestDTO request, HttpServletRequest httpRequest) {
        return donNghiPhepService.create(request, httpRequest);
    }

    @GetMapping({"/my-requests", "/my"})
    public ResponseEntity<List<DonNghiPhepResponseDTO>> getMyRequests(HttpServletRequest httpRequest) {
        return ResponseEntity.ok(donNghiPhepService.getMyRequests(httpRequest));
    }

    @GetMapping
    public ResponseEntity<List<DonNghiPhepResponseDTO>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID branchId,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(donNghiPhepService.getAll(status, branchId, httpRequest));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return donNghiPhepService.approve(id, httpRequest);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest httpRequest) {
        String reason = body != null ? body.get("lyDoTuChoi") : null;
        return donNghiPhepService.reject(id, reason, httpRequest);
    }
}
