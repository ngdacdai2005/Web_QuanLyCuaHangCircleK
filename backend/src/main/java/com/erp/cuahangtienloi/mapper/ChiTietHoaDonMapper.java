package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.ChiTietHoaDonResponseDTO;
import com.erp.cuahangtienloi.entity.ChiTietHoaDon;
import org.springframework.stereotype.Component;

@Component
public class ChiTietHoaDonMapper {
    public ChiTietHoaDonResponseDTO toResponse(ChiTietHoaDon ct) {
        ChiTietHoaDonResponseDTO dto = new ChiTietHoaDonResponseDTO();
        dto.setId(ct.getId());
        dto.setIdHoaDon(ct.getIdHoaDon());
        dto.setIdSanPham(ct.getIdSanPham());
        dto.setSoLuong(ct.getSoLuong());
        dto.setDonGia(ct.getDonGia());
        dto.setGiamGiaDong(ct.getGiamGiaDong());
        dto.setVatPhantram(ct.getVatPhantram());
        dto.setThanhTien(ct.getThanhTien());
        dto.setDonGiaVon(ct.getDonGiaVon());
        dto.setThuTu(ct.getThuTu());
        dto.setNgayTao(ct.getNgayTao());
        return dto;
    }
}