package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.HopDongCountDTO;
import com.erp.cuahangtienloi.dto.HopDongDTO;
import com.erp.cuahangtienloi.dto.HopDongRejectDTO;
import com.erp.cuahangtienloi.entity.HopDong;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.repository.HopDongRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.service.FileStorageService.StoredFile;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
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
    private final com.erp.cuahangtienloi.repository.HopDongChiTietRepository hopDongChiTietRepository;
    private final com.erp.cuahangtienloi.repository.GiaNhapNccRepository giaNhapNccRepository;
    private final com.erp.cuahangtienloi.repository.SanPhamRepository sanPhamRepository;
    private final com.erp.cuahangtienloi.repository.SanPhamNhaCungCapRepository sanPhamNhaCungCapRepository;
    private final NotificationHelper notificationHelper;

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
        validate(req, null);
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
        h.setHanMucHopDong(req.getHanMucHopDong());
        h.setGiaTriDaSuDung(BigDecimal.ZERO);
        h.setDieuKhoanThanhToan(req.getDieuKhoanThanhToan());
        h.setSoNgayDuocNo(req.getSoNgayDuocNo() != null ? Math.max(0, req.getSoNgayDuocNo()) : 0);
        h.setNoiDung(req.getNoiDung());
        h.setSoHopDongDoiTac(req.getSoHopDongDoiTac());
        h.setNguoiDaiDienNcc(req.getNguoiDaiDienNcc());
        h.setChucVuNcc(req.getChucVuNcc());
        h.setNguoiDaiDienBenMua(req.getNguoiDaiDienBenMua());
        h.setDiaDiemGiaoHang(req.getDiaDiemGiaoHang());
        h.setThoiGianGiaoHang(req.getThoiGianGiaoHang());
        h.setChietKhauPhantram(req.getChietKhauPhantram() != null ? req.getChietKhauPhantram() : BigDecimal.ZERO);
        h.setChinhSachDoiTra(req.getChinhSachDoiTra());
        h.setTuDongGiaHan(Boolean.TRUE.equals(req.getTuDongGiaHan()));
        h.setTrangThai(ST_DRAFT);
        h.setSoLanTrinh(0);
        h.setNgayTao(LocalDateTime.now());
        h.setNgayCapNhat(LocalDateTime.now());
        h.setNguoiTao(actorId);
        h.setNguoiCapNhat(actorId);
        applyFile(h, file);
        HopDong saved = hopDongRepository.save(h);
        saveContractLines(saved, req.getLines());
        return toDTO(saved);
    }

    @Transactional
    public Optional<HopDongDTO> update(UUID id, HopDongDTO req, MultipartFile file, UUID actorId) {
        return hopDongRepository.findById(id).map(h -> {
            requireStatus(h, EDITABLE, "sửa");
            validate(req, h.getIdNcc());
            h.setTenHopDong(req.getTenHopDong().trim());
            h.setLoaiHopDong(req.getLoaiHopDong() == null ? "MUA_HANG" : req.getLoaiHopDong());
            h.setIdNcc(req.getIdNcc());
            h.setNgayKy(req.getNgayKy());
            h.setNgayHieuLuc(req.getNgayHieuLuc());
            h.setNgayHetHan(req.getNgayHetHan());
            h.setGiaTriHopDong(req.getGiaTriHopDong());
            h.setHanMucHopDong(req.getHanMucHopDong());
            h.setDieuKhoanThanhToan(req.getDieuKhoanThanhToan());
            h.setSoNgayDuocNo(req.getSoNgayDuocNo() != null ? Math.max(0, req.getSoNgayDuocNo()) : 0);
            h.setNoiDung(req.getNoiDung());
            h.setSoHopDongDoiTac(req.getSoHopDongDoiTac());
            h.setNguoiDaiDienNcc(req.getNguoiDaiDienNcc());
            h.setChucVuNcc(req.getChucVuNcc());
            h.setNguoiDaiDienBenMua(req.getNguoiDaiDienBenMua());
            h.setDiaDiemGiaoHang(req.getDiaDiemGiaoHang());
            h.setThoiGianGiaoHang(req.getThoiGianGiaoHang());
            h.setChietKhauPhantram(req.getChietKhauPhantram() != null ? req.getChietKhauPhantram() : BigDecimal.ZERO);
            h.setChinhSachDoiTra(req.getChinhSachDoiTra());
            h.setTuDongGiaHan(Boolean.TRUE.equals(req.getTuDongGiaHan()));
            replaceFile(h, file);
            h.setNgayCapNhat(LocalDateTime.now());
            h.setNguoiCapNhat(actorId);
            HopDong saved = hopDongRepository.save(h);
            if (req.getLines() != null) {
                saveContractLines(saved, req.getLines());
            }
            return toDTO(saved);
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
            HopDong saved = hopDongRepository.save(h);
            notificationHelper.notifyContractSubmitted(saved, actorId);
            return toDTO(saved);
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
            HopDong saved = hopDongRepository.save(h);

            // Tự động kích hoạt bảng giá hiệu lực cho các mặt hàng trong hợp đồng
            List<com.erp.cuahangtienloi.entity.HopDongChiTiet> lines = hopDongChiTietRepository.findByIdHopDong(h.getId());
            for (com.erp.cuahangtienloi.entity.HopDongChiTiet ct : lines) {
                com.erp.cuahangtienloi.entity.GiaNhapNcc giaNcc = com.erp.cuahangtienloi.entity.GiaNhapNcc.builder()
                        .id(UUID.randomUUID())
                        .idSanPham(ct.getIdSanPham())
                        .idNhaCungCap(h.getIdNcc())
                        .idHopDongChiTiet(ct.getId())
                        .giaNhap(ct.getDonGiaCamKet())
                        .ngayHieuLucTu(ct.getNgayHieuLucTu() != null ? ct.getNgayHieuLucTu() : h.getNgayHieuLuc())
                        .ngayHieuLucDen(ct.getNgayHetHan() != null ? ct.getNgayHetHan() : h.getNgayHetHan())
                        .dangApDung(true)
                        .ghiChu("Giá cam kết theo hợp đồng đã duyệt " + h.getMaHopDong())
                        .nguoiTao(actorId)
                        .ngayTao(LocalDateTime.now())
                        .ngayCapNhat(LocalDateTime.now())
                        .build();
                giaNhapNccRepository.save(giaNcc);

                Optional<com.erp.cuahangtienloi.entity.SanPhamNhaCungCap> spNccOpt =
                        sanPhamNhaCungCapRepository.findByIdSanPhamAndIdNhaCungCap(ct.getIdSanPham(), h.getIdNcc());
                if (spNccOpt.isPresent()) {
                    com.erp.cuahangtienloi.entity.SanPhamNhaCungCap spncc = spNccOpt.get();
                    spncc.setGiaNhap(ct.getDonGiaCamKet());
                    spncc.setNgayCapNhat(LocalDateTime.now());
                    sanPhamNhaCungCapRepository.save(spncc);
                } else {
                    com.erp.cuahangtienloi.entity.SanPhamNhaCungCap spncc = com.erp.cuahangtienloi.entity.SanPhamNhaCungCap.builder()
                            .id(UUID.randomUUID())
                            .idSanPham(ct.getIdSanPham())
                            .idNhaCungCap(h.getIdNcc())
                            .giaNhap(ct.getDonGiaCamKet())
                            .laNccChinh(false)
                            .ghiChu("Tự động liên kết từ hợp đồng " + h.getMaHopDong())
                            .ngayTao(LocalDateTime.now())
                            .ngayCapNhat(LocalDateTime.now())
                            .build();
                    sanPhamNhaCungCapRepository.save(spncc);
                }
            }

            notificationHelper.notifyContractApproved(saved, actorId);
            return toDTO(saved);
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
            HopDong saved = hopDongRepository.save(h);
            notificationHelper.notifyContractRejected(saved, lyDo, actorId);
            return toDTO(saved);
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
            hopDongChiTietRepository.deleteByIdHopDong(h.getId());
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

    private void saveContractLines(HopDong h, List<com.erp.cuahangtienloi.dto.HopDongChiTietDTO> lines) {
        if (lines == null) return;
        hopDongChiTietRepository.deleteByIdHopDong(h.getId());
        for (com.erp.cuahangtienloi.dto.HopDongChiTietDTO line : lines) {
            if (line.getIdSanPham() == null) continue;
            if (!sanPhamRepository.existsById(line.getIdSanPham())) {
                throw new IllegalArgumentException("Sản phẩm ID " + line.getIdSanPham() + " không tồn tại");
            }
            com.erp.cuahangtienloi.entity.HopDongChiTiet ct = com.erp.cuahangtienloi.entity.HopDongChiTiet.builder()
                    .id(UUID.randomUUID())
                    .idHopDong(h.getId())
                    .idSanPham(line.getIdSanPham())
                    .donGiaCamKet(line.getDonGiaCamKet() != null ? line.getDonGiaCamKet() : BigDecimal.ZERO)
                    .soLuongCamKet(line.getSoLuongCamKet() != null ? line.getSoLuongCamKet() : 0)
                    .soLuongDaNhap(0)
                    .vatPhantram(line.getVatPhantram() != null ? line.getVatPhantram() : 8)
                    .moq(line.getMoq() != null ? Math.max(1, line.getMoq()) : 1)
                    .ngayHieuLucTu(line.getNgayHieuLucTu() != null ? line.getNgayHieuLucTu() : h.getNgayHieuLuc())
                    .ngayHetHan(line.getNgayHetHan() != null ? line.getNgayHetHan() : h.getNgayHetHan())
                    .ghiChu(line.getGhiChu())
                    .ngayTao(LocalDateTime.now())
                    .ngayCapNhat(LocalDateTime.now())
                    .build();
            hopDongChiTietRepository.save(ct);
        }
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

    private void validate(HopDongDTO req, UUID currentIdNcc) {
        if (req.getTenHopDong() == null || req.getTenHopDong().isBlank())
            throw new IllegalArgumentException("Tên hợp đồng không được để trống");
        if (req.getIdNcc() == null)
            throw new IllegalArgumentException("Nhà cung cấp không tồn tại");
        NhaCungCap ncc = nhaCungCapRepository.findById(req.getIdNcc())
                .orElseThrow(() -> new IllegalArgumentException("Nhà cung cấp không tồn tại"));
        if (req.getNgayKy() == null || req.getNgayHieuLuc() == null)
            throw new IllegalArgumentException("Ngày ký và ngày hiệu lực là bắt buộc");
        if (req.getNgayHetHan() != null && req.getNgayHetHan().isBefore(req.getNgayHieuLuc()))
            throw new IllegalArgumentException("Ngày hết hạn phải sau hoặc bằng ngày hiệu lực");
        if (req.getGiaTriHopDong() != null && req.getGiaTriHopDong().signum() < 0)
            throw new IllegalArgumentException("Giá trị hợp đồng không được âm");
        if (req.getHanMucHopDong() != null && req.getHanMucHopDong().signum() < 0)
            throw new IllegalArgumentException("Hạn mức hợp đồng không được âm");

        // NCC phải đang hoạt động, trừ khi hợp đồng giữ nguyên NCC hiện tại (khi sửa)
        boolean keepingCurrentNcc = req.getIdNcc().equals(currentIdNcc);
        if (!keepingCurrentNcc && !Boolean.TRUE.equals(ncc.getDangHoatDong()))
            throw new IllegalArgumentException(
                    "Nhà cung cấp đã ngừng hợp tác — không thể chọn làm NCC của hợp đồng.");
    }

    @Transactional(readOnly = true)
    public List<HopDongCountDTO> countByNcc() {
        LocalDate today = LocalDate.now();
        return hopDongRepository.countByNcc(today, today.plusDays(30)).stream()
                .map(c -> new HopDongCountDTO(
                        c.getIdNcc(),
                        c.getTong() == null ? 0 : c.getTong(),
                        c.getDangHieuLuc() == null ? 0 : c.getDangHieuLuc(),
                        c.getSapHetHan() == null ? 0 : c.getSapHetHan()))
                .toList();
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
        d.setHanMucHopDong(h.getHanMucHopDong());
        d.setGiaTriDaSuDung(h.getGiaTriDaSuDung() != null ? h.getGiaTriDaSuDung() : BigDecimal.ZERO);
        d.setDieuKhoanThanhToan(h.getDieuKhoanThanhToan());
        d.setSoNgayDuocNo(h.getSoNgayDuocNo());
        d.setNoiDung(h.getNoiDung());
        d.setSoHopDongDoiTac(h.getSoHopDongDoiTac());
        d.setNguoiDaiDienNcc(h.getNguoiDaiDienNcc());
        d.setChucVuNcc(h.getChucVuNcc());
        d.setNguoiDaiDienBenMua(h.getNguoiDaiDienBenMua());
        d.setDiaDiemGiaoHang(h.getDiaDiemGiaoHang());
        d.setThoiGianGiaoHang(h.getThoiGianGiaoHang());
        d.setChietKhauPhantram(h.getChietKhauPhantram() != null ? h.getChietKhauPhantram() : BigDecimal.ZERO);
        d.setChinhSachDoiTra(h.getChinhSachDoiTra());
        d.setTuDongGiaHan(Boolean.TRUE.equals(h.getTuDongGiaHan()));
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

        List<com.erp.cuahangtienloi.dto.HopDongChiTietDTO> lines =
                hopDongChiTietRepository.findByIdHopDong(h.getId()).stream().map(ct -> {
                    com.erp.cuahangtienloi.dto.HopDongChiTietDTO lineDto = new com.erp.cuahangtienloi.dto.HopDongChiTietDTO();
                    lineDto.setId(ct.getId());
                    lineDto.setIdHopDong(ct.getIdHopDong());
                    lineDto.setIdSanPham(ct.getIdSanPham());
                    lineDto.setDonGiaCamKet(ct.getDonGiaCamKet());
                    lineDto.setSoLuongCamKet(ct.getSoLuongCamKet());
                    lineDto.setSoLuongDaNhap(ct.getSoLuongDaNhap());
                    lineDto.setVatPhantram(ct.getVatPhantram());
                    lineDto.setMoq(ct.getMoq() != null ? ct.getMoq() : 1);
                    lineDto.setNgayHieuLucTu(ct.getNgayHieuLucTu());
                    lineDto.setNgayHetHan(ct.getNgayHetHan());
                    lineDto.setGhiChu(ct.getGhiChu());
                    sanPhamRepository.findById(ct.getIdSanPham()).ifPresent(sp -> {
                        lineDto.setTenSanPham(sp.getTenSanPham());
                        lineDto.setSku(sp.getSku());
                        lineDto.setDonVi(sp.getDonVi());
                    });
                    return lineDto;
                }).toList();
        d.setLines(lines);

        return d;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveContractLines(UUID idNcc) {
        LocalDate today = LocalDate.now();
        List<HopDong> activeContracts = hopDongRepository.filter(idNcc, ST_ACTIVE).stream()
                .filter(h -> h.getNgayHetHan() == null || !h.getNgayHetHan().isBefore(today))
                .toList();

        List<Map<String, Object>> results = new ArrayList<>();
        for (HopDong h : activeContracts) {
            List<com.erp.cuahangtienloi.entity.HopDongChiTiet> lines = hopDongChiTietRepository.findByIdHopDong(h.getId());
            for (com.erp.cuahangtienloi.entity.HopDongChiTiet line : lines) {
                Map<String, Object> map = new HashMap<>();
                map.put("idSanPham", line.getIdSanPham());
                map.put("idHopDong", h.getId());
                map.put("maHopDong", h.getMaHopDong());
                map.put("tenHopDong", h.getTenHopDong());
                map.put("donGiaCamKet", line.getDonGiaCamKet());
                map.put("soLuongCamKet", line.getSoLuongCamKet());
                map.put("soLuongDaNhap", line.getSoLuongDaNhap());
                map.put("ngayHieuLuc", h.getNgayHieuLuc());
                map.put("ngayHetHan", h.getNgayHetHan());
                map.put("moq", line.getMoq() != null ? line.getMoq() : 1);
                sanPhamRepository.findById(line.getIdSanPham()).ifPresent(sp -> {
                    map.put("tenSanPham", sp.getTenSanPham());
                    map.put("sku", sp.getSku());
                });
                results.add(map);
            }
        }
        return results;
    }

    public record FilePayload(Resource resource, String contentType, String fileName) {}
}