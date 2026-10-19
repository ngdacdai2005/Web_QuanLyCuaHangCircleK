package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ThongBao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ThongBaoRepository extends JpaRepository<ThongBao, Long> {

    @Query("SELECT t FROM ThongBao t WHERE " +
           "(:isAdmin = true OR (t.loaiThongBao IN :allowedTypes) OR (:userId IS NOT NULL AND t.idNhanVienNhan = :userId)) " +
           "AND (:isSystemWide = true OR t.idChiNhanh IS NULL OR (:branchId IS NOT NULL AND t.idChiNhanh = :branchId) OR (:userId IS NOT NULL AND t.idNhanVienNhan = :userId)) " +
           "AND (:unreadOnly = false OR t.daDoc = false) " +
           "AND (:loai IS NULL OR t.loaiThongBao = :loai) " +
           "ORDER BY t.ngayTao DESC")
    List<ThongBao> findFiltered(
            @Param("isAdmin") boolean isAdmin,
            @Param("isSystemWide") boolean isSystemWide,
            @Param("allowedTypes") Collection<String> allowedTypes,
            @Param("branchId") UUID branchId,
            @Param("userId") UUID userId,
            @Param("unreadOnly") boolean unreadOnly,
            @Param("loai") String loai
    );

    @Query("SELECT COUNT(t) FROM ThongBao t WHERE " +
           "(:isAdmin = true OR (t.loaiThongBao IN :allowedTypes) OR (:userId IS NOT NULL AND t.idNhanVienNhan = :userId)) " +
           "AND (:isSystemWide = true OR t.idChiNhanh IS NULL OR (:branchId IS NOT NULL AND t.idChiNhanh = :branchId) OR (:userId IS NOT NULL AND t.idNhanVienNhan = :userId)) " +
           "AND t.daDoc = false")
    long countUnreadFiltered(
            @Param("isAdmin") boolean isAdmin,
            @Param("isSystemWide") boolean isSystemWide,
            @Param("allowedTypes") Collection<String> allowedTypes,
            @Param("branchId") UUID branchId,
            @Param("userId") UUID userId
    );

    @Modifying
    @Query("UPDATE ThongBao t SET t.daDoc = true, t.ngayDoc = CURRENT_TIMESTAMP " +
           "WHERE t.daDoc = false " +
           "AND (:isAdmin = true OR (t.loaiThongBao IN :allowedTypes) OR (:userId IS NOT NULL AND t.idNhanVienNhan = :userId)) " +
           "AND (:isSystemWide = true OR t.idChiNhanh IS NULL OR (:branchId IS NOT NULL AND t.idChiNhanh = :branchId) OR (:userId IS NOT NULL AND t.idNhanVienNhan = :userId))")
    void markAllAsReadFiltered(
            @Param("isAdmin") boolean isAdmin,
            @Param("isSystemWide") boolean isSystemWide,
            @Param("allowedTypes") Collection<String> allowedTypes,
            @Param("branchId") UUID branchId,
            @Param("userId") UUID userId
    );
}
