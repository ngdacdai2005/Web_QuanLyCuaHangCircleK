package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.HopDong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface HopDongRepository extends JpaRepository<HopDong, UUID> {

    boolean existsByIdNcc(UUID idNcc);
    boolean existsByMaHopDong(String maHopDong);

    @Query("""
            SELECT h FROM HopDong h
            WHERE (:idNcc IS NULL OR h.idNcc = :idNcc)
              AND (:trangThai IS NULL OR h.trangThai = :trangThai)
            ORDER BY h.ngayTao DESC""")
    List<HopDong> filter(@Param("idNcc") UUID idNcc, @Param("trangThai") String trangThai);

    List<HopDong> findByTrangThaiAndNgayHetHanBetween(String trangThai, LocalDate from, LocalDate to);
}