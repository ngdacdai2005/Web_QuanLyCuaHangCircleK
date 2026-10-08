package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.HopDongDTO;
import com.erp.cuahangtienloi.dto.HopDongRejectDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.HopDongService;
import com.erp.cuahangtienloi.service.HopDongService.FilePayload;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hop-dong")
@RequiredArgsConstructor
public class HopDongController {

    private static final String VIEW = "hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')";
    private static final String WRITE = "hasAnyRole('ADMIN', 'KE_TOAN')";
    private static final String APPROVE = "hasRole('ADMIN')";

    private final HopDongService hopDongService;
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize(VIEW)
    public ResponseEntity<List<HopDongDTO>> list(
            @RequestParam(name = "idNcc", required = false) UUID idNcc,
            @RequestParam(name = "trangThai", required = false) String trangThai) {
        return ResponseEntity.ok(hopDongService.list(idNcc, trangThai));
    }

    @GetMapping("/sap-het-han")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<List<HopDongDTO>> sapHetHan(
            @RequestParam(name = "days", defaultValue = "30") int days) {
        return ResponseEntity.ok(hopDongService.sapHetHan(days));
    }

    @GetMapping("/{id}")
    @PreAuthorize(VIEW)
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return hopDongService.getById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/file")
    @PreAuthorize(VIEW)
    public ResponseEntity<?> downloadFile(@PathVariable UUID id) {
        return hopDongService.downloadFile(id).map(payload -> {
            String media = payload.contentType() != null
                    ? payload.contentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
            ContentDisposition cd = ContentDisposition.attachment()
                    .filename(payload.fileName(), StandardCharsets.UTF_8).build();
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(media))
                    .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                    .body(payload.resource());
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize(WRITE)
    public ResponseEntity<?> create(
            @RequestPart("hopDong") HopDongDTO request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(hopDongService.create(request, file, actor.getId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize(WRITE)
    public ResponseEntity<?> update(
            @PathVariable UUID id,
            @RequestPart("hopDong") HopDongDTO request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return hopDongService.update(id, request, file, actor.getId())
                .map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/trinh")
    @PreAuthorize(WRITE)
    public ResponseEntity<?> submit(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return hopDongService.submit(id, actor.getId())
                .map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/duyet")
    @PreAuthorize(APPROVE)
    public ResponseEntity<?> approve(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return hopDongService.approve(id, actor.getId())
                .map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/tu-choi")
    @PreAuthorize(APPROVE)
    public ResponseEntity<?> reject(@PathVariable UUID id,
                                    @RequestBody HopDongRejectDTO body,
                                    HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return hopDongService.reject(id, body.getLyDo(), actor.getId())
                .map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/huy")
    @PreAuthorize(WRITE)
    public ResponseEntity<?> cancel(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return hopDongService.cancel(id, actor.getId())
                .map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (hopDongService.delete(id)) return ResponseEntity.ok().build();
        return ResponseEntity.notFound().build();
    }
}