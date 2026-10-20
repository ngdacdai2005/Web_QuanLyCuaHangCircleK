package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.CreateSanPhamRequestDTO;
import com.erp.cuahangtienloi.dto.response.SanPhamResponseDTO;
import com.erp.cuahangtienloi.dto.request.UpdateSanPhamRequestDTO;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.mapper.SanPhamMapper;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SanPhamService {

    private final SanPhamRepository sanPhamRepository;
    private final DanhMucRepository danhMucRepository;
    private final NhaCungCapRepository nhaCungCapRepository;
    private final com.erp.cuahangtienloi.repository.SanPhamNhaCungCapRepository sanPhamNhaCungCapRepository;
    private final BranchProductStatusService branchProductStatusService;
    private final SanPhamMapper sanPhamMapper;

    @Transactional(readOnly = true)
    public List<SanPhamResponseDTO> getAll(UUID branchId, boolean isAdmin) {
        return sanPhamRepository.findAll().stream()
                .map(sp -> {
                    SanPhamResponseDTO dto = sanPhamMapper.toResponse(sp);
                    if (Boolean.FALSE.equals(sp.getDangHoatDong())) {
                        dto.setDangHoatDong(false);
                    } else if (!isAdmin && branchId != null) {
                        if (branchProductStatusService.isInactiveForBranch(branchId, sp.getId())
                                || (sp.getIdDanhMuc() != null && branchProductStatusService.isCategoryInactiveForBranch(branchId, sp.getIdDanhMuc()))) {
                            dto.setDangHoatDong(false);
                        }
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<SanPhamResponseDTO> getById(UUID id) {
        return sanPhamRepository.findById(id).map(sanPhamMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<SanPhamResponseDTO> getByDanhMuc(UUID idDanhMuc) {
        return sanPhamRepository.findByIdDanhMuc(idDanhMuc).stream()
                .map(sanPhamMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<SanPhamResponseDTO> getByMaVach(String maVach) {
        return sanPhamRepository.findByMaVach(maVach).map(sanPhamMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<SanPhamResponseDTO> getActive(UUID branchId, boolean isAdmin) {
        return sanPhamRepository.findByDangHoatDong(true).stream()
                .filter(sp -> {
                    if (isAdmin || branchId == null) return true;
                    if (branchProductStatusService.isInactiveForBranch(branchId, sp.getId())) return false;
                    if (sp.getIdDanhMuc() != null && branchProductStatusService.isCategoryInactiveForBranch(branchId, sp.getIdDanhMuc())) return false;
                    return true;
                })
                .map(sanPhamMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SanPhamResponseDTO create(CreateSanPhamRequestDTO request) {
        if (sanPhamRepository.existsBySku(request.getSku())) {
            throw new IllegalArgumentException("SKU đã tồn tại");
        }
        if (request.getMaVach() != null && !request.getMaVach().isBlank()
                && sanPhamRepository.existsByMaVach(request.getMaVach())) {
            throw new IllegalArgumentException("Mã vạch đã tồn tại");
        }
        if (!danhMucRepository.existsById(request.getIdDanhMuc())) {
            throw new IllegalArgumentException("Danh mục không tồn tại");
        }
        if (request.getIdNhaCungCap() != null && !nhaCungCapRepository.existsById(request.getIdNhaCungCap())) {
            throw new IllegalArgumentException("Nhà cung cấp không tồn tại");
        }
        int tonToiThieu = request.getTonToiThieu() != null ? request.getTonToiThieu() : 0;
        int tonToiDa = request.getTonToiDa() != null ? request.getTonToiDa() : 0;
        if (tonToiDa > 0 && tonToiDa < tonToiThieu) {
            throw new IllegalArgumentException("Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu");
        }

        SanPham sp = new SanPham();
        sp.setId(UUID.randomUUID());
        sp.setIdDanhMuc(request.getIdDanhMuc());
        sp.setSku(request.getSku());
        sp.setMaVach(request.getMaVach());
        sp.setTenSanPham(request.getTenSanPham());
        sp.setDonVi(request.getDonVi() != null ? request.getDonVi() : "PIECE");
        sp.setImageUrl(request.getImageUrl());
        sp.setMoTa(request.getMoTa());
        sp.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        sp.setGiaVon(request.getGiaVon() != null ? request.getGiaVon() : BigDecimal.ZERO);
        sp.setGiaBan(request.getGiaBan());
        sp.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        sp.setIdNhaCungCap(request.getIdNhaCungCap());
        sp.setTonToiThieu(request.getTonToiThieu() != null ? request.getTonToiThieu() : 0);
        sp.setTonToiDa(request.getTonToiDa() != null ? request.getTonToiDa() : 0);
        sp.setDeHong(request.getDeHong() != null ? request.getDeHong() : false);
        sp.setHanSuDungNgay(request.getHanSuDungNgay() != null ? request.getHanSuDungNgay() : 0);
        sp.setNgayTao(LocalDateTime.now());
        sp.setNgayCapNhat(LocalDateTime.now());

        SanPham saved = sanPhamRepository.save(sp);
        if (saved.getIdNhaCungCap() != null && sanPhamNhaCungCapRepository != null) {
            sanPhamNhaCungCapRepository.findByIdSanPhamAndIdNhaCungCap(saved.getId(), saved.getIdNhaCungCap())
                    .orElseGet(() -> sanPhamNhaCungCapRepository.save(
                            com.erp.cuahangtienloi.entity.SanPhamNhaCungCap.builder()
                                    .id(UUID.randomUUID())
                                    .idSanPham(saved.getId())
                                    .idNhaCungCap(saved.getIdNhaCungCap())
                                    .giaNhap(saved.getGiaVon() != null ? saved.getGiaVon() : BigDecimal.ZERO)
                                    .laNccChinh(true)
                                    .ghiChu("Đồng bộ NCC chính khi tạo sản phẩm")
                                    .ngayTao(LocalDateTime.now())
                                    .ngayCapNhat(LocalDateTime.now())
                                    .build()
                    ));
        }
        return sanPhamMapper.toResponse(saved);
    }

    @Transactional
    public Optional<SanPhamResponseDTO> update(UUID id, UpdateSanPhamRequestDTO request) {
        return sanPhamRepository.findById(id)
                .map(sp -> {
                    if (request.getTenSanPham() != null && request.getTenSanPham().isBlank()) {
                        throw new IllegalArgumentException("Tên sản phẩm không được để trống");
                    }
                    if (request.getSku() != null) {
                        SanPham duplicate = sanPhamRepository.findBySku(request.getSku()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            throw new IllegalArgumentException("SKU đã tồn tại");
                        }
                    }
                    if (request.getMaVach() != null && !request.getMaVach().isBlank()) {
                        SanPham duplicate = sanPhamRepository.findByMaVach(request.getMaVach()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            throw new IllegalArgumentException("Mã vạch đã tồn tại");
                        }
                    }
                    if (request.getIdDanhMuc() != null && !danhMucRepository.existsById(request.getIdDanhMuc())) {
                        throw new IllegalArgumentException("Danh mục không tồn tại");
                    }
                    if (request.getIdNhaCungCap() != null && !nhaCungCapRepository.existsById(request.getIdNhaCungCap())) {
                        throw new IllegalArgumentException("Nhà cung cấp không tồn tại");
                    }
                    int min = request.getTonToiThieu() != null
                            ? request.getTonToiThieu()
                            : (sp.getTonToiThieu() != null ? sp.getTonToiThieu() : 0);
                    int max = request.getTonToiDa() != null
                            ? request.getTonToiDa()
                            : (sp.getTonToiDa() != null ? sp.getTonToiDa() : 0);
                    if (max > 0 && max < min) {
                        throw new IllegalArgumentException("Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu");
                    }
                    if (request.getIdDanhMuc() != null) sp.setIdDanhMuc(request.getIdDanhMuc());
                    if (request.getSku() != null) sp.setSku(request.getSku());
                    if (request.getMaVach() != null) sp.setMaVach(request.getMaVach());
                    if (request.getTenSanPham() != null) sp.setTenSanPham(request.getTenSanPham());
                    if (request.getDonVi() != null) sp.setDonVi(request.getDonVi());
                    if (request.getImageUrl() != null) sp.setImageUrl(request.getImageUrl());
                    if (request.getMoTa() != null) sp.setMoTa(request.getMoTa());
                    if (request.getDangHoatDong() != null) sp.setDangHoatDong(request.getDangHoatDong());
                    if (request.getGiaVon() != null) sp.setGiaVon(request.getGiaVon());
                    if (request.getGiaBan() != null) sp.setGiaBan(request.getGiaBan());
                    if (request.getVatPhantram() != null) sp.setVatPhantram(request.getVatPhantram());
                    if (request.getIdNhaCungCap() != null) sp.setIdNhaCungCap(request.getIdNhaCungCap());
                    if (request.getTonToiThieu() != null) sp.setTonToiThieu(request.getTonToiThieu());
                    if (request.getTonToiDa() != null) sp.setTonToiDa(request.getTonToiDa());
                    if (request.getDeHong() != null) sp.setDeHong(request.getDeHong());
                    if (request.getHanSuDungNgay() != null) sp.setHanSuDungNgay(request.getHanSuDungNgay());
                    sp.setNgayCapNhat(LocalDateTime.now());

                    SanPham saved = sanPhamRepository.save(sp);
                    if (saved.getIdNhaCungCap() != null && sanPhamNhaCungCapRepository != null) {
                        sanPhamNhaCungCapRepository.findByIdSanPhamAndIdNhaCungCap(saved.getId(), saved.getIdNhaCungCap())
                                .orElseGet(() -> sanPhamNhaCungCapRepository.save(
                                        com.erp.cuahangtienloi.entity.SanPhamNhaCungCap.builder()
                                                .id(UUID.randomUUID())
                                                .idSanPham(saved.getId())
                                                .idNhaCungCap(saved.getIdNhaCungCap())
                                                .giaNhap(saved.getGiaVon() != null ? saved.getGiaVon() : BigDecimal.ZERO)
                                                .laNccChinh(true)
                                                .ghiChu("Đồng bộ NCC chính khi cập nhật sản phẩm")
                                                .ngayTao(LocalDateTime.now())
                                                .ngayCapNhat(LocalDateTime.now())
                                                .build()
                                ));
                    }
                    return sanPhamMapper.toResponse(saved);
                });
    }

    @Transactional
    public String delete(UUID id, boolean permanent, UUID branchId, boolean isAdmin) {
        SanPham sp = sanPhamRepository.findById(id).orElse(null);
        if (sp == null) {
            return null;
        }

        if (!isAdmin) {
            if (branchId == null) {
                throw new IllegalArgumentException("Tài khoản chưa được gán chi nhánh để thực hiện thao tác");
            }
            branchProductStatusService.deactivateForBranch(branchId, id);
            return "Sản phẩm đã được chuyển sang ngừng kinh doanh tại chi nhánh này";
        }

        // ADMIN
        if (permanent) {
            try {
                sanPhamRepository.deleteById(id);
                branchProductStatusService.removeProduct(id);
                return "Đã xóa vĩnh viễn sản phẩm khỏi hệ thống";
            } catch (DataIntegrityViolationException ex) {
                sp.setDangHoatDong(false);
                sp.setNgayCapNhat(LocalDateTime.now());
                sanPhamRepository.save(sp);
                return "Sản phẩm đã phát sinh dữ liệu giao dịch/tồn kho nên không thể xóa vĩnh viễn. Hệ thống đã chuyển sang ngừng kinh doanh trên toàn chuỗi";
            }
        } else {
            sp.setDangHoatDong(false);
            sp.setNgayCapNhat(LocalDateTime.now());
            sanPhamRepository.save(sp);
            return "Sản phẩm đã được chuyển sang ngừng kinh doanh trên toàn hệ thống";
        }
    }

    @Transactional
    public String restore(UUID id, UUID branchId, boolean isAdmin) {
        SanPham sp = sanPhamRepository.findById(id).orElse(null);
        if (sp == null) {
            return null;
        }

        if (isAdmin) {
            sp.setDangHoatDong(true);
            sp.setNgayCapNhat(LocalDateTime.now());
            sanPhamRepository.save(sp);
            if (branchId != null) {
                branchProductStatusService.activateForBranch(branchId, id);
            }
            return "Sản phẩm đã được kích hoạt kinh doanh lại trên toàn hệ thống";
        } else {
            if (Boolean.FALSE.equals(sp.getDangHoatDong())) {
                throw new IllegalArgumentException("Sản phẩm đang bị Admin ngừng kinh doanh toàn hệ thống, không thể mở lại từ chi nhánh");
            }
            if (branchId != null) {
                if (sp.getIdDanhMuc() != null && branchProductStatusService.isCategoryInactiveForBranch(branchId, sp.getIdDanhMuc())) {
                    throw new IllegalArgumentException("Danh mục của sản phẩm này đang bị ngừng kinh doanh tại chi nhánh. Vui lòng kích hoạt lại danh mục trước.");
                }
                branchProductStatusService.activateForBranch(branchId, id);
            }
            return "Sản phẩm đã được kích hoạt kinh doanh lại tại chi nhánh";
        }
    }
    
}
