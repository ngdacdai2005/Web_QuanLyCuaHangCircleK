package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.constant.RecordStatus;
import com.erp.cuahangtienloi.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
    boolean existsByName(String name);

    Optional<Permission> findByName(String name);

    List<Permission> findByModule(String module);

    long countByModule(String module);

    @Query("SELECT p FROM Permission p WHERE p.status = :status AND p.deleted = 0 ORDER BY p.module ASC, p.name ASC")
    List<Permission> findByStatusOrdered(@Param("status") RecordStatus status);

    List<Permission> findAllByOrderByModuleAscNameAsc();
}
