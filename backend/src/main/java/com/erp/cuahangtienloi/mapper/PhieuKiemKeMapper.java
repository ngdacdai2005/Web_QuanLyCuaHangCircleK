package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.PhieuKiemKeResponseDTO;
import com.erp.cuahangtienloi.entity.PhieuKiemKe;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PhieuKiemKeMapper {

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    public PhieuKiemKeResponseDTO toResponse(PhieuKiemKe pkk) {
        PhieuKiemKeResponseDTO dto = new PhieuKiemKeResponseDTO();

        dto.setId(pkk.getId());
        dto.setMaPhieu(pkk.getMaPhieu());
        dto.setIdChiNhanh(pkk.getIdChiNhanh());
        dto.setIdNguoiTao(pkk.getIdNguoiTao());
        dto.setIdNguoiDuyet(pkk.getIdNguoiDuyet());
        dto.setNgayKiemKe(pkk.getNgayKiemKe());
        dto.setNgayCanBang(pkk.getNgayCanBang());
        dto.setTrangThai(pkk.getTrangThai());
        dto.setGhiChu(pkk.getGhiChu());

        if (pkk.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(pkk.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        if (pkk.getIdNguoiTao() != null) {
            nhanVienRepository.findById(pkk.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }

        if (pkk.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(pkk.getIdNguoiDuyet())
                    .ifPresent(nv -> dto.setTenNguoiDuyet(nv.getHoTen()));
        }

        return dto;
    }

}
