package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.NhaCungCap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NhaCungCapRepository extends JpaRepository<NhaCungCap, UUID> {
    Optional<NhaCungCap> findByMaNcc(String maNcc);
    boolean existsByMaNcc(String maNcc);

    boolean existsBySoDienThoai(String soDienThoai);
    boolean existsBySoDienThoaiAndIdNot(String soDienThoai, UUID id);
    boolean existsByMaSoThue(String maSoThue);
    boolean existsByMaSoThueAndIdNot(String maSoThue, UUID id);

    interface LastCompletedDate { UUID getIdNcc(); LocalDate getNgayGanNhat(); }

    @Query("SELECT p.idNcc AS idNcc, MAX(p.ngayNhanThucTe) AS ngayGanNhat " +
            "FROM PhieuNhap p WHERE p.trangThai = 'COMPLETED' GROUP BY p.idNcc")
    List<LastCompletedDate> findLastCompletedDatePerNcc();
}
