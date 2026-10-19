package com.erp.cuahangtienloi.service.impl;

import com.erp.cuahangtienloi.dto.request.VaiTroCreateRequest;
import com.erp.cuahangtienloi.dto.request.VaiTroUpdateRequest;
import com.erp.cuahangtienloi.dto.response.VaiTroDTO;
import com.erp.cuahangtienloi.entity.RolePermission;
import com.erp.cuahangtienloi.entity.RolePermissionId;
import com.erp.cuahangtienloi.entity.VaiTro;
import com.erp.cuahangtienloi.exception.ConflictException;
import com.erp.cuahangtienloi.mapper.VaiTroMapper;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.RolePermissionRepository;
import com.erp.cuahangtienloi.repository.VaiTroRepository;
import com.erp.cuahangtienloi.service.VaiTroService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VaiTroServiceImpl implements VaiTroService {

    private final VaiTroRepository vaiTroRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final NhanVienRepository nhanVienRepository;
    private final VaiTroMapper vaiTroMapper;

    private long countUsersForRole(VaiTro v) {
        long countById = nhanVienRepository.countByIdVaiTro(v.getId());
        if (countById > 0) return countById;
        return nhanVienRepository.countByVaiTro(v.getTenVaiTro());
    }

    @Override
    public List<VaiTroDTO> getAllVaiTro() {
        return vaiTroRepository.findAllByOrderByMaVaiTroAsc().stream()
                .map(v -> vaiTroMapper.toDto(v, countUsersForRole(v)))
                .collect(Collectors.toList());
    }

    @Override
    public VaiTroDTO getVaiTroById(Long id) {
        VaiTro v = vaiTroRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy vai trò với ID: " + id));
        return vaiTroMapper.toDto(v, countUsersForRole(v));
    }

    @Override
    @Transactional
    public VaiTroDTO createVaiTro(VaiTroCreateRequest request) {
        String code = request.getMaVaiTro().trim().toUpperCase();
        String name = request.getTenVaiTro().trim().toUpperCase();

        if (vaiTroRepository.existsByMaVaiTro(code)) {
            throw new ConflictException("Mã vai trò '" + code + "' đã tồn tại.");
        }
        if (vaiTroRepository.existsByTenVaiTro(name)) {
            throw new ConflictException("Tên vai trò '" + name + "' đã tồn tại.");
        }

        VaiTro entity = vaiTroMapper.toEntity(request);
        entity.setMaVaiTro(code);
        entity.setTenVaiTro(name);
        VaiTro saved = vaiTroRepository.save(entity);
        return vaiTroMapper.toDto(saved, 0);
    }

    @Override
    @Transactional
    public VaiTroDTO updateVaiTro(Long id, VaiTroUpdateRequest request) {
        VaiTro entity = vaiTroRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy vai trò với ID: " + id));

        String newName = request.getTenVaiTro().trim().toUpperCase();
        if (!entity.getTenVaiTro().equalsIgnoreCase(newName) && vaiTroRepository.existsByTenVaiTro(newName)) {
            throw new ConflictException("Tên vai trò '" + newName + "' đã được sử dụng bởi nhóm khác.");
        }

        vaiTroMapper.updateEntity(entity, request);
        entity.setTenVaiTro(newName);
        VaiTro updated = vaiTroRepository.save(entity);
        return vaiTroMapper.toDto(updated, countUsersForRole(updated));
    }

    @Override
    @Transactional
    public void deleteVaiTro(Long id) {
        VaiTro entity = vaiTroRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy vai trò với ID: " + id));

        long userCount = countUsersForRole(entity);
        if (userCount > 0) {
            throw new ConflictException("Không thể xoá vai trò '" + entity.getTenVaiTro() + "' vì đang có " + userCount + " nhân viên sử dụng.");
        }

        rolePermissionRepository.deleteByRoleId(id);
        vaiTroRepository.delete(entity);
    }

    @Override
    public List<Long> getPermissionIdsByRoleId(Long roleId) {
        return rolePermissionRepository.findPermissionIdsByRoleId(roleId);
    }

    @Override
    @Transactional
    public void assignPermissions(Long roleId, List<Long> permissionIds, String currentUser) {
        if (!vaiTroRepository.existsById(roleId)) {
            throw new NoSuchElementException("Không tìm thấy vai trò với ID: " + roleId);
        }

        rolePermissionRepository.deleteByRoleId(roleId);

        if (permissionIds != null && !permissionIds.isEmpty()) {
            List<RolePermission> links = permissionIds.stream()
                    .distinct()
                    .map(pid -> {
                        RolePermission rp = new RolePermission(new RolePermissionId(roleId, pid));
                        rp.setNguoiGan(currentUser);
                        rp.setNgayGan(LocalDateTime.now());
                        return rp;
                    })
                    .collect(Collectors.toList());
            rolePermissionRepository.saveAll(links);
        }
    }
}
