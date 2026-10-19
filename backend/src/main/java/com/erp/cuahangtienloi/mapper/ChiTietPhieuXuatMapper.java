package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.ChiTietPhieuXuatResponseDTO;
import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import org.springframework.stereotype.Component;

@Component
public class ChiTietPhieuXuatMapper {
    public ChiTietPhieuXuatResponseDTO toResponse(ChiTietPhieuXuat e) {
        if (e == null) return null;
        ChiTietPhieuXuatResponseDTO d = new ChiTietPhieuXuatResponseDTO();
        d.setId(e.getId());
        d.setIdPhieuXuat(e.getIdPhieuXuat());
        d.setIdSanPham(e.getIdSanPham());
        d.setSoLuongYeuCau(e.getSoLuongYeuCau());
        d.setSoLuongXuat(e.getSoLuongXuat());
        d.setSoLuongNhan(e.getSoLuongNhan());
        d.setDonGiaVon(e.getDonGiaVon());
        d.setThanhTien(e.getThanhTien());
        d.setHanSuDung(e.getHanSuDung());
        d.setThuTu(e.getThuTu());
        d.setNgayTao(e.getNgayTao());
        return d;
    }
}