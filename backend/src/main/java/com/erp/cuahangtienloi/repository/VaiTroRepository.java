package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.constant.RecordStatus;
import com.erp.cuahangtienloi.entity.VaiTro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VaiTroRepository extends JpaRepository<VaiTro, Long> {
    boolean existsByMaVaiTro(String maVaiTro);

    boolean existsByTenVaiTro(String tenVaiTro);

    Optional<VaiTro> findByMaVaiTro(String maVaiTro);

    Optional<VaiTro> findByTenVaiTro(String tenVaiTro);

    List<VaiTro> findByStatusOrderByMaVaiTroAsc(RecordStatus status);

    List<VaiTro> findAllByOrderByMaVaiTroAsc();
}
