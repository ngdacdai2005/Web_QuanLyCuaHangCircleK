package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.DonNghiPhep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DonNghiPhepRepository extends JpaRepository<DonNghiPhep, UUID> {
    List<DonNghiPhep> findByIdNhanVienOrderByNgayTaoDesc(UUID idNhanVien);
    List<DonNghiPhep> findByIdChiNhanhOrderByNgayTaoDesc(UUID idChiNhanh);
    List<DonNghiPhep> findByTrangThaiOrderByNgayTaoDesc(String trangThai);
    List<DonNghiPhep> findAllByOrderByNgayTaoDesc();
    long countByIdNhanVienAndTrangThai(UUID idNhanVien, String trangThai);
    long countByIdChiNhanhAndTrangThai(UUID idChiNhanh, String trangThai);
}
