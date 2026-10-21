package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.request.DonNghiPhepRequestDTO;
import com.erp.cuahangtienloi.dto.response.DonNghiPhepResponseDTO;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.entity.DonNghiPhep;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.mapper.DonNghiPhepMapper;
import com.erp.cuahangtienloi.repository.ChamCongRepository;
import com.erp.cuahangtienloi.repository.DonNghiPhepRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DonNghiPhepService {

    private final DonNghiPhepRepository donNghiPhepRepository;
    private final DonNghiPhepMapper donNghiPhepMapper;
    private final NhanVienRepository nhanVienRepository;
    private final ChamCongRepository chamCongRepository;
    private final BranchAccessService branchAccessService;

    @Transactional
    public ResponseEntity<?> create(DonNghiPhepRequestDTO request, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        UUID targetEmployeeId = request.getIdNhanVien() != null ? request.getIdNhanVien() : actor.getId();

        // Kiểm tra quyền: nhân viên tự nộp hoặc quản lý nộp hộ
        if (!targetEmployeeId.equals(actor.getId()) && !branchAccessService.isSystemWide(actor) && !"QUAN_LY".equals(actor.getVaiTro())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền nộp đơn cho nhân viên khác");
        }

        if (request.getTuNgay() == null || request.getDenNgay() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Ngày bắt đầu và ngày kết thúc không được để trống"));
        }

        if (request.getDenNgay().isBefore(request.getTuNgay())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Ngày kết thúc không được trước ngày bắt đầu"));
        }

        DonNghiPhep entity = donNghiPhepMapper.toEntity(request);
        entity.setIdNhanVien(targetEmployeeId);
        
        // Gán chi nhánh
        if (entity.getIdChiNhanh() == null) {
            nhanVienRepository.findById(targetEmployeeId).ifPresent(nv -> entity.setIdChiNhanh(nv.getIdChiNhanh()));
        }

        // Tính số ngày nghỉ nếu chưa nhập
        if (entity.getSoNgayNghi() == null || entity.getSoNgayNghi().compareTo(BigDecimal.ZERO) <= 0) {
            long days = ChronoUnit.DAYS.between(request.getTuNgay(), request.getDenNgay()) + 1;
            entity.setSoNgayNghi(BigDecimal.valueOf(days));
        }

        entity.setTrangThai("PENDING");
        entity.setNgayTao(LocalDateTime.now());

        DonNghiPhep saved = donNghiPhepRepository.save(entity);
        return ResponseEntity.ok(donNghiPhepMapper.toResponse(saved));
    }

    public List<DonNghiPhepResponseDTO> getMyRequests(HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return donNghiPhepRepository.findByIdNhanVienOrderByNgayTaoDesc(actor.getId())
                .stream()
                .map(donNghiPhepMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<DonNghiPhepResponseDTO> getAll(String status, UUID branchId, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);

        List<DonNghiPhep> list;
        if (branchAccessService.isSystemWide(actor)) {
            if (branchId != null) {
                list = donNghiPhepRepository.findByIdChiNhanhOrderByNgayTaoDesc(branchId);
            } else {
                list = donNghiPhepRepository.findAllByOrderByNgayTaoDesc();
            }
        } else {
            UUID userBranch = actor.getIdChiNhanh();
            if (userBranch == null) {
                return List.of();
            }
            list = donNghiPhepRepository.findByIdChiNhanhOrderByNgayTaoDesc(userBranch);
        }

        if (status != null && !status.isBlank()) {
            list = list.stream()
                    .filter(d -> status.equalsIgnoreCase(d.getTrangThai()))
                    .collect(Collectors.toList());
        }

        return list.stream()
                .map(donNghiPhepMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ResponseEntity<?> approve(UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        if (!branchAccessService.isSystemWide(actor) && !"QUAN_LY".equals(actor.getVaiTro())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ Quản lý hoặc Admin mới có quyền duyệt đơn nghỉ phép");
        }

        Optional<DonNghiPhep> opt = donNghiPhepRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        DonNghiPhep don = opt.get();
        if ("APPROVED".equals(don.getTrangThai())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Đơn này đã được duyệt trước đó"));
        }

        don.setTrangThai("APPROVED");
        don.setIdNguoiDuyet(actor.getId());
        don.setNgayDuyet(LocalDateTime.now());
        donNghiPhepRepository.save(don);

        // TỰ ĐỘNG CẬP NHẬT HOẶC TẠO LỊCH CHẤM CÔNG THÀNH 'LEAVE' CHO CÁC NGÀY NGHỈ
        NhanVien targetEmp = nhanVienRepository.findById(don.getIdNhanVien()).orElse(null);
        String defaultCa = (targetEmp != null && targetEmp.getCaMacDinh() != null) ? targetEmp.getCaMacDinh() : "MORNING";

        LocalDate cur = don.getTuNgay();
        LocalDate end = don.getDenNgay();
        String leaveNote = "Nghỉ phép (" + don.getLoaiNghi() + ")" + (don.getLyDo() != null && !don.getLyDo().isBlank() ? ": " + don.getLyDo() : "");

        while (!cur.isAfter(end)) {
            List<ChamCong> existingList = chamCongRepository.findByIdNhanVienAndWorkDate(don.getIdNhanVien(), cur);
            if (!existingList.isEmpty()) {
                for (ChamCong cc : existingList) {
                    cc.setTrangThai("LEAVE");
                    cc.setGhiChu(leaveNote);
                    cc.setNgayCapNhat(LocalDateTime.now());
                    chamCongRepository.save(cc);
                }
            } else {
                ChamCong newCc = new ChamCong();
                newCc.setId(UUID.randomUUID());
                newCc.setIdNhanVien(don.getIdNhanVien());
                newCc.setWorkDate(cur);
                newCc.setCaLamViec(defaultCa);
                newCc.setCheckInAt(plannedCheckIn(cur, defaultCa));
                newCc.setCheckOutAt(plannedCheckOut(cur, defaultCa));
                newCc.setOvertimeHours(BigDecimal.ZERO);
                newCc.setBreakHours(BigDecimal.ZERO);
                newCc.setTrangThai("LEAVE");
                newCc.setDaThanhToan(false);
                newCc.setGhiChu(leaveNote);
                newCc.setNgayTao(LocalDateTime.now());
                newCc.setNgayCapNhat(LocalDateTime.now());
                chamCongRepository.save(newCc);
            }
            cur = cur.plusDays(1);
        }

        return ResponseEntity.ok(donNghiPhepMapper.toResponse(don));
    }

    private LocalDateTime plannedCheckIn(LocalDate workDate, String caLamViec) {
        int startHour = "MORNING".equals(caLamViec) ? 6 : "AFTERNOON".equals(caLamViec) ? 14 : 22;
        return LocalDateTime.of(workDate, java.time.LocalTime.of(startHour, 0));
    }

    private LocalDateTime plannedCheckOut(LocalDate workDate, String caLamViec) {
        if ("NIGHT".equals(caLamViec)) {
            return LocalDateTime.of(workDate.plusDays(1), java.time.LocalTime.of(6, 0));
        }
        int endHour = "MORNING".equals(caLamViec) ? 14 : 22;
        return LocalDateTime.of(workDate, java.time.LocalTime.of(endHour, 0));
    }

    @Transactional
    public ResponseEntity<?> reject(UUID id, String lyDoTuChoi, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        if (!branchAccessService.isSystemWide(actor) && !"QUAN_LY".equals(actor.getVaiTro())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ Quản lý hoặc Admin mới có quyền từ chối đơn nghỉ phép");
        }

        Optional<DonNghiPhep> opt = donNghiPhepRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        DonNghiPhep don = opt.get();
        don.setTrangThai("REJECTED");
        don.setIdNguoiDuyet(actor.getId());
        don.setLyDoTuChoi(lyDoTuChoi);
        don.setNgayDuyet(LocalDateTime.now());
        donNghiPhepRepository.save(don);

        return ResponseEntity.ok(donNghiPhepMapper.toResponse(don));
    }
}
