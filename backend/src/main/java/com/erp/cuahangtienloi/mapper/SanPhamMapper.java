package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.SanPhamResponseDTO;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SanPhamMapper {

    private final DanhMucRepository danhMucRepository;
    private final NhaCungCapRepository nhaCungCapRepository;

    public SanPhamResponseDTO toResponse(SanPham sp) {
        SanPhamResponseDTO dto = new SanPhamResponseDTO();

        dto.setId(sp.getId());
        dto.setIdDanhMuc(sp.getIdDanhMuc());
        dto.setSku(sp.getSku());
        dto.setMaVach(sp.getMaVach());
        dto.setTenSanPham(sp.getTenSanPham());
        dto.setDonVi(sp.getDonVi());
        dto.setImageUrl(sp.getImageUrl());
        dto.setMoTa(sp.getMoTa());
        dto.setDangHoatDong(sp.getDangHoatDong());
        dto.setGiaVon(sp.getGiaVon());
        dto.setGiaBan(sp.getGiaBan());
        dto.setVatPhantram(sp.getVatPhantram());
        dto.setIdNhaCungCap(sp.getIdNhaCungCap());
        dto.setTonToiThieu(sp.getTonToiThieu());
        dto.setTonToiDa(sp.getTonToiDa());
        dto.setDeHong(sp.getDeHong());
        dto.setHanSuDungNgay(sp.getHanSuDungNgay());
        dto.setNgayTao(sp.getNgayTao());
        dto.setNgayCapNhat(sp.getNgayCapNhat());

        if (sp.getIdDanhMuc() != null) {
            danhMucRepository.findById(sp.getIdDanhMuc())
                    .ifPresent(dm -> dto.setTenDanhMuc(dm.getTenDanhMuc()));
        }

        if (sp.getIdNhaCungCap() != null) {
            nhaCungCapRepository.findById(sp.getIdNhaCungCap())
                    .ifPresent(ncc -> dto.setTenNhaCungCap(ncc.getTenNcc()));
        }

        return dto;
    }
}
