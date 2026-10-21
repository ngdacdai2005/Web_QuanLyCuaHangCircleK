package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.BanGiaoPhienThuNganRequestDTO;
import com.erp.cuahangtienloi.dto.request.ChotPhienThuNganRequestDTO;
import com.erp.cuahangtienloi.dto.request.GiaoDichQuyCaRequestDTO;
import com.erp.cuahangtienloi.dto.request.MoPhienThuNganRequestDTO;
import com.erp.cuahangtienloi.dto.response.DoiSoatPhienThuNganDTO;
import com.erp.cuahangtienloi.dto.response.PhienThuNganResponseDTO;
import com.erp.cuahangtienloi.entity.*;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PhienThuNganService {

    private final PhienThuNganRepository phienThuNganRepository;
    private final GiaoDichQuyCaRepository giaoDichQuyCaRepository;
    private final HoaDonRepository hoaDonRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final BranchAccessService branchAccessService;
    private final com.erp.cuahangtienloi.mapper.NhanVienMapper nhanVienMapper;

    @Transactional
    public PhienThuNganResponseDTO moPhien(MoPhienThuNganRequestDTO request, NhanVien cashier) {
        // Kiểm tra xem thu ngân có phiên nào đang mở không
        Optional<PhienThuNgan> existing = phienThuNganRepository.findByIdThuNganAndTrangThai(cashier.getId(), "DANG_MO");
        if (existing.isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn đang có một phiên thu ngân đang mở. Vui lòng chốt ca trước khi mở ca mới!");
        }

        UUID branchId = request.getIdChiNhanh() != null ? request.getIdChiNhanh() : cashier.getIdChiNhanh();
        if (branchId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chi nhánh không được để trống!");
        }

        BigDecimal duKien = request.getQuyDauCaDuKien() != null ? request.getQuyDauCaDuKien() : BigDecimal.ZERO;
        BigDecimal thucTe = request.getQuyDauCaThucTe() != null ? request.getQuyDauCaThucTe() : BigDecimal.ZERO;
        BigDecimal lech = thucTe.subtract(duKien);

        PhienThuNgan phien = PhienThuNgan.builder()
                .maPhien(sinhMaPhien())
                .idChiNhanh(branchId)
                .idThuNgan(cashier.getId())
                .quaySo(request.getQuaySo() != null ? request.getQuaySo() : "Quầy 1")
                .gioMoCa(LocalDateTime.now())
                .quyDauCaDuKien(duKien)
                .quyDauCaThucTe(thucTe)
                .lechDauCa(lech)
                .idNguoiGiaoDauCa(request.getIdNguoiGiaoDauCa())
                .ghiChuMoCa(request.getGhiChuMoCa())
                .bangKeMoCa(request.getBangKeMoCa())
                .trangThai("DANG_MO")
                .build();

        PhienThuNgan saved = phienThuNganRepository.save(phien);
        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public PhienThuNganResponseDTO getPhienHienTai(NhanVien cashier) {
        PhienThuNgan phien = phienThuNganRepository.findByIdThuNganAndTrangThai(cashier.getId(), "DANG_MO")
                .orElse(null);
        if (phien == null) {
            return null;
        }
        return mapToDTO(phien);
    }

    @Transactional(readOnly = true)
    public DoiSoatPhienThuNganDTO tinhDoiSoat(UUID idPhien) {
        PhienThuNgan phien = phienThuNganRepository.findById(idPhien)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiên thu ngân"));
        return tinhDoiSoatEntity(phien);
    }

    public DoiSoatPhienThuNganDTO tinhDoiSoatEntity(PhienThuNgan phien) {
        // Lấy danh sách hóa đơn gắn với phiên thu ngân
        List<HoaDon> hoaDons = hoaDonRepository.findByIdPhienThuNgan(phien.getId());
        
        // Nếu hóa đơn cũ chưa có id_phien_thu_ngan, tìm theo thu ngân và khoảng thời gian
        if (hoaDons.isEmpty() && phien.getGioMoCa() != null) {
            LocalDateTime endTime = phien.getGioDongCa() != null ? phien.getGioDongCa() : LocalDateTime.now();
            hoaDons = hoaDonRepository.findByIdThuNgan(phien.getIdThuNgan()).stream()
                    .filter(hd -> hd.getNgayBan() != null 
                            && !hd.getNgayBan().isBefore(phien.getGioMoCa()) 
                            && !hd.getNgayBan().isAfter(endTime))
                    .collect(Collectors.toList());
        }

        BigDecimal tongTienMat = BigDecimal.ZERO;
        long soDonTienMat = 0;
        BigDecimal tongThe = BigDecimal.ZERO;
        long soDonThe = 0;
        BigDecimal tongQr = BigDecimal.ZERO;
        long soDonQr = 0;
        BigDecimal tongHoanTienMat = BigDecimal.ZERO;
        long soDonHoan = 0;

        for (HoaDon hd : hoaDons) {
            BigDecimal total = hd.getGrandTotal() != null ? hd.getGrandTotal() : BigDecimal.ZERO;
            String hinhThuc = hd.getHinhThucTt() != null ? hd.getHinhThucTt().toUpperCase() : "CASH";
            String trangThai = hd.getTrangThai() != null ? hd.getTrangThai().toUpperCase() : "COMPLETED";

            if ("REFUNDED".equals(trangThai)) {
                if ("CASH".equals(hinhThuc) || "TIEN_MAT".equals(hinhThuc)) {
                    tongHoanTienMat = tongHoanTienMat.add(total);
                    soDonHoan++;
                }
            } else if ("COMPLETED".equals(trangThai) || "PAID".equals(trangThai)) {
                if ("CASH".equals(hinhThuc) || "TIEN_MAT".equals(hinhThuc)) {
                    tongTienMat = tongTienMat.add(total);
                    soDonTienMat++;
                } else if ("CARD".equals(hinhThuc) || "THE".equals(hinhThuc)) {
                    tongThe = tongThe.add(total);
                    soDonThe++;
                } else {
                    tongQr = tongQr.add(total);
                    soDonQr++;
                }
            }
        }

        // Lấy các giao dịch quỹ phát sinh trong ca
        List<GiaoDichQuyCa> gdList = giaoDichQuyCaRepository.findByIdPhienThuNganOrderByNgayTaoAsc(phien.getId());
        BigDecimal tongNopKet = BigDecimal.ZERO;
        BigDecimal tongThuBoSung = BigDecimal.ZERO;
        BigDecimal tongChiHopLe = BigDecimal.ZERO;

        for (GiaoDichQuyCa gd : gdList) {
            BigDecimal amt = gd.getSoTien() != null ? gd.getSoTien() : BigDecimal.ZERO;
            if ("NOP_KET".equals(gd.getLoaiGiaoDich())) {
                tongNopKet = tongNopKet.add(amt);
            } else if ("THU_BO_SUNG".equals(gd.getLoaiGiaoDich())) {
                tongThuBoSung = tongThuBoSung.add(amt);
            } else if ("CHI_TAM_UNG".equals(gd.getLoaiGiaoDich())) {
                tongChiHopLe = tongChiHopLe.add(amt);
            }
        }

        BigDecimal quyDauCa = phien.getQuyDauCaThucTe() != null ? phien.getQuyDauCaThucTe() : BigDecimal.ZERO;

        // Công thức chuẩn nghiệp vụ Circle K / Retail ERP:
        // Tiền dự kiến cuối ca = Quỹ đầu ca + Tiền mặt bán hàng + Tiền thu bổ sung - Tiền hoàn khách - Tiền chi hợp lệ - Tiền nộp két
        BigDecimal tienDuKien = quyDauCa
                .add(tongTienMat)
                .add(tongThuBoSung)
                .subtract(tongHoanTienMat)
                .subtract(tongChiHopLe)
                .subtract(tongNopKet);

        BigDecimal thucDem = phien.getTienThucDemCuoiCa();
        BigDecimal lech = thucDem != null ? thucDem.subtract(tienDuKien) : null;

        return DoiSoatPhienThuNganDTO.builder()
                .idPhienThuNgan(phien.getId())
                .maPhien(phien.getMaPhien())
                .quyDauCaThucTe(quyDauCa)
                .tongTienMatBanHang(tongTienMat)
                .soDonTienMat(soDonTienMat)
                .tongDoanhThuThe(tongThe)
                .soDonThe(soDonThe)
                .tongDoanhThuQr(tongQr)
                .soDonQr(soDonQr)
                .tongDoanhThuKhongTienMat(tongThe.add(tongQr))
                .tongThuBoSung(tongThuBoSung)
                .tongHoanTienMat(tongHoanTienMat)
                .soDonHoanTienMat(soDonHoan)
                .tongChiHopLe(tongChiHopLe)
                .tongNopKet(tongNopKet)
                .tienDuKienCuoiCa(tienDuKien)
                .tienThucDemCuoiCa(thucDem)
                .lechCuoiCa(lech)
                .lyDoChenhLech(phien.getLyDoChenhLech())
                .build();
    }

    @Transactional
    public PhienThuNganResponseDTO chotPhien(UUID idPhien, ChotPhienThuNganRequestDTO request, NhanVien cashier) {
        PhienThuNgan phien = phienThuNganRepository.findById(idPhien)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiên thu ngân"));

        if (!phien.getIdThuNgan().equals(cashier.getId()) && !branchAccessService.isSystemWide(cashier)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chốt ca của nhân viên khác");
        }

        if ("DA_DONG".equals(phien.getTrangThai())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phiên ca này đã được đóng hoàn tất");
        }

        phien.setGioDongCa(LocalDateTime.now());
        DoiSoatPhienThuNganDTO doiSoat = tinhDoiSoatEntity(phien);

        BigDecimal thucDem = request.getTienThucDemCuoiCa() != null ? request.getTienThucDemCuoiCa() : BigDecimal.ZERO;
        BigDecimal tienDuKien = doiSoat.getTienDuKienCuoiCa();
        BigDecimal lech = thucDem.subtract(tienDuKien);

        phien.setTienDuKienCuoiCa(tienDuKien);
        phien.setTienThucDemCuoiCa(thucDem);
        phien.setLechCuoiCa(lech);
        phien.setLyDoChenhLech(request.getLyDoChenhLech());
        phien.setBangKeDongCa(request.getBangKeDongCa());
        phien.setTrangThai("CHO_BAN_GIAO");

        PhienThuNgan saved = phienThuNganRepository.save(phien);
        return mapToDTO(saved);
    }

    @Transactional
    public PhienThuNganResponseDTO banGiaoPhien(UUID idPhien, BanGiaoPhienThuNganRequestDTO request, NhanVien cashier) {
        PhienThuNgan phien = phienThuNganRepository.findById(idPhien)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiên thu ngân"));

        if (!phien.getIdThuNgan().equals(cashier.getId()) && !branchAccessService.isSystemWide(cashier)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền bàn giao phiên này");
        }

        phien.setIdNguoiNhanBanGiao(request.getIdNguoiNhanBanGiao());
        phien.setThoiGianBanGiao(LocalDateTime.now());
        phien.setGhiChuBanGiao(request.getGhiChuBanGiao());
        phien.setTrangThai("DA_BAN_GIAO");

        PhienThuNgan saved = phienThuNganRepository.save(phien);
        return mapToDTO(saved);
    }

    @Transactional
    public PhienThuNganResponseDTO xacNhanNhanBanGiao(UUID idPhien, NhanVien receiver) {
        PhienThuNgan phien = phienThuNganRepository.findById(idPhien)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiên thu ngân"));

        // 1. Tuyệt đối không cho phép người giao tự tiếp quản ca của chính mình
        if (phien.getIdThuNgan().equals(receiver.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn là người giao ca này, không thể tự tiếp quản ca của chính mình");
        }

        // 2. Kiểm tra chi nhánh
        if (receiver.getIdChiNhanh() == null || !receiver.getIdChiNhanh().equals(phien.getIdChiNhanh())) {
            if (!branchAccessService.isSystemWide(receiver)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thuộc chi nhánh của ca bàn giao này");
            }
        }

        // 3. Nếu ca được bàn giao đích danh cho người khác: chỉ người đó hoặc Quản lý mới được nhận
        boolean isManager = "QUAN_LY".equals(receiver.getVaiTro()) || branchAccessService.isSystemWide(receiver);
        if (phien.getIdNguoiNhanBanGiao() != null && !phien.getIdNguoiNhanBanGiao().equals(receiver.getId()) && !isManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ca này được bàn giao cho nhân viên khác, bạn không có quyền tiếp quản");
        }

        phien.setIdNguoiNhanBanGiao(receiver.getId());
        phien.setXacNhanBanGiao(true);
        phien.setTrangThai("DA_DONG");

        PhienThuNgan saved = phienThuNganRepository.save(phien);
        return mapToDTO(saved);
    }

    @Transactional
    public GiaoDichQuyCa themGiaoDichQuy(GiaoDichQuyCaRequestDTO request, NhanVien actor) {
        PhienThuNgan phien = phienThuNganRepository.findById(request.getIdPhienThuNgan())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiên thu ngân"));

        if (!"DANG_MO".equals(phien.getTrangThai())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể thêm giao dịch vào ca đã đóng");
        }

        GiaoDichQuyCa gd = GiaoDichQuyCa.builder()
                .idPhienThuNgan(phien.getId())
                .loaiGiaoDich(request.getLoaiGiaoDich())
                .soTien(request.getSoTien())
                .idNguoiThucHien(actor.getId())
                .idNguoiXacNhan(request.getIdNguoiXacNhan())
                .lyDo(request.getLyDo())
                .build();

        return giaoDichQuyCaRepository.save(gd);
    }

    @Transactional(readOnly = true)
    public List<PhienThuNganResponseDTO> getDanhSachPhien(UUID branchId, NhanVien actor) {
        List<PhienThuNgan> list;
        if (branchAccessService.isSystemWide(actor)) {
            if (branchId != null) {
                list = phienThuNganRepository.findByIdChiNhanhOrderByGioMoCaDesc(branchId);
            } else {
                list = phienThuNganRepository.findAllByOrderByGioMoCaDesc();
            }
        } else {
            UUID userBranch = actor.getIdChiNhanh();
            if (userBranch == null) return List.of();
            list = phienThuNganRepository.findByIdChiNhanhOrderByGioMoCaDesc(userBranch);
        }

        return list.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    private PhienThuNganResponseDTO mapToDTO(PhienThuNgan p) {
        String tenChiNhanh = p.getIdChiNhanh() != null 
                ? chiNhanhRepository.findById(p.getIdChiNhanh()).map(ChiNhanh::getTenChiNhanh).orElse("Không xác định") 
                : "Không xác định";

        String tenThuNgan = p.getIdThuNgan() != null 
                ? nhanVienRepository.findById(p.getIdThuNgan()).map(NhanVien::getHoTen).orElse("Không xác định") 
                : "Không xác định";

        String tenNguoiGiao = p.getIdNguoiGiaoDauCa() != null 
                ? nhanVienRepository.findById(p.getIdNguoiGiaoDauCa()).map(NhanVien::getHoTen).orElse(null) 
                : null;

        String tenNguoiNhan = p.getIdNguoiNhanBanGiao() != null 
                ? nhanVienRepository.findById(p.getIdNguoiNhanBanGiao()).map(NhanVien::getHoTen).orElse(null) 
                : null;

        DoiSoatPhienThuNganDTO doiSoat = tinhDoiSoatEntity(p);

        return PhienThuNganResponseDTO.builder()
                .id(p.getId())
                .maPhien(p.getMaPhien())
                .idChiNhanh(p.getIdChiNhanh())
                .tenChiNhanh(tenChiNhanh)
                .idThuNgan(p.getIdThuNgan())
                .tenThuNgan(tenThuNgan)
                .quaySo(p.getQuaySo())
                .gioMoCa(p.getGioMoCa())
                .gioDongCa(p.getGioDongCa())
                .quyDauCaDuKien(p.getQuyDauCaDuKien())
                .quyDauCaThucTe(p.getQuyDauCaThucTe())
                .lechDauCa(p.getLechDauCa())
                .idNguoiGiaoDauCa(p.getIdNguoiGiaoDauCa())
                .tenNguoiGiaoDauCa(tenNguoiGiao)
                .ghiChuMoCa(p.getGhiChuMoCa())
                .bangKeMoCa(p.getBangKeMoCa())
                .tienDuKienCuoiCa(p.getTienDuKienCuoiCa() != null ? p.getTienDuKienCuoiCa() : doiSoat.getTienDuKienCuoiCa())
                .tienThucDemCuoiCa(p.getTienThucDemCuoiCa())
                .lechCuoiCa(p.getLechCuoiCa() != null ? p.getLechCuoiCa() : doiSoat.getLechCuoiCa())
                .lyDoChenhLech(p.getLyDoChenhLech())
                .bangKeDongCa(p.getBangKeDongCa())
                .idNguoiNhanBanGiao(p.getIdNguoiNhanBanGiao())
                .tenNguoiNhanBanGiao(tenNguoiNhan)
                .soTienBanGiao(p.getTienThucDemCuoiCa())
                .xacNhanBanGiao(p.getXacNhanBanGiao())
                .thoiGianBanGiao(p.getThoiGianBanGiao())
                .ghiChuBanGiao(p.getGhiChuBanGiao())
                .trangThai(p.getTrangThai())
                .ngayTao(p.getNgayTao())
                .ngayCapNhat(p.getNgayCapNhat())
                .doiSoat(doiSoat)
                .build();
    }

    private synchronized String sinhMaPhien() {
        String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE); // YYYYMMDD
        String prefix = "PH-" + today + "-";
        List<String> list = phienThuNganRepository.findMaPhienByPrefix(prefix);
        int maxSeq = 0;
        for (String m : list) {
            try {
                int seq = Integer.parseInt(m.substring(prefix.length()));
                if (seq > maxSeq) maxSeq = seq;
            } catch (Exception ignored) {}
        }
        return String.format("%s%04d", prefix, maxSeq + 1);
    }

    public List<com.erp.cuahangtienloi.dto.response.NhanVienResponseDTO> getDanhSachNhanVienBanGiao(NhanVien cashier) {
        if (cashier.getIdChiNhanh() == null) {
            return List.of();
        }
        return nhanVienRepository.findByIdChiNhanh(cashier.getIdChiNhanh()).stream()
                .filter(nv -> Boolean.TRUE.equals(nv.getDangHoatDong()))
                .filter(nv -> !nv.getId().equals(cashier.getId()))
                .map(nhanVienMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PhienThuNganResponseDTO getPhienChoTiepQuan(NhanVien cashier) {
        if (cashier.getIdChiNhanh() == null) {
            return null;
        }

        boolean isManager = "QUAN_LY".equals(cashier.getVaiTro()) || branchAccessService.isSystemWide(cashier);
        List<PhienThuNgan> list;
        if (isManager) {
            // Quản lý: có quyền thấy và tiếp quản ca chờ bàn giao của chi nhánh (loại trừ ca do chính mình lập nếu có)
            list = phienThuNganRepository.findPendingHandoversForBranch(cashier.getIdChiNhanh()).stream()
                    .filter(p -> !p.getIdThuNgan().equals(cashier.getId()))
                    .toList();
        } else {
            // Thu ngân: CHỈ thấy ca bàn giao đích danh cho mình hoặc ca chung chưa chỉ định (đã loại trừ ca của chính mình trong query)
            list = phienThuNganRepository.findPendingHandoversForEmployee(cashier.getIdChiNhanh(), cashier.getId());
        }

        if (list.isEmpty()) {
            return null;
        }
        return mapToDTO(list.get(0));
    }

    @Transactional
    public PhienThuNganResponseDTO tiepQuanVaMoCa(UUID idPhien, MoPhienThuNganRequestDTO request, NhanVien receiver) {
        xacNhanNhanBanGiao(idPhien, receiver);
        return moPhien(request, receiver);
    }

    // 12. Tổng quan quỹ tiền mặt tại quầy và két an toàn của chi nhánh (khớp số liệu với Sổ Quỹ)
    @Transactional(readOnly = true)
    public com.erp.cuahangtienloi.dto.response.TongQuanQuyChiNhanhDTO getTongQuanQuyChiNhanh(UUID branchId, NhanVien actor) {
        UUID targetBranchId = branchId;
        if (targetBranchId == null && !branchAccessService.isSystemWide(actor)) {
            targetBranchId = actor.getIdChiNhanh();
        }

        List<PhienThuNgan> activeShifts;
        if (targetBranchId != null) {
            branchAccessService.requireReadableBranch(actor, targetBranchId);
            activeShifts = phienThuNganRepository.findByIdChiNhanhAndTrangThai(targetBranchId, "DANG_MO");
        } else {
            activeShifts = phienThuNganRepository.findByTrangThai("DANG_MO");
        }

        BigDecimal tongTienNganKeo = BigDecimal.ZERO;
        List<PhienThuNganResponseDTO> dtoList = new ArrayList<>();

        for (PhienThuNgan p : activeShifts) {
            DoiSoatPhienThuNganDTO ds = tinhDoiSoatEntity(p);
            PhienThuNganResponseDTO dto = mapToDTO(p);
            dto.setDoiSoat(ds);
            dto.setTienDuKienCuoiCa(ds.getTienDuKienCuoiCa());
            dtoList.add(dto);
            if (ds.getTienDuKienCuoiCa() != null) {
                tongTienNganKeo = tongTienNganKeo.add(ds.getTienDuKienCuoiCa());
            }
        }

        // Tính tổng tiền nộp két an toàn chưa đem gửi ngân hàng
        BigDecimal tongKetAnToan = BigDecimal.ZERO;
        List<PhienThuNgan> recentShifts = targetBranchId != null
                ? phienThuNganRepository.findByIdChiNhanhOrderByGioMoCaDesc(targetBranchId)
                : phienThuNganRepository.findAllByOrderByGioMoCaDesc();

        for (PhienThuNgan p : recentShifts) {
            List<GiaoDichQuyCa> gdList = giaoDichQuyCaRepository.findByIdPhienThuNganOrderByNgayTaoAsc(p.getId());
            for (GiaoDichQuyCa gd : gdList) {
                if ("NOP_KET".equals(gd.getLoaiGiaoDich()) && gd.getSoTien() != null) {
                    tongKetAnToan = tongKetAnToan.add(gd.getSoTien());
                }
            }
        }

        String tenChiNhanh = targetBranchId != null
                ? chiNhanhRepository.findById(targetBranchId).map(ChiNhanh::getTenChiNhanh).orElse("Chi nhánh")
                : "Tất cả chi nhánh";

        return com.erp.cuahangtienloi.dto.response.TongQuanQuyChiNhanhDTO.builder()
                .idChiNhanh(targetBranchId)
                .tenChiNhanh(tenChiNhanh)
                .tongTienNganKeo(tongTienNganKeo)
                .tongTienKetAnToan(tongKetAnToan)
                .soQuayDangMo(dtoList.size())
                .danhSachQuayDangMo(dtoList)
                .build();
    }
}
