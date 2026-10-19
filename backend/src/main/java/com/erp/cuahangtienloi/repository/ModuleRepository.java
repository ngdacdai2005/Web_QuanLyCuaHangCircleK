package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.constant.RecordStatus;
import com.erp.cuahangtienloi.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Long> {
    boolean existsByName(String name);

    Optional<Module> findByName(String name);

    List<Module> findByStatusOrderByThuTuAsc(RecordStatus status);

    List<Module> findAllByOrderByThuTuAsc();
}
