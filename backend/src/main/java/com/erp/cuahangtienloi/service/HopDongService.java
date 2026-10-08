package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.HopDongDTO;
import com.erp.cuahangtienloi.dto.HopDongRejectDTO;
import com.erp.cuahangtienloi.entity.HopDong;
import com.erp.cuahangtienloi.repository.HopDongRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.service.FileStorageService.StoredFile;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HopDongService {

    public static final String ST_DRAFT = "DRAFT";
    public static final String ST_PENDING_APPROVAL = "PENDING_APPROVAL";
    public static final String ST_ACTIVE = "ACTIVE";
    public static final String ST_REJECTED = "REJECTED";
    public static final String ST_EXPIRED = "EXPIRED";
    public static final String ST_CANCELLED = "CANCELLED";

    private static final Set<String> EDITABLE = Set.of(ST_DRAFT, ST_REJECTED);
    private static final Set<String> CANCELLABLE = Set.of(ST_DRAFT, ST_REJECTED, ST_PENDING_APPROVAL);
    private static final Set<String> DELETEABLE = Set.of(ST_DRAFT, ST_REJECTED, ST_CANCELLED);

    private final HopDongRepository hopDongRepository;
    private final NhaCungCapRepository nhaCungCapRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<HopDongDTO> list(UUID idNcc, String trangThai) {
        return hopDongRepository.filter(idNcc, trangThai).stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public Optional<HopDongDTO> getById(UUID id) {
        return hopDongRepository.findById(id).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<HopDongDTO> sapHetHan(int days) {
        if (days < 1) days = 30;
        LocalDate today = LocalDate.now();
        return hopDongRepository
                .findByTrangThaiAndNgayHetHanBetween(ST_ACTIVE, today, today.plusDays(days))
                .stream().map(this::toDTO).toList();
    }

    @Transactional
    public HopDongDTO create(HopDongDTO req, MultipartFile file, UUID actorId) {
        validate(req);
        HopDong h = new HopDong();
        h.setId(UUID.randomUUID());
        h.setMaHopDong("HD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        h.setTenHopDong(req.getTenHopDong().trim());
        h.setLoaiHopDong(req.getLoaiHopDong() == null ? "MUA_HANG" : req.getLoaiHopDong());
        h.setIdNcc(req.getIdNcc());
        h.setNgayKy(req.getNgayKy());
        h.setNgayHieuLuc(req.getNgayHieuLuc());
        h.setNgayHetHan(req.getNgayHetHan());
        h.setGiaTriHopDong(req.getGiaTriHopDong());
        h.setDieuKhoanThanhToan(req.getDieuKhoanThanhToan());
        h.setSoNgayDuocNo(req.getSoNgayDuocNo() != null ? Math.max(0, req.getSoNgayDuocNo()) : 0);
        h.setNoiDung(req.getNoiDung());
        h.setTrangThai(ST_DRAFT);
        h.setSoLanTrinh(0);
        h.setNgayTao(LocalDateTime.now());
        h.setNgayCapNhat(LocalDateTime.now());
        h.setNguoiTao(actorId);
        h.setNguoiCapNhat(actorId);
        applyFile(h, file);
        return toDTO(hopDongRepository.save(h));
    }

    @Transactional
    public Optional<HopDongDTO> update(UUID id, HopDongDTO req, MultipartFile file, UUID actorId) {
        return hopDongRepository.findById(id).map(h -> {
            requireStatus(h, EDITABLE, "sửa");
            validate(req);
            h.setTenHopDong(req.getTenHopDong().trim());
            h.setLoaiHopDong(req.getLoaiHopDong() == null ? "MUA_HANG" : req.getLoaiHopDong());
            h.setIdNcc(req.getIdNcc());
            h.setNgayKy(req.getNgayKy());
            h.setNgayHieuLuc(req.getNgayHieuLuc());
            h.setNgayHetHan(req.getNgayHetHan());
            h.setGiaTriHopDong(req.getGiaTriHopDong());
            h.setDieuKhoanThanhToan(req.getDieuKhoanThanhToan());
            h.setSoNgayDuocNo(req.getSoNgayDuocNo() != null ? Math.max(0, req.getSoNgayDuocNo()) : 0);
            h.setNoiDung(req.getNoiDung());
            replaceFile(h, file);
            h.setNgayCapNhat(LocalDateTime.now());
            h.setNguoiCapNhat(actorId);
            return toDTO(hopDongRepository.save(h));
        });
    }

    @Transactional
    public Optional<HopDongDTO> submit(UUID id, UUID actorId) {
        return hopDongRepository.findById(id).map(h -> {
            requireStatus(h, EDITABLE, "trình duyệt");
            if (h.getFileDuongDan() == null || h.getFileDuongDan().isBlank())
                throw new IllegalArgumentException("Phải đính kèm file scan hợp đồng (PDF/ảnh) trước khi trình duyệt");
            h.setTrangThai(ST_PENDING_APPROVAL);
            h.setSoLanTrinh(h.getSoLanTrinh() == null ? 1 : h.getSoLanTrinh() + 1);
            h.setLyDoTuChoi(null);
            h.setNgayCapNhat(LocalDateTime.now());
            h.setNguoiCapNhat(actorId);
            return toDTO(hopDongRepository.save(h));
        });
    }

    @Transactional
    public Optional<HopDongDTO> approve(UUID id, UUID actorId) {
        return hopDongRepository.findById(id).map(h -> {
            requireStatus(h, Set.of(ST_PENDING_APPROVAL), "duyệt");
            if (h.getNgayHetHan() != null && h.getNgayHetHan().isBefore(LocalDate.now()))
                throw new IllegalArgumentException("Hợp đồng đã quá hạn hiệu lực, không thể duyệt");
            h.setTrangThai(ST_ACTIVE);
            h.setIdNguoiDuyet(actorId);
            h.setNgayDuyet(LocalDateTime.now());
            h.setNgayCapNhat(LocalDateTime.now());
            h.setNguoiCapNhat(actorId);
            return toDTO(hopDongRepository.save(h));
        });
    }

    @Transactional
    public Optional<HopDongDTO> reject(UUID id, String lyDo, UUID actorId) {
        return hopDongRepository.findById(id).map(h -> {
            requireStatus(h, Set.of(ST_PENDING_APPROVAL), "từ chối");
            if (lyDo == null || lyDo.isBlank())
                throw new IllegalArgumentException("Vui lòng nhập lý do từ chối");
            h.setTrangThai(ST_REJECTED);
            h.setLyDoTuChoi(lyDo.trim());
            h.setIdNguoiDuyet(actorId);
            h.setNgayDuyet(LocalDateTime.now());
            h.setNgayCapNhat(LocalDateTime.now());
            h.setNguoiCapNhat(actorId);
            return toDTO(hopDongRepository.save(h));
        });
    }

    @Transactional
    public Optional<HopDongDTO> cancel(UUID id, UUID actorId) {
        return hopDongRepository.findById(id).map(h -> {
            requireStatus(h, CANCELLABLE, "hủy");
            h.setTrangThai(ST_CANCELLED);
            h.setNgayCapNhat(LocalDateTime.now());
            h.setNguoiCapNhat(actorId);
            return toDTO(hopDongRepository.save(h));
        });
    }

    @Transactional
    public boolean delete(UUID id) {
        return hopDongRepository.findById(id).map(h -> {
            requireStatus(h, DELETEABLE, "xóa");
            fileStorageService.delete(h.getFileDuongDan());
            hopDongRepository.delete(h);
            return true;
        }).orElse(false);
    }

    @Transactional(readOnly = true)
    public Optional<FilePayload> downloadFile(UUID id) {
        return hopDongRepository.findById(id)
                .filter(h -> h.getFileDuongDan() != null && !h.getFileDuongDan().isBlank())
                .flatMap(h -> {
                    Resource r = fileStorageService.load(h.getFileDuongDan());
                    if (r == null) return Optional.empty();
                    return Optional.of(new FilePayload(r, h.getFileLoai(), h.getFileTenGoc()));
                });
    }

    private void applyFile(HopDong h, MultipartFile file) {
        if (file == null || file.isEmpty()) return;
        StoredFile s = fileStorageService.store(file);
        h.setFileDuongDan(s.duongDan());
        h.setFileTenGoc(s.tenGoc());
        h.setFileLoai(s.loai());
        h.setFileKichThuoc(s.kichThuoc());
    }

    private void replaceFile(HopDong h, MultipartFile file) {
        if (file == null || file.isEmpty()) return;
        fileStorageService.delete(h.getFileDuongDan());
        applyFile(h, file);
    }

    private void validate(HopDongDTO req) {
        if (req.getTenHopDong() == null || req.getTenHopDong().isBlank())
            throw new IllegalArgumentException("Tên hợp đồng không được để trống");
        if (req.getIdNcc() == null || !nhaCungCapRepository.existsById(req.getIdNcc()))
            throw new IllegalArgumentException("Nhà cung cấp không tồn tại");
        if (req.getNgayKy() == null || req.getNgayHieuLuc() == null)
            throw new IllegalArgumentException("Ngày ký và ngày hiệu lực là bắt buộc");
        if (req.getNgayHetHan() != null && req.getNgayHetHan().isBefore(req.getNgayHieuLuc()))
            throw new IllegalArgumentException("Ngày hết hạn phải sau hoặc bằng ngày hiệu lực");
        if (req.getGiaTriHopDong() != null && req.getGiaTriHopDong().signum() < 0)
            throw new IllegalArgumentException("Giá trị hợp đồng không được âm");
    }

    private void requireStatus(HopDong h, Set<String> allowed, String action) {
        if (!allowed.contains(h.getTrangThai()))
            throw new IllegalArgumentException("Hợp đồng ở trạng thái " + statusLabel(h.getTrangThai())
                    + " — không thể " + action);
    }

    private String statusLabel(String st) {
        return switch (st == null ? "" : st) {
            case ST_DRAFT -> "Nháp";
            case ST_PENDING_APPROVAL -> "Chờ duyệt";
            case ST_ACTIVE -> "Hiệu lực";
            case ST_REJECTED -> "Đã từ chối";
            case ST_EXPIRED -> "Hết hạn";
            case ST_CANCELLED -> "Đã hủy";
            default -> st;
        };
    }

    private String effectiveStatus(HopDong h) {
        if (ST_ACTIVE.equals(h.getTrangThai())
                && h.getNgayHetHan() != null
                && h.getNgayHetHan().isBefore(LocalDate.now())) {
            return ST_EXPIRED;
        }
        return h.getTrangThai();
    }

    private HopDongDTO toDTO(HopDong h) {
        HopDongDTO d = new HopDongDTO();
        d.setId(h.getId());
        d.setMaHopDong(h.getMaHopDong());
        d.setTenHopDong(h.getTenHopDong());
        d.setLoaiHopDong(h.getLoaiHopDong());
        d.setIdNcc(h.getIdNcc());
        d.setNgayKy(h.getNgayKy());
        d.setNgayHieuLuc(h.getNgayHieuLuc());
        d.setNgayHetHan(h.getNgayHetHan());
        d.setGiaTriHopDong(h.getGiaTriHopDong());
        d.setDieuKhoanThanhToan(h.getDieuKhoanThanhToan());
        d.setSoNgayDuocNo(h.getSoNgayDuocNo());
        d.setNoiDung(h.getNoiDung());
        d.setFileTenGoc(h.getFileTenGoc());
        d.setFileCo(h.getFileDuongDan() != null && !h.getFileDuongDan().isBlank());
        d.setTrangThai(effectiveStatus(h));
        d.setLyDoTuChoi(h.getLyDoTuChoi());
        d.setIdNguoiDuyet(h.getIdNguoiDuyet());
        d.setNgayDuyet(h.getNgayDuyet());
        d.setSoLanTrinh(h.getSoLanTrinh());
        d.setNgayTao(h.getNgayTao());
        d.setNgayCapNhat(h.getNgayCapNhat());
        d.setNguoiTao(h.getNguoiTao());
        d.setNguoiCapNhat(h.getNguoiCapNhat());
        nhaCungCapRepository.findById(h.getIdNcc()).ifPresent(ncc -> {
            d.setMaNcc(ncc.getMaNcc());
            d.setTenNcc(ncc.getTenNcc());
        });
        return d;
    }

    public record FilePayload(Resource resource, String contentType, String fileName) {}
}