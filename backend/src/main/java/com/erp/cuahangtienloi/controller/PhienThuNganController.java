package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.request.BanGiaoPhienThuNganRequestDTO;
import com.erp.cuahangtienloi.dto.request.ChotPhienThuNganRequestDTO;
import com.erp.cuahangtienloi.dto.request.GiaoDichQuyCaRequestDTO;
import com.erp.cuahangtienloi.dto.request.MoPhienThuNganRequestDTO;
import com.erp.cuahangtienloi.dto.response.DoiSoatPhienThuNganDTO;
import com.erp.cuahangtienloi.dto.response.PhienThuNganResponseDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhienThuNganService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phien-thu-ngan")
@RequiredArgsConstructor
public class PhienThuNganController {

    private final PhienThuNganService phienThuNganService;
    private final BranchAccessService branchAccessService;

    // 1. Mở ca & Nhận quỹ đầu ca
    @PostMapping("/mo-ca")
    public ResponseEntity<PhienThuNganResponseDTO> moCa(
            @Valid @RequestBody MoPhienThuNganRequestDTO request,
            HttpServletRequest httpRequest) {
        NhanVien cashier = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phienThuNganService.moPhien(request, cashier));
    }

    // 2. Lấy thông tin phiên ca đang mở của thu ngân hiện tại
    @GetMapping("/hien-tai")
    public ResponseEntity<PhienThuNganResponseDTO> getPhienHienTai(HttpServletRequest httpRequest) {
        NhanVien cashier = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        PhienThuNganResponseDTO phien = phienThuNganService.getPhienHienTai(cashier);
        return ResponseEntity.ok(phien);
    }

    // 3. Đối soát tự động dòng tiền của phiên ca (Dự kiến vs Thực tế)
    @GetMapping("/{id}/doi-soat")
    public ResponseEntity<DoiSoatPhienThuNganDTO> getDoiSoat(@PathVariable UUID id) {
        return ResponseEntity.ok(phienThuNganService.tinhDoiSoat(id));
    }

    // 4. Chốt ca (Kiểm đếm tiền thực tế & Ghi nhận chênh lệch)
    @PostMapping("/{id}/chot-ca")
    public ResponseEntity<PhienThuNganResponseDTO> chotCa(
            @PathVariable UUID id,
            @Valid @RequestBody ChotPhienThuNganRequestDTO request,
            HttpServletRequest httpRequest) {
        NhanVien cashier = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phienThuNganService.chotPhien(id, request, cashier));
    }

    // 5. Bàn giao ca cho người tiếp quản hoặc Quản lý
    @PostMapping("/{id}/ban-giao")
    public ResponseEntity<PhienThuNganResponseDTO> banGiao(
            @PathVariable UUID id,
            @Valid @RequestBody BanGiaoPhienThuNganRequestDTO request,
            HttpServletRequest httpRequest) {
        NhanVien cashier = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phienThuNganService.banGiaoPhien(id, request, cashier));
    }

    // 6. Người nhận xác nhận nhận bàn giao ca
    @PostMapping("/{id}/xac-nhan-ban-giao")
    public ResponseEntity<PhienThuNganResponseDTO> xacNhanNhanBanGiao(
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        NhanVien receiver = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phienThuNganService.xacNhanNhanBanGiao(id, receiver));
    }

    // 7. Ghi nhận nộp két an toàn (Drop Safe) hoặc thu chi phụ trong ca
    @PostMapping("/giao-dich-quy")
    public ResponseEntity<?> themGiaoDichQuy(
            @Valid @RequestBody GiaoDichQuyCaRequestDTO request,
            HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phienThuNganService.themGiaoDichQuy(request, actor));
    }

    // 8. Lấy danh sách lịch sử các phiên ca (cho Quản lý / Giám sát)
    @GetMapping
    public ResponseEntity<List<PhienThuNganResponseDTO>> getDanhSachPhien(
            @RequestParam(required = false) UUID branchId,
            HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phienThuNganService.getDanhSachPhien(branchId, actor));
    }

    // 9. Lấy danh sách nhân viên cùng chi nhánh để bàn giao ca
    @GetMapping("/nhan-vien-ban-giao")
    public ResponseEntity<List<com.erp.cuahangtienloi.dto.response.NhanVienResponseDTO>> getNhanVienBanGiao(HttpServletRequest httpRequest) {
        NhanVien cashier = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phienThuNganService.getDanhSachNhanVienBanGiao(cashier));
    }
}
