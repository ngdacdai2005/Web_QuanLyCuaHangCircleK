package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.ChiTietPhieuNhapResponseDTO;
import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import org.springframework.stereotype.Component;

@Component
public class ChiTietPhieuNhapMapper {
    public ChiTietPhieuNhapResponseDTO toResponse(ChiTietPhieuNhap e) {
        if (e == null) return null;
        ChiTietPhieuNhapResponseDTO d = new ChiTietPhieuNhapResponseDTO();
        d.setId(e.getId());
        d.setIdPhieuNhap(e.getIdPhieuNhap());
        d.setIdSanPham(e.getIdSanPham());
        d.setSoLuongDat(e.getSoLuongDat());
        d.setSoLuongNhan(e.getSoLuongNhan());
        d.setDonGiaNhap(e.getDonGiaNhap());
        d.setVatPhantram(e.getVatPhantram());
        d.setThanhTien(e.getThanhTien());
        d.setHanSuDung(e.getHanSuDung());
        d.setThuTu(e.getThuTu());
        d.setNgayTao(e.getNgayTao());
        return d;
    }
}