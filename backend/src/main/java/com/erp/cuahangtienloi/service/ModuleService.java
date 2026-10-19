package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.ModuleCreateRequest;
import com.erp.cuahangtienloi.dto.request.ModuleUpdateRequest;
import com.erp.cuahangtienloi.dto.response.ModuleDTO;

import java.util.List;

public interface ModuleService {
    List<ModuleDTO> getAllModules();

    ModuleDTO getModuleById(Long id);

    ModuleDTO createModule(ModuleCreateRequest request);

    ModuleDTO updateModule(Long id, ModuleUpdateRequest request);

    void deleteModule(Long id);
}
