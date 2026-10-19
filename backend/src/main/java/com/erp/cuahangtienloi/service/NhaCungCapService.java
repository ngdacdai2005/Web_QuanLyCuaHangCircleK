package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.NhaCungCapRequestDTO;
import com.erp.cuahangtienloi.dto.response.NhaCungCapResponseDTO;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.NhaCungCapDanhMuc;
import com.erp.cuahangtienloi.mapper.NhaCungCapMapper;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapDanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NhaCungCapService {

    private final NhaCungCapRepository nhaCungCapRepository;
    private final NhaCungCapDanhMucRepository nccDanhMucRepository;
    private final DanhMucRepository danhMucRepository;
    private final NhaCungCapMapper nhaCungCapMapper;

    @Transactional(readOnly = true)
    public List<NhaCungCapResponseDTO> getAll() {
        return nhaCungCapRepository.findAll().stream()
                .map(nhaCungCapMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<NhaCungCapResponseDTO> getById(UUID id) {
        return nhaCungCapRepository.findById(id).map(nhaCungCapMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<NhaCungCapResponseDTO> getActive() {
        return nhaCungCapRepository.findAll().stream()
                .filter(ncc -> ncc.getDangHoatDong() != null && ncc.getDangHoatDong())
                .map(nhaCungCapMapper::toResponse)
                .toList();
    }

    @Transactional
    public NhaCungCapResponseDTO create(NhaCungCapRequestDTO request) {
        if (request.getTenNcc() == null || request.getTenNcc().isBlank()) {
            throw new IllegalArgumentException("Tên NCC không được để trống");
        }

        if (nhaCungCapRepository.existsByMaNcc(request.getMaNcc())) {
            throw new IllegalArgumentException("Mã NCC đã tồn tại");
        }
        if (request.getCategoryIds() != null
                && request.getCategoryIds().stream().anyMatch(categoryId -> !danhMucRepository.existsById(categoryId))) {
            throw new IllegalArgumentException("Danh mục của nhà cung cấp không tồn tại");
        }

        NhaCungCap ncc = new NhaCungCap();
        ncc.setId(UUID.randomUUID());

        String maNcc = request.getMaNcc();
        if (maNcc == null || maNcc.isBlank()) {
            maNcc = "NCC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        ncc.setMaNcc(maNcc);
        ncc.setTenNcc(request.getTenNcc());
        ncc.setMaSoThue(request.getMaSoThue());
        ncc.setSoDienThoai(request.getSoDienThoai());
        ncc.setEmail(request.getEmail());
        ncc.setDiaChi(request.getDiaChi());
        ncc.setNguoiLienHe(request.getNguoiLienHe());
        ncc.setChucDanhLienHe(request.getChucDanhLienHe());
        ncc.setSdtLienHe(request.getSdtLienHe());
        ncc.setDieuKhoanThanhToan(request.getDieuKhoanThanhToan() != null ? request.getDieuKhoanThanhToan() : "Thanh toán ngay");
        ncc.setSoNgayDuocNo(request.getSoNgayDuocNo() != null ? request.getSoNgayDuocNo() : 0);
        ncc.setTongCongNo(request.getTongCongNo() != null ? request.getTongCongNo() : BigDecimal.ZERO);
        ncc.setTongDonHang(request.getTongDonHang() != null ? request.getTongDonHang() : 0);
        ncc.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        ncc.setGhiChu(request.getGhiChu());
        ncc.setNgayTao(LocalDateTime.now());
        ncc.setNgayCapNhat(LocalDateTime.now());

        NhaCungCap saved = nhaCungCapRepository.save(ncc);
        saveCategories(saved.getId(), request.getCategoryIds());

        return nhaCungCapMapper.toResponse(saved);
    }

    @Transactional
    public Optional<NhaCungCapResponseDTO> update(UUID id, NhaCungCapRequestDTO  request) {
        return nhaCungCapRepository.findById(id)
                .map(ncc -> {
                    if (request.getTenNcc() != null && request.getTenNcc().isBlank()) {
                        throw new IllegalArgumentException("Tên NCC không được để trống");
                    }
                    if (request.getMaNcc() != null) {
                        NhaCungCap duplicate = nhaCungCapRepository.findByMaNcc(request.getMaNcc()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            throw new IllegalArgumentException("Mã NCC đã tồn tại");
                        }
                    }
                    if (request.getCategoryIds() != null
                            && request.getCategoryIds().stream().anyMatch(categoryId -> !danhMucRepository.existsById(categoryId))) {
                        throw new IllegalArgumentException("Danh mục của nhà cung cấp không tồn tại");
                    }

                    if (request.getMaNcc() != null) ncc.setMaNcc(request.getMaNcc());
                    if (request.getTenNcc() != null) ncc.setTenNcc(request.getTenNcc());
                    if (request.getMaSoThue() != null) ncc.setMaSoThue(request.getMaSoThue());
                    if (request.getSoDienThoai() != null) ncc.setSoDienThoai(request.getSoDienThoai());
                    if (request.getEmail() != null) ncc.setEmail(request.getEmail());
                    if (request.getDiaChi() != null) ncc.setDiaChi(request.getDiaChi());
                    if (request.getNguoiLienHe() != null) ncc.setNguoiLienHe(request.getNguoiLienHe());
                    if (request.getChucDanhLienHe() != null) ncc.setChucDanhLienHe(request.getChucDanhLienHe());
                    if (request.getSdtLienHe() != null) ncc.setSdtLienHe(request.getSdtLienHe());
                    if (request.getDieuKhoanThanhToan() != null) ncc.setDieuKhoanThanhToan(request.getDieuKhoanThanhToan());
                    if (request.getSoNgayDuocNo() != null) ncc.setSoNgayDuocNo(request.getSoNgayDuocNo());
                    if (request.getTongCongNo() != null) ncc.setTongCongNo(request.getTongCongNo());
                    if (request.getTongDonHang() != null) ncc.setTongDonHang(request.getTongDonHang());
                    if (request.getDangHoatDong() != null) ncc.setDangHoatDong(request.getDangHoatDong());
                    if (request.getGhiChu() != null) ncc.setGhiChu(request.getGhiChu());
                    ncc.setNgayCapNhat(LocalDateTime.now());

                    NhaCungCap saved = nhaCungCapRepository.save(ncc);

                    if (request.getCategoryIds() != null) {
                        nccDanhMucRepository.deleteByIdNhaCungCap(id);
                        saveCategories(id, request.getCategoryIds());
                    }

                    return nhaCungCapMapper.toResponse(saved);
                });
    }

    @Transactional
    public boolean delete(UUID id) {
        if (nhaCungCapRepository.existsById(id)) {
            nhaCungCapRepository.deleteById(id);
            return true;
        }
        return false;
    }

    private void saveCategories(UUID nccId, List<UUID> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return;
        }

        List<NhaCungCapDanhMuc> links = categoryIds.stream()
                .distinct()
                .map(categoryId -> {
                    NhaCungCapDanhMuc link = new NhaCungCapDanhMuc();
                    link.setIdNhaCungCap(nccId);
                    link.setIdDanhMuc(categoryId);
                    link.setNgayTao(LocalDateTime.now());
                    return link;
                })
                .toList();

        nccDanhMucRepository.saveAll(links);
    }
}
