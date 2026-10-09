package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.NhanVienResponseDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import org.springframework.stereotype.Component;

@Component
public class NhanVienMapper {

    public NhanVienResponseDTO toResponse(NhanVien nv) {
        NhanVienResponseDTO dto = new NhanVienResponseDTO();
        dto.setId(nv.getId());
        dto.setMaNhanVien(nv.getMaNhanVien());
        dto.setTenDangNhap(nv.getTenDangNhap());
        dto.setHoTen(nv.getHoTen());
        dto.setEmail(nv.getEmail());
        dto.setSoDienThoai(nv.getSoDienThoai());
        dto.setVaiTro(nv.getVaiTro());
        dto.setViTri(nv.getViTri());
        dto.setLoaiHopDong(nv.getLoaiHopDong());
        dto.setCaMacDinh(nv.getCaMacDinh());
        dto.setLuongTheoGio(nv.getLuongTheoGio());
        dto.setLuongCung(nv.getLuongCung());
        dto.setSoTaiKhoan(nv.getSoTaiKhoan());
        dto.setTenNganHang(nv.getTenNganHang());
        dto.setNgayVaoLam(nv.getNgayVaoLam());
        dto.setIdChiNhanh(nv.getIdChiNhanh());
        dto.setDangHoatDong(nv.getDangHoatDong());
        dto.setTrangThai(nv.getTrangThai());
        dto.setNgayTao(nv.getNgayTao());
        dto.setNguoiTao(nv.getNguoiTao());
        dto.setNgayCapNhat(nv.getNgayCapNhat());
        dto.setNguoiCapNhat(nv.getNguoiCapNhat());
        return dto;
    }
}