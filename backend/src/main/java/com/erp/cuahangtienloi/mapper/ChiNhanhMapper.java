package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.ChiNhanhResponseDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import org.springframework.stereotype.Component;

@Component
public class ChiNhanhMapper {
    public ChiNhanhResponseDTO toResponse(ChiNhanh cn) {
        ChiNhanhResponseDTO dto = new ChiNhanhResponseDTO();
        dto.setId(cn.getId());
        dto.setMaChiNhanh(cn.getMaChiNhanh());
        dto.setTenChiNhanh(cn.getTenChiNhanh());
        dto.setDiaChi(cn.getDiaChi());
        dto.setDiaChiChiTiet(cn.getDiaChiChiTiet());
        dto.setTinhThanh(cn.getTinhThanh());
        dto.setQuanHuyen(cn.getQuanHuyen());
        dto.setVungMien(cn.getVungMien());
        dto.setSoDienThoai(cn.getSoDienThoai());
        dto.setGioMoCua(cn.getGioMoCua());
        dto.setDienTichM2(cn.getDienTichM2());
        dto.setDoanhThuThang(cn.getDoanhThuThang());
        dto.setNgayKhaiTruong(cn.getNgayKhaiTruong());
        dto.setLoai(cn.getLoai());
        dto.setLoaiChiNhanh(cn.getLoaiChiNhanh());
        dto.setIdQuanLy(cn.getIdQuanLy());
        dto.setDangHoatDong(cn.getDangHoatDong());
        dto.setTrangThai(cn.getTrangThai());
        dto.setTenQuanLy(cn.getTenQuanLy());
        dto.setNgayTao(cn.getNgayTao());
        dto.setNguoiTao(cn.getNguoiTao());
        dto.setNgayCapNhat(cn.getNgayCapNhat());
        dto.setNguoiCapNhat(cn.getNguoiCapNhat());
        return dto;
    }
}
