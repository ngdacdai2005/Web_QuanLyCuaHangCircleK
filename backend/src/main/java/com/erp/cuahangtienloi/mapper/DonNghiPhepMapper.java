package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.request.DonNghiPhepRequestDTO;
import com.erp.cuahangtienloi.dto.response.DonNghiPhepResponseDTO;
import com.erp.cuahangtienloi.entity.DonNghiPhep;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DonNghiPhepMapper {

    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;

    public DonNghiPhepResponseDTO toResponse(DonNghiPhep entity) {
        if (entity == null) return null;
        DonNghiPhepResponseDTO dto = new DonNghiPhepResponseDTO();
        dto.setId(entity.getId());
        dto.setIdNhanVien(entity.getIdNhanVien());
        dto.setIdChiNhanh(entity.getIdChiNhanh());
        dto.setLoaiNghi(entity.getLoaiNghi());
        dto.setTuNgay(entity.getTuNgay());
        dto.setDenNgay(entity.getDenNgay());
        dto.setSoNgayNghi(entity.getSoNgayNghi());
        dto.setLyDo(entity.getLyDo());
        dto.setTrangThai(entity.getTrangThai());
        dto.setIdNguoiDuyet(entity.getIdNguoiDuyet());
        dto.setLyDoTuChoi(entity.getLyDoTuChoi());
        dto.setNgayTao(entity.getNgayTao());
        dto.setNgayDuyet(entity.getNgayDuyet());

        if (entity.getIdNhanVien() != null) {
            nhanVienRepository.findById(entity.getIdNhanVien()).ifPresent(nv -> {
                dto.setTenNhanVien(nv.getHoTen());
                dto.setMaNhanVien(nv.getMaNhanVien());
                if (entity.getIdChiNhanh() == null && nv.getIdChiNhanh() != null) {
                    dto.setIdChiNhanh(nv.getIdChiNhanh());
                }
            });
        }

        UUID branchId = dto.getIdChiNhanh();
        if (branchId != null) {
            chiNhanhRepository.findById(branchId).ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        if (entity.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(entity.getIdNguoiDuyet()).ifPresent(nd -> dto.setTenNguoiDuyet(nd.getHoTen()));
        }

        return dto;
    }

    public DonNghiPhep toEntity(DonNghiPhepRequestDTO dto) {
        if (dto == null) return null;
        DonNghiPhep entity = new DonNghiPhep();
        entity.setIdNhanVien(dto.getIdNhanVien());
        entity.setIdChiNhanh(dto.getIdChiNhanh());
        entity.setLoaiNghi(dto.getLoaiNghi());
        entity.setTuNgay(dto.getTuNgay());
        entity.setDenNgay(dto.getDenNgay());
        entity.setSoNgayNghi(dto.getSoNgayNghi());
        entity.setLyDo(dto.getLyDo());
        return entity;
    }
}
