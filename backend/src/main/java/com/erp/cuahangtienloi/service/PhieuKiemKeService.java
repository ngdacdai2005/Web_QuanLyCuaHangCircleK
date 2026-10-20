package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.ChiTietKiemKeRequestDTO;
import com.erp.cuahangtienloi.dto.response.ChiTietKiemKeResponseDTO;
import com.erp.cuahangtienloi.dto.response.PhieuKiemKeResponseDTO;
import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuKiemKe;
import com.erp.cuahangtienloi.mapper.ChiTietKiemKeMapper;
import com.erp.cuahangtienloi.mapper.PhieuKiemKeMapper;
import com.erp.cuahangtienloi.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhieuKiemKeService {

    private final PhieuKiemKeRepository phieuKiemKeRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiTietKiemKeRepository chiTietKiemKeRepository;
    private final SanPhamRepository sanPhamRepository;
    private final TonKhoRepository tonKhoRepository;
    private final BranchAccessService branchAccessService;
    private final JdbcTemplate jdbcTemplate;
    private final PhieuKiemKeMapper phieuKiemKeMapper;
    private final ChiTietKiemKeMapper chiTietKiemKeMapper;
    private final NotificationHelper notificationHelper;

    public static class CreateStocktakeRequest extends com.erp.cuahangtienloi.dto.request.CreateStocktakeRequestDTO {}
    public static class CreateStocktakeLineRequest extends com.erp.cuahangtienloi.dto.request.CreateStocktakeLineDTO {}

    @Transactional(readOnly = true)
    public List<PhieuKiemKeResponseDTO> getAll(NhanVien actor) {
        return phieuKiemKeRepository.findAll().stream()
                .filter(pkk -> branchAccessService.canReadBranch(actor, pkk.getIdChiNhanh()))
                .map(phieuKiemKeMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<PhieuKiemKeResponseDTO> getById(UUID id, NhanVien actor) {
        return phieuKiemKeRepository.findById(id)
                .filter(pkk -> branchAccessService.canReadBranch(actor, pkk.getIdChiNhanh()))
                .map(phieuKiemKeMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<PhieuKiemKeResponseDTO> getByChiNhanh(UUID idChiNhanh, NhanVien actor) {
        branchAccessService.requireReadableBranch(actor, idChiNhanh);
        return phieuKiemKeRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(phieuKiemKeMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PhieuKiemKeResponseDTO> getByStatus(String trangThai, NhanVien actor) {
        return phieuKiemKeRepository.findByTrangThai(trangThai).stream()
                .filter(pkk -> branchAccessService.canReadBranch(actor, pkk.getIdChiNhanh()))
                .map(phieuKiemKeMapper::toResponse)
                .toList();
    }

    @Transactional
    public PhieuKiemKeResponseDTO create(PhieuKiemKe request, UUID idNguoiTao, NhanVien actor) {
        if (request.getIdChiNhanh() == null || !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            throw new IllegalArgumentException("Chi nhánh không tồn tại");
        }
        branchAccessService.requireReadableBranch(actor, request.getIdChiNhanh());
        PhieuKiemKe pkk = new PhieuKiemKe();
        pkk.setId(UUID.randomUUID());
        pkk.setMaPhieu(sinhMaPhieuKiemKe(
                request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now()));
        pkk.setIdChiNhanh(request.getIdChiNhanh());
        pkk.setIdNguoiTao(idNguoiTao);
        pkk.setIdNguoiDuyet(null);
        pkk.setNgayKiemKe(request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now());
        pkk.setNgayCanBang(null);
        pkk.setTrangThai("DANG_KIEM_KE");
        pkk.setGhiChu(request.getGhiChu());
        pkk.setNgayTao(LocalDateTime.now());
        pkk.setNgayCapNhat(LocalDateTime.now());

        PhieuKiemKe created = phieuKiemKeRepository.saveAndFlush(pkk);
        return phieuKiemKeMapper.toResponse(created);
    }

    @Transactional
    public PhieuKiemKeResponseDTO createWithLines(com.erp.cuahangtienloi.dto.request.CreateStocktakeRequestDTO request, UUID idNguoiTao, NhanVien actor) {
        if (request.getIdChiNhanh() == null) {
            throw new IllegalArgumentException("Thiếu chi nhánh");
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new IllegalArgumentException("Thiếu danh sách sản phẩm kiểm kê");
        }
        if (!chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            throw new IllegalArgumentException("Chi nhánh không tồn tại");
        }
        branchAccessService.requireReadableBranch(actor, request.getIdChiNhanh());
        for (com.erp.cuahangtienloi.dto.request.CreateStocktakeLineDTO line : request.getLines()) {
            if (line.getIdSanPham() == null || !sanPhamRepository.existsById(line.getIdSanPham())) {
                throw new IllegalArgumentException("Sản phẩm kiểm kê không tồn tại");
            }
        }

        PhieuKiemKe pkk = new PhieuKiemKe();
        pkk.setId(UUID.randomUUID());
        pkk.setIdChiNhanh(request.getIdChiNhanh());
        pkk.setIdNguoiTao(idNguoiTao);
        pkk.setNgayKiemKe(request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now());
        pkk.setTrangThai("DANG_KIEM_KE");
        pkk.setGhiChu(request.getGhiChu());
        pkk.setNgayTao(LocalDateTime.now());
        pkk.setNgayCapNhat(LocalDateTime.now());
        pkk.setMaPhieu(sinhMaPhieuKiemKe(pkk.getNgayKiemKe()));
        PhieuKiemKe savedHeader = phieuKiemKeRepository.saveAndFlush(pkk);

        List<ChiTietKiemKe> lines = new ArrayList<>();
        for (com.erp.cuahangtienloi.dto.request.CreateStocktakeLineDTO line : request.getLines()) {
            var tonKho = tonKhoRepository.findByIdSanPhamAndIdChiNhanh(
                    line.getIdSanPham(), request.getIdChiNhanh()).orElse(null);
            int tonHeThong = tonKho != null && tonKho.getSoLuongTon() != null
                    ? tonKho.getSoLuongTon() : 0;
            BigDecimal donGiaVon = tonKho != null && tonKho.getGiaVonTrungBinh() != null
                    ? tonKho.getGiaVonTrungBinh() : BigDecimal.ZERO;
            int soLuongLech = line.getTonThucTe() - tonHeThong;
            if (soLuongLech != 0 && (line.getLyDoLech() == null || line.getLyDoLech().isBlank())) {
                throw new IllegalArgumentException("Phải nhập nguyên nhân cho sản phẩm có chênh lệch tồn kho");
            }
            ChiTietKiemKe ct = new ChiTietKiemKe();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuKiemKe(savedHeader.getId());
            ct.setIdSanPham(line.getIdSanPham());
            ct.setTonHeThong(tonHeThong);
            ct.setTonThucTe(line.getTonThucTe());
            ct.setSoLuongLech(soLuongLech);
            ct.setLyDoLech(line.getLyDoLech());
            ct.setDonGiaVon(donGiaVon);
            ct.setGiaTriLech(donGiaVon.multiply(BigDecimal.valueOf(soLuongLech)));
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        chiTietKiemKeRepository.saveAll(lines);
        chiTietKiemKeRepository.flush();

        return phieuKiemKeMapper.toResponse(savedHeader);
    }

    @Transactional
    public Optional<PhieuKiemKeResponseDTO> update(UUID id, PhieuKiemKe request, NhanVien actor) {
        return phieuKiemKeRepository.findById(id)
                .map(pkk -> {
                    branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
                    requireEditable(pkk);
                    if (request.getMaPhieu() != null) pkk.setMaPhieu(request.getMaPhieu());
                    if (request.getIdChiNhanh() != null && !request.getIdChiNhanh().equals(pkk.getIdChiNhanh())) {
                        if (!"ADMIN".equals(actor.getVaiTro())) {
                            throw new org.springframework.web.server.ResponseStatusException(
                                    org.springframework.http.HttpStatus.FORBIDDEN,
                                    "Chỉ Admin được đổi chi nhánh của phiếu kiểm kê");
                        }
                        if (!chiNhanhRepository.existsById(request.getIdChiNhanh())) {
                            throw new IllegalArgumentException("Chi nhánh không tồn tại");
                        }
                        pkk.setIdChiNhanh(request.getIdChiNhanh());
                    }
                    if (request.getTrangThai() != null || request.getNgayCanBang() != null) {
                        throw new IllegalArgumentException("Không đổi trạng thái hoặc cân bằng qua PUT; hãy dùng endpoint /balance");
                    }
                    if (request.getGhiChu() != null) pkk.setGhiChu(request.getGhiChu());
                    pkk.setNgayCapNhat(LocalDateTime.now());
                    phieuKiemKeRepository.save(pkk);
                    return phieuKiemKeMapper.toResponse(pkk);
                });
    }

    @Transactional
    public PhieuKiemKeResponseDTO create(com.erp.cuahangtienloi.dto.request.PhieuKiemKeRequestDTO request, UUID idNguoiTao, NhanVien actor) {
        return create(phieuKiemKeMapper.toEntity(request), idNguoiTao, actor);
    }

    @Transactional
    public Optional<PhieuKiemKeResponseDTO> update(UUID id, com.erp.cuahangtienloi.dto.request.PhieuKiemKeRequestDTO request, NhanVien actor) {
        return update(id, phieuKiemKeMapper.toEntity(request), actor);
    }

    @Transactional
    public PhieuKiemKeResponseDTO submit(UUID id, NhanVien actor) {
        PhieuKiemKe pkk = phieuKiemKeRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy phiếu kiểm kê"));
        branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
        requireEditable(pkk);
        if (!"ADMIN".equals(actor.getVaiTro()) && !actor.getId().equals(pkk.getIdNguoiTao())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Chỉ người tạo phiếu mới được gửi duyệt");
        }
        if (chiTietKiemKeRepository.findByIdPhieuKiemKe(id).isEmpty()) {
            throw new IllegalArgumentException("Phiếu kiểm kê phải có ít nhất một dòng");
        }
        pkk.setTrangThai("CHO_DUYET");
        pkk.setNgayCapNhat(LocalDateTime.now());
        PhieuKiemKe saved = phieuKiemKeRepository.save(pkk);
        notificationHelper.notifyStocktakeSubmitted(saved, actor != null ? actor.getHoTen() : "Hệ thống");
        return phieuKiemKeMapper.toResponse(saved);
    }

    @Transactional
    public PhieuKiemKeResponseDTO balance(UUID id, NhanVien actor) {
        PhieuKiemKe pkk = phieuKiemKeRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy phiếu kiểm kê"));
        branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
        if (!"CHO_DUYET".equals(pkk.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ cân bằng được phiếu đang chờ duyệt");
        }
        boolean isAdmin = "ADMIN".equals(actor.getVaiTro());
        boolean isAccountantApprovingAnotherPerson = "KE_TOAN".equals(actor.getVaiTro())
                && !actor.getId().equals(pkk.getIdNguoiTao());
        if (!isAdmin && !isAccountantApprovingAnotherPerson) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Chỉ Admin hoặc Kế toán duyệt phiếu của người khác mới được cân bằng kho");
        }

        jdbcTemplate.query(
                "SELECT fn_can_bang_kiem_ke(?::uuid, ?::uuid, CURRENT_DATE, ?::varchar, NULL::text)",
                rs -> { }, id, actor.getId(), actor.getHoTen());

        PhieuKiemKe updated = phieuKiemKeRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Không tìm thấy phiếu kiểm kê sau khi cân bằng"));

        notificationHelper.notifyStocktakeBalanced(updated, actor != null ? actor.getHoTen() : "Hệ thống");
        return phieuKiemKeMapper.toResponse(updated);
    }

    @Transactional
    public PhieuKiemKeResponseDTO cancel(UUID id, NhanVien actor) {
        PhieuKiemKe pkk = phieuKiemKeRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy phiếu kiểm kê"));
        branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
        if ("DA_CAN_BANG".equals(pkk.getTrangThai()) || "CANCELLED".equals(pkk.getTrangThai())) {
            throw new IllegalArgumentException("Không thể hủy phiếu đã cân bằng hoặc đã hủy");
        }
        if (!"ADMIN".equals(actor.getVaiTro()) && !actor.getId().equals(pkk.getIdNguoiTao())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Chỉ người tạo hoặc Admin được hủy phiếu kiểm kê");
        }
        pkk.setTrangThai("CANCELLED");
        pkk.setNgayCapNhat(LocalDateTime.now());
        phieuKiemKeRepository.save(pkk);
        return phieuKiemKeMapper.toResponse(pkk);
    }

    @Transactional
    public boolean delete(UUID id, NhanVien actor) {
        return phieuKiemKeRepository.findById(id).map(pkk -> {
            branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
            requireEditable(pkk);
            phieuKiemKeRepository.delete(pkk);
            return true;
        }).orElse(false);
    }

    private void requireEditable(PhieuKiemKe pkk) {
        if (!"DANG_KIEM_KE".equals(pkk.getTrangThai())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Phiếu kiểm kê đã gửi duyệt, đã cân bằng hoặc đã hủy nên không thể sửa");
        }
    }

    private String sinhMaPhieuKiemKe(LocalDate ngay) {
        String dateStr = ngay.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "KK-" + dateStr + "-";
        long count = phieuKiemKeRepository.countByMaPhieuPrefix(prefix);
        return prefix + String.format("%03d", count + 1);
    }

    // --- Logic ChiTietKiemKe ---
    @Transactional(readOnly = true)
    public List<ChiTietKiemKeResponseDTO> getLinesByPhieu(UUID idPhieuKiemKe, NhanVien actor) {
        requireReadableHeader(idPhieuKiemKe, actor);
        return chiTietKiemKeRepository.findByIdPhieuKiemKe(idPhieuKiemKe).stream()
                .map(chiTietKiemKeMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChiTietKiemKeResponseDTO> getLinesBySanPham(UUID idSanPham, NhanVien actor) {
        return chiTietKiemKeRepository.findByIdSanPham(idSanPham).stream()
                .filter(ct -> canReadHeader(actor, ct.getIdPhieuKiemKe()))
                .map(chiTietKiemKeMapper::toResponse)
                .toList();
    }

    @Transactional
    public ChiTietKiemKeResponseDTO createLine(ChiTietKiemKeRequestDTO request, NhanVien actor) {
        validateLine(request, actor);
        ChiTietKiemKe saved = chiTietKiemKeRepository.save(buildLine(request));
        return chiTietKiemKeMapper.toResponse(saved);
    }

    @Transactional
    public List<ChiTietKiemKeResponseDTO> createBatchLines(List<ChiTietKiemKeRequestDTO> requests, NhanVien actor) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Danh sách chi tiết rỗng");
        }
        List<ChiTietKiemKe> saved = new ArrayList<>();
        for (ChiTietKiemKeRequestDTO request : requests) {
            validateLine(request, actor);
            saved.add(chiTietKiemKeRepository.save(buildLine(request)));
        }
        chiTietKiemKeRepository.flush();
        return saved.stream().map(chiTietKiemKeMapper::toResponse).toList();
    }

    @Transactional
    public boolean deleteLine(UUID id, NhanVien actor) {
        return chiTietKiemKeRepository.findById(id).map(ct -> {
            requireReadableHeader(ct.getIdPhieuKiemKe(), actor);
            requireEditableHeader(ct.getIdPhieuKiemKe());
            chiTietKiemKeRepository.delete(ct);
            return true;
        }).orElse(false);
    }

    @Transactional
    public void deleteLinesByPhieu(UUID idPhieuKiemKe, NhanVien actor) {
        requireReadableHeader(idPhieuKiemKe, actor);
        requireEditableHeader(idPhieuKiemKe);
        List<ChiTietKiemKe> list = chiTietKiemKeRepository.findByIdPhieuKiemKe(idPhieuKiemKe);
        chiTietKiemKeRepository.deleteAll(list);
    }

    private void validateLine(ChiTietKiemKeRequestDTO request, NhanVien actor) {
        if (request.getIdPhieuKiemKe() == null || !phieuKiemKeRepository.existsById(request.getIdPhieuKiemKe())) {
            throw new IllegalArgumentException("Phiếu kiểm kê không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        requireReadableHeader(request.getIdPhieuKiemKe(), actor);
        requireEditableHeader(request.getIdPhieuKiemKe());
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getTonHeThong(), "Tồn hệ thống");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getTonThucTe(), "Tồn thực tế");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGiaVon(), "Đơn giá vốn");
    }

    private ChiTietKiemKe buildLine(ChiTietKiemKeRequestDTO request) {
        ChiTietKiemKe ct = new ChiTietKiemKe();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuKiemKe(request.getIdPhieuKiemKe());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setTonHeThong(request.getTonHeThong());
        ct.setTonThucTe(request.getTonThucTe());
        ct.setSoLuongLech(request.getSoLuongLech());
        ct.setLyDoLech(request.getLyDoLech());
        ct.setDonGiaVon(request.getDonGiaVon());
        ct.setGiaTriLech(request.getGiaTriLech());
        ct.setNgayTao(LocalDateTime.now());
        return ct;
    }

    private boolean canReadHeader(NhanVien actor, UUID idPhieuKiemKe) {
        return phieuKiemKeRepository.findById(idPhieuKiemKe)
                .map(header -> branchAccessService.canReadBranch(actor, header.getIdChiNhanh()))
                .orElse(false);
    }

    private void requireReadableHeader(UUID idPhieuKiemKe, NhanVien actor) {
        if (!canReadHeader(actor, idPhieuKiemKe)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Không được xem hoặc sửa chi tiết kiểm kê của chi nhánh khác");
        }
    }

    private void requireEditableHeader(UUID idPhieuKiemKe) {
        phieuKiemKeRepository.findById(idPhieuKiemKe).ifPresent(header -> {
            if (!"DANG_KIEM_KE".equals(header.getTrangThai())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "Phiếu kiểm kê đã gửi duyệt, đã cân bằng hoặc đã hủy");
            }
        });
    }

}
