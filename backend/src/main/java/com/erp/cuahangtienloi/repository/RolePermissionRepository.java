package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.RolePermission;
import com.erp.cuahangtienloi.entity.RolePermissionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {
    List<RolePermission> findByIdRoleId(Long roleId);

    List<RolePermission> findByIdRoleIdIn(List<Long> roleIds);

    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.id.roleId = :roleId")
    void deleteByRoleId(@Param("roleId") Long roleId);

    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.id.permissionId = :permissionId")
    void deleteByPermissionId(@Param("permissionId") Long permissionId);

    @Query("SELECT rp.id.permissionId FROM RolePermission rp WHERE rp.id.roleId = :roleId")
    List<Long> findPermissionIdsByRoleId(@Param("roleId") Long roleId);

    @Query("SELECT DISTINCT rp.id.roleId FROM RolePermission rp WHERE rp.id.permissionId IN :permissionIds")
    List<Long> findRoleIdsByPermissionIdIn(@Param("permissionIds") List<Long> permissionIds);
}
