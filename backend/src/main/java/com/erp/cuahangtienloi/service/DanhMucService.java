package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.DanhMucRequestDTO;
import com.erp.cuahangtienloi.dto.response.DanhMucResponseDTO;
import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.mapper.DanhMucMapper;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.nonNegative;
import static com.erp.cuahangtienloi.validation.InputValidator.requireText;

@Service
@RequiredArgsConstructor
public class DanhMucService {

    private final DanhMucRepository danhMucRepository;
    private final SanPhamRepository sanPhamRepository;
    private final BranchProductStatusService branchProductStatusService;
    private final DanhMucMapper danhMucMapper;

    @Transactional(readOnly = true)
    public List<DanhMucResponseDTO> getAll(UUID branchId, boolean isAdmin) {
        return danhMucRepository.findAll().stream()
                .map(dm -> {
                    DanhMucResponseDTO dto = danhMucMapper.toResponse(dm);
                    if (Boolean.FALSE.equals(dm.getDangHoatDong())) {
                        dto.setDangHoatDong(false);
                    } else if (!isAdmin && branchId != null
                            && branchProductStatusService.isCategoryInactiveForBranch(branchId, dm.getId())) {
                        dto.setDangHoatDong(false);
                    } else {
                        dto.setDangHoatDong(dm.getDangHoatDong() != null ? dm.getDangHoatDong() : true);
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<DanhMucResponseDTO> getById(UUID id, UUID branchId, boolean isAdmin) {
        return danhMucRepository.findById(id)
                .map(dm -> {
                    DanhMucResponseDTO dto = danhMucMapper.toResponse(dm);
                    if (Boolean.FALSE.equals(dm.getDangHoatDong())) {
                        dto.setDangHoatDong(false);
                    } else if (!isAdmin && branchId != null
                            && branchProductStatusService.isCategoryInactiveForBranch(branchId, dm.getId())) {
                        dto.setDangHoatDong(false);
                    }
                    return dto;
                });
    }

    @Transactional(readOnly = true)
    public List<DanhMucResponseDTO> getActive(UUID branchId, boolean isAdmin) {
        return danhMucRepository.findAll().stream()
                .filter(dm -> dm.getDangHoatDong() != null && dm.getDangHoatDong())
                .filter(dm -> isAdmin || branchId == null || !branchProductStatusService.isCategoryInactiveForBranch(branchId, dm.getId()))
                .map(danhMucMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DanhMucResponseDTO> getByParent(UUID parentId) {
        return danhMucRepository.findAll().stream()
                .filter(dm -> parentId == null ? dm.getParentId() == null : parentId.equals(dm.getParentId()))
                .map(danhMucMapper::toResponse)
                .toList();
    }

    @Transactional
    public DanhMucResponseDTO create(DanhMucRequestDTO request) {
        request.setTenDanhMuc(requireText(request.getTenDanhMuc(), "Tên danh mục", 2, 100));
        if (request.getMaDanhMuc() != null && request.getMaDanhMuc().length() > 20) {
            throw new IllegalArgumentException("Mã danh mục tối đa 20 ký tự");
        }
        if (request.getThuTuHienThi() != null) {
            nonNegative(request.getThuTuHienThi(), "Thứ tự hiển thị");
        }
        if (request.getParentId() != null && !danhMucRepository.existsById(request.getParentId())) {
            throw new IllegalArgumentException("Danh mục cha không tồn tại");
        }
        if (danhMucRepository.existsByMaDanhMuc(request.getMaDanhMuc())) {
            throw new IllegalArgumentException("Mã danh mục đã tồn tại");
        }

        DanhMuc dm = new DanhMuc();
        dm.setId(UUID.randomUUID());
        String maDM = request.getMaDanhMuc();
        if (maDM == null || maDM.isBlank()) {
            maDM = "DM-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }
        dm.setMaDanhMuc(maDM);
        dm.setTenDanhMuc(request.getTenDanhMuc());
        dm.setParentId(request.getParentId());
        dm.setMoTa(request.getMoTa());
        dm.setIconEmoji(request.getIconEmoji());
        dm.setImageUrl(request.getImageUrl());
        dm.setMauHex(request.getMauHex());
        dm.setThuTuHienThi(request.getThuTuHienThi() != null ? request.getThuTuHienThi() : 999);
        dm.setProductCount(0);
        dm.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        dm.setNgayTao(LocalDateTime.now());
        dm.setNgayCapNhat(LocalDateTime.now());

        return danhMucMapper.toResponse(danhMucRepository.save(dm));
    }

    @Transactional
    public Optional<DanhMucResponseDTO> update(UUID id, DanhMucRequestDTO request) {
        return danhMucRepository.findById(id)
                .map(dm -> {
                    if (request.getTenDanhMuc() != null) {
                        request.setTenDanhMuc(requireText(request.getTenDanhMuc(), "Tên danh mục", 2, 100));
                    }
                    nonNegative(request.getThuTuHienThi(), "Thứ tự hiển thị");
                    if (request.getParentId() != null) {
                        if (request.getParentId().equals(id)) {
                            throw new IllegalArgumentException("Danh mục không thể là cha của chính nó");
                        }
                        if (!danhMucRepository.existsById(request.getParentId())) {
                            throw new IllegalArgumentException("Danh mục cha không tồn tại");
                        }
                    }
                    if (request.getMaDanhMuc() != null) {
                        DanhMuc duplicate = danhMucRepository.findByMaDanhMuc(request.getMaDanhMuc()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            throw new IllegalArgumentException("Mã danh mục đã tồn tại");
                        }
                    }
                    if (request.getMaDanhMuc() != null) dm.setMaDanhMuc(request.getMaDanhMuc());
                    if (request.getTenDanhMuc() != null) dm.setTenDanhMuc(request.getTenDanhMuc());
                    if (request.getParentId() != null) dm.setParentId(request.getParentId());
                    if (request.getMoTa() != null) dm.setMoTa(request.getMoTa());
                    if (request.getIconEmoji() != null) dm.setIconEmoji(request.getIconEmoji());
                    if (request.getImageUrl() != null) dm.setImageUrl(request.getImageUrl());
                    if (request.getMauHex() != null) dm.setMauHex(request.getMauHex());
                    if (request.getThuTuHienThi() != null) dm.setThuTuHienThi(request.getThuTuHienThi());
                    if (request.getDangHoatDong() != null) dm.setDangHoatDong(request.getDangHoatDong());
                    dm.setNgayCapNhat(LocalDateTime.now());
                    return danhMucMapper.toResponse(danhMucRepository.save(dm));
                });
    }

    @Transactional
    public String delete(UUID id, UUID branchId, boolean isAdmin) {
        DanhMuc dm = danhMucRepository.findById(id).orElse(null);
        if (dm == null) {
            return null;
        }

        if (!isAdmin) {
            if (branchId == null) {
                throw new IllegalArgumentException("Tài khoản chưa được gán chi nhánh để thực hiện thao tác");
            }
            // 1. Tắt danh mục tại chi nhánh này
            branchProductStatusService.deactivateCategoryForBranch(branchId, id);

            // 2. Cascade: Tắt tất cả sản phẩm thuộc danh mục này tại chi nhánh
            List<SanPham> products = sanPhamRepository.findByIdDanhMuc(id);
            for (SanPham p : products) {
                branchProductStatusService.deactivateForBranch(branchId, p.getId());
            }

            return "Danh mục và các sản phẩm thuộc danh mục đã được chuyển sang ngừng kinh doanh tại chi nhánh này";
        }

        // ADMIN: Ngừng hoạt động toàn hệ thống
        dm.setDangHoatDong(false);
        dm.setNgayCapNhat(LocalDateTime.now());
        danhMucRepository.save(dm);

        // Cascade: Tắt tất cả sản phẩm thuộc danh mục trên toàn hệ thống
        List<SanPham> products = sanPhamRepository.findByIdDanhMuc(id);
        for (SanPham p : products) {
            p.setDangHoatDong(false);
            p.setNgayCapNhat(LocalDateTime.now());
            sanPhamRepository.save(p);
        }

        return "Danh mục và toàn bộ sản phẩm thuộc danh mục đã được chuyển sang ngừng hoạt động trên toàn hệ thống";
    }

    @Transactional
    public String restore(UUID id, UUID branchId, boolean isAdmin) {
        DanhMuc dm = danhMucRepository.findById(id).orElse(null);
        if (dm == null) {
            return null;
        }

        if (isAdmin) {
            dm.setDangHoatDong(true);
            dm.setNgayCapNhat(LocalDateTime.now());
            danhMucRepository.save(dm);

            // Khôi phục các sản phẩm thuộc danh mục
            List<SanPham> products = sanPhamRepository.findByIdDanhMuc(id);
            for (SanPham p : products) {
                p.setDangHoatDong(true);
                p.setNgayCapNhat(LocalDateTime.now());
                sanPhamRepository.save(p);
            }
            return "Danh mục và các sản phẩm thuộc danh mục đã được kích hoạt lại trên toàn hệ thống";
        } else {
            if (Boolean.FALSE.equals(dm.getDangHoatDong())) {
                throw new IllegalArgumentException("Danh mục đang bị Admin ngừng kinh doanh toàn hệ thống, không thể mở lại từ chi nhánh");
            }
            if (branchId != null) {
                branchProductStatusService.activateCategoryForBranch(branchId, id);

                // Khôi phục các sản phẩm thuộc danh mục tại chi nhánh
                List<SanPham> products = sanPhamRepository.findByIdDanhMuc(id);
                for (SanPham p : products) {
                    branchProductStatusService.activateForBranch(branchId, p.getId());
                }
            }
            return "Danh mục và các sản phẩm đã được kích hoạt kinh doanh lại tại chi nhánh";
        }
    }

    @Transactional
    public Optional<Boolean> moveUp(UUID id) {
        return danhMucRepository.findById(id)
                .map(current -> {
                    List<DanhMuc> all = danhMucRepository.findAll();
                    Optional<DanhMuc> target = all.stream()
                            .filter(dm -> dm.getThuTuHienThi() != null
                                    && current.getThuTuHienThi() != null
                                    && dm.getThuTuHienThi() < current.getThuTuHienThi()
                                    && !dm.getId().equals(id))
                            .max(Comparator.comparingInt(DanhMuc::getThuTuHienThi));
                    if (target.isEmpty()) {
                        return false; // Đã ở đầu
                    }
                    int tmp = current.getThuTuHienThi();
                    current.setThuTuHienThi(target.get().getThuTuHienThi());
                    target.get().setThuTuHienThi(tmp);
                    current.setNgayCapNhat(LocalDateTime.now());
                    target.get().setNgayCapNhat(LocalDateTime.now());
                    danhMucRepository.save(current);
                    danhMucRepository.save(target.get());
                    return true;
                });
    }

    @Transactional
    public Optional<Boolean> moveDown(UUID id) {
        return danhMucRepository.findById(id)
                .map(current -> {
                    List<DanhMuc> all = danhMucRepository.findAll();
                    Optional<DanhMuc> target = all.stream()
                            .filter(dm -> dm.getThuTuHienThi() != null
                                    && current.getThuTuHienThi() != null
                                    && dm.getThuTuHienThi() > current.getThuTuHienThi()
                                    && !dm.getId().equals(id))
                            .min(Comparator.comparingInt(DanhMuc::getThuTuHienThi));
                    if (target.isEmpty()) {
                        return false; // Đã ở cuối
                    }
                    int tmp = current.getThuTuHienThi();
                    current.setThuTuHienThi(target.get().getThuTuHienThi());
                    target.get().setThuTuHienThi(tmp);
                    current.setNgayCapNhat(LocalDateTime.now());
                    target.get().setNgayCapNhat(LocalDateTime.now());
                    danhMucRepository.save(current);
                    danhMucRepository.save(target.get());
                    return true;
                });
    }
}
