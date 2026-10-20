package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.DanhMucResponseDTO;
import com.erp.cuahangtienloi.entity.DanhMuc;
import org.springframework.stereotype.Component;

@Component
public class DanhMucMapper {
    public DanhMucResponseDTO toResponse(DanhMuc dm) {
        DanhMucResponseDTO dto = new DanhMucResponseDTO();
        dto.setId(dm.getId());
        dto.setMaDanhMuc(dm.getMaDanhMuc());
        dto.setTenDanhMuc(dm.getTenDanhMuc());
        dto.setParentId(dm.getParentId());
        dto.setMoTa(dm.getMoTa());
        dto.setIconEmoji(dm.getIconEmoji());
        dto.setImageUrl(dm.getImageUrl());
        dto.setMauHex(dm.getMauHex());
        dto.setThuTuHienThi(dm.getThuTuHienThi());
        dto.setProductCount(dm.getProductCount());
        dto.setSkuPrefix(dm.getSkuPrefix());
        dto.setDangHoatDong(dm.getDangHoatDong());
        dto.setNgayTao(dm.getNgayTao());
        dto.setNgayCapNhat(dm.getNgayCapNhat());
        return dto;
    }
}