package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.HopDongChiTiet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HopDongChiTietRepository extends JpaRepository<HopDongChiTiet, UUID> {

    List<HopDongChiTiet> findByIdHopDong(UUID idHopDong);

    Optional<HopDongChiTiet> findByIdHopDongAndIdSanPham(UUID idHopDong, UUID idSanPham);

    void deleteByIdHopDong(UUID idHopDong);
}
