package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.GiaNhapNcc;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GiaNhapNccRepository extends JpaRepository<GiaNhapNcc, UUID> {

    List<GiaNhapNcc> findByIdSanPhamAndIdNhaCungCapOrderByNgayHieuLucTuDesc(UUID idSanPham, UUID idNhaCungCap);

    List<GiaNhapNcc> findByIdNhaCungCap(UUID idNhaCungCap);

    @Query("""
            SELECT g FROM GiaNhapNcc g
            WHERE g.idSanPham = :idSanPham
              AND g.idNhaCungCap = :idNcc
              AND g.dangApDung = true
              AND g.ngayHieuLucTu <= :date
              AND (g.ngayHieuLucDen IS NULL OR g.ngayHieuLucDen >= :date)
            ORDER BY g.ngayHieuLucTu DESC, g.ngayTao DESC
            """)
    List<GiaNhapNcc> findEffectivePrices(
            @Param("idSanPham") UUID idSanPham,
            @Param("idNcc") UUID idNcc,
            @Param("date") LocalDate date);

    default Optional<GiaNhapNcc> findLatestEffectivePrice(UUID idSanPham, UUID idNcc, LocalDate date) {
        List<GiaNhapNcc> list = findEffectivePrices(idSanPham, idNcc, date);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
