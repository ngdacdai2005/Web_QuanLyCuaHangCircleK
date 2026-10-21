package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.PhienThuNgan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhienThuNganRepository extends JpaRepository<PhienThuNgan, UUID> {

    // Tìm phiên ca đang mở của một thu ngân
    Optional<PhienThuNgan> findByIdThuNganAndTrangThai(UUID idThuNgan, String trangThai);

    // Tìm phiên ca đang mở tại một quầy của chi nhánh
    Optional<PhienThuNgan> findByIdChiNhanhAndQuaySoAndTrangThai(UUID idChiNhanh, String quaySo, String trangThai);

    // Tìm phiên ca gần nhất đã chốt hoặc bàn giao của quầy để lấy quỹ đề xuất cho ca sau
    @Query("SELECT p FROM PhienThuNgan p WHERE p.idChiNhanh = :idChiNhanh AND p.quaySo = :quaySo AND p.trangThai IN ('DA_DONG', 'CHO_BAN_GIAO', 'DA_BAN_GIAO') ORDER BY p.gioDongCa DESC")
    List<PhienThuNgan> findLatestClosedSessions(@Param("idChiNhanh") UUID idChiNhanh, @Param("quaySo") String quaySo);

    // Lọc phiên ca theo chi nhánh và khoảng thời gian
    List<PhienThuNgan> findByIdChiNhanhOrderByGioMoCaDesc(UUID idChiNhanh);

    List<PhienThuNgan> findAllByOrderByGioMoCaDesc();

    @Query("SELECT p FROM PhienThuNgan p WHERE p.idChiNhanh = :idChiNhanh AND p.gioMoCa >= :fromTime AND p.gioMoCa <= :toTime ORDER BY p.gioMoCa DESC")
    List<PhienThuNgan> findByBranchAndDateRange(
            @Param("idChiNhanh") UUID idChiNhanh,
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime
    );

    // Tìm mã phiên lớn nhất trong ngày để sinh mã tự tăng (VD: PH-20261021-0001)
    @Query("SELECT p.maPhien FROM PhienThuNgan p WHERE p.maPhien LIKE :prefix% ORDER BY p.maPhien DESC")
    List<String> findMaPhienByPrefix(@Param("prefix") String prefix);
}
