package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.NccActivityReportDTO;
import com.erp.cuahangtienloi.dto.NhaCungCapDTO;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.NhaCungCapDanhMuc;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NhaCungCapService {

    private final NhaCungCapRepository nhaCungCapRepository;
    private final NhaCungCapDanhMucRepository nccDanhMucRepository;
    private final DanhMucRepository danhMucRepository;
    private final PhieuNhapRepository phieuNhapRepository;
    private final HopDongRepository hopDongRepository;

    @Transactional(readOnly = true)
    public List<NhaCungCapDTO> getAll() {
        return nhaCungCapRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<NhaCungCapDTO> getById(UUID id) {
        return nhaCungCapRepository.findById(id).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<NhaCungCapDTO> getActive() {
        return nhaCungCapRepository.findAll().stream()
                .filter(ncc -> ncc.getDangHoatDong() != null && ncc.getDangHoatDong())
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public NhaCungCapDTO create(NhaCungCapDTO request, UUID actorId) {
        if (request.getTenNcc() == null || request.getTenNcc().isBlank()) {
            throw new IllegalArgumentException("Tên NCC không được để trống");
        }

        String maNcc = request.getMaNcc();
        if (maNcc == null || maNcc.isBlank()) {
            maNcc = "NCC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } else if (nhaCungCapRepository.existsByMaNcc(maNcc)) {
            throw new IllegalArgumentException("Mã NCC đã tồn tại");
        }

        // ===== KIỂM TRA MÃ SỐ THUẾ =====
        String maSoThue = normalizeMaSoThue(request.getMaSoThue());

        if (maSoThue != null && nhaCungCapRepository.existsByMaSoThue(maSoThue)) {
            throw new IllegalArgumentException(
                    "Mã số thuế đã được dùng bởi NCC khác");
        }

        validateCategories(request.getCategoryIds());

        String phone = normalizePhone(request.getSoDienThoai());
        if (phone != null && nhaCungCapRepository.existsBySoDienThoai(phone)) {
            throw new IllegalArgumentException(
                    "Số điện thoại này đã được dùng bởi NCC khác");
        }

        NhaCungCap ncc = new NhaCungCap();
        ncc.setId(UUID.randomUUID());
        ncc.setMaNcc(maNcc);
        ncc.setTenNcc(request.getTenNcc().trim());
        ncc.setMaSoThue(maSoThue);
        ncc.setSoDienThoai(phone);
        ncc.setEmail(request.getEmail());
        ncc.setDiaChi(request.getDiaChi());
        ncc.setNguoiLienHe(request.getNguoiLienHe());
        ncc.setChucDanhLienHe(request.getChucDanhLienHe());
        ncc.setSdtLienHe(request.getSdtLienHe());
        ncc.setDieuKhoanThanhToan(
                request.getDieuKhoanThanhToan() != null && !request.getDieuKhoanThanhToan().isBlank()
                        ? request.getDieuKhoanThanhToan() : "Thanh toán ngay");

        // Giá trị khởi tạo do hệ thống đặt, KHÔNG lấy từ client.
        // so_ngay_duoc_no do trigger trg_ncc_dong_bo_ngay_no đồng bộ từ dieu_khoan_thanh_toan.
        ncc.setSoNgayDuocNo(0);
        ncc.setTongCongNo(BigDecimal.ZERO);
        ncc.setTongDonHang(0);

        ncc.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        ncc.setGhiChu(request.getGhiChu());
        ncc.setNgayTao(LocalDateTime.now());
        ncc.setNgayCapNhat(LocalDateTime.now());
        ncc.setNguoiTao(actorId);
        ncc.setNguoiCapNhat(actorId);

        NhaCungCap saved = nhaCungCapRepository.save(ncc);
        saveCategories(saved.getId(), request.getCategoryIds());

        return toDTO(saved);
    }

    @Transactional
    public Optional<NhaCungCapDTO> update(UUID id, NhaCungCapDTO request, UUID actorId) {
        return nhaCungCapRepository.findById(id)
                .map(ncc -> {
                    if (request.getTenNcc() == null || request.getTenNcc().isBlank()) {
                        throw new IllegalArgumentException("Tên NCC không được để trống");
                    }

                    // Mã NCC: chỉ đổi khi request gửi giá trị mới (UI hiện không gửi)
                    String newMa = request.getMaNcc();
                    if (newMa != null && !newMa.isBlank() && !newMa.equals(ncc.getMaNcc())) {
                        NhaCungCap duplicate = nhaCungCapRepository.findByMaNcc(newMa).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            throw new IllegalArgumentException("Mã NCC đã tồn tại");
                        }
                        ncc.setMaNcc(newMa);
                    }

                    String maSoThue = normalizeMaSoThue(request.getMaSoThue());

                    if (maSoThue != null
                            && nhaCungCapRepository.existsByMaSoThueAndIdNot(maSoThue, id)) {

                        throw new IllegalArgumentException(
                                "Mã số thuế đã được dùng bởi NCC khác");
                    }

                    validateCategories(request.getCategoryIds());

                    String phone = normalizePhone(request.getSoDienThoai());
                    if (phone != null && nhaCungCapRepository.existsBySoDienThoaiAndIdNot(phone, id)) {
                        throw new IllegalArgumentException(
                                "Số điện thoại này đã được dùng bởi NCC khác");
                    }

                    // Full-update: rỗng/null = xóa giá trị (trừ các cột bắt buộc bên dưới)
                    ncc.setTenNcc(request.getTenNcc().trim());
                    ncc.setMaSoThue(maSoThue);
                    ncc.setSoDienThoai(phone);
                    ncc.setEmail(request.getEmail());
                    ncc.setDiaChi(request.getDiaChi());
                    ncc.setNguoiLienHe(request.getNguoiLienHe());
                    ncc.setChucDanhLienHe(request.getChucDanhLienHe());
                    ncc.setSdtLienHe(request.getSdtLienHe());
                    ncc.setGhiChu(request.getGhiChu());

                    // Cột bắt buộc: không có giá trị thì giữ giá trị cũ
                    if (request.getDieuKhoanThanhToan() != null && !request.getDieuKhoanThanhToan().isBlank()) {
                        ncc.setDieuKhoanThanhToan(request.getDieuKhoanThanhToan());
                    }
                    if (request.getDangHoatDong() != null) {
                        ncc.setDangHoatDong(request.getDangHoatDong());
                    }

                    // KHÔNG gán: soNgayDuocNo (trigger), tongCongNo, tongDonHang (trigger từ phiếu nhập)
                    ncc.setNgayCapNhat(LocalDateTime.now());
                    ncc.setNguoiCapNhat(actorId);

                    NhaCungCap saved = nhaCungCapRepository.save(ncc);

                    // categoryIds == null: giữ nguyên; có giá trị (kể cả rỗng): thay thế toàn bộ
                    if (request.getCategoryIds() != null) {
                        nccDanhMucRepository.deleteByIdNhaCungCap(id);
                        saveCategories(id, request.getCategoryIds());
                    }

                    return toDTO(saved);
                });
    }

    @Transactional
    public boolean delete(UUID id) {
        if (!nhaCungCapRepository.existsById(id)) {
            return false;
        }
        if (phieuNhapRepository.existsByIdNcc(id)) {
            throw new IllegalArgumentException(
                    "NCC đã phát sinh phiếu nhập — không thể xóa. Hãy chuyển sang 'Ngừng hợp tác'.");
        }
        if (hopDongRepository.existsByIdNcc(id)) {
            throw new IllegalArgumentException(
                    "NCC đã phát sinh hợp đồng — không thể xóa. Hãy chuyển sang 'Ngừng hợp tác'.");
        }
        nhaCungCapRepository.deleteById(id);
        return true;
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;
        String p = phone.trim();
        return p.isEmpty() ? null : p;
    }

    private String normalizeMaSoThue(String maSoThue) {
        if (maSoThue == null) return null;
        String m = maSoThue.trim();
        return m.isEmpty() ? null : m;
    }

    private void validateCategories(List<UUID> categoryIds) {
        if (categoryIds != null
                && categoryIds.stream().anyMatch(categoryId -> !danhMucRepository.existsById(categoryId))) {
            throw new IllegalArgumentException("Danh mục của nhà cung cấp không tồn tại");
        }
    }

    @Transactional(readOnly = true)
    public List<NccActivityReportDTO> reportInactive(int months) {
        LocalDate cutoff = LocalDate.now().minusMonths(Math.max(1, months));
        Map<UUID, LocalDate> lastByNcc = nhaCungCapRepository.findLastCompletedDatePerNcc().stream()
                .collect(Collectors.toMap(NhaCungCapRepository.LastCompletedDate::getIdNcc, NhaCungCapRepository.LastCompletedDate::getNgayGanNhat));
        return nhaCungCapRepository.findAll().stream()
                .map(ncc -> { LocalDate last = lastByNcc.get(ncc.getId());
                    return (last == null || last.isBefore(cutoff)) ? toActivityDto(ncc, last) : null; })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(d -> d.getNgayPhieuGanNhat() != null ? d.getNgayPhieuGanNhat() : LocalDate.MIN))
                .toList();
    }

    private NccActivityReportDTO toActivityDto(NhaCungCap ncc, LocalDate last) {
        NccActivityReportDTO d = new NccActivityReportDTO();
        d.setId(ncc.getId());
        d.setMaNcc(ncc.getMaNcc());
        d.setTenNcc(ncc.getTenNcc());
        d.setNgayPhieuGanNhat(last);
        d.setTongDonHang(ncc.getTongDonHang());
        d.setTongCongNo(ncc.getTongCongNo());
        d.setDangHoatDong(ncc.getDangHoatDong());
        return d;
    }

    private void saveCategories(UUID nccId, List<UUID> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return;
        }

        List<NhaCungCapDanhMuc> links = categoryIds.stream()
                .distinct()
                .map(categoryId -> {
                    NhaCungCapDanhMuc link = new NhaCungCapDanhMuc();
                    link.setIdNhaCungCap(nccId);
                    link.setIdDanhMuc(categoryId);
                    link.setNgayTao(LocalDateTime.now());
                    return link;
                })
                .toList();

        nccDanhMucRepository.saveAll(links);
    }

    public NhaCungCapDTO toDTO(NhaCungCap ncc) {
        NhaCungCapDTO dto = new NhaCungCapDTO();
        dto.setId(ncc.getId());
        dto.setMaNcc(ncc.getMaNcc());
        dto.setTenNcc(ncc.getTenNcc());
        dto.setMaSoThue(ncc.getMaSoThue());
        dto.setSoDienThoai(ncc.getSoDienThoai());
        dto.setEmail(ncc.getEmail());
        dto.setDiaChi(ncc.getDiaChi());
        dto.setNguoiLienHe(ncc.getNguoiLienHe());
        dto.setChucDanhLienHe(ncc.getChucDanhLienHe());
        dto.setSdtLienHe(ncc.getSdtLienHe());
        dto.setDieuKhoanThanhToan(ncc.getDieuKhoanThanhToan());
        dto.setSoNgayDuocNo(ncc.getSoNgayDuocNo());
        dto.setTongCongNo(ncc.getTongCongNo());
        dto.setTongDonHang(ncc.getTongDonHang());
        dto.setDangHoatDong(ncc.getDangHoatDong());
        dto.setGhiChu(ncc.getGhiChu());
        dto.setNgayTao(ncc.getNgayTao());
        dto.setNgayCapNhat(ncc.getNgayCapNhat());
        dto.setNguoiTao(ncc.getNguoiTao());
        dto.setNguoiCapNhat(ncc.getNguoiCapNhat());

        List<NhaCungCapDanhMuc> links = nccDanhMucRepository.findByIdNhaCungCap(ncc.getId());
        List<NhaCungCapDTO.DanhMucSummary> categories = links.stream()
                .map(link -> danhMucRepository.findById(link.getIdDanhMuc())
                        .map(dm -> {
                            NhaCungCapDTO.DanhMucSummary summary = new NhaCungCapDTO.DanhMucSummary();
                            summary.setId(dm.getId());
                            summary.setTenDanhMuc(dm.getTenDanhMuc());
                            summary.setIconEmoji(dm.getIconEmoji());
                            summary.setMauHex(dm.getMauHex());
                            return summary;
                        })
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();

        dto.setCategories(categories);
        dto.setCategoryIds(
                categories.stream()
                        .map(NhaCungCapDTO.DanhMucSummary::getId)
                        .toList()
        );

        return dto;
    }
}