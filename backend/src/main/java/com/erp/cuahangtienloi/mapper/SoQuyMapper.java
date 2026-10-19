package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.SoQuyResponseDTO;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SoQuyMapper {

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    public SoQuyResponseDTO toResponse(SoQuy sq) {
        SoQuyResponseDTO dto = new SoQuyResponseDTO();

        dto.setId(sq.getId());
        dto.setMaChungTu(sq.getMaChungTu());
        dto.setMaChungTuLienQuan(sq.getMaChungTuLienQuan());
        dto.setIdChiNhanh(sq.getIdChiNhanh());
        dto.setIdNguoiTao(sq.getIdNguoiTao());
        dto.setDirection(sq.getDirection());
        dto.setHangMuc(sq.getHangMuc());
        dto.setHinhThucTt(sq.getHinhThucTt());
        dto.setEntryDate(sq.getEntryDate());
        dto.setSoTien(sq.getSoTien());
        dto.setDoiTuong(sq.getDoiTuong());
        dto.setDienGiai(sq.getDienGiai());
        dto.setRunningBalance(sq.getRunningBalance());
        dto.setTrangThai(sq.getTrangThai());

        if (sq.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(sq.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        if (sq.getIdNguoiTao() != null) {
            nhanVienRepository.findById(sq.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }

        return dto;
    }

    public SoQuy toEntity(com.erp.cuahangtienloi.dto.request.SoQuyRequestDTO dto) {
        if (dto == null) return null;
        SoQuy sq = new SoQuy();
        sq.setMaChungTu(dto.getMaChungTu());
        sq.setMaChungTuLienQuan(dto.getMaChungTuLienQuan());
        sq.setIdChiNhanh(dto.getIdChiNhanh());
        sq.setIdNguoiTao(dto.getIdNguoiTao());
        sq.setDirection(dto.getDirection());
        sq.setHangMuc(dto.getHangMuc());
        sq.setHinhThucTt(dto.getHinhThucTt());
        sq.setEntryDate(dto.getEntryDate());
        sq.setSoTien(dto.getSoTien());
        sq.setDoiTuong(dto.getDoiTuong());
        sq.setDienGiai(dto.getDienGiai());
        sq.setRunningBalance(dto.getRunningBalance());
        sq.setTrangThai(dto.getTrangThai());
        return sq;
    }
}
