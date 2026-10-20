package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.ChiTietPhieuNhapRequestDTO;
import com.erp.cuahangtienloi.dto.response.ChiTietPhieuNhapResponseDTO;
import com.erp.cuahangtienloi.dto.response.PhieuNhapResponseDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import com.erp.cuahangtienloi.entity.HopDong;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuNhap;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.SanPhamNhaCungCap;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.mapper.ChiTietPhieuNhapMapper;
import com.erp.cuahangtienloi.mapper.PhieuNhapMapper;
import com.erp.cuahangtienloi.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
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
public class PhieuNhapService {

    private final PhieuNhapRepository phieuNhapRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhaCungCapRepository nhaCungCapRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiTietPhieuNhapRepository chiTietPhieuNhapRepository;
    private final SanPhamRepository sanPhamRepository;
    private final LoHangService loHangService;
    private final SoQuyRepository soQuyRepository;
    private final JdbcTemplate jdbcTemplate;
    private final BranchAccessService branchAccessService;
    private final PhieuNhapMapper phieuNhapMapper;
    private final ChiTietPhieuNhapMapper chiTietPhieuNhapMapper;
    private final HopDongRepository hopDongRepository;
    private final com.erp.cuahangtienloi.repository.HopDongChiTietRepository hopDongChiTietRepository;
    private final SanPhamNhaCungCapRepository sanPhamNhaCungCapRepository;
    private final PriceResolutionService priceResolutionService;
    private final NotificationHelper notificationHelper;

    @PersistenceContext
    private EntityManager entityManager;

    public static final String ST_PENDING_CONFIRMATION = "PENDING_CONFIRMATION";
    public static final String ST_REJECTED = "REJECTED";
    public static final String ST_PENDING_RECEIVING = "PENDING_RECEIVING";
    public static final String ST_RECEIVING = "RECEIVING";
    public static final String ST_COMPLETED = "COMPLETED";
    public static final String ST_CANCELLED = "CANCELLED";

    public static final java.util.Set<String> SURPLUS_HANDLING = java.util.Set.of(
            "NHAP_KHO",
            "TRA_LAI_NCC",
            "CHUA_XU_LY"
    );

    public static class PayRequest extends com.erp.cuahangtienloi.dto.request.PayRequestDTO {}
    public static class PurchaseLine extends com.erp.cuahangtienloi.dto.request.PurchaseLineDTO {}
    public static class CreatePurchaseRequest extends com.erp.cuahangtienloi.dto.request.CreatePurchaseRequestDTO {}
    public static class ConfirmReceivingRequest extends com.erp.cuahangtienloi.dto.request.ConfirmReceivingRequestDTO {}
    public static class ChangePriceRequest extends com.erp.cuahangtienloi.dto.request.ChangePriceRequestDTO {}

    @Transactional(readOnly = true)
    public List<PhieuNhapResponseDTO> getAll(NhanVien actor) {
        return phieuNhapRepository.findAll().stream()
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(phieuNhapMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<PhieuNhapResponseDTO> getById(UUID id, NhanVien actor) {
        return phieuNhapRepository.findById(id)
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(phieuNhapMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapResponseDTO> getByChiNhanh(UUID idChiNhanh, NhanVien actor) {
        branchAccessService.requireReadableBranch(actor, idChiNhanh);
        return phieuNhapRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(phieuNhapMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapResponseDTO> getByNcc(UUID idNcc, NhanVien actor) {
        return phieuNhapRepository.findByIdNcc(idNcc).stream()
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(phieuNhapMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapResponseDTO> getByStatus(String trangThai, NhanVien actor) {
        return phieuNhapRepository.findByTrangThai(trangThai).stream()
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(phieuNhapMapper::toResponse)
                .toList();
    }

    @Transactional
    public PhieuNhapResponseDTO createWithLines(com.erp.cuahangtienloi.dto.request.CreatePurchaseRequestDTO request, NhanVien actor) {
        if (request.getIdNcc() == null) {
            throw new IllegalArgumentException("Thiếu nhà cung cấp");
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new IllegalArgumentException("Phiếu không có dòng hàng");
        }
        NhaCungCap ncc = nhaCungCapRepository.findById(request.getIdNcc())
                .orElseThrow(() -> new IllegalArgumentException("Nhà cung cấp không tồn tại"));
        if (!Boolean.TRUE.equals(ncc.getDangHoatDong())) {
            throw new IllegalArgumentException("Nhà cung cấp đã ngừng hoạt động / ngừng hợp tác — không thể tạo đơn nhập");
        }

        if (request.getIdHopDong() != null) {
            HopDong hd = hopDongRepository.findById(request.getIdHopDong())
                    .orElseThrow(() -> new IllegalArgumentException("Hợp đồng mua hàng không tồn tại"));
            if (!hd.getIdNcc().equals(request.getIdNcc())) {
                throw new IllegalArgumentException("Hợp đồng không thuộc về Nhà cung cấp đã chọn");
            }
            if (!"ACTIVE".equalsIgnoreCase(hd.getTrangThai())) {
                throw new IllegalArgumentException("Hợp đồng " + hd.getMaHopDong() + " không ở trạng thái hiệu lực");
            }
            LocalDate ngayDat = request.getNgayDatHang() != null ? request.getNgayDatHang() : LocalDate.now();
            if (hd.getNgayHieuLuc() != null && ngayDat.isBefore(hd.getNgayHieuLuc())) {
                throw new IllegalArgumentException("Ngày đặt hàng nằm trước ngày hiệu lực hợp đồng (" + hd.getNgayHieuLuc() + ")");
            }
            if (hd.getNgayHetHan() != null && ngayDat.isAfter(hd.getNgayHetHan())) {
                throw new IllegalArgumentException("Hợp đồng đã hết hạn hiệu lực vào ngày " + hd.getNgayHetHan());
            }
        }

        UUID idChiNhanh = request.getIdChiNhanh();
        if (idChiNhanh == null) {
            throw new IllegalArgumentException("Thiếu kho nhận hàng");
        }
        ChiNhanh chiNhanhNhap = chiNhanhRepository.findById(idChiNhanh)
                .orElseThrow(() -> new IllegalArgumentException("Chi nhánh nhập hàng không tồn tại"));
        if (!"KHO_TONG".equals(chiNhanhNhap.getLoai())) {
            throw new IllegalArgumentException("Phiếu nhập chỉ được tạo cho Kho Tổng");
        }
        if (!Boolean.TRUE.equals(chiNhanhNhap.getDangHoatDong())) {
            throw new IllegalArgumentException("Kho Tổng đã ngừng hoạt động");
        }
        branchAccessService.requireReadableBranch(actor, idChiNhanh);

        for (com.erp.cuahangtienloi.dto.request.PurchaseLineDTO line : request.getLines()) {
            if (line.getIdSanPham() == null) continue;
            SanPham sp = sanPhamRepository.findById(line.getIdSanPham())
                    .orElseThrow(() -> new IllegalArgumentException("Sản phẩm trong phiếu nhập không tồn tại"));

            Optional<SanPhamNhaCungCap> spNccOpt = sanPhamNhaCungCapRepository.findByIdSanPhamAndIdNhaCungCap(line.getIdSanPham(), request.getIdNcc());
            boolean isPrimarySupplier = request.getIdNcc().equals(sp.getIdNhaCungCap());
            boolean inContractLines = request.getIdHopDong() != null && hopDongChiTietRepository.findByIdHopDongAndIdSanPham(request.getIdHopDong(), line.getIdSanPham()).isPresent();
            boolean contractHasNoLines = request.getIdHopDong() != null && hopDongChiTietRepository.findByIdHopDong(request.getIdHopDong()).isEmpty();

            boolean canSupply = spNccOpt.isPresent() || isPrimarySupplier || inContractLines || contractHasNoLines;
            if (!canSupply) {
                throw new IllegalArgumentException("Nhà cung cấp chưa được duyệt cung cấp sản phẩm: " + sp.getTenSanPham());
            }

            if (spNccOpt.isEmpty()) {
                BigDecimal donGiaNhap = line.getDonGiaNhap() != null && line.getDonGiaNhap().compareTo(BigDecimal.ZERO) > 0
                        ? line.getDonGiaNhap()
                        : (sp.getGiaVon() != null ? sp.getGiaVon() : BigDecimal.ZERO);
                SanPhamNhaCungCap spncc = SanPhamNhaCungCap.builder()
                        .id(UUID.randomUUID())
                        .idSanPham(sp.getId())
                        .idNhaCungCap(request.getIdNcc())
                        .giaNhap(donGiaNhap)
                        .laNccChinh(isPrimarySupplier)
                        .ghiChu("Tự động liên kết khi nhập kho NCC")
                        .ngayTao(LocalDateTime.now())
                        .ngayCapNhat(LocalDateTime.now())
                        .build();
                sanPhamNhaCungCapRepository.save(spncc);
            }

            if (line.getSoLuongNhan() != null && line.getSoLuongNhan() > line.getSoLuong()) {
                throw new IllegalArgumentException("Số lượng nhận không được vượt số lượng đặt");
            }
        }

        PhieuNhap pn = new PhieuNhap();
        pn.setId(UUID.randomUUID());
        pn.setIdChiNhanh(idChiNhanh);
        pn.setIdNcc(request.getIdNcc());
        pn.setIdHopDong(request.getIdHopDong());
        pn.setIdNguoiNhap(actor.getId());
        LocalDate ngayNhap = request.getNgayDatHang() != null ? request.getNgayDatHang() : LocalDate.now();
        pn.setNgayDatHang(ngayNhap);
        pn.setNgayDuKienGiao(request.getNgayDuKienGiao() != null ? request.getNgayDuKienGiao() : ngayNhap);
        pn.setNgayNhanThucTe(null);
        pn.setGiamGia(BigDecimal.ZERO);
        pn.setTrangThai(ST_PENDING_CONFIRMATION);
        pn.setGhiChu(request.getGhiChu());
        pn.setSubTotal(BigDecimal.ZERO);
        pn.setVatTotal(BigDecimal.ZERO);
        pn.setGrandTotal(BigDecimal.ZERO);
        pn.setDaThanhToan(BigDecimal.ZERO);
        pn.setCongNo(BigDecimal.ZERO);
        pn.setNgayTao(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());
        PhieuNhap saved = phieuNhapRepository.saveAndFlush(pn);

        List<ChiTietPhieuNhap> lines = new ArrayList<>();
        int thuTu = 1;
        for (com.erp.cuahangtienloi.dto.request.PurchaseLineDTO line : request.getLines()) {
            if (line.getIdSanPham() == null || line.getSoLuong() == null || line.getSoLuong() <= 0) {
                continue;
            }
            ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuNhap(saved.getId());
            ct.setIdSanPham(line.getIdSanPham());
            ct.setSoLuongDat(line.getSoLuong());
            ct.setSoLuongNhan(0);
            ct.setSoLuongThua(0);
            ct.setXuLyThua("CHUA_XU_LY");

            BigDecimal unitPrice = line.getDonGiaNhap();
            if (unitPrice == null || unitPrice.signum() <= 0) {
                com.erp.cuahangtienloi.dto.PriceResolutionDTO priceResolved =
                        priceResolutionService.resolvePurchasePrice(request.getIdNcc(), line.getIdSanPham(), request.getIdHopDong());
                unitPrice = priceResolved.getDonGiaDeXuat();
            }
            ct.setDonGiaNhap(unitPrice != null ? unitPrice : BigDecimal.ZERO);
            ct.setVatPhantram(line.getVatPhantram() != null ? line.getVatPhantram() : 8);
            ct.setThanhTien(BigDecimal.ZERO);
            ct.setHanSuDung(line.getHanSuDung());
            ct.setThuTu(thuTu++);
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Không có dòng hàng hợp lệ");
        }
        chiTietPhieuNhapRepository.saveAll(lines);
        chiTietPhieuNhapRepository.flush();

        entityManager.clear();
        PhieuNhap finalPn = phieuNhapRepository.findById(saved.getId()).orElseThrow();
        notificationHelper.notifyPurchaseOrderCreated(finalPn, ncc.getTenNcc(), actor != null ? actor.getHoTen() : "Hệ thống");
        return phieuNhapMapper.toResponse(finalPn);
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> approve(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) return Optional.empty();
        PhieuNhap pn = found.get();
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());
        if (!ST_PENDING_CONFIRMATION.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ duyệt phiếu ở trạng thái chờ duyệt (PENDING_CONFIRMATION)");
        }
        pn.setTrangThai(ST_PENDING_RECEIVING);
        pn.setIdNguoiDuyet(actor.getId());
        pn.setNgayDuyet(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());
        phieuNhapRepository.saveAndFlush(pn);
        entityManager.clear();
        PhieuNhap approvedPn = phieuNhapRepository.findById(id).orElseThrow();
        notificationHelper.notifyPurchaseOrderApproved(approvedPn, actor != null ? actor.getHoTen() : "Hệ thống");
        return Optional.of(phieuNhapMapper.toResponse(approvedPn));
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> reject(UUID id, String lyDo, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) return Optional.empty();
        PhieuNhap pn = found.get();
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());
        if (!ST_PENDING_CONFIRMATION.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ từ chối phiếu ở trạng thái chờ duyệt (PENDING_CONFIRMATION)");
        }
        if (lyDo == null || lyDo.isBlank()) {
            throw new IllegalArgumentException("Lý do từ chối không được để trống");
        }
        pn.setTrangThai(ST_REJECTED);
        pn.setIdNguoiDuyet(actor.getId());
        pn.setNgayDuyet(LocalDateTime.now());
        pn.setLyDoTuChoi(lyDo.trim());
        pn.setNgayCapNhat(LocalDateTime.now());
        phieuNhapRepository.saveAndFlush(pn);
        entityManager.clear();
        return Optional.of(phieuNhapMapper.toResponse(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> startReceiving(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) return Optional.empty();
        PhieuNhap pn = found.get();
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());
        if (!ST_PENDING_RECEIVING.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ được bắt đầu kiểm nhận khi phiếu đang chờ nhận hàng (PENDING_RECEIVING)");
        }
        pn.setTrangThai(ST_RECEIVING);
        pn.setIdNguoiKiemNhan(actor.getId());
        pn.setNgayKiemNhan(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());
        phieuNhapRepository.saveAndFlush(pn);
        entityManager.clear();
        return Optional.of(phieuNhapMapper.toResponse(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> cancelReceiving(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) return Optional.empty();
        PhieuNhap pn = found.get();
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());
        if (!ST_RECEIVING.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ có thể hủy kiểm nhận khi phiếu đang ở trạng thái RECEIVING");
        }
        pn.setTrangThai(ST_PENDING_RECEIVING);
        pn.setIdNguoiKiemNhan(null);
        pn.setNgayKiemNhan(null);
        pn.setNgayCapNhat(LocalDateTime.now());
        phieuNhapRepository.saveAndFlush(pn);
        entityManager.clear();
        return Optional.of(phieuNhapMapper.toResponse(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> cancel(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) return Optional.empty();
        PhieuNhap pn = found.get();
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());
        String trangThai = pn.getTrangThai();
        if (!ST_PENDING_CONFIRMATION.equals(trangThai)
                && !ST_PENDING_RECEIVING.equals(trangThai)
                && !ST_RECEIVING.equals(trangThai)) {
            throw new IllegalArgumentException("Chỉ có thể hủy phiếu khi đang chờ duyệt, chờ nhận hàng hoặc đang kiểm nhận");
        }
        pn.setTrangThai(ST_CANCELLED);
        pn.setNgayCapNhat(LocalDateTime.now());
        phieuNhapRepository.saveAndFlush(pn);
        entityManager.clear();
        return Optional.of(phieuNhapMapper.toResponse(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> confirmReceiving(UUID id, com.erp.cuahangtienloi.dto.request.ConfirmReceivingRequestDTO request, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) return Optional.empty();
        PhieuNhap pn = found.get();
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());
        if (!ST_RECEIVING.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ được xác nhận kiểm nhận khi phiếu đang ở trạng thái RECEIVING");
        }
        if (request == null || request.getLines() == null || request.getLines().isEmpty()) {
            throw new IllegalArgumentException("Phiếu nhập phải có ít nhất một dòng kiểm nhận");
        }
        BigDecimal giamGia = request.getGiamGia() != null ? request.getGiamGia() : BigDecimal.ZERO;
        if (giamGia.signum() < 0) {
            throw new IllegalArgumentException("Giảm giá không được âm");
        }
        List<ChiTietPhieuNhap> lines = chiTietPhieuNhapRepository.findByIdPhieuNhap(id);
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Phiếu không có dòng chi tiết — không thể kiểm nhận");
        }
        java.util.Map<UUID, com.erp.cuahangtienloi.dto.request.ConfirmReceivingRequestDTO.ReceivingLineDTO> requestLines = new java.util.HashMap<>();
        for (var line : request.getLines()) {
            if (line.getIdChiTiet() == null) throw new IllegalArgumentException("Thiếu id chi tiết phiếu nhập");
            if (requestLines.put(line.getIdChiTiet(), line) != null) {
                throw new IllegalArgumentException("Không được gửi trùng dòng chi tiết: " + line.getIdChiTiet());
            }
        }
        if (requestLines.size() != lines.size()) {
            throw new IllegalArgumentException("Danh sách kiểm nhận phải chứa đầy đủ các dòng của phiếu nhập");
        }

        LocalDate ngayNhan = LocalDate.now();
        boolean coChenhLech = false;
        for (ChiTietPhieuNhap ct : lines) {
            var input = requestLines.get(ct.getId());
            int soLuongDat = ct.getSoLuongDat() != null ? ct.getSoLuongDat() : 0;
            int soLuongNhan = input.getSoLuongNhan() != null ? input.getSoLuongNhan() : 0;
            int soLuongThua = input.getSoLuongThua() != null ? input.getSoLuongThua() : 0;
            if (soLuongNhan < 0) throw new IllegalArgumentException("Số lượng nhận không được âm");
            if (soLuongNhan > soLuongDat) throw new IllegalArgumentException("Số lượng nhận không được vượt số lượng đặt");
            if (soLuongThua < 0) throw new IllegalArgumentException("Số lượng thừa không được âm");
            String xuLyThua = input.getXuLyThua();
            if (xuLyThua == null || !SURPLUS_HANDLING.contains(xuLyThua)) {
                throw new IllegalArgumentException("Cách xử lý số lượng thừa không hợp lệ");
            }
            if (soLuongThua == 0 && !"CHUA_XU_LY".equals(xuLyThua)) {
                throw new IllegalArgumentException("Khi không có số lượng thừa, cách xử lý phải là CHUA_XU_LY");
            }
            if (soLuongThua > 0 && "CHUA_XU_LY".equals(xuLyThua)) {
                throw new IllegalArgumentException("Có số lượng thừa thì phải chọn NHAP_KHO hoặc TRA_LAI_NCC");
            }
            if (soLuongNhan != soLuongDat || soLuongThua > 0) {
                coChenhLech = true;
            }

            ct.setSoLuongNhan(soLuongNhan);
            ct.setSoLuongThua(soLuongThua);
            ct.setXuLyThua(xuLyThua);
            if (input.getLyDoChenhLechDong() != null && !input.getLyDoChenhLechDong().isBlank()) {
                ct.setLyDoChenhLechDong(input.getLyDoChenhLechDong().trim());
            }

            LocalDate hsd = ct.getHanSuDung();
            if (hsd == null) {
                SanPham sp = sanPhamRepository.findById(ct.getIdSanPham()).orElse(null);
                if (sp != null && sp.getHanSuDungNgay() != null && sp.getHanSuDungNgay() >= 0) {
                    hsd = ngayNhan.plusDays(sp.getHanSuDungNgay());
                    ct.setHanSuDung(hsd);
                }
            }
            chiTietPhieuNhapRepository.save(ct);

            int soLuongNhapKho = soLuongNhan;
            if ("NHAP_KHO".equals(xuLyThua)) {
                soLuongNhapKho += soLuongThua;
            }
            if (soLuongNhapKho > 0) {
                jdbcTemplate.query(
                        "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                        rs -> {},
                        ct.getIdSanPham(), pn.getIdChiNhanh(), "PURCHASE_IN", soLuongNhapKho, ct.getDonGiaNhap(),
                        pn.getMaPhieu(), actor.getHoTen(), hsd,
                        "Nhập hàng từ NCC: phiếu " + pn.getMaPhieu());
                loHangService.taoHoacCapNhatLoHang(
                        ct.getIdSanPham(), pn.getIdChiNhanh(), soLuongNhapKho,
                        ct.getDonGiaNhap(), hsd, null, null);
            }
        }
        chiTietPhieuNhapRepository.flush();

        if (coChenhLech && request.getLyDoChenhLech() != null && !request.getLyDoChenhLech().isBlank()) {
            pn.setLyDoChenhLech(request.getLyDoChenhLech().trim());
        }

        BigDecimal[] totals = jdbcTemplate.queryForObject(
                "SELECT sub_total, vat_total FROM phieu_nhap WHERE id = ?",
                (rs, rowNum) -> new BigDecimal[]{ rs.getBigDecimal("sub_total"), rs.getBigDecimal("vat_total") },
                pn.getId()
        );
        BigDecimal subTotalDb = totals != null && totals[0] != null ? totals[0] : BigDecimal.ZERO;
        BigDecimal vatTotalDb = totals != null && totals[1] != null ? totals[1] : BigDecimal.ZERO;
        BigDecimal grandTotalMoi = subTotalDb.add(vatTotalDb).subtract(giamGia);
        if (grandTotalMoi.signum() < 0) throw new IllegalArgumentException("Tổng tiền phiếu nhập không được âm");

        BigDecimal daThanhToan = pn.getDaThanhToan() != null ? pn.getDaThanhToan() : BigDecimal.ZERO;
        pn.setSubTotal(subTotalDb);
        pn.setVatTotal(vatTotalDb);
        pn.setGiamGia(giamGia);
        pn.setGrandTotal(grandTotalMoi);
        pn.setCongNo(grandTotalMoi.subtract(daThanhToan));
        pn.setNgayNhanThucTe(ngayNhan);
        pn.setTrangThai(ST_COMPLETED);
        pn.setNgayCapNhat(LocalDateTime.now());
        phieuNhapRepository.saveAndFlush(pn);

        capNhatThucHienHopDong(pn.getIdHopDong(), lines, grandTotalMoi);

        entityManager.clear();
        PhieuNhap completedPn = phieuNhapRepository.findById(id).orElseThrow();
        notificationHelper.notifyPurchaseOrderCompleted(completedPn, grandTotalMoi, actor != null ? actor.getHoTen() : "Hệ thống");
        return Optional.of(phieuNhapMapper.toResponse(completedPn));
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> changePrice(
            UUID idPhieuNhap,
            UUID idChiTiet,
            com.erp.cuahangtienloi.dto.request.ChangePriceRequestDTO request,
            NhanVien actor
    ) {
        PhieuNhap pn = phieuNhapRepository.findByIdForUpdate(idPhieuNhap)
                .orElseThrow(() -> new IllegalArgumentException("Phiếu nhập không tồn tại"));
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());
        if (!ST_PENDING_RECEIVING.equals(pn.getTrangThai())
                && !ST_RECEIVING.equals(pn.getTrangThai())
                && !ST_COMPLETED.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ được thay đổi giá khi phiếu đang chờ nhận hàng, đang kiểm nhận hoặc đã hoàn tất");
        }
        if (request == null || request.getDonGiaNhapMoi() == null || request.getDonGiaNhapMoi().signum() <= 0) {
            throw new IllegalArgumentException("Đơn giá mới phải lớn hơn 0");
        }
        if (request.getLyDo() == null || request.getLyDo().isBlank()) {
            throw new IllegalArgumentException("Lý do thay đổi giá bắt buộc nhập");
        }
        ChiTietPhieuNhap ct = chiTietPhieuNhapRepository.findByIdForUpdate(idChiTiet)
                .orElseThrow(() -> new IllegalArgumentException("Chi tiết phiếu nhập không tồn tại"));
        if (!idPhieuNhap.equals(ct.getIdPhieuNhap())) {
            throw new IllegalArgumentException("Chi tiết không thuộc phiếu nhập này");
        }
        if (ct.getDonGiaNhapCu() == null) {
            ct.setDonGiaNhapCu(ct.getDonGiaNhap() != null ? ct.getDonGiaNhap() : BigDecimal.ZERO);
        }
        ct.setDonGiaNhap(request.getDonGiaNhapMoi());
        ct.setLyDoChenhLechDong(request.getLyDo().trim());
        chiTietPhieuNhapRepository.saveAndFlush(ct);

        BigDecimal[] totals = jdbcTemplate.queryForObject(
                "SELECT sub_total, vat_total, grand_total FROM phieu_nhap WHERE id = ?",
                (rs, rowNum) -> new BigDecimal[]{ rs.getBigDecimal("sub_total"), rs.getBigDecimal("vat_total"), rs.getBigDecimal("grand_total") },
                pn.getId()
        );
        BigDecimal subTotalDb = totals != null && totals[0] != null ? totals[0] : BigDecimal.ZERO;
        BigDecimal vatTotalDb = totals != null && totals[1] != null ? totals[1] : BigDecimal.ZERO;
        BigDecimal grandTotalDb = totals != null && totals[2] != null ? totals[2] : BigDecimal.ZERO;
        BigDecimal daThanhToan = pn.getDaThanhToan() != null ? pn.getDaThanhToan() : BigDecimal.ZERO;

        pn.setSubTotal(subTotalDb);
        pn.setVatTotal(vatTotalDb);
        pn.setGrandTotal(grandTotalDb);
        pn.setCongNo(grandTotalDb.subtract(daThanhToan));
        pn.setNgayCapNhat(LocalDateTime.now());
        phieuNhapRepository.saveAndFlush(pn);
        entityManager.clear();
        return Optional.of(phieuNhapMapper.toResponse(phieuNhapRepository.findById(idPhieuNhap).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> pay(UUID id, com.erp.cuahangtienloi.dto.request.PayRequestDTO request, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) return Optional.empty();
        PhieuNhap pn = found.get();
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());
        if (!ST_COMPLETED.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ thanh toán phiếu nhập đã hoàn tất kiểm nhận (COMPLETED)");
        }
        BigDecimal grandTotal = pn.getGrandTotal() != null ? pn.getGrandTotal() : BigDecimal.ZERO;
        BigDecimal daThanhToan = pn.getDaThanhToan() != null ? pn.getDaThanhToan() : BigDecimal.ZERO;
        BigDecimal congNo = grandTotal.subtract(daThanhToan);
        if (congNo.signum() <= 0) {
            throw new IllegalArgumentException("Phiếu nhập đã thanh toán đủ");
        }
        BigDecimal soTienThanhToan = request != null && request.getDaThanhToan() != null ? request.getDaThanhToan() : congNo;
        if (soTienThanhToan.signum() <= 0) {
            throw new IllegalArgumentException("Số tiền thanh toán phải lớn hơn 0");
        }
        if (soTienThanhToan.compareTo(congNo) > 0) {
            throw new IllegalArgumentException("Số tiền thanh toán không được vượt quá công nợ hiện tại (" + congNo + ")");
        }
        BigDecimal tongDaThanhToanMoi = daThanhToan.add(soTienThanhToan);
        BigDecimal congNoMoi = grandTotal.subtract(tongDaThanhToanMoi);
        pn.setDaThanhToan(tongDaThanhToanMoi);
        pn.setCongNo(congNoMoi);
        pn.setNgayCapNhat(LocalDateTime.now());
        phieuNhapRepository.saveAndFlush(pn);

        ghiSoQuyNhapHang(pn, soTienThanhToan, actor.getId(), request != null ? request.getHinhThucTt() : null);

        entityManager.clear();
        return Optional.of(phieuNhapMapper.toResponse(phieuNhapRepository.findById(id).orElseThrow()));
    }

    private void ghiSoQuyNhapHang(PhieuNhap pn, BigDecimal amount, UUID actorId, String hinhThucTt) {
        if (amount == null || amount.signum() <= 0) return;

        String tenNcc = nhaCungCapRepository.findById(pn.getIdNcc())
                .map(NhaCungCap::getTenNcc)
                .orElse("Nhà cung cấp");
        SoQuy cashEntry = new SoQuy();
        cashEntry.setId(UUID.randomUUID());
        cashEntry.setMaChungTu(null);
        cashEntry.setMaChungTuLienQuan(pn.getMaPhieu());
        cashEntry.setIdChiNhanh(pn.getIdChiNhanh());
        cashEntry.setIdNguoiTao(actorId != null ? actorId : pn.getIdNguoiNhap());
        cashEntry.setDirection("PAYMENT");
        cashEntry.setHangMuc("NHAP_HANG");
        cashEntry.setHinhThucTt(hinhThucTt != null && !hinhThucTt.isBlank() ? hinhThucTt : "BANK_TRANSFER");
        cashEntry.setEntryDate(LocalDate.now());
        cashEntry.setSoTien(amount);
        cashEntry.setDoiTuong(tenNcc);
        cashEntry.setDienGiai("Thanh toán nhập hàng " + pn.getMaPhieu() + " · NCC " + tenNcc);
        cashEntry.setRunningBalance(BigDecimal.ZERO);
        cashEntry.setTrangThai("COMPLETED");
        cashEntry.setNgayTao(LocalDateTime.now());
        cashEntry.setNgayCapNhat(LocalDateTime.now());
        soQuyRepository.saveAndFlush(cashEntry);
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> receive(UUID id, NhanVien actor) {
        return startReceiving(id, actor);
    }

    private void capNhatThucHienHopDong(UUID idHopDong, List<ChiTietPhieuNhap> lines, BigDecimal grandTotal) {
        if (idHopDong == null) return;
        hopDongRepository.findById(idHopDong).ifPresent(hd -> {
            BigDecimal currentUsage = hd.getGiaTriDaSuDung() != null ? hd.getGiaTriDaSuDung() : BigDecimal.ZERO;
            hd.setGiaTriDaSuDung(currentUsage.add(grandTotal != null ? grandTotal : BigDecimal.ZERO));
            hd.setNgayCapNhat(LocalDateTime.now());
            hopDongRepository.save(hd);

            for (ChiTietPhieuNhap ct : lines) {
                if (ct.getSoLuongNhan() != null && ct.getSoLuongNhan() > 0) {
                    hopDongChiTietRepository.findByIdHopDongAndIdSanPham(idHopDong, ct.getIdSanPham()).ifPresent(item -> {
                        int currentReceived = item.getSoLuongDaNhap() != null ? item.getSoLuongDaNhap() : 0;
                        item.setSoLuongDaNhap(currentReceived + ct.getSoLuongNhan());
                        item.setNgayCapNhat(LocalDateTime.now());
                        hopDongChiTietRepository.save(item);
                    });
                }
            }
        });
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> update(UUID id, PhieuNhap request, NhanVien actor) {
        return phieuNhapRepository.findById(id)
                .map(pn -> {
                    branchAccessService.requireReadableBranch(actor, pn.getIdChiNhanh());
                    validatePurchaseTotals(request);
                    if (request.getMaPhieu() != null) pn.setMaPhieu(request.getMaPhieu());
                    if (request.getNgayDatHang() != null) pn.setNgayDatHang(request.getNgayDatHang());
                    if (request.getNgayDuKienGiao() != null) pn.setNgayDuKienGiao(request.getNgayDuKienGiao());
                    if (request.getNgayNhanThucTe() != null) pn.setNgayNhanThucTe(request.getNgayNhanThucTe());
                    if (request.getSubTotal() != null) pn.setSubTotal(request.getSubTotal());
                    if (request.getVatTotal() != null) pn.setVatTotal(request.getVatTotal());
                    if (request.getGiamGia() != null) pn.setGiamGia(request.getGiamGia());
                    if (request.getGrandTotal() != null) pn.setGrandTotal(request.getGrandTotal());
                    if (request.getDaThanhToan() != null) pn.setDaThanhToan(request.getDaThanhToan());
                    if (request.getCongNo() != null) pn.setCongNo(request.getCongNo());
                    if (request.getTrangThai() != null) pn.setTrangThai(request.getTrangThai());
                    if (request.getGhiChu() != null) pn.setGhiChu(request.getGhiChu());
                    pn.setNgayCapNhat(LocalDateTime.now());
                    phieuNhapRepository.save(pn);
                    return phieuNhapMapper.toResponse(pn);
                });
    }

    @Transactional
    public Optional<PhieuNhapResponseDTO> update(UUID id, com.erp.cuahangtienloi.dto.request.PhieuNhapRequestDTO request, NhanVien actor) {
        return update(id, phieuNhapMapper.toEntity(request), actor);
    }

    @Transactional
    public boolean delete(UUID id, NhanVien actor) {
        return phieuNhapRepository.findById(id).map(pn -> {
            branchAccessService.requireReadableBranch(actor, pn.getIdChiNhanh());
            phieuNhapRepository.delete(pn);
            return true;
        }).orElse(false);
    }

    private void validatePurchaseTotals(PhieuNhap request) {
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSubTotal(), "Tạm tính");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getVatTotal(), "Tiền VAT");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getGiamGia(), "Giảm giá");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getGrandTotal(), "Tổng tiền");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDaThanhToan(), "Đã thanh toán");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getCongNo(), "Công nợ");
    }

    // --- Logic ChiTietPhieuNhap ---
    @Transactional(readOnly = true)
    public List<ChiTietPhieuNhapResponseDTO> getLinesByPhieuNhap(UUID idPhieuNhap, NhanVien actor) {
        requireReadableHeader(idPhieuNhap, actor);   // giữ nguyên, phải gọi trước khi trả
        return chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap).stream()
                .map(chiTietPhieuNhapMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChiTietPhieuNhapResponseDTO> getLinesBySanPham(UUID idSanPham, NhanVien actor) {
        return chiTietPhieuNhapRepository.findByIdSanPham(idSanPham).stream()
                .filter(ct -> canReadHeader(actor, ct.getIdPhieuNhap()))
                .map(chiTietPhieuNhapMapper::toResponse)
                .toList();
    }

    @Transactional
    public ChiTietPhieuNhapResponseDTO createLine(ChiTietPhieuNhapRequestDTO request, NhanVien actor) {
        validateLine(request, actor);
        ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuNhap(request.getIdPhieuNhap());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuongDat(request.getSoLuongDat());
        ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
        ct.setDonGiaNhap(request.getDonGiaNhap());
        ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        ct.setThanhTien(request.getThanhTien());
        ct.setHanSuDung(request.getHanSuDung());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());
        return chiTietPhieuNhapMapper.toResponse(chiTietPhieuNhapRepository.save(ct));
    }

    @Transactional
    public void createBatchLines(List<ChiTietPhieuNhapRequestDTO> requests, NhanVien actor) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Danh sách chi tiết phiếu nhập rỗng");
        }
        for (ChiTietPhieuNhapRequestDTO request : requests) {
            validateLine(request, actor);
            ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuNhap(request.getIdPhieuNhap());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuongDat(request.getSoLuongDat());
            ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
            ct.setDonGiaNhap(request.getDonGiaNhap());
            ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
            ct.setThanhTien(request.getThanhTien());
            ct.setHanSuDung(request.getHanSuDung());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietPhieuNhapRepository.save(ct);
        }
    }

    @Transactional
    public boolean deleteLine(UUID id, NhanVien actor) {
        return chiTietPhieuNhapRepository.findById(id).map(ct -> {
            requireReadableHeader(ct.getIdPhieuNhap(), actor);
            chiTietPhieuNhapRepository.delete(ct);
            return true;
        }).orElse(false);
    }

    @Transactional
    public void deleteLinesByPhieuNhap(UUID idPhieuNhap, NhanVien actor) {
        requireReadableHeader(idPhieuNhap, actor);
        List<ChiTietPhieuNhap> list = chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap);
        chiTietPhieuNhapRepository.deleteAll(list);
    }

    private void validateLine(ChiTietPhieuNhapRequestDTO  request, NhanVien actor) {
        if (request.getIdPhieuNhap() == null || !phieuNhapRepository.existsById(request.getIdPhieuNhap())) {
            throw new IllegalArgumentException("Phiếu nhập không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        requireReadableHeader(request.getIdPhieuNhap(), actor);
        com.erp.cuahangtienloi.validation.InputValidator.positive(request.getSoLuongDat(), "Số lượng đặt");
        if (request.getSoLuongNhan() != null) {
            com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSoLuongNhan(), "Số lượng nhận");
            if (request.getSoLuongNhan() > request.getSoLuongDat()) {
                throw new IllegalArgumentException("Số lượng nhận không được vượt số lượng đặt");
            }
        }
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGiaNhap(), "Đơn giá nhập");
        if (request.getVatPhantram() != null && (request.getVatPhantram() < 0 || request.getVatPhantram() > 100)) {
            throw new IllegalArgumentException("VAT phải từ 0 đến 100");
        }
    }

    private boolean canReadHeader(NhanVien actor, UUID idPhieuNhap) {
        return phieuNhapRepository.findById(idPhieuNhap)
                .map(header -> branchAccessService.canReadBranch(actor, header.getIdChiNhanh()))
                .orElse(false);
    }

    private void requireReadableHeader(UUID idPhieuNhap, NhanVien actor) {
        if (!canReadHeader(actor, idPhieuNhap)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Không được xem hoặc sửa chi tiết phiếu nhập của chi nhánh khác");
        }
    }
}
