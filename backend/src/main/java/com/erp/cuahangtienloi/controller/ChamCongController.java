package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.response.ChamCongResponseDTO;
import com.erp.cuahangtienloi.dto.request.ChamCongRequestDTO;
import com.erp.cuahangtienloi.service.ChamCongService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cham-cong")
@RequiredArgsConstructor
public class ChamCongController {

    private final ChamCongService chamCongService;

    @GetMapping
    @PreAuthorize("hasAuthority('attendance:read') or hasAuthority('attendance:checkin')")
    public ResponseEntity<List<ChamCongResponseDTO>> getAll(HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getAll(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:read') or hasAuthority('attendance:checkin')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return chamCongService.getById(id, request);
    }

    @GetMapping("/by-employee/{idNhanVien}")
    @PreAuthorize("hasAuthority('attendance:read') or hasAuthority('attendance:checkin')")
    public ResponseEntity<List<ChamCongResponseDTO>> getByNhanVien(@PathVariable UUID idNhanVien, HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getByNhanVien(idNhanVien, request));
    }

    @GetMapping("/by-date/{workDate}")
    @PreAuthorize("hasAuthority('attendance:read') or hasAuthority('attendance:checkin')")
    public ResponseEntity<List<ChamCongResponseDTO>> getByDate(@PathVariable LocalDate workDate, HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getByDate(workDate, request));
    }

    @GetMapping("/by-employee/{idNhanVien}/from/{from}/to/{to}")
    @PreAuthorize("hasAuthority('attendance:read') or hasAuthority('attendance:checkin')")
    public ResponseEntity<List<ChamCongResponseDTO>> getByNhanVienAndDateRange(
            @PathVariable UUID idNhanVien,
            @PathVariable LocalDate from,
            @PathVariable LocalDate to, HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getByNhanVienAndDateRange(idNhanVien, from, to, request));
    }

    @GetMapping("/by-date-range")
    @PreAuthorize("hasAuthority('attendance:read') or hasAuthority('attendance:checkin')")
    public ResponseEntity<List<ChamCongResponseDTO>> getByDateRange(
            @RequestParam("from") LocalDate start,
            @RequestParam("to") LocalDate end, HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getByDateRange(start, end, request));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('attendance:update') or hasAuthority('attendance:approve')")
    public ResponseEntity<?> create(@RequestBody ChamCongRequestDTO request, HttpServletRequest httpRequest) {
        return chamCongService.create(request, httpRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:update') or hasAuthority('attendance:approve')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ChamCongRequestDTO request, HttpServletRequest httpRequest) {
        return chamCongService.update(id, request, httpRequest);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:update') or hasAuthority('attendance:approve')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        return chamCongService.delete(id);
    }

    @PostMapping("/schedule/{idNhanVien}")
    @PreAuthorize("hasAuthority('attendance:update') or hasAuthority('attendance:approve')")
    public ResponseEntity<?> scheduleForEmployee(
            @PathVariable UUID idNhanVien,
            @RequestParam(required = false) String workDate, HttpServletRequest httpRequest) {
        return chamCongService.scheduleForEmployee(idNhanVien, workDate, httpRequest);
    }

    @PostMapping("/{id}/clock-in")
    @PreAuthorize("hasAuthority('attendance:checkin')")
    public ResponseEntity<?> clockIn(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return chamCongService.clockIn(id, httpRequest);
    }

    @PostMapping("/{id}/clock-out")
    @PreAuthorize("hasAuthority('attendance:checkin')")
    public ResponseEntity<?> clockOut(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return chamCongService.clockOut(id, httpRequest);
    }

    @PostMapping("/schedule-range/{idNhanVien}")
    @PreAuthorize("hasAuthority('attendance:update') or hasAuthority('attendance:approve')")
    public ResponseEntity<?> scheduleRange(
            @PathVariable UUID idNhanVien,
            @RequestParam("from") String fromDate,
            @RequestParam("to") String toDate, HttpServletRequest httpRequest) {
        return chamCongService.scheduleRange(idNhanVien, fromDate, toDate, httpRequest);
    }
}
