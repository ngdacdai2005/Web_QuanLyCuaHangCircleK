package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.GiaoDichQuyCa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GiaoDichQuyCaRepository extends JpaRepository<GiaoDichQuyCa, UUID> {
    List<GiaoDichQuyCa> findByIdPhienThuNganOrderByNgayTaoAsc(UUID idPhienThuNgan);
}
