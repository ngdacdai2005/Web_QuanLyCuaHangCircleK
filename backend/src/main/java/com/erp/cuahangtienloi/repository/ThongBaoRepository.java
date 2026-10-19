package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ThongBao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ThongBaoRepository extends JpaRepository<ThongBao, Long> {

    List<ThongBao> findAllByOrderByNgayTaoDesc();

    List<ThongBao> findByDaDocFalseOrderByNgayTaoDesc();

    List<ThongBao> findByLoaiThongBaoOrderByNgayTaoDesc(String loaiThongBao);

    List<ThongBao> findByLoaiThongBaoAndDaDocFalseOrderByNgayTaoDesc(String loaiThongBao);

    long countByDaDocFalse();

    @Modifying
    @Query("UPDATE ThongBao t SET t.daDoc = true, t.ngayDoc = CURRENT_TIMESTAMP WHERE t.daDoc = false")
    void markAllAsRead();
}
