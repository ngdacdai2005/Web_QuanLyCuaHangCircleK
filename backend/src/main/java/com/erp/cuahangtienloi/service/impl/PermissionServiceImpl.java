package com.erp.cuahangtienloi.service.impl;

import com.erp.cuahangtienloi.constant.RecordStatus;
import com.erp.cuahangtienloi.dto.request.PermissionCreateRequest;
import com.erp.cuahangtienloi.dto.request.PermissionUpdateRequest;
import com.erp.cuahangtienloi.dto.response.PermissionDTO;
import com.erp.cuahangtienloi.entity.Permission;
import com.erp.cuahangtienloi.entity.RolePermission;
import com.erp.cuahangtienloi.entity.RolePermissionId;
import com.erp.cuahangtienloi.exception.ConflictException;
import com.erp.cuahangtienloi.mapper.PermissionMapper;
import com.erp.cuahangtienloi.repository.PermissionRepository;
import com.erp.cuahangtienloi.repository.RolePermissionRepository;
import com.erp.cuahangtienloi.repository.VaiTroRepository;
import com.erp.cuahangtienloi.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final VaiTroRepository vaiTroRepository;
    private final PermissionMapper permissionMapper;

    @Override
    public List<PermissionDTO> getAllPermissions() {
        return permissionRepository.findAllByOrderByModuleAscNameAsc().stream()
                .filter(p -> p.getDeleted() == null || p.getDeleted() == 0)
                .map(permissionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<PermissionDTO> getPermissionsByModule(String module) {
        return permissionRepository.findByModule(module).stream()
                .filter(p -> p.getDeleted() == null || p.getDeleted() == 0)
                .map(permissionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, List<PermissionDTO>> getGroupedByModule() {
        List<Permission> list = permissionRepository.findByStatusOrdered(RecordStatus.ACTIVE);
        Map<String, List<PermissionDTO>> grouped = new LinkedHashMap<>();

        for (Permission p : list) {
            String mod = p.getModule() != null ? p.getModule() : "other";
            grouped.computeIfAbsent(mod, k -> new ArrayList<>()).add(permissionMapper.toDto(p));
        }
        return grouped;
    }

    @Override
    public PermissionDTO getPermissionById(Long id) {
        Permission p = permissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy quyền với ID: " + id));
        return permissionMapper.toDto(p);
    }

    @Override
    @Transactional
    public PermissionDTO createPermission(PermissionCreateRequest request) {
        String key = request.getName().trim().toLowerCase();
        if (permissionRepository.existsByName(key)) {
            throw new ConflictException("Quyền '" + key + "' đã tồn tại.");
        }

        Permission entity = permissionMapper.toEntity(request);
        entity.setName(key);
        Permission saved = permissionRepository.save(entity);

        // Tự động gán quyền mới cho Admin Role nếu role này tồn tại
        vaiTroRepository.findByTenVaiTro("ADMIN").ifPresent(adminRole -> {
            if (adminRole.getStatus() == RecordStatus.ACTIVE) {
                RolePermission rp = new RolePermission(new RolePermissionId(adminRole.getId(), saved.getId()));
                rp.setVaiTro(adminRole);
                rp.setPermission(saved);
                rp.setNguoiGan("SYSTEM");
                rolePermissionRepository.save(rp);
            }
        });

        return permissionMapper.toDto(saved);
    }

    @Override
    @Transactional
    public PermissionDTO updatePermission(Long id, PermissionUpdateRequest request) {
        Permission entity = permissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy quyền với ID: " + id));

        permissionMapper.updateEntity(entity, request);
        Permission updated = permissionRepository.save(entity);
        return permissionMapper.toDto(updated);
    }

    @Override
    @Transactional
    public void deletePermission(Long id) {
        Permission entity = permissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy quyền với ID: " + id));

        rolePermissionRepository.deleteByPermissionId(id);
        permissionRepository.delete(entity);
    }

    @Override
    @Transactional
    public void deleteBulk(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        for (Long id : ids) {
            rolePermissionRepository.deleteByPermissionId(id);
            permissionRepository.deleteById(id);
        }
    }
}
