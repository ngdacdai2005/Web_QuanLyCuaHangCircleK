package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.SanPhamNhaCungCap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SanPhamNhaCungCapRepository extends JpaRepository<SanPhamNhaCungCap, UUID> {

    List<SanPhamNhaCungCap> findByIdSanPham(UUID idSanPham);

    List<SanPhamNhaCungCap> findByIdNhaCungCap(UUID idNhaCungCap);

    Optional<SanPhamNhaCungCap> findByIdSanPhamAndIdNhaCungCap(UUID idSanPham, UUID idNhaCungCap);

    Optional<SanPhamNhaCungCap> findByIdSanPhamAndLaNccChinhTrue(UUID idSanPham);

    @Modifying
    @Query("UPDATE SanPhamNhaCungCap s SET s.laNccChinh = false WHERE s.idSanPham = :idSanPham")
    void resetPrimaryBySanPham(@Param("idSanPham") UUID idSanPham);

    @Modifying
    @Query("DELETE FROM SanPhamNhaCungCap s WHERE s.idSanPham = :idSanPham AND s.idNhaCungCap = :idNcc")
    void deleteBySanPhamAndNcc(@Param("idSanPham") UUID idSanPham, @Param("idNcc") UUID idNcc);

    void deleteByIdSanPham(UUID idSanPham);
}
