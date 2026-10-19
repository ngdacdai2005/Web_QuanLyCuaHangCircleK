package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.BangLuongResponseDTO;
import com.erp.cuahangtienloi.entity.BangLuong;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BangLuongMapper {
    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;

    public BangLuongResponseDTO toResponse(BangLuong bl) {
        BangLuongResponseDTO dto = new BangLuongResponseDTO();

        dto.setId(bl.getId());
        dto.setIdNhanVien(bl.getIdNhanVien());
        dto.setIdChiNhanh(bl.getIdChiNhanh());
        dto.setLoaiHopDong(bl.getLoaiHopDong());
        dto.setThangNam(bl.getThangNam());
        dto.setTongGioLam(bl.getTongGioLam());
        dto.setOvertimeHours(bl.getOvertimeHours());
        dto.setTongSoCa(bl.getTongSoCa());
        dto.setGioDieuChinh(bl.getGioDieuChinh());
        dto.setLyDoDieuChinh(bl.getLyDoDieuChinh());
        dto.setLuongTheoGio(bl.getLuongTheoGio());
        dto.setLuongCung(bl.getLuongCung());
        dto.setLuongCungThucTe(bl.getLuongCungThucTe());
        dto.setTienCongTheoGio(bl.getTienCongTheoGio());
        dto.setTienOt(bl.getTienOt());
        dto.setThuong(bl.getThuong());
        dto.setKhauTru(bl.getKhauTru());
        dto.setTongTienLuong(bl.getTongTienLuong());
        dto.setTrangThai(bl.getTrangThai());
        dto.setIdNguoiXacNhan(bl.getIdNguoiXacNhan());
        dto.setNgayXacNhan(bl.getNgayXacNhan());
        dto.setIdNguoiDuyetChi(bl.getIdNguoiDuyetChi());
        dto.setNgayDuyetChi(bl.getNgayDuyetChi());
        dto.setIdNguoiThanhToan(bl.getIdNguoiThanhToan());
        dto.setNgayThanhToan(bl.getNgayThanhToan());
        dto.setMaPhieuChi(bl.getMaPhieuChi());

        if (bl.getIdNhanVien() != null) {
            nhanVienRepository.findById(bl.getIdNhanVien())
                    .ifPresent(nv -> {
                        dto.setTenNhanVien(nv.getHoTen());
                        dto.setMaNhanVien(nv.getMaNhanVien());
                        dto.setVaiTro(nv.getVaiTro());
                    });
        }

        if (bl.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(bl.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        if (bl.getIdNguoiXacNhan() != null) {
            nhanVienRepository.findById(bl.getIdNguoiXacNhan())
                    .ifPresent(nv -> dto.setTenNguoiXacNhan(nv.getHoTen()));
        }

        if (bl.getIdNguoiDuyetChi() != null) {
            nhanVienRepository.findById(bl.getIdNguoiDuyetChi())
                    .ifPresent(nv -> dto.setTenNguoiDuyetChi(nv.getHoTen()));
        }

        if (bl.getIdNguoiThanhToan() != null) {
            nhanVienRepository.findById(bl.getIdNguoiThanhToan())
                    .ifPresent(nv -> dto.setTenNguoiThanhToan(nv.getHoTen()));
        }

        return dto;
    }

    public BangLuong toEntity(com.erp.cuahangtienloi.dto.request.BangLuongRequestDTO dto) {
        if (dto == null) return null;
        BangLuong bl = new BangLuong();
        bl.setIdNhanVien(dto.getIdNhanVien());
        bl.setIdChiNhanh(dto.getIdChiNhanh());
        bl.setLoaiHopDong(dto.getLoaiHopDong());
        bl.setThangNam(dto.getThangNam());
        bl.setTongGioLam(dto.getTongGioLam());
        bl.setOvertimeHours(dto.getOvertimeHours());
        bl.setTongSoCa(dto.getTongSoCa());
        bl.setLuongTheoGio(dto.getLuongTheoGio());
        bl.setLuongCung(dto.getLuongCung());
        bl.setLuongCungThucTe(dto.getLuongCungThucTe());
        bl.setTienCongTheoGio(dto.getTienCongTheoGio());
        bl.setTienOt(dto.getTienOt());
        bl.setThuong(dto.getThuong());
        bl.setKhauTru(dto.getKhauTru());
        bl.setTongTienLuong(dto.getTongTienLuong());
        bl.setTrangThai(dto.getTrangThai());
        return bl;
    }
}
