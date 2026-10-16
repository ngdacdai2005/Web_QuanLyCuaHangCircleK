
package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.PhieuXuatKhoResponseDTO;
import com.erp.cuahangtienloi.entity.PhieuXuatKho;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PhieuXuatKhoMapper {

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    public PhieuXuatKhoResponseDTO toResponse(PhieuXuatKho pxk) {
        PhieuXuatKhoResponseDTO dto = new PhieuXuatKhoResponseDTO();

        dto.setId(pxk.getId());
        dto.setMaPhieu(pxk.getMaPhieu());
        dto.setIdChiNhanhXuat(pxk.getIdChiNhanhXuat());
        dto.setIdChiNhanhNhan(pxk.getIdChiNhanhNhan());
        dto.setIdNguoiTao(pxk.getIdNguoiTao());
        dto.setIdNguoiDuyet(pxk.getIdNguoiDuyet());
        dto.setIdNguoiNhan(pxk.getIdNguoiNhan());
        dto.setNgayYeuCau(pxk.getNgayYeuCau());
        dto.setNgayXuatThucTe(pxk.getNgayXuatThucTe());
        dto.setNgayNhanThucTe(pxk.getNgayNhanThucTe());
        dto.setTrangThai(pxk.getTrangThai());
        dto.setGhiChu(pxk.getGhiChu());

        if (pxk.getIdChiNhanhXuat() != null) {
            chiNhanhRepository.findById(pxk.getIdChiNhanhXuat())
                    .ifPresent(cn -> dto.setTenChiNhanhXuat(cn.getTenChiNhanh()));
        }

        if (pxk.getIdChiNhanhNhan() != null) {
            chiNhanhRepository.findById(pxk.getIdChiNhanhNhan())
                    .ifPresent(cn -> dto.setTenChiNhanhNhan(cn.getTenChiNhanh()));
        }

        if (pxk.getIdNguoiTao() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }

        if (pxk.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiDuyet())
                    .ifPresent(nv -> dto.setTenNguoiDuyet(nv.getHoTen()));
        }

        if (pxk.getIdNguoiNhan() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiNhan())
                    .ifPresent(nv -> dto.setTenNguoiNhan(nv.getHoTen()));
        }

        return dto;
    }

    public PhieuXuatKho toEntity(com.erp.cuahangtienloi.dto.request.PhieuXuatKhoRequestDTO dto) {
        if (dto == null) return null;
        PhieuXuatKho pxk = new PhieuXuatKho();
        pxk.setMaPhieu(dto.getMaPhieu());
        pxk.setIdChiNhanhXuat(dto.getIdChiNhanhXuat());
        pxk.setIdChiNhanhNhan(dto.getIdChiNhanhNhan());
        pxk.setNgayYeuCau(dto.getNgayYeuCau());
        pxk.setTrangThai(dto.getTrangThai());
        pxk.setGhiChu(dto.getGhiChu());
        return pxk;
    }
}