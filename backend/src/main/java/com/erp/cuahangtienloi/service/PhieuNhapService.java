package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.PhieuNhapDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuNhap;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.SoQuy;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

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

    public static final String ST_PENDING_CONFIRMATION = "PENDING_CONFIRMATION";
    public static final String ST_REJECTED            = "REJECTED";
    public static final String ST_PENDING_RECEIVING   = "PENDING_RECEIVING";
    public static final String ST_RECEIVING           = "RECEIVING";
    public static final String ST_COMPLETED           = "COMPLETED";
    public static final String ST_CANCELLED           = "CANCELLED";

    private static final Set<String> SURPLUS_HANDLING = Set.of("NHAP_KHO", "TRA_LAI_NCC", "CHUA_XU_LY");

    @PersistenceContext
    private EntityManager entityManager;

    @Getter
    @Setter
    public static class PayRequest {
        private BigDecimal daThanhToan;
        private String hinhThucTt;
    }

    @Getter
    @Setter
    public static class ChangePriceRequest {
        @NotNull(message = "Đơn giá mới bắt buộc nhập")
        @DecimalMin(value = "0.01", message = "Đơn giá mới phải lớn hơn 0")
        private BigDecimal donGiaNhapMoi;
        @NotBlank(message = "Lý do thay đổi giá bắt buộc nhập")
        private String lyDo;
    }

    @Getter
    @Setter
    public static class CreatePurchaseRequest {
        private UUID idChiNhanh;

        @NotNull(message = "Nhà cung cấp bắt buộc chọn")
        private UUID idNcc;

        private LocalDate ngayDatHang;
        private LocalDate ngayDuKienGiao;

        @PositiveOrZero(message = "Giảm giá không được âm")
        private BigDecimal giamGia;

        private String ghiChu;

        @NotEmpty(message = "Phiếu nhập phải có ít nhất một dòng hàng")
        @Valid
        private List<PurchaseLine> lines;
    }

    @Getter
    @Setter
    public static class PurchaseLine {
        @NotNull(message = "Sản phẩm bắt buộc chọn")
        private UUID idSanPham;

        @NotNull(message = "Số lượng đặt bắt buộc nhập")
        @Min(value = 1, message = "Số lượng đặt phải lớn hơn 0")
        private Integer soLuong;

        @NotNull(message = "Đơn giá nhập bắt buộc nhập")
        @DecimalMin(value = "0.01", message = "Đơn giá nhập phải lớn hơn 0")
        private BigDecimal donGiaNhap;

        @Min(value = 0, message = "VAT phải từ 0 đến 100")
        @Max(value = 100, message = "VAT phải từ 0 đến 100")
        private Integer vatPhantram;

        private LocalDate hanSuDung;
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapDTO> getAll(NhanVien actor) {
        List<PhieuNhap> purchases = phieuNhapRepository.findAll()
                .stream()
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .toList();
        return toDTOList(purchases);
    }

    @Transactional(readOnly = true)
    public Optional<PhieuNhapDTO> getById(UUID id, NhanVien actor) {
        return phieuNhapRepository.findById(id)
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapDTO> getByChiNhanh(UUID idChiNhanh, NhanVien actor) {
        branchAccessService.requireReadableBranch(actor, idChiNhanh);
        return toDTOList(phieuNhapRepository.findByIdChiNhanh(idChiNhanh));
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapDTO> getByNcc(UUID idNcc, NhanVien actor) {
        List<PhieuNhap> purchases =
                phieuNhapRepository.findByIdNcc(idNcc)
                        .stream()
                        .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                        .toList();

        return toDTOList(purchases);
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapDTO> getByStatus(String trangThai, NhanVien actor) {
        List<PhieuNhap> purchases =
                phieuNhapRepository.findByTrangThai(trangThai)
                        .stream()
                        .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                        .toList();

        return toDTOList(purchases);
    }

    @Transactional
    public PhieuNhapDTO createWithLines(CreatePurchaseRequest request, NhanVien actor) {
        if (request.getIdNcc() == null) {
            throw new IllegalArgumentException("Thiếu nhà cung cấp");
        }

        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new IllegalArgumentException("Phiếu không có dòng hàng");
        }

        NhaCungCap nhaCungCap = nhaCungCapRepository.findById(request.getIdNcc())
                .orElseThrow(() ->
                        new IllegalArgumentException("Nhà cung cấp không tồn tại"));

        if (!Boolean.TRUE.equals(nhaCungCap.getDangHoatDong())) {
            throw new IllegalArgumentException(
                    "Nhà cung cấp đã ngừng hợp tác, không thể lập phiếu nhập mới"
            );
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

        branchAccessService.requireWritableBranch(actor, idChiNhanh);

        // ===== XÁC ĐỊNH NGÀY ĐẶT HÀNG =====
        LocalDate ngayNhap = request.getNgayDatHang() != null
                        ? request.getNgayDatHang()
                        : LocalDate.now();

        // ===== VALIDATE NGÀY DỰ KIẾN GIAO =====
        if (request.getNgayDuKienGiao() != null && request.getNgayDuKienGiao().isBefore(ngayNhap)) {
            throw new IllegalArgumentException("Ngày dự kiến giao phải >= ngày đặt hàng");
        }

        // ===== GIẢM GIÁ CHỈ ĐƯỢC ÁP DỤNG KHI XÁC NHẬN NHẬN HÀNG =====
        if (request.getGiamGia() != null && request.getGiamGia().signum() != 0) {
            throw new IllegalArgumentException(
                    "Phiếu nhập chưa có số lượng nhận nên chưa hỗ trợ giảm giá khi tạo. "
                            + "Giảm giá được đặt ở bước xác nhận kiểm nhận."
            );
        }

        // ===== VALIDATE CÁC DÒNG HÀNG =====
        Set<UUID> productIds = new HashSet<>();
        for (PurchaseLine line : request.getLines()) {
            if (line.getIdSanPham() == null) {
                throw new IllegalArgumentException("Sản phẩm trong dòng nhập không được để trống");
            }

            // Không cho phép một sản phẩm xuất hiện nhiều lần
            // trong cùng một phiếu nhập.
            if (!productIds.add(line.getIdSanPham())) {
                throw new IllegalArgumentException("Không được có nhiều dòng cùng một sản phẩm");
            }

            // Kiểm tra sản phẩm thực sự tồn tại trong DB.
            if (!sanPhamRepository.existsById(line.getIdSanPham())) {
                throw new IllegalArgumentException("Sản phẩm không tồn tại");
            }

            if (line.getSoLuong() == null || line.getSoLuong() <= 0) {
                throw new IllegalArgumentException("Số lượng đặt phải lớn hơn 0");
            }

            if (line.getDonGiaNhap() == null || line.getDonGiaNhap().signum() <= 0) {
                throw new IllegalArgumentException("Đơn giá nhập phải lớn hơn 0");
            }
        }

        // ===== TẠO PHIẾU NHẬP =====
        PhieuNhap pn = new PhieuNhap();
        pn.setId(UUID.randomUUID());
        pn.setIdChiNhanh(idChiNhanh);
        pn.setIdNcc(request.getIdNcc());
        pn.setIdNguoiNhap(actor.getId());

        pn.setNgayDatHang(ngayNhap);

        pn.setNgayDuKienGiao(request.getNgayDuKienGiao() != null
                        ? request.getNgayDuKienGiao()
                        : ngayNhap
        );

        pn.setNgayNhanThucTe(null);

        // Luôn = 0 khi mới tạo.
        // Giảm giá sẽ được áp dụng ở confirmReceiving().
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

        // ===== TẠO CHI TIẾT =====
        List<ChiTietPhieuNhap> lines = new ArrayList<>();
        int thuTu = 1;

        for (PurchaseLine line : request.getLines()) {
            ChiTietPhieuNhap ct = new ChiTietPhieuNhap();

            ct.setId(UUID.randomUUID());
            ct.setIdPhieuNhap(saved.getId());
            ct.setIdSanPham(line.getIdSanPham());

            ct.setSoLuongDat(line.getSoLuong());
            ct.setSoLuongNhan(0);

            ct.setSoLuongThua(0);
            ct.setXuLyThua("CHUA_XU_LY");

            ct.setDonGiaNhap(line.getDonGiaNhap());

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

        return toDTO(phieuNhapRepository.findById(saved.getId()).orElseThrow());
    }

    @Transactional
    public Optional<PhieuNhapDTO> approve(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);

        if (found.isEmpty()) {
            return Optional.empty();
        }

        PhieuNhap pn = found.get();

        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        if (!ST_PENDING_CONFIRMATION.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ duyệt phiếu ở trạng thái chờ duyệt");
        }

        pn.setTrangThai(ST_PENDING_RECEIVING);
        pn.setIdNguoiDuyet(actor.getId());
        pn.setNgayDuyet(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.saveAndFlush(pn);

        entityManager.clear();

        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapDTO> reject(UUID id, String lyDo, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);

        if (found.isEmpty()) {
            return Optional.empty();
        }

        PhieuNhap pn = found.get();

        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        if (!ST_PENDING_CONFIRMATION.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ từ chối phiếu ở trạng thái chờ duyệt");
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

        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    /**
     * Thanh toán công nợ phiếu nhập.
     *
     * Chỉ thanh toán khi phiếu đã COMPLETED.
     *
     * - Hỗ trợ thanh toán nhiều lần.
     * - Mỗi lần thanh toán tạo một dòng sổ quỹ riêng.
     * - Không thay đổi trạng thái phiếu.
     * - Không cho thanh toán vượt quá công nợ hiện tại.
     *
     * Công thức:
     *   công nợ hiện tại = grand_total - da_thanh_toan
     *   da_thanh_toan mới = da_thanh_toan + số tiền thanh toán
     *   công nợ mới = grand_total - da_thanh_toan mới
     *
     * Thanh toán không làm thay đổi tồn kho.
     */
    @Transactional
    public Optional<PhieuNhapDTO> pay(UUID id, PayRequest request, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);

        if (found.isEmpty()) {
            return Optional.empty();
        }

        PhieuNhap pn = found.get();

        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        if (!ST_COMPLETED.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ thanh toán phiếu nhập đã hoàn tất kiểm nhận");
        }

        List<ChiTietPhieuNhap> lines = chiTietPhieuNhapRepository.findByIdPhieuNhap(id);

        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Phiếu không có dòng chi tiết — không thể thanh toán");
        }

        BigDecimal grandTotal = pn.getGrandTotal() != null
                        ? pn.getGrandTotal()
                        : BigDecimal.ZERO;

        BigDecimal daThanhToan = pn.getDaThanhToan() != null
                        ? pn.getDaThanhToan()
                        : BigDecimal.ZERO;

        BigDecimal congNo = grandTotal.subtract(daThanhToan);

        if (congNo.signum() <= 0) {
            throw new IllegalArgumentException("Phiếu nhập đã thanh toán đủ");
        }

        BigDecimal soTienThanhToan = request != null && request.getDaThanhToan() != null
                        ? request.getDaThanhToan()
                        : congNo;

        if (soTienThanhToan.signum() <= 0) {
            throw new IllegalArgumentException("Số tiền thanh toán phải lớn hơn 0");
        }

        if (soTienThanhToan.compareTo(congNo) > 0) {
            throw new IllegalArgumentException("Số tiền thanh toán không được vượt quá công nợ hiện tại");
        }

        BigDecimal tongDaThanhToanMoi = daThanhToan.add(soTienThanhToan);

        BigDecimal congNoMoi = grandTotal.subtract(tongDaThanhToanMoi);

        pn.setDaThanhToan(tongDaThanhToanMoi);
        pn.setCongNo(congNoMoi);
        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.saveAndFlush(pn);

        /*
         * Mỗi lần thanh toán tạo một phiếu chi riêng.
         * Không được dùng idempotency guard cũ,
         * vì một phiếu nhập có thể thanh toán nhiều lần.
         */
        ghiSoQuyNhapHang(pn, soTienThanhToan, actor.getId(), request != null ? request.getHinhThucTt() : null);

        entityManager.clear();

        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    /**
     * Ghi sổ quỹ chi tiền trả NCC cho phiếu nhập.
     *
     * Mỗi lần thanh toán tạo một dòng sổ quỹ riêng,
     * vì một phiếu nhập có thể được thanh toán nhiều lần.
     */
    private void ghiSoQuyNhapHang(PhieuNhap pn, BigDecimal amount, UUID actorId, String hinhThucTt) {
        if (amount == null || amount.signum() <= 0) {
            return;
        }

        String tenNcc = nhaCungCapRepository
                .findById(pn.getIdNcc())
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
    public Optional<PhieuNhapDTO> startReceiving(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);

        if (found.isEmpty()) {
            return Optional.empty();
        }

        PhieuNhap pn = found.get();

        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        if (!ST_PENDING_RECEIVING.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ được bắt đầu kiểm nhận khi phiếu đang chờ nhận hàng");
        }

        pn.setTrangThai(ST_RECEIVING);
        pn.setIdNguoiKiemNhan(actor.getId());
        pn.setNgayKiemNhan(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.saveAndFlush(pn);

        entityManager.clear();

        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapDTO> cancelReceiving(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);

        if (found.isEmpty()) {
            return Optional.empty();
        }

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

        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapDTO> cancel(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);

        if (found.isEmpty()) {
            return Optional.empty();
        }

        PhieuNhap pn = found.get();

        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        String trangThai = pn.getTrangThai();

        if (!ST_PENDING_CONFIRMATION.equals(trangThai)
                && !ST_PENDING_RECEIVING.equals(trangThai)
                && !ST_RECEIVING.equals(trangThai)) {

            throw new IllegalArgumentException(
                    "Chỉ có thể hủy phiếu khi đang chờ duyệt, "
                            + "chờ nhận hàng hoặc đang kiểm nhận"
            );
        }

        pn.setTrangThai(ST_CANCELLED);
        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.saveAndFlush(pn);

        entityManager.clear();

        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapDTO> changePrice(UUID idPhieuNhap, UUID idChiTiet, ChangePriceRequest request, NhanVien actor) {
        PhieuNhap pn = phieuNhapRepository
                .findByIdForUpdate(idPhieuNhap)
                .orElseThrow(() -> new IllegalArgumentException("Phiếu nhập không tồn tại"));

        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        if (!ST_PENDING_RECEIVING.equals(pn.getTrangThai())
                && !ST_RECEIVING.equals(pn.getTrangThai())
                && !ST_COMPLETED.equals(pn.getTrangThai())) {

            throw new IllegalArgumentException(
                    "Chỉ được thay đổi giá khi phiếu đang "
                            + "chờ nhận hàng, đang kiểm nhận hoặc đã hoàn tất"
            );
        }

        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu thay đổi giá không được để trống");
        }

        if (request.getDonGiaNhapMoi() == null || request.getDonGiaNhapMoi().signum() <= 0) {
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

        BigDecimal giaCu = ct.getDonGiaNhap() != null ? ct.getDonGiaNhap() : BigDecimal.ZERO;

        BigDecimal giaMoi = request.getDonGiaNhapMoi();

        /*
         * Chỉ lưu giá cũ ở lần sửa giá đầu tiên.
         */
        if (ct.getDonGiaNhapCu() == null) {
            ct.setDonGiaNhapCu(giaCu);
        }

        /*
         * =========================================================
         * TÍNH GRAND TOTAL DỰ KIẾN ĐỂ KIỂM TRA CÔNG NỢ
         * =========================================================
         *
         * Chỉ cần kiểm tra khi dòng đã có số lượng nhận.
         *
         * Delta trước VAT:
         *   (giá mới - giá cũ) × số lượng nhận
         *
         * Delta VAT:
         *   delta trước VAT × VAT%
         *
         * Delta tổng:
         *   delta trước VAT + delta VAT
         */
        int soLuongNhan = ct.getSoLuongNhan() != null ? ct.getSoLuongNhan() : 0;

        BigDecimal grandTotalHienTai = pn.getGrandTotal() != null ? pn.getGrandTotal() : BigDecimal.ZERO;

        BigDecimal daThanhToan = pn.getDaThanhToan() != null ? pn.getDaThanhToan() : BigDecimal.ZERO;

        BigDecimal deltaSubTotal = giaMoi.subtract(giaCu).multiply(BigDecimal.valueOf(soLuongNhan));

        int vatPhanTram = ct.getVatPhantram() != null ? ct.getVatPhantram() : 0;

        BigDecimal deltaVat = deltaSubTotal
                        .multiply(BigDecimal.valueOf(vatPhanTram))
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);

        BigDecimal deltaGrandTotal = deltaSubTotal.add(deltaVat);

        BigDecimal grandTotalDuKien = grandTotalHienTai.add(deltaGrandTotal);

        /*
         * Không được sửa giá làm tổng tiền nhỏ hơn
         * số tiền đã thanh toán.
         */
        if (grandTotalDuKien.compareTo(daThanhToan) < 0) {
            throw new IllegalArgumentException("Không được giảm giá làm tổng tiền nhỏ hơn số tiền đã thanh toán");
        }

        /*
         * =========================================================
         * UPDATE CHI TIẾT
         * =========================================================
         *
         * Trigger DB sẽ tự tính lại:
         *   thanh_tien
         */
        ct.setDonGiaNhap(giaMoi);
        ct.setLyDoChenhLechDong(request.getLyDo().trim());

        chiTietPhieuNhapRepository.saveAndFlush(ct);

        /*
         * =========================================================
         * ĐỌC LẠI TỔNG TỪ DATABASE
         * =========================================================
         *
         * PostgreSQL trigger là nguồn chuẩn.
         * Không lấy tổng cũ trong entity Java.
         */
        BigDecimal[] totals = jdbcTemplate.queryForObject(
                """
                SELECT sub_total, vat_total, grand_total
                FROM phieu_nhap
                WHERE id = ?
                """,
                (rs, rowNum) -> new BigDecimal[]{
                        rs.getBigDecimal("sub_total"),
                        rs.getBigDecimal("vat_total"),
                        rs.getBigDecimal("grand_total")
                },
                pn.getId()
        );

        if (totals == null) {
            throw new IllegalStateException("Không thể đọc lại tổng tiền phiếu nhập");
        }

        BigDecimal subTotalDb = totals[0] != null ? totals[0] : BigDecimal.ZERO;

        BigDecimal vatTotalDb = totals[1] != null ? totals[1] : BigDecimal.ZERO;

        BigDecimal grandTotalDb = totals[2] != null ? totals[2] : BigDecimal.ZERO;

        /*
         * Kiểm tra lại bằng tổng thực tế từ DATABASE.
         *
         * Cần thiết vì Java và PostgreSQL có thể làm tròn VAT
         * theo cách khác nhau ở mức 1 đơn vị.
         */
        if (grandTotalDb.compareTo(daThanhToan) < 0) {
            throw new IllegalArgumentException("Không được giảm giá làm tổng tiền nhỏ hơn số tiền đã thanh toán");
        }

        /*
         * Đồng bộ entity header với DB.
         *
         * Tránh Hibernate lấy giá trị cũ trong RAM
         * ghi đè ngược lại kết quả trigger.
         */
        pn.setSubTotal(subTotalDb);
        pn.setVatTotal(vatTotalDb);
        pn.setGrandTotal(grandTotalDb);

        pn.setCongNo(grandTotalDb.subtract(daThanhToan));

        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.saveAndFlush(pn);

        entityManager.clear();

        return Optional.of(toDTO(phieuNhapRepository.findById(idPhieuNhap).orElseThrow()));
    }

    @Getter
    @Setter
    public static class ConfirmReceivingRequest {
        @PositiveOrZero(message = "Giảm giá không được âm")
        private BigDecimal giamGia;

        private String lyDoChenhLech;

        @NotEmpty(message = "Phiếu nhập phải có ít nhất một dòng kiểm nhận")
        @Valid
        private List<ReceivingLine> lines;
    }

    @Getter
    @Setter
    public static class ReceivingLine {
        @NotNull
        private UUID idChiTiet;

        @NotNull
        @Min(0)
        private Integer soLuongNhan;

        @NotNull
        @Min(0)
        private Integer soLuongThua;

        @NotBlank
        private String xuLyThua;

        private String lyDoChenhLechDong;
    }

    @Transactional
    public Optional<PhieuNhapDTO> confirmReceiving(UUID id, ConfirmReceivingRequest request, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);

        if (found.isEmpty()) {
            return Optional.empty();
        }

        PhieuNhap pn = found.get();

        // 1. Kiểm tra quyền chi nhánh
        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        // 2. Chỉ được xác nhận khi đang kiểm nhận
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

        /*
         * Map id chi tiết -> dữ liệu kiểm nhận client gửi lên.
         */
        Map<UUID, ReceivingLine> requestLines = new HashMap<>();

        for (ReceivingLine line : request.getLines()) {
            if (line.getIdChiTiet() == null) {
                throw new IllegalArgumentException("Thiếu id chi tiết phiếu nhập");
            }

            if (requestLines.put(line.getIdChiTiet(), line) != null) {
                throw new IllegalArgumentException(
                        "Không được gửi trùng dòng chi tiết: "
                                + line.getIdChiTiet()
                );
            }
        }

        /*
         * Bắt buộc client phải gửi đủ tất cả dòng.
         */
        if (requestLines.size() != lines.size()) {
            throw new IllegalArgumentException("Danh sách kiểm nhận phải chứa đầy đủ các dòng của phiếu nhập");
        }

        /*
         * =========================================================
         * PHASE 1 — VALIDATE TOÀN BỘ
         * =========================================================
         *
         * Chưa save line.
         * Chưa ghi tồn kho.
         * Chưa tạo lô.
         *
         * Mục đích: nếu có bất kỳ lỗi nào thì chưa thực hiện
         * side-effect nghiệp vụ.
         */
        Map<UUID, ReceivingLine> validatedLines = new HashMap<>();

        boolean coChenhLech = false;

        BigDecimal subTotalDuKien = BigDecimal.ZERO;
        BigDecimal vatTotalDuKien = BigDecimal.ZERO;

        LocalDate ngayNhan = LocalDate.now();

        for (ChiTietPhieuNhap ct : lines) {
            ReceivingLine input = requestLines.get(ct.getId());

            if (input == null) {
                throw new IllegalArgumentException("Thiếu dòng kiểm nhận: " + ct.getId());
            }

            int soLuongDat = ct.getSoLuongDat() != null ? ct.getSoLuongDat() : 0;

            int soLuongNhan = input.getSoLuongNhan() != null ? input.getSoLuongNhan() : 0;

            int soLuongThua = input.getSoLuongThua() != null ? input.getSoLuongThua() : 0;

            ReceivingLine normalized = new ReceivingLine();
            normalized.setIdChiTiet(input.getIdChiTiet());
            normalized.setSoLuongNhan(soLuongNhan);
            normalized.setSoLuongThua(soLuongThua);
            normalized.setXuLyThua(input.getXuLyThua());
            normalized.setLyDoChenhLechDong(input.getLyDoChenhLechDong());

            validatedLines.put(ct.getId(), normalized);

            /*
             * Số lượng nhận không được âm.
             */
            if (soLuongNhan < 0) {
                throw new IllegalArgumentException("Số lượng nhận không được âm");
            }

            /*
             * Không được nhận vượt số lượng đặt.
             */
            if (soLuongNhan > soLuongDat) {
                throw new IllegalArgumentException("Số lượng nhận không được vượt số lượng đặt");
            }

            /*
             * Tính tổng dự kiến ngay trong Phase 1.
             *
             * Chỉ tính số lượng nhận được thanh toán.
             * Hàng thừa không được NHAP_KHO vẫn không làm tăng
             * tiền phải trả NCC.
             */
            BigDecimal donGiaNhap = ct.getDonGiaNhap() != null ? ct.getDonGiaNhap() : BigDecimal.ZERO;

            BigDecimal thanhTienDuKien = donGiaNhap.multiply(BigDecimal.valueOf(soLuongNhan));

            int vatPhanTram = ct.getVatPhantram() != null ? ct.getVatPhantram() : 0;

            BigDecimal vatDuKien = thanhTienDuKien
                            .multiply(BigDecimal.valueOf(vatPhanTram))
                            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);

            subTotalDuKien = subTotalDuKien.add(thanhTienDuKien);

            vatTotalDuKien = vatTotalDuKien.add(vatDuKien);

            /*
             * Số lượng thừa không được âm.
             */
            if (soLuongThua < 0) {
                throw new IllegalArgumentException("Số lượng thừa không được âm");
            }

            String xuLyThua = input.getXuLyThua();

            if (xuLyThua == null || !SURPLUS_HANDLING.contains(xuLyThua)) {
                throw new IllegalArgumentException("Cách xử lý số lượng thừa không hợp lệ");
            }

            /*
             * Nếu không có hàng thừa thì bắt buộc CHUA_XU_LY.
             */
            if (soLuongThua == 0 && !"CHUA_XU_LY".equals(xuLyThua)) {
                throw new IllegalArgumentException("Khi không có số lượng thừa, " + "cách xử lý phải là CHUA_XU_LY");
            }

            /*
             * Nếu có hàng thừa thì phải quyết định:
             * - NHAP_KHO
             * - TRA_LAI_NCC
             */
            if (soLuongThua > 0 && "CHUA_XU_LY".equals(xuLyThua)) {
                throw new IllegalArgumentException("Có số lượng thừa thì phải chọn NHAP_KHO " + "hoặc TRA_LAI_NCC");
            }

            /*
             * Kiểm tra chênh lệch.
             */
            boolean lineHasDifference = soLuongNhan != soLuongDat || soLuongThua > 0;

            if (lineHasDifference) {
                coChenhLech = true;

                String lyDoDong = input.getLyDoChenhLechDong();

                boolean coLyDoDong = lyDoDong != null && !lyDoDong.isBlank();

                boolean coLyDoChung = request.getLyDoChenhLech() != null && !request.getLyDoChenhLech().isBlank();

                if (!coLyDoDong && !coLyDoChung) {
                    throw new IllegalArgumentException("Dòng có chênh lệch phải có lý do chênh lệch");
                }
            }
        }

        /*
         * =========================================================
         * VALIDATE TỔNG TIỀN NGAY TRONG PHASE 1
         * =========================================================
         *
         * Chưa cập nhật:
         * - chi tiết
         * - tồn kho
         * - thẻ kho
         * - lô hàng
         *
         * Vì vậy nếu giảm giá sai thì chưa có side-effect.
         */
        BigDecimal tongChuaGiamGiaDuKien = subTotalDuKien.add(vatTotalDuKien);

        if (giamGia.compareTo(tongChuaGiamGiaDuKien) > 0) {
            throw new IllegalArgumentException("Giảm giá không được lớn hơn tổng tiền hàng hóa");
        }

        BigDecimal grandTotalDuKien = tongChuaGiamGiaDuKien.subtract(giamGia);

        BigDecimal daThanhToanHienTai = pn.getDaThanhToan() != null ? pn.getDaThanhToan() : BigDecimal.ZERO;

        if (grandTotalDuKien.compareTo(daThanhToanHienTai) < 0) {
            throw new IllegalArgumentException("Tổng tiền không được nhỏ hơn số tiền đã thanh toán");
        }

        /*
         * =========================================================
         * PHASE 2 — APPLY
         * =========================================================
         *
         * Tới đây toàn bộ request đã hợp lệ.
         *
         * Bây giờ mới:
         * - cập nhật chi tiết
         * - ghi thẻ kho
         * - cập nhật tồn
         * - tạo/cập nhật lô
         */

        for (ChiTietPhieuNhap ct : lines) {
            ReceivingLine input = validatedLines.get(ct.getId());

            int soLuongNhan = input.getSoLuongNhan() != null ? input.getSoLuongNhan() : 0;

            int soLuongThua = input.getSoLuongThua() != null ? input.getSoLuongThua() : 0;

            String xuLyThua = input.getXuLyThua();

            /*
             * Cập nhật số lượng kiểm nhận.
             */
            ct.setSoLuongNhan(soLuongNhan);
            ct.setSoLuongThua(soLuongThua);
            ct.setXuLyThua(xuLyThua);

            /*
             * Lưu lý do chênh lệch theo dòng nếu có.
             */
            String lyDoDong = input.getLyDoChenhLechDong();

            ct.setLyDoChenhLechDong(lyDoDong != null && !lyDoDong.isBlank() ? lyDoDong.trim() : null);

            /*
             * Nếu chưa có HSD thì tự tính:
             *
             * HSD = ngày nhận + hạn sử dụng của sản phẩm.
             */
            LocalDate hsd = ct.getHanSuDung();

            if (hsd == null) {
                SanPham sp = sanPhamRepository.findById(ct.getIdSanPham()).orElse(null);

                if (sp != null && sp.getHanSuDungNgay() != null && sp.getHanSuDungNgay() >= 0) {
                    hsd = ngayNhan.plusDays(sp.getHanSuDungNgay());
                    ct.setHanSuDung(hsd);
                }
            }

            chiTietPhieuNhapRepository.save(ct);

            /*
             * =====================================================
             * TÍNH SỐ LƯỢNG THỰC TẾ NHẬP KHO
             * =====================================================
             *
             * Bình thường:
             *   nhập kho = số lượng nhận
             *
             * Nếu NHAP_KHO hàng thừa:
             *   nhập kho = số lượng nhận + số lượng thừa
             *
             * Nếu TRA_LAI_NCC:
             *   nhập kho = số lượng nhận
             */
            int soLuongNhapKho = soLuongNhan;

            if ("NHAP_KHO".equals(xuLyThua)) {
                soLuongNhapKho += soLuongThua;
            }

            /*
             * Chỉ ghi tồn nếu thực sự có hàng nhập kho.
             */
            if (soLuongNhapKho > 0) {
                jdbcTemplate.query(
                        "SELECT fn_ghi_the_kho_va_dieu_chinh_ton("
                                + "?::uuid, "
                                + "?::uuid, "
                                + "?::varchar, "
                                + "?::integer, "
                                + "?::numeric, "
                                + "?::varchar, "
                                + "?::varchar, "
                                + "?::date, "
                                + "?::text, "
                                + "NOW()::timestamp)",

                        rs -> {},

                        ct.getIdSanPham(),
                        pn.getIdChiNhanh(),
                        "PURCHASE_IN",
                        soLuongNhapKho,
                        ct.getDonGiaNhap(),
                        pn.getMaPhieu(),
                        actor.getHoTen(),
                        hsd,
                        "Nhập hàng từ NCC: phiếu "
                                + pn.getMaPhieu()
                );

                /*
                 * Tạo/cập nhật lô theo số lượng thực tế nhập kho.
                 */
                loHangService.taoHoacCapNhatLoHang(
                        ct.getIdSanPham(),
                        pn.getIdChiNhanh(),
                        soLuongNhapKho,
                        ct.getDonGiaNhap(),
                        hsd,
                        null,
                        null
                );
            }
        }

        chiTietPhieuNhapRepository.flush();

        /*
         * Lưu lý do chênh lệch ở cấp phiếu.
         *
         * Phải thực hiện SAU flush() chi tiết.
         * Nếu set pn trước flush(), Hibernate có thể flush luôn
         * entity PhieuNhap đang dirty với subTotal/vatTotal/grandTotal
         * cũ trong RAM và ghi đè kết quả trigger.
         */
        if (coChenhLech) {
            String lyDoChung = request.getLyDoChenhLech();

            pn.setLyDoChenhLech(lyDoChung != null && !lyDoChung.isBlank() ? lyDoChung.trim() : null);
        } else {
            pn.setLyDoChenhLech(null);
        }

        /*
         * =========================================================
         * ĐỌC TỔNG CHUẨN TỪ DATABASE
         * =========================================================
         *
         * Trigger trên phieu_nhap/chi_tiet_phieu_nhap là nguồn chuẩn
         * cho sub_total và vat_total.
         */
        BigDecimal[] totals = jdbcTemplate.queryForObject(
                """
                SELECT sub_total, vat_total
                FROM phieu_nhap
                WHERE id = ?
                """,
                (rs, rowNum) -> new BigDecimal[]{
                        rs.getBigDecimal("sub_total"),
                        rs.getBigDecimal("vat_total")
                },
                pn.getId()
        );

        if (totals == null) {
            throw new IllegalStateException("Không thể đọc tổng tiền phiếu nhập sau khi kiểm nhận");
        }

        BigDecimal subTotalDb = totals[0] != null ? totals[0] : BigDecimal.ZERO;

        BigDecimal vatTotalDb = totals[1] != null ? totals[1] : BigDecimal.ZERO;

        BigDecimal tongChuaGiamGiaDb = subTotalDb.add(vatTotalDb);

        BigDecimal grandTotalMoi = tongChuaGiamGiaDb.subtract(giamGia);

        if (grandTotalMoi.signum() < 0) {
            throw new IllegalArgumentException("Tổng tiền phiếu nhập không được âm");
        }

        BigDecimal daThanhToan = pn.getDaThanhToan() != null ? pn.getDaThanhToan() : BigDecimal.ZERO;

        if (daThanhToan.compareTo(grandTotalMoi) > 0) {
            throw new IllegalArgumentException("Số tiền đã thanh toán lớn hơn tổng tiền phiếu nhập");
        }

        /*
         * =========================================================
         * ĐỒNG BỘ HEADER TRƯỚC KHI SAVE
         * =========================================================
         *
         * Rất quan trọng:
         * Không được để subTotal/vatTotal trong entity vẫn là 0,
         * vì saveAndFlush(pn) có thể ghi đè kết quả trigger.
         */
        pn.setSubTotal(subTotalDb);
        pn.setVatTotal(vatTotalDb);
        pn.setGiamGia(giamGia);
        pn.setGrandTotal(grandTotalMoi);
        pn.setCongNo(grandTotalMoi.subtract(daThanhToan));

        /*
         * Hoàn tất kiểm nhận.
         */
        pn.setNgayNhanThucTe(ngayNhan);
        pn.setTrangThai(ST_COMPLETED);
        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.saveAndFlush(pn);

        entityManager.clear();

        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapDTO> update(UUID id, PhieuNhap request, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);

        if (found.isEmpty()) {
            return Optional.empty();
        }

        PhieuNhap pn = found.get();

        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        /*
         * Chỉ cho sửa thông tin phiếu khi đang chờ duyệt.
         */
        if (!ST_PENDING_CONFIRMATION.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ được chỉnh sửa phiếu khi đang ở trạng thái chờ duyệt");
        }

        /*
         * Không cho client thay đổi các field nghiệp vụ:
         * - trạng thái
         * - đã thanh toán
         * - công nợ
         * - ngày nhận thực tế
         */
        LocalDate ngayDatHang = request.getNgayDatHang() != null
                        ? request.getNgayDatHang()
                        : pn.getNgayDatHang();

        LocalDate ngayDuKienGiao = request.getNgayDuKienGiao() != null
                        ? request.getNgayDuKienGiao()
                        : pn.getNgayDuKienGiao();

        if (ngayDatHang != null && ngayDuKienGiao != null && ngayDuKienGiao.isBefore(ngayDatHang)) {
            throw new IllegalArgumentException("Ngày dự kiến giao phải >= ngày đặt hàng");
        }

        pn.setNgayDatHang(ngayDatHang);
        pn.setNgayDuKienGiao(ngayDuKienGiao);


        if (request.getGiamGia() != null && request.getGiamGia().signum() != 0) {
            throw new IllegalArgumentException("Giảm giá chỉ được áp dụng khi xác nhận kiểm nhận");
        }

        if (request.getGhiChu() != null) {
            pn.setGhiChu(request.getGhiChu());
        }

        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.saveAndFlush(pn);

        entityManager.clear();

        return Optional.of(
                toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public boolean delete(UUID id, NhanVien actor) {
        return phieuNhapRepository.findByIdForUpdate(id).map(pn -> {
            branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

            if (!ST_PENDING_CONFIRMATION.equals(pn.getTrangThai())) {
                throw new IllegalArgumentException("Chỉ được xóa phiếu khi đang chờ duyệt");
            }

            phieuNhapRepository.delete(pn);
            return true;

        }).orElse(false);
    }

    private PhieuNhap requireEditablePurchase(UUID idPhieuNhap, NhanVien actor) {
        PhieuNhap pn =
                phieuNhapRepository.findByIdForUpdate(idPhieuNhap)
                        .orElseThrow(() -> new IllegalArgumentException("Phiếu nhập không tồn tại"));

        branchAccessService.requireWritableBranch(actor, pn.getIdChiNhanh());

        if (!ST_PENDING_CONFIRMATION.equals(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ được sửa chi tiết khi phiếu đang chờ duyệt");
        }
        return pn;
    }


    // --- Logic ChiTietPhieuNhap ---
    @Transactional(readOnly = true)
    public List<ChiTietPhieuNhap> getLinesByPhieuNhap(UUID idPhieuNhap, NhanVien actor) {
        requireReadableHeader(idPhieuNhap, actor);
        return chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap);
    }

    @Transactional(readOnly = true)
    public List<ChiTietPhieuNhap> getLinesBySanPham(UUID idSanPham, NhanVien actor) {
        return chiTietPhieuNhapRepository.findByIdSanPham(idSanPham).stream()
                .filter(ct -> canReadHeader(actor, ct.getIdPhieuNhap()))
                .toList();
    }

    @Transactional
    public ChiTietPhieuNhap createLine(ChiTietPhieuNhap request, NhanVien actor) {
        validateLine(request, actor);
        ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuNhap(request.getIdPhieuNhap());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuongDat(request.getSoLuongDat());
        ct.setSoLuongNhan(0);
        ct.setSoLuongThua(0);
        ct.setXuLyThua("CHUA_XU_LY");
        ct.setLyDoChenhLechDong(null);
        ct.setDonGiaNhap(request.getDonGiaNhap());
        ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        ct.setThanhTien(BigDecimal.ZERO);
        ct.setHanSuDung(request.getHanSuDung());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());
        return chiTietPhieuNhapRepository.save(ct);
    }

    @Transactional
    public void createBatchLines(List<ChiTietPhieuNhap> requests, NhanVien actor) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Danh sách chi tiết phiếu nhập rỗng");
        }
        for (ChiTietPhieuNhap request : requests) {
            validateLine(request, actor);
            ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuNhap(request.getIdPhieuNhap());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuongDat(request.getSoLuongDat());
            ct.setSoLuongNhan(0);
            ct.setSoLuongThua(0);
            ct.setXuLyThua("CHUA_XU_LY");
            ct.setLyDoChenhLechDong(null);
            ct.setDonGiaNhap(request.getDonGiaNhap());
            ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
            ct.setThanhTien(BigDecimal.ZERO);
            ct.setHanSuDung(request.getHanSuDung());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietPhieuNhapRepository.save(ct);
        }
    }

    @Transactional
    public boolean deleteLine(UUID id, NhanVien actor) {
        return chiTietPhieuNhapRepository.findByIdForUpdate(id).map(ct -> {
            requireEditablePurchase(ct.getIdPhieuNhap(), actor);

            chiTietPhieuNhapRepository.delete(ct);
            return true;
        }).orElse(false);
    }

    @Transactional
    public void deleteLinesByPhieuNhap(UUID idPhieuNhap, NhanVien actor) {
        requireEditablePurchase(idPhieuNhap, actor);
        List<ChiTietPhieuNhap> list = chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap);
        chiTietPhieuNhapRepository.deleteAll(list);
    }

    private void validateLine(ChiTietPhieuNhap request, NhanVien actor) {
        if (request.getIdPhieuNhap() == null || !phieuNhapRepository.existsById(request.getIdPhieuNhap())) {
            throw new IllegalArgumentException("Phiếu nhập không tồn tại");
        }

        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }

        requireEditablePurchase(request.getIdPhieuNhap(), actor);

        com.erp.cuahangtienloi.validation.InputValidator
                .positive(request.getSoLuongDat(), "Số lượng đặt");

        com.erp.cuahangtienloi.validation.InputValidator
                .positive(request.getDonGiaNhap(), "Đơn giá nhập");

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


    private BigDecimal tinhGiaTriDuKien(PhieuNhap pn, List<ChiTietPhieuNhap> lines) {
        if (!ST_PENDING_CONFIRMATION.equals(pn.getTrangThai())
                && !ST_PENDING_RECEIVING.equals(pn.getTrangThai())
                && !ST_RECEIVING.equals(pn.getTrangThai())) {
            return null;
        }

        BigDecimal subTotal = BigDecimal.ZERO;
        BigDecimal vatTotal = BigDecimal.ZERO;

        for (ChiTietPhieuNhap ct : lines) {
            BigDecimal donGia = ct.getDonGiaNhap() != null ? ct.getDonGiaNhap() : BigDecimal.ZERO;

            int soLuongDat = ct.getSoLuongDat() != null ? ct.getSoLuongDat() : 0;

            int vatPhanTram = ct.getVatPhantram() != null ? ct.getVatPhantram() : 0;

            BigDecimal thanhTien = donGia.multiply(BigDecimal.valueOf(soLuongDat));

            subTotal = subTotal.add(thanhTien);

            vatTotal = vatTotal.add(thanhTien
                            .multiply(BigDecimal.valueOf(vatPhanTram))
                            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
            );
        }

        BigDecimal giamGia = pn.getGiamGia() != null ? pn.getGiamGia() : BigDecimal.ZERO;

        return subTotal.add(vatTotal).subtract(giamGia);
    }

    private List<PhieuNhapDTO> toDTOList(List<PhieuNhap> purchases) {

        if (purchases == null || purchases.isEmpty()) {
            return List.of();
        }

        // =========================================================
        // 1. Lấy ID phiếu nhập
        // =========================================================
        List<UUID> purchaseIds = purchases.stream()
                .map(PhieuNhap::getId)
                .filter(Objects::nonNull)
                .toList();

        // =========================================================
        // 2. Lấy toàn bộ chi tiết chỉ bằng 1 query
        // =========================================================
        List<ChiTietPhieuNhap> allLines = chiTietPhieuNhapRepository.findByIdPhieuNhapIn(purchaseIds);

        Map<UUID, List<ChiTietPhieuNhap>> linesByPurchase =
                allLines.stream().collect(Collectors.groupingBy(ChiTietPhieuNhap::getIdPhieuNhap));

        // =========================================================
        // 3. Lấy danh sách ID chi nhánh / NCC / nhân viên
        // =========================================================
        Set<UUID> branchIds = purchases.stream()
                .map(PhieuNhap::getIdChiNhanh)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Set<UUID> supplierIds = purchases.stream()
                .map(PhieuNhap::getIdNcc)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Set<UUID> employeeIds = purchases.stream()
                .map(PhieuNhap::getIdNguoiNhap)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // =========================================================
        // 4. Batch load
        // =========================================================
        Map<UUID, ChiNhanh> branches =
                chiNhanhRepository.findAllById(branchIds)
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        ChiNhanh::getId,
                                        Function.identity()
                                )
                        );

        Map<UUID, NhaCungCap> suppliers =
                nhaCungCapRepository.findAllById(supplierIds)
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        NhaCungCap::getId,
                                        Function.identity()
                                )
                        );

        Map<UUID, NhanVien> employees =
                nhanVienRepository.findAllById(employeeIds)
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        NhanVien::getId,
                                        Function.identity()
                                )
                        );

        // =========================================================
        // 5. Map DTO
        // =========================================================
        List<PhieuNhapDTO> result = new ArrayList<>();

        for (PhieuNhap pn : purchases) {
            PhieuNhapDTO dto = new PhieuNhapDTO();

            dto.setId(pn.getId());
            dto.setMaPhieu(pn.getMaPhieu());

            dto.setIdChiNhanh(pn.getIdChiNhanh());
            dto.setIdNcc(pn.getIdNcc());
            dto.setIdNguoiNhap(pn.getIdNguoiNhap());

            dto.setNgayDatHang(pn.getNgayDatHang());
            dto.setNgayDuKienGiao(pn.getNgayDuKienGiao());
            dto.setNgayNhanThucTe(pn.getNgayNhanThucTe());

            dto.setSubTotal(pn.getSubTotal());
            dto.setVatTotal(pn.getVatTotal());
            dto.setGiamGia(pn.getGiamGia());
            dto.setGrandTotal(pn.getGrandTotal());

            dto.setDaThanhToan(pn.getDaThanhToan());
            dto.setCongNo(pn.getCongNo());

            dto.setTrangThai(pn.getTrangThai());
            dto.setGhiChu(pn.getGhiChu());

            dto.setIdNguoiDuyet(pn.getIdNguoiDuyet());
            dto.setNgayDuyet(pn.getNgayDuyet());
            dto.setLyDoTuChoi(pn.getLyDoTuChoi());

            dto.setIdNguoiKiemNhan(pn.getIdNguoiKiemNhan());
            dto.setNgayKiemNhan(pn.getNgayKiemNhan());

            dto.setLyDoChenhLech(pn.getLyDoChenhLech());

            // =====================================================
            // Giá trị dự kiến
            // =====================================================
            List<ChiTietPhieuNhap> lines = linesByPurchase.getOrDefault(pn.getId(), List.of());

            dto.setGiaTriDuKien(tinhGiaTriDuKien(pn, lines));

            // =====================================================
            // Tên chi nhánh
            // =====================================================
            if (pn.getIdChiNhanh() != null) {
                ChiNhanh cn = branches.get(pn.getIdChiNhanh());

                if (cn != null) {
                    dto.setTenChiNhanh(cn.getTenChiNhanh());
                }
            }

            // =====================================================
            // Tên nhà cung cấp
            // =====================================================
            if (pn.getIdNcc() != null) {
                NhaCungCap ncc = suppliers.get(pn.getIdNcc());

                if (ncc != null) {
                    dto.setTenNcc(ncc.getTenNcc());
                }
            }

            // =====================================================
            // Tên người nhập
            // =====================================================
            if (pn.getIdNguoiNhap() != null) {
                NhanVien nv = employees.get(pn.getIdNguoiNhap());

                if (nv != null) {
                    dto.setTenNguoiNhap(nv.getHoTen());
                }
            }
            result.add(dto);
        }
        return result;
    }

    public PhieuNhapDTO toDTO(PhieuNhap pn) {
        PhieuNhapDTO dto = new PhieuNhapDTO();
        dto.setId(pn.getId());
        dto.setMaPhieu(pn.getMaPhieu());
        dto.setIdChiNhanh(pn.getIdChiNhanh());
        dto.setIdNcc(pn.getIdNcc());
        dto.setIdNguoiNhap(pn.getIdNguoiNhap());
        dto.setNgayDatHang(pn.getNgayDatHang());
        dto.setNgayDuKienGiao(pn.getNgayDuKienGiao());
        dto.setNgayNhanThucTe(pn.getNgayNhanThucTe());
        dto.setSubTotal(pn.getSubTotal());
        dto.setVatTotal(pn.getVatTotal());
        dto.setGiamGia(pn.getGiamGia());
        dto.setGrandTotal(pn.getGrandTotal());
        dto.setDaThanhToan(pn.getDaThanhToan());
        dto.setCongNo(pn.getCongNo());
        dto.setTrangThai(pn.getTrangThai());
        dto.setGhiChu(pn.getGhiChu());

        dto.setIdNguoiDuyet(pn.getIdNguoiDuyet());
        dto.setNgayDuyet(pn.getNgayDuyet());
        dto.setLyDoTuChoi(pn.getLyDoTuChoi());

        dto.setIdNguoiKiemNhan(pn.getIdNguoiKiemNhan());
        dto.setNgayKiemNhan(pn.getNgayKiemNhan());

        dto.setLyDoChenhLech(pn.getLyDoChenhLech());
        dto.setGiaTriDuKien(tinhGiaTriDuKien(pn, chiTietPhieuNhapRepository.findByIdPhieuNhap(pn.getId())));

        if (pn.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(pn.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (pn.getIdNcc() != null) {
            nhaCungCapRepository.findById(pn.getIdNcc())
                    .ifPresent(ncc -> dto.setTenNcc(ncc.getTenNcc()));
        }
        if (pn.getIdNguoiNhap() != null) {
            nhanVienRepository.findById(pn.getIdNguoiNhap())
                    .ifPresent(nv -> dto.setTenNguoiNhap(nv.getHoTen()));
        }

        return dto;
    }
}
