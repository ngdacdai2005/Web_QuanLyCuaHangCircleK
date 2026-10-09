package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.HoaDonResponseDTO;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class HoaDonMapper {

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    public HoaDonResponseDTO toResponse(HoaDon hd) {
        HoaDonResponseDTO dto = new HoaDonResponseDTO();

        dto.setId(hd.getId());
        dto.setMaHoaDon(hd.getMaHoaDon());
        dto.setIdChiNhanh(hd.getIdChiNhanh());
        dto.setIdThuNgan(hd.getIdThuNgan());
        dto.setCaLamViec(hd.getCaLamViec());
        dto.setNgayBan(hd.getNgayBan());
        dto.setHinhThucTt(hd.getHinhThucTt());
        dto.setSdtThanhVien(hd.getSdtThanhVien());
        dto.setSubTotal(hd.getSubTotal());
        dto.setGiamGia(hd.getGiamGia());
        dto.setVatTotal(hd.getVatTotal());
        dto.setGrandTotal(hd.getGrandTotal());
        dto.setTienKhachDua(hd.getTienKhachDua());
        dto.setTienThoi(hd.getTienThoi());
        dto.setTrangThai(hd.getTrangThai());
        dto.setIdNguoiHoan(hd.getIdNguoiHoan());
        dto.setNgayHoan(hd.getNgayHoan());
        dto.setLyDoHoan(hd.getLyDoHoan());
        dto.setGhiChu(hd.getGhiChu());

        if (hd.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(hd.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        if (hd.getIdThuNgan() != null) {
            nhanVienRepository.findById(hd.getIdThuNgan())
                    .ifPresent(nv -> dto.setTenThuNgan(nv.getHoTen()));
        }

        return dto;
    }
}
