package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.constant.RecordStatus;
import com.erp.cuahangtienloi.dto.request.VaiTroCreateRequest;
import com.erp.cuahangtienloi.dto.request.VaiTroUpdateRequest;
import com.erp.cuahangtienloi.dto.response.VaiTroDTO;
import com.erp.cuahangtienloi.entity.VaiTro;
import org.springframework.stereotype.Component;

@Component
public class VaiTroMapper {

    public VaiTroDTO toDto(VaiTro v, long userCount) {
        if (v == null) return null;
        return VaiTroDTO.builder()
                .id(v.getId())
                .maVaiTro(v.getMaVaiTro())
                .tenVaiTro(v.getTenVaiTro())
                .moTa(v.getMoTa())
                .status(v.getStatus() != null ? v.getStatus().ordinal() : 0)
                .userCount(userCount)
                .build();
    }

    public VaiTro toEntity(VaiTroCreateRequest req) {
        if (req == null) return null;
        return VaiTro.builder()
                .maVaiTro(req.getMaVaiTro().trim())
                .tenVaiTro(req.getTenVaiTro().trim())
                .moTa(req.getMoTa())
                .status(RecordStatus.ACTIVE)
                .build();
    }

    public void updateEntity(VaiTro v, VaiTroUpdateRequest req) {
        if (v == null || req == null) return;
        v.setTenVaiTro(req.getTenVaiTro().trim());
        v.setMoTa(req.getMoTa());
        if (req.getStatus() != null) {
            v.setStatus(req.getStatus() == 1 ? RecordStatus.INACTIVE : RecordStatus.ACTIVE);
        }
    }
}
