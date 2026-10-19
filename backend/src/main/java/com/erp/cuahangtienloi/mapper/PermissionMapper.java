package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.constant.RecordStatus;
import com.erp.cuahangtienloi.dto.request.PermissionCreateRequest;
import com.erp.cuahangtienloi.dto.request.PermissionUpdateRequest;
import com.erp.cuahangtienloi.dto.response.PermissionDTO;
import com.erp.cuahangtienloi.entity.Permission;
import org.springframework.stereotype.Component;

@Component
public class PermissionMapper {

    public PermissionDTO toDto(Permission p) {
        if (p == null) return null;
        return PermissionDTO.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .displayNameVi(p.getDisplayNameVi())
                .displayNameEn(p.getDisplayNameEn())
                .module(p.getModule())
                .status(p.getStatus() != null ? p.getStatus().ordinal() : 0)
                .build();
    }

    public Permission toEntity(PermissionCreateRequest req) {
        if (req == null) return null;
        RecordStatus st = (req.getStatus() != null && req.getStatus() == 1)
                ? RecordStatus.INACTIVE : RecordStatus.ACTIVE;
        return Permission.builder()
                .name(req.getName())
                .displayNameVi(req.getDisplayNameVi())
                .displayNameEn(req.getDisplayNameEn())
                .description(req.getDescription())
                .module(req.getModule())
                .status(st)
                .build();
    }

    public void updateEntity(Permission p, PermissionUpdateRequest req) {
        if (p == null || req == null) return;
        p.setDisplayNameVi(req.getDisplayNameVi());
        p.setDisplayNameEn(req.getDisplayNameEn());
        p.setDescription(req.getDescription());
        if (req.getModule() != null && !req.getModule().isBlank()) {
            p.setModule(req.getModule());
        }
        if (req.getStatus() != null) {
            p.setStatus(req.getStatus() == 1 ? RecordStatus.INACTIVE : RecordStatus.ACTIVE);
        }
    }
}
