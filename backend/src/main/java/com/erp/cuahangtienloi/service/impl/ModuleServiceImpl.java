package com.erp.cuahangtienloi.service.impl;

import com.erp.cuahangtienloi.dto.request.ModuleCreateRequest;
import com.erp.cuahangtienloi.dto.request.ModuleUpdateRequest;
import com.erp.cuahangtienloi.dto.response.ModuleDTO;
import com.erp.cuahangtienloi.entity.Module;
import com.erp.cuahangtienloi.exception.ConflictException;
import com.erp.cuahangtienloi.mapper.ModuleMapper;
import com.erp.cuahangtienloi.repository.ModuleRepository;
import com.erp.cuahangtienloi.repository.PermissionRepository;
import com.erp.cuahangtienloi.service.ModuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ModuleServiceImpl implements ModuleService {

    private final ModuleRepository moduleRepository;
    private final PermissionRepository permissionRepository;
    private final ModuleMapper moduleMapper;

    @Override
    public List<ModuleDTO> getAllModules() {
        return moduleRepository.findAllByOrderByThuTuAsc().stream()
                .filter(m -> m.getDeleted() == null || m.getDeleted() == 0)
                .map(m -> {
                    long permCount = permissionRepository.countByModule(m.getName());
                    return moduleMapper.toDto(m, permCount);
                })
                .collect(Collectors.toList());
    }

    @Override
    public ModuleDTO getModuleById(Long id) {
        Module m = moduleRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy module với ID: " + id));
        long permCount = permissionRepository.countByModule(m.getName());
        return moduleMapper.toDto(m, permCount);
    }

    @Override
    @Transactional
    public ModuleDTO createModule(ModuleCreateRequest request) {
        String name = request.getName().trim();
        if (moduleRepository.existsByName(name)) {
            throw new ConflictException("Module với tên '" + name + "' đã tồn tại.");
        }

        Module entity = moduleMapper.toEntity(request);
        entity.setName(name);
        Module saved = moduleRepository.save(entity);
        return moduleMapper.toDto(saved, 0);
    }

    @Override
    @Transactional
    public ModuleDTO updateModule(Long id, ModuleUpdateRequest request) {
        Module entity = moduleRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy module với ID: " + id));

        moduleMapper.updateEntity(entity, request);
        Module updated = moduleRepository.save(entity);
        long permCount = permissionRepository.countByModule(updated.getName());
        return moduleMapper.toDto(updated, permCount);
    }

    @Override
    @Transactional
    public void deleteModule(Long id) {
        Module entity = moduleRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy module với ID: " + id));

        long count = permissionRepository.countByModule(entity.getName());
        if (count > 0) {
            throw new ConflictException("Không thể xoá module '" + entity.getName() + "' vì đang chứa " + count + " quyền.");
        }

        moduleRepository.delete(entity);
    }
}
