
package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.PhieuNhapResponseDTO;
import com.erp.cuahangtienloi.entity.PhieuNhap;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PhieuNhapMapper {

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhaCungCapRepository nhaCungCapRepository;
    private final NhanVienRepository nhanVienRepository;

    public PhieuNhapResponseDTO toResponse(PhieuNhap pn) {
        PhieuNhapResponseDTO dto = new PhieuNhapResponseDTO();

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