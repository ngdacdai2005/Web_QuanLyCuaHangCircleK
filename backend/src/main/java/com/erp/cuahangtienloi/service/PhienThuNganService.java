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

        // Người nhận hoặc Quản lý xác nhận
        if (phien.getIdNguoiNhanBanGiao() != null && !phien.getIdNguoiNhanBanGiao().equals(receiver.getId()) && !branchAccessService.isSystemWide(receiver)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không phải là người được chỉ định nhận bàn giao ca này");
        }

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
}
