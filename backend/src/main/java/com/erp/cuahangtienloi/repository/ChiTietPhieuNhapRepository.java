package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChiTietPhieuNhapRepository extends JpaRepository<ChiTietPhieuNhap, UUID> {
    List<ChiTietPhieuNhap> findByIdPhieuNhap(UUID idPhieuNhap);

    List<ChiTietPhieuNhap> findByIdSanPham(UUID idSanPham);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ChiTietPhieuNhap c where c.id = :id")
    Optional<ChiTietPhieuNhap> findByIdForUpdate(@Param("id") UUID id);

    List<ChiTietPhieuNhap> findByIdPhieuNhapIn(Collection<UUID> idPhieuNhaps);
}
