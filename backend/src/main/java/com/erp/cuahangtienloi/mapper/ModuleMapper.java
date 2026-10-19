package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.constant.RecordStatus;
import com.erp.cuahangtienloi.dto.request.ModuleCreateRequest;
import com.erp.cuahangtienloi.dto.request.ModuleUpdateRequest;
import com.erp.cuahangtienloi.dto.response.ModuleDTO;
import com.erp.cuahangtienloi.entity.Module;
import org.springframework.stereotype.Component;

@Component
public class ModuleMapper {

    public ModuleDTO toDto(Module m, long permissionCount) {
        if (m == null) return null;
        return ModuleDTO.builder()
                .id(m.getId())
                .name(m.getName())
                .displayNameVi(m.getDisplayNameVi())
                .displayNameEn(m.getDisplayNameEn())
                .description(m.getDescription())
                .icon(m.getIcon())
                .color(m.getColor())
                .thuTu(m.getThuTu())
                .status(m.getStatus() != null ? m.getStatus().ordinal() : 0)
                .permissionCount(permissionCount)
                .build();
    }

    public Module toEntity(ModuleCreateRequest req) {
        if (req == null) return null;
        return Module.builder()
                .name(req.getName())
                .displayNameVi(req.getDisplayNameVi())
                .displayNameEn(req.getDisplayNameEn())
                .description(req.getDescription())
                .icon(req.getIcon())
                .color(req.getColor())
                .thuTu(req.getThuTu() != null ? req.getThuTu() : 0)
                .status(RecordStatus.ACTIVE)
                .build();
    }

    public void updateEntity(Module m, ModuleUpdateRequest req) {
        if (m == null || req == null) return;
        m.setDisplayNameVi(req.getDisplayNameVi());
        m.setDisplayNameEn(req.getDisplayNameEn());
        m.setDescription(req.getDescription());
        m.setIcon(req.getIcon());
        m.setColor(req.getColor());
        if (req.getThuTu() != null) {
            m.setThuTu(req.getThuTu());
        }
        if (req.getStatus() != null) {
            m.setStatus(req.getStatus() == 1 ? RecordStatus.INACTIVE : RecordStatus.ACTIVE);
        }
    }
}
