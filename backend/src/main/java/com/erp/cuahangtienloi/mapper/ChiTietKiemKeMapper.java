package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.ChiTietKiemKeResponseDTO;
import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import org.springframework.stereotype.Component;

@Component
public class ChiTietKiemKeMapper {
    public ChiTietKiemKeResponseDTO toResponse(ChiTietKiemKe e) {
        if (e == null) return null;
        ChiTietKiemKeResponseDTO d = new ChiTietKiemKeResponseDTO();
        d.setId(e.getId());
        d.setIdPhieuKiemKe(e.getIdPhieuKiemKe());
        d.setIdSanPham(e.getIdSanPham());
        d.setTonHeThong(e.getTonHeThong());
        d.setTonThucTe(e.getTonThucTe());
        d.setSoLuongLech(e.getSoLuongLech());
        d.setLyDoLech(e.getLyDoLech());
        d.setDonGiaVon(e.getDonGiaVon());
        d.setGiaTriLech(e.getGiaTriLech());
        d.setNgayTao(e.getNgayTao());
        return d;
    }
}