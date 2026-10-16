package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.CheckoutLineDTO;
import com.erp.cuahangtienloi.dto.request.CheckoutRequestDTO;
import com.erp.cuahangtienloi.dto.request.ChiTietHoaDonRequestDTO;
import com.erp.cuahangtienloi.dto.request.CreateSaleRequestDTO;
import com.erp.cuahangtienloi.dto.request.SaleLineDTO;
import com.erp.cuahangtienloi.dto.response.ChiTietHoaDonResponseDTO;
import com.erp.cuahangtienloi.dto.response.HoaDonResponseDTO;
import com.erp.cuahangtienloi.entity.*;
import com.erp.cuahangtienloi.mapper.ChiTietHoaDonMapper;
import com.erp.cuahangtienloi.mapper.HoaDonMapper;
import com.erp.cuahangtienloi.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static com.erp.cuahangtienloi.validation.InputValidator.PAYMENT_METHODS;

@Service
@RequiredArgsConstructor
public class HoaDonService {

    private final HoaDonRepository hoaDonRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiTietHoaDonRepository chiTietHoaDonRepository;
    private final SanPhamRepository sanPhamRepository;
    private final TonKhoRepository tonKhoRepository;
    private final SoQuyRepository soQuyRepository;
    private final JdbcTemplate jdbcTemplate;
    private final LoHangService loHangService;
    private final HoaDonMapper hoaDonMapper;
    private final ChiTietHoaDonMapper chiTietHoaDonMapper;

    private final Map<String, HoaDonResponseDTO> recentCheckoutCache = new java.util.concurrent.ConcurrentHashMap<>();
    private final Map<String, Long> recentCheckoutTimestamp = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ConcurrentHashMap<String, Object> checkoutLocks = new java.util.concurrent.ConcurrentHashMap<>();

    private void evictExpiredCheckoutKeys() {
        long now = System.currentTimeMillis();
        recentCheckoutTimestamp.entrySet().removeIf(entry -> {
            if (now - entry.getValue() > 60_000) {
                recentCheckoutCache.remove(entry.getKey());
                return true;
            }
            return false;
        });
    }

    public static class CreateSaleRequest extends com.erp.cuahangtienloi.dto.request.CreateSaleRequestDTO {}
    public static class SaleLine extends com.erp.cuahangtienloi.dto.request.SaleLineDTO {}
    public static class CheckoutRequest extends com.erp.cuahangtienloi.dto.request.CheckoutRequestDTO {}
    public static class CheckoutLine extends com.erp.cuahangtienloi.dto.request.CheckoutLineDTO {}

    public record CheckoutLineCalculated(UUID productId, Integer quantity, BigDecimal unitPrice,
                                          BigDecimal lineDiscount, Integer vatPercent,
                                          BigDecimal netAmount, BigDecimal unitCost) {}

    @Transactional(readOnly = true)
    public List<HoaDonResponseDTO> getAll(NhanVien actor) {
        return findInvoicesVisibleTo(actor).stream()
                .map(hoaDonMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<HoaDonResponseDTO> getById(UUID id, NhanVien actor) {
        return hoaDonRepository.findById(id)
                .filter(hd -> canReadInvoice(actor, hd))
                .map(hoaDonMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<HoaDonResponseDTO> getByChiNhanh(UUID idChiNhanh, NhanVien actor) {
        return findInvoicesVisibleTo(actor).stream()
                .filter(hd -> idChiNhanh.equals(hd.getIdChiNhanh()))
                .map(hoaDonMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HoaDonResponseDTO> getByThuNgan(UUID idThuNgan, NhanVien actor) {
        return findInvoicesVisibleTo(actor).stream()
                .filter(hd -> idThuNgan.equals(hd.getIdThuNgan()))
                .map(hoaDonMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HoaDonResponseDTO> getByStatus(String trangThai, NhanVien actor) {
        return findInvoicesVisibleTo(actor).stream()
                .filter(hd -> trangThai.equals(hd.getTrangThai()))
                .map(hoaDonMapper::toResponse)
                .toList();
    }

    @Transactional
    public HoaDonResponseDTO create(HoaDon request) {
        if (request.getIdChiNhanh() == null) {
            throw new IllegalArgumentException("Chi nhánh bán hàng không tồn tại");
        }
        ChiNhanh cnCreate = chiNhanhRepository.findById(request.getIdChiNhanh())
                .orElseThrow(() -> new IllegalArgumentException("Chi nhánh bán hàng không tồn tại"));
        if (!"CUA_HANG_BAN_LE".equals(cnCreate.getLoai()) || !Boolean.TRUE.equals(cnCreate.getDangHoatDong())) {
            throw new IllegalArgumentException("Chỉ có thể bán hàng tại Cửa hàng bán lẻ đang hoạt động");
        }
        validatePayment(request.getHinhThucTt(), request.getGrandTotal(), request.getTienKhachDua());
        HoaDon hd = new HoaDon();
        hd.setId(UUID.randomUUID());
        hd.setMaHoaDon(request.getMaHoaDon());
        hd.setIdChiNhanh(request.getIdChiNhanh());
        hd.setIdThuNgan(request.getIdThuNgan());
        hd.setCaLamViec(request.getCaLamViec());
        hd.setNgayBan(request.getNgayBan() != null ? request.getNgayBan() : LocalDateTime.now());
        hd.setHinhThucTt(request.getHinhThucTt());
        hd.setSdtThanhVien(request.getSdtThanhVien());
        hd.setSubTotal(request.getSubTotal());
        hd.setGiamGia(request.getGiamGia());
        hd.setVatTotal(request.getVatTotal());
        hd.setGrandTotal(request.getGrandTotal());
        hd.setTienKhachDua(request.getTienKhachDua());
        hd.setTienThoi(request.getTienThoi());
        hd.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "COMPLETED");
        hd.setNgayTao(LocalDateTime.now());
        hd.setNgayCapNhat(LocalDateTime.now());

        hoaDonRepository.save(hd);
        return hoaDonMapper.toResponse(hd);
    }

    @Transactional
    public HoaDonResponseDTO create(com.erp.cuahangtienloi.dto.request.HoaDonRequestDTO request) {
        return create(hoaDonMapper.toEntity(request));
    }

    @Transactional
    public HoaDonResponseDTO createWithLines(CreateSaleRequestDTO request, UUID authenticatedCashierId) {
        if (request.getIdChiNhanh() == null) {
            throw new IllegalArgumentException("Thiếu chi nhánh");
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new IllegalArgumentException("Giỏ hàng trống");
        }
        ChiNhanh cnCreateLines = chiNhanhRepository.findById(request.getIdChiNhanh())
                .orElseThrow(() -> new IllegalArgumentException("Chi nhánh bán hàng không tồn tại"));
        if (!"CUA_HANG_BAN_LE".equals(cnCreateLines.getLoai()) || !Boolean.TRUE.equals(cnCreateLines.getDangHoatDong())) {
            throw new IllegalArgumentException("Chỉ có thể bán hàng tại Cửa hàng bán lẻ đang hoạt động");
        }
        validatePayment(request.getHinhThucTt(), request.getGrandTotal(), request.getTienKhachDua());
        for (SaleLineDTO line : request.getLines()) {
            var product = sanPhamRepository.findById(line.getIdSanPham()).orElse(null);
            if (product == null || !Boolean.TRUE.equals(product.getDangHoatDong())) {
                throw new IllegalArgumentException("Sản phẩm không tồn tại hoặc đã ngừng bán");
            }
            int stock = tonKhoRepository.findByIdSanPhamAndIdChiNhanh(line.getIdSanPham(), request.getIdChiNhanh())
                    .map(tk -> tk.getSoLuongTon() == null ? 0 : tk.getSoLuongTon())
                    .orElse(0);
            if (line.getSoLuong() > stock) {
                throw new IllegalArgumentException("Số lượng bán vượt tồn kho hiện tại");
            }
        }
        if (request.getIdThuNgan() == null) {
            request.setIdThuNgan(authenticatedCashierId);
        }

        HoaDon hd = new HoaDon();
        hd.setId(UUID.randomUUID());
        hd.setMaHoaDon(sinhMaHoaDon());
        hd.setIdChiNhanh(request.getIdChiNhanh());
        hd.setIdThuNgan(request.getIdThuNgan());
        hd.setCaLamViec(request.getCaLamViec() != null ? request.getCaLamViec() : "MORNING");
        hd.setNgayBan(request.getNgayBan() != null ? request.getNgayBan() : LocalDateTime.now());
        hd.setHinhThucTt(request.getHinhThucTt() != null ? request.getHinhThucTt() : "CASH");
        hd.setSdtThanhVien(request.getSdtThanhVien());
        hd.setSubTotal(request.getSubTotal() != null ? request.getSubTotal() : BigDecimal.ZERO);
        hd.setGiamGia(request.getGiamGia() != null ? request.getGiamGia() : BigDecimal.ZERO);
        hd.setVatTotal(request.getVatTotal() != null ? request.getVatTotal() : BigDecimal.ZERO);
        hd.setGrandTotal(request.getGrandTotal() != null ? request.getGrandTotal() : BigDecimal.ZERO);
        hd.setTienKhachDua(request.getTienKhachDua());
        hd.setTienThoi(request.getTienThoi());
        hd.setTrangThai("COMPLETED");
        hd.setNgayTao(LocalDateTime.now());
        hd.setNgayCapNhat(LocalDateTime.now());
        HoaDon saved = hoaDonRepository.saveAndFlush(hd);

        List<ChiTietHoaDon> lines = new ArrayList<>();
        int thuTu = 1;
        for (SaleLineDTO line : request.getLines()) {
            ChiTietHoaDon ct = new ChiTietHoaDon();
            ct.setId(UUID.randomUUID());
            ct.setIdHoaDon(saved.getId());
            ct.setIdSanPham(line.getIdSanPham());
            ct.setSoLuong(line.getSoLuong());
            ct.setDonGia(line.getDonGia() != null ? line.getDonGia() : BigDecimal.ZERO);
            ct.setGiamGiaDong(line.getGiamGiaDong() != null ? line.getGiamGiaDong() : BigDecimal.ZERO);
            ct.setVatPhantram(line.getVatPhantram() != null ? line.getVatPhantram() : 8);
            ct.setThanhTien(line.getThanhTien() != null ? line.getThanhTien()
                    : line.getDonGia().multiply(BigDecimal.valueOf(line.getSoLuong())));
            ct.setDonGiaVon(line.getDonGiaVon() != null ? line.getDonGiaVon() : BigDecimal.ZERO);
            ct.setThuTu(thuTu++);
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        chiTietHoaDonRepository.saveAll(lines);
        chiTietHoaDonRepository.flush();

        return hoaDonMapper.toResponse(saved);
    }

    @Transactional
    public HoaDonResponseDTO checkout(CheckoutRequestDTO request, UUID cashierId, NhanVien cashier) {
        String dedupKey = (request.getClientRequestId() != null && !request.getClientRequestId().isBlank())
                ? "req:" + request.getClientRequestId().trim()
                : "fallback:" + cashierId + ":" + request.getIdChiNhanh() + ":" + (System.currentTimeMillis() / 2000);

        evictExpiredCheckoutKeys();

        HoaDonResponseDTO cached = recentCheckoutCache.get(dedupKey);
        if (cached != null) {
            return cached;
        }

        Object lock = checkoutLocks.computeIfAbsent(dedupKey, k -> new Object());
        synchronized (lock) {
            cached = recentCheckoutCache.get(dedupKey);
            if (cached != null) {
                return cached;
            }
            try {
                if (!"ADMIN".equals(cashier.getVaiTro())
                        && cashier.getIdChiNhanh() != null
                        && !cashier.getIdChiNhanh().equals(request.getIdChiNhanh())) {
                    throw new org.springframework.web.server.ResponseStatusException(
                            org.springframework.http.HttpStatus.FORBIDDEN, "Không được bán hàng tại chi nhánh khác");
                }
                ChiNhanh cnCheckout = chiNhanhRepository.findById(request.getIdChiNhanh())
                        .orElseThrow(() -> new IllegalArgumentException("Chi nhánh bán hàng không tồn tại"));
                if (!"CUA_HANG_BAN_LE".equals(cnCheckout.getLoai()) || !Boolean.TRUE.equals(cnCheckout.getDangHoatDong())) {
                    throw new IllegalArgumentException("Chỉ có thể bán hàng tại Cửa hàng bán lẻ đang hoạt động");
                }

                Map<UUID, CheckoutLineDTO> requested = new LinkedHashMap<>();
                for (CheckoutLineDTO line : request.getLines()) {
                    if (requested.putIfAbsent(line.getIdSanPham(), line) != null) {
                        throw new IllegalArgumentException("Một sản phẩm chỉ được xuất hiện một lần trong hóa đơn");
                    }
                }

                List<CheckoutLineCalculated> calculated = new ArrayList<>();
                BigDecimal subTotal = BigDecimal.ZERO;
                BigDecimal lineDiscountTotal = BigDecimal.ZERO;
                BigDecimal vatTotal = BigDecimal.ZERO;

                List<UUID> productIds = requested.keySet().stream().sorted(Comparator.naturalOrder()).toList();
                for (UUID productId : productIds) {
                    CheckoutLineDTO line = requested.get(productId);
                    TonKho stock = tonKhoRepository.findByIdSanPhamAndIdChiNhanhForUpdate(productId, request.getIdChiNhanh())
                            .orElseThrow(() -> new IllegalArgumentException("Sản phẩm chưa có tồn kho tại chi nhánh"));
                    if (stock.getSoLuongTon() == null || stock.getSoLuongTon() < line.getSoLuong()) {
                        throw new IllegalArgumentException("Số lượng bán vượt tồn kho hiện tại");
                    }
                    var product = sanPhamRepository.findById(productId)
                            .filter(p -> Boolean.TRUE.equals(p.getDangHoatDong()))
                            .orElseThrow(() -> new IllegalArgumentException("Sản phẩm không tồn tại hoặc đã ngừng bán"));
                    BigDecimal unitPrice = product.getGiaBan();
                    if (unitPrice == null || unitPrice.signum() < 0) {
                        throw new IllegalArgumentException("Sản phẩm chưa có giá bán hợp lệ");
                    }
                    BigDecimal gross = unitPrice.multiply(BigDecimal.valueOf(line.getSoLuong()));
                    BigDecimal lineDiscount = line.getGiamGiaDong() == null ? BigDecimal.ZERO : line.getGiamGiaDong();
                    if (lineDiscount.signum() < 0 || lineDiscount.compareTo(gross) > 0) {
                        throw new IllegalArgumentException("Giảm giá dòng không hợp lệ");
                    }
                    int vat = product.getVatPhantram() == null ? 0 : product.getVatPhantram();
                    BigDecimal net = gross.subtract(lineDiscount);
                    BigDecimal lineVat = net.multiply(BigDecimal.valueOf(vat))
                            .divide(BigDecimal.valueOf(100))
                            .setScale(0, RoundingMode.HALF_UP);
                    calculated.add(new CheckoutLineCalculated(productId, line.getSoLuong(), unitPrice,
                            lineDiscount, vat, net, stock.getGiaVonTrungBinh() == null ? BigDecimal.ZERO : stock.getGiaVonTrungBinh()));
                    subTotal = subTotal.add(gross);
                    lineDiscountTotal = lineDiscountTotal.add(lineDiscount);
                    vatTotal = vatTotal.add(lineVat);
                }

                BigDecimal orderDiscount = request.getGiamGia() == null ? BigDecimal.ZERO : request.getGiamGia();
                if (orderDiscount.signum() < 0 || orderDiscount.compareTo(subTotal.subtract(lineDiscountTotal)) > 0) {
                    throw new IllegalArgumentException("Giảm giá hóa đơn không hợp lệ");
                }
                BigDecimal totalDiscount = lineDiscountTotal.add(orderDiscount);
                BigDecimal grandTotal = subTotal.subtract(totalDiscount).add(vatTotal);
                String paymentMethod = request.getHinhThucTt() == null ? "CASH" : request.getHinhThucTt();
                validatePayment(paymentMethod, grandTotal, request.getTienKhachDua());
                BigDecimal tendered = "CASH".equals(paymentMethod) ? request.getTienKhachDua() : grandTotal;
                BigDecimal change = tendered.subtract(grandTotal);

                HoaDon invoice = new HoaDon();
                invoice.setId(UUID.randomUUID());
                invoice.setMaHoaDon(sinhMaHoaDon());
                invoice.setIdChiNhanh(request.getIdChiNhanh());
                invoice.setIdThuNgan(cashierId);
                invoice.setCaLamViec(request.getCaLamViec() == null ? "MORNING" : request.getCaLamViec());
                invoice.setNgayBan(LocalDateTime.now());
                invoice.setHinhThucTt(paymentMethod);
                invoice.setSdtThanhVien(request.getSdtThanhVien());
                invoice.setSubTotal(subTotal);
                invoice.setGiamGia(totalDiscount);
                invoice.setVatTotal(vatTotal);
                invoice.setGrandTotal(grandTotal);
                invoice.setTienKhachDua(tendered);
                invoice.setTienThoi(change);
                invoice.setTrangThai("COMPLETED");
                invoice.setNgayTao(LocalDateTime.now());
                invoice.setNgayCapNhat(LocalDateTime.now());
                HoaDon saved = hoaDonRepository.saveAndFlush(invoice);

                List<ChiTietHoaDon> invoiceLines = new ArrayList<>();
                int order = 1;
                for (CheckoutLineCalculated line : calculated) {
                    ChiTietHoaDon detail = new ChiTietHoaDon();
                    detail.setId(UUID.randomUUID());
                    detail.setIdHoaDon(saved.getId());
                    detail.setIdSanPham(line.productId());
                    detail.setSoLuong(line.quantity());
                    detail.setDonGia(line.unitPrice());
                    detail.setGiamGiaDong(line.lineDiscount());
                    detail.setVatPhantram(line.vatPercent());
                    detail.setThanhTien(line.netAmount());
                    detail.setDonGiaVon(line.unitCost());
                    detail.setThuTu(order++);
                    detail.setNgayTao(LocalDateTime.now());
                    invoiceLines.add(detail);
                }
                chiTietHoaDonRepository.saveAll(invoiceLines);
                chiTietHoaDonRepository.flush();

                for (CheckoutLineCalculated line : calculated) {
                    jdbcTemplate.query(
                            "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, 'SALE_OUT'::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, NULL::date, ?::text, NOW()::timestamp)",
                            rs -> { }, line.productId(), request.getIdChiNhanh(), -line.quantity(), line.unitCost(),
                            saved.getMaHoaDon(), cashier.getHoTen(), "Bán hàng POS: " + saved.getMaHoaDon());
                    loHangService.xuatKhoFEFO(line.productId(), request.getIdChiNhanh(), line.quantity());
                }

                if (soQuyRepository.existsByMaChungTuLienQuanAndDirectionAndHangMuc(
                        saved.getMaHoaDon(), "RECEIPT", "BAN_HANG")) {
                    throw new IllegalStateException("Phiếu thu cho hóa đơn đã tồn tại");
                }
                SoQuy cashEntry = new SoQuy();
                cashEntry.setId(UUID.randomUUID());
                cashEntry.setMaChungTu(null);
                cashEntry.setMaChungTuLienQuan(saved.getMaHoaDon());
                cashEntry.setIdChiNhanh(request.getIdChiNhanh());
                cashEntry.setIdNguoiTao(cashierId);
                cashEntry.setDirection("RECEIPT");
                cashEntry.setHangMuc("BAN_HANG");
                cashEntry.setHinhThucTt(paymentMethod);
                cashEntry.setEntryDate(LocalDate.now());
                cashEntry.setSoTien(grandTotal);
                cashEntry.setDoiTuong("Khách lẻ");
                cashEntry.setDienGiai("Doanh thu hóa đơn " + saved.getMaHoaDon());
                cashEntry.setRunningBalance(BigDecimal.ZERO);
                cashEntry.setTrangThai("COMPLETED");
                cashEntry.setNgayTao(LocalDateTime.now());
                cashEntry.setNgayCapNhat(LocalDateTime.now());
                soQuyRepository.saveAndFlush(cashEntry);

                HoaDonResponseDTO result = hoaDonMapper.toResponse(saved);
                recentCheckoutCache.put(dedupKey, result);
                recentCheckoutTimestamp.put(dedupKey, System.currentTimeMillis());
                return result;
            } finally {
                checkoutLocks.remove(dedupKey);
            }
        }
    }

    @Transactional
    public Optional<HoaDonResponseDTO> update(UUID id, HoaDon request) {
        return hoaDonRepository.findById(id)
                .map(hd -> {
                    if (request.getMaHoaDon() != null) hd.setMaHoaDon(request.getMaHoaDon());
                    if (request.getCaLamViec() != null) hd.setCaLamViec(request.getCaLamViec());
                    if (request.getHinhThucTt() != null) hd.setHinhThucTt(request.getHinhThucTt());
                    if (request.getSdtThanhVien() != null) hd.setSdtThanhVien(request.getSdtThanhVien());
                    if (request.getSubTotal() != null) hd.setSubTotal(request.getSubTotal());
                    if (request.getGiamGia() != null) hd.setGiamGia(request.getGiamGia());
                    if (request.getVatTotal() != null) hd.setVatTotal(request.getVatTotal());
                    if (request.getGrandTotal() != null) hd.setGrandTotal(request.getGrandTotal());
                    if (request.getTienKhachDua() != null) hd.setTienKhachDua(request.getTienKhachDua());
                    if (request.getTienThoi() != null) hd.setTienThoi(request.getTienThoi());
                    if (request.getTrangThai() != null) hd.setTrangThai(request.getTrangThai());
                    if ("REFUNDED".equals(request.getTrangThai())) {
                        hd.setIdNguoiHoan(request.getIdNguoiHoan());
                        hd.setNgayHoan(LocalDateTime.now());
                        hd.setLyDoHoan(request.getLyDoHoan());
                    }
                    if (request.getGhiChu() != null) hd.setGhiChu(request.getGhiChu());
                    hd.setNgayCapNhat(LocalDateTime.now());
                    hoaDonRepository.save(hd);
                    return hoaDonMapper.toResponse(hd);
                });
    }

    @Transactional
    public Optional<HoaDonResponseDTO> update(UUID id, com.erp.cuahangtienloi.dto.request.HoaDonRequestDTO request) {
        return update(id, hoaDonMapper.toEntity(request));
    }

    @Transactional
    public boolean delete(UUID id) {
        if (hoaDonRepository.existsById(id)) {
            hoaDonRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // --- Logic ChiTietHoaDon ---
    @Transactional(readOnly = true)
    public Optional<List<ChiTietHoaDonResponseDTO>> getLinesByHoaDon(UUID idHoaDon, NhanVien actor) {
        HoaDon invoice = hoaDonRepository.findById(idHoaDon).orElse(null);
        if (invoice == null || !canReadInvoice(actor, invoice)) {
            return Optional.empty();
        }
        return Optional.of(chiTietHoaDonRepository.findByIdHoaDon(idHoaDon).stream()
                .map(chiTietHoaDonMapper::toResponse)
                .toList());
    }

    @Transactional(readOnly = true)
    public List<ChiTietHoaDonResponseDTO> getLinesBySanPham(UUID idSanPham) {
        return chiTietHoaDonRepository.findByIdSanPham(idSanPham).stream()
                .map(chiTietHoaDonMapper::toResponse)
                .toList();
    }

    @Transactional
    public ChiTietHoaDonResponseDTO createLine(ChiTietHoaDonRequestDTO request) {
        validateLine(request);
        ChiTietHoaDon ct = new ChiTietHoaDon();
        ct.setId(UUID.randomUUID());
        ct.setIdHoaDon(request.getIdHoaDon());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuong(request.getSoLuong());
        ct.setDonGia(request.getDonGia());
        ct.setGiamGiaDong(request.getGiamGiaDong() != null ? request.getGiamGiaDong() : BigDecimal.ZERO);
        ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        ct.setThanhTien(request.getThanhTien());
        ct.setDonGiaVon(request.getDonGiaVon());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());
        return chiTietHoaDonMapper.toResponse(chiTietHoaDonRepository.save(ct));
    }

    @Transactional
    public void createBatchLines(List<ChiTietHoaDonRequestDTO> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Danh sách chi tiết hóa đơn rỗng");
        }
        for (ChiTietHoaDonRequestDTO request : requests) {
            validateLine(request);
            ChiTietHoaDon ct = new ChiTietHoaDon();
            ct.setId(UUID.randomUUID());
            ct.setIdHoaDon(request.getIdHoaDon());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuong(request.getSoLuong());
            ct.setDonGia(request.getDonGia());
            ct.setGiamGiaDong(request.getGiamGiaDong() != null ? request.getGiamGiaDong() : BigDecimal.ZERO);
            ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
            ct.setThanhTien(request.getThanhTien());
            ct.setDonGiaVon(request.getDonGiaVon());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietHoaDonRepository.save(ct);
        }
    }

    @Transactional
    public boolean deleteLine(UUID id) {
        if (chiTietHoaDonRepository.existsById(id)) {
            chiTietHoaDonRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Transactional
    public void deleteLinesByHoaDon(UUID idHoaDon) {
        List<ChiTietHoaDon> list = chiTietHoaDonRepository.findByIdHoaDon(idHoaDon);
        chiTietHoaDonRepository.deleteAll(list);
    }

    private void validateLine(ChiTietHoaDonRequestDTO request) {
        if (request.getIdHoaDon() == null || !hoaDonRepository.existsById(request.getIdHoaDon())) {
            throw new IllegalArgumentException("Hóa đơn không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        com.erp.cuahangtienloi.validation.InputValidator.positive(request.getSoLuong(), "Số lượng");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGia(), "Đơn giá");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getGiamGiaDong(), "Giảm giá dòng");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getThanhTien(), "Thành tiền");
        if (request.getVatPhantram() != null && (request.getVatPhantram() < 0 || request.getVatPhantram() > 100)) {
            throw new IllegalArgumentException("VAT phải từ 0 đến 100");
        }
    }

    private List<HoaDon> findInvoicesVisibleTo(NhanVien actor) {
        return switch (actor.getVaiTro()) {
            case "ADMIN", "KE_TOAN" -> hoaDonRepository.findAll();
            case "QUAN_LY" -> actor.getIdChiNhanh() == null
                    ? List.of()
                    : hoaDonRepository.findByIdChiNhanh(actor.getIdChiNhanh());
            case "THU_NGAN" -> hoaDonRepository.findByIdThuNgan(actor.getId());
            default -> List.of();
        };
    }

    public boolean canReadInvoice(NhanVien actor, HoaDon invoice) {
        return switch (actor.getVaiTro()) {
            case "ADMIN", "KE_TOAN" -> true;
            case "QUAN_LY" -> actor.getIdChiNhanh() != null
                    && actor.getIdChiNhanh().equals(invoice.getIdChiNhanh());
            case "THU_NGAN" -> actor.getId().equals(invoice.getIdThuNgan());
            default -> false;
        };
    }

    private void validatePayment(String method, BigDecimal total, BigDecimal customerPaid) {
        String paymentMethod = method != null ? method : "CASH";
        if (!PAYMENT_METHODS.contains(paymentMethod)) {
            throw new IllegalArgumentException("Phương thức thanh toán không hợp lệ");
        }
        if (total != null && total.signum() < 0) {
            throw new IllegalArgumentException("Tổng tiền phải lớn hơn hoặc bằng 0");
        }
        if ("CASH".equals(paymentMethod)
                && total != null && (customerPaid == null || customerPaid.compareTo(total) < 0)) {
            throw new IllegalArgumentException("Tiền khách đưa phải lớn hơn hoặc bằng tổng tiền");
        }
    }

    private String sinhMaHoaDon() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        Long sequence = jdbcTemplate.queryForObject("SELECT nextval('seq_hoa_don_ma')", Long.class);
        return "HD-" + dateStr + "-" + String.format("%04d", sequence);
    }

    @Transactional
    public HoaDonResponseDTO refund(UUID id, String lyDoHoan, NhanVien actor) {
        HoaDon hd = hoaDonRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hoá đơn"));
        if (!"COMPLETED".equals(hd.getTrangThai())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hoàn tiền được hoá đơn ở trạng thái COMPLETED");
        }

        if ("QUAN_LY".equals(actor.getVaiTro()) || "THU_NGAN".equals(actor.getVaiTro())) {
            if (actor.getIdChiNhanh() != null && !actor.getIdChiNhanh().equals(hd.getIdChiNhanh())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể hoàn hoá đơn khác chi nhánh");
            }
        }

        String lyDo = (lyDoHoan != null && !lyDoHoan.trim().isEmpty())
                ? lyDoHoan.trim()
                : "Khách trả hàng hoàn tiền";

        String nguoiThucHien = (actor.getHoTen() != null && !actor.getHoTen().trim().isEmpty())
                ? actor.getHoTen()
                : "Hệ thống";

        // 1. Cập nhật trạng thái hoá đơn sang REFUNDED
        hd.setTrangThai("REFUNDED");
        hd.setIdNguoiHoan(actor.getId());
        hd.setNgayHoan(LocalDateTime.now());
        hd.setLyDoHoan(lyDo);
        hd.setNgayCapNhat(LocalDateTime.now());
        HoaDon saved = hoaDonRepository.saveAndFlush(hd);

        // 2. Trả lại tồn kho và ghi thẻ kho cho từng dòng hàng
        List<ChiTietHoaDon> lines = chiTietHoaDonRepository.findByIdHoaDon(id);
        for (ChiTietHoaDon line : lines) {
            jdbcTemplate.query(
                    "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, 'SALE_RETURN'::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, NULL::date, ?::text, NOW()::timestamp)",
                    rs -> { }, line.getIdSanPham(), hd.getIdChiNhanh(), line.getSoLuong(), line.getDonGiaVon(),
                    hd.getMaHoaDon(), nguoiThucHien, "Hoàn tiền hoá đơn: " + hd.getMaHoaDon());
        }

        // 3. Tự động sinh Phiếu chi hoàn tiền trong Sổ quỹ (so_quy) nếu chưa có
        if (!soQuyRepository.existsByMaChungTuLienQuanAndDirectionAndHangMuc(
                saved.getMaHoaDon(), "PAYMENT", "KHAC")) {
            SoQuy refundCashEntry = new SoQuy();
            refundCashEntry.setId(UUID.randomUUID());
            refundCashEntry.setMaChungTu(null);
            refundCashEntry.setMaChungTuLienQuan(saved.getMaHoaDon());
            refundCashEntry.setIdChiNhanh(saved.getIdChiNhanh());
            refundCashEntry.setIdNguoiTao(actor.getId());
            refundCashEntry.setDirection("PAYMENT");
            refundCashEntry.setHangMuc("KHAC");
            refundCashEntry.setHinhThucTt(saved.getHinhThucTt() != null ? saved.getHinhThucTt() : "CASH");
            refundCashEntry.setEntryDate(LocalDate.now());
            refundCashEntry.setSoTien(saved.getGrandTotal() != null ? saved.getGrandTotal() : BigDecimal.ZERO);
            refundCashEntry.setDoiTuong("Khách lẻ");
            refundCashEntry.setDienGiai("Hoàn tiền hoá đơn " + saved.getMaHoaDon() + ": " + lyDo);
            refundCashEntry.setRunningBalance(BigDecimal.ZERO);
            refundCashEntry.setTrangThai("COMPLETED");
            refundCashEntry.setNgayTao(LocalDateTime.now());
            refundCashEntry.setNgayCapNhat(LocalDateTime.now());
            soQuyRepository.saveAndFlush(refundCashEntry);
        }

        return hoaDonMapper.toResponse(saved);
    }
}
