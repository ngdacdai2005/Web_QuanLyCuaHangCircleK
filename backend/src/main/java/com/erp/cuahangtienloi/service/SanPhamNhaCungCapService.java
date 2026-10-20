package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.SaveSanPhamNccRequest;
import com.erp.cuahangtienloi.dto.response.SanPhamNhaCungCapDTO;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.SanPhamNhaCungCap;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.repository.SanPhamNhaCungCapRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SanPhamNhaCungCapService {

    private final SanPhamNhaCungCapRepository sanPhamNccRepository;
    private final SanPhamRepository sanPhamRepository;
    private final NhaCungCapRepository nhaCungCapRepository;
    private final com.erp.cuahangtienloi.repository.GiaNhapNccRepository giaNhapNccRepository;

    @Transactional(readOnly = true)
    public List<SanPhamNhaCungCapDTO> getSuppliersOfProduct(UUID productId) {
        List<SanPhamNhaCungCap> list = sanPhamNccRepository.findByIdSanPham(productId);
        Map<UUID, NhaCungCap> nccMap = nhaCungCapRepository.findAllById(
                list.stream().map(SanPhamNhaCungCap::getIdNhaCungCap).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(NhaCungCap::getId, n -> n));

        return list.stream().map(spNcc -> {
            NhaCungCap ncc = nccMap.get(spNcc.getIdNhaCungCap());
            return SanPhamNhaCungCapDTO.builder()
                    .id(spNcc.getId())
                    .idSanPham(spNcc.getIdSanPham())
                    .idNhaCungCap(spNcc.getIdNhaCungCap())
                    .maNcc(ncc != null ? ncc.getMaNcc() : null)
                    .tenNcc(ncc != null ? ncc.getTenNcc() : null)
                    .maSanPhamNcc(spNcc.getMaSanPhamNcc())
                    .giaNhap(spNcc.getGiaNhap())
                    .laNccChinh(spNcc.getLaNccChinh())
                    .ghiChu(spNcc.getGhiChu())
                    .ngayCapNhat(spNcc.getNgayCapNhat())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public SanPhamNhaCungCapDTO saveSupplierForProduct(UUID productId, SaveSanPhamNccRequest request) {
        SanPham sp = sanPhamRepository.findById(productId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy sản phẩm id: " + productId));

        NhaCungCap ncc = nhaCungCapRepository.findById(request.getIdNhaCungCap())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhà cung cấp id: " + request.getIdNhaCungCap()));

        List<SanPhamNhaCungCap> existingList = sanPhamNccRepository.findByIdSanPham(productId);
        boolean isFirst = existingList.isEmpty();
        boolean makePrimary = Boolean.TRUE.equals(request.getLaNccChinh()) || isFirst;

        if (makePrimary) {
            sanPhamNccRepository.resetPrimaryBySanPham(productId);
            sp.setIdNhaCungCap(ncc.getId());
            if (request.getGiaNhap() != null && request.getGiaNhap().compareTo(BigDecimal.ZERO) > 0) {
                sp.setGiaVon(request.getGiaNhap());
            }
            sanPhamRepository.save(sp);
        }

        SanPhamNhaCungCap entity = sanPhamNccRepository.findByIdSanPhamAndIdNhaCungCap(productId, request.getIdNhaCungCap())
                .orElse(SanPhamNhaCungCap.builder()
                        .idSanPham(productId)
                        .idNhaCungCap(request.getIdNhaCungCap())
                        .build());

        BigDecimal oldPrice = entity.getGiaNhap();
        BigDecimal newPrice = request.getGiaNhap() != null ? request.getGiaNhap() : BigDecimal.ZERO;
        boolean priceChanged = oldPrice == null || oldPrice.compareTo(newPrice) != 0;

        entity.setMaSanPhamNcc(request.getMaSanPhamNcc());
        entity.setGiaNhap(newPrice);
        entity.setLaNccChinh(makePrimary);
        entity.setGhiChu(request.getGhiChu());
        entity.setNgayCapNhat(LocalDateTime.now());

        SanPhamNhaCungCap saved = sanPhamNccRepository.save(entity);

        if (priceChanged && newPrice.signum() > 0) {
            com.erp.cuahangtienloi.entity.GiaNhapNcc priceLog = com.erp.cuahangtienloi.entity.GiaNhapNcc.builder()
                    .id(UUID.randomUUID())
                    .idSanPham(productId)
                    .idNhaCungCap(request.getIdNhaCungCap())
                    .giaNhap(newPrice)
                    .ngayHieuLucTu(LocalDate.now())
                    .dangApDung(true)
                    .ghiChu("Cập nhật giá từ màn hình thiết lập nguồn cung")
                    .ngayTao(LocalDateTime.now())
                    .ngayCapNhat(LocalDateTime.now())
                    .build();
            giaNhapNccRepository.save(priceLog);
        }

        return SanPhamNhaCungCapDTO.builder()
                .id(saved.getId())
                .idSanPham(saved.getIdSanPham())
                .idNhaCungCap(saved.getIdNhaCungCap())
                .maNcc(ncc.getMaNcc())
                .tenNcc(ncc.getTenNcc())
                .maSanPhamNcc(saved.getMaSanPhamNcc())
                .giaNhap(saved.getGiaNhap())
                .laNccChinh(saved.getLaNccChinh())
                .ghiChu(saved.getGhiChu())
                .ngayCapNhat(saved.getNgayCapNhat())
                .build();
    }

    @Transactional
    public void removeSupplierFromProduct(UUID productId, UUID nccId) {
        Optional<SanPhamNhaCungCap> opt = sanPhamNccRepository.findByIdSanPhamAndIdNhaCungCap(productId, nccId);
        if (opt.isEmpty()) return;

        boolean wasPrimary = Boolean.TRUE.equals(opt.get().getLaNccChinh());
        sanPhamNccRepository.deleteBySanPhamAndNcc(productId, nccId);

        if (wasPrimary) {
            List<SanPhamNhaCungCap> remaining = sanPhamNccRepository.findByIdSanPham(productId);
            SanPham sp = sanPhamRepository.findById(productId).orElse(null);
            if (!remaining.isEmpty()) {
                SanPhamNhaCungCap nextPrimary = remaining.get(0);
                nextPrimary.setLaNccChinh(true);
                sanPhamNccRepository.save(nextPrimary);
                if (sp != null) {
                    sp.setIdNhaCungCap(nextPrimary.getIdNhaCungCap());
                    sp.setGiaVon(nextPrimary.getGiaNhap());
                    sanPhamRepository.save(sp);
                }
            } else if (sp != null) {
                sp.setIdNhaCungCap(null);
                sanPhamRepository.save(sp);
            }
        }
    }

    @Transactional
    public void setPrimarySupplier(UUID productId, UUID nccId) {
        SanPhamNhaCungCap target = sanPhamNccRepository.findByIdSanPhamAndIdNhaCungCap(productId, nccId)
                .orElseThrow(() -> new NoSuchElementException("Sản phẩm chưa liên kết với nhà cung cấp này"));

        sanPhamNccRepository.resetPrimaryBySanPham(productId);
        target.setLaNccChinh(true);
        target.setNgayCapNhat(LocalDateTime.now());
        sanPhamNccRepository.save(target);

        SanPham sp = sanPhamRepository.findById(productId).orElse(null);
        if (sp != null) {
            sp.setIdNhaCungCap(nccId);
            if (target.getGiaNhap() != null && target.getGiaNhap().compareTo(BigDecimal.ZERO) > 0) {
                sp.setGiaVon(target.getGiaNhap());
            }
            sanPhamRepository.save(sp);
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProductsSuppliedBy(UUID nccId) {
        List<SanPhamNhaCungCap> links = sanPhamNccRepository.findByIdNhaCungCap(nccId);
        Set<UUID> linkedProductIds = links.stream().map(SanPhamNhaCungCap::getIdSanPham).collect(Collectors.toSet());

        List<SanPham> primaryProducts = sanPhamRepository.findAll().stream()
                .filter(p -> nccId.equals(p.getIdNhaCungCap()) && !linkedProductIds.contains(p.getId()))
                .collect(Collectors.toList());

        if (links.isEmpty() && primaryProducts.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, SanPham> productMap = sanPhamRepository.findAllById(linkedProductIds)
                .stream().collect(Collectors.toMap(SanPham::getId, p -> p));

        List<Map<String, Object>> result = new ArrayList<>();
        for (SanPhamNhaCungCap link : links) {
            SanPham p = productMap.get(link.getIdSanPham());
            if (p == null || !Boolean.TRUE.equals(p.getDangHoatDong())) continue;

            Map<String, Object> item = new HashMap<>();
            item.put("id", p.getId());
            item.put("sku", p.getSku());
            item.put("maVach", p.getMaVach());
            item.put("tenSanPham", p.getTenSanPham());
            item.put("donVi", p.getDonVi());
            item.put("vatPhantram", p.getVatPhantram());
            item.put("imageUrl", p.getImageUrl());
            // Giá nhập riêng của NCC này
            item.put("giaNhapNcc", link.getGiaNhap());
            item.put("maSanPhamNcc", link.getMaSanPhamNcc());
            item.put("laNccChinh", link.getLaNccChinh());
            result.add(item);
        }

        for (SanPham p : primaryProducts) {
            if (!Boolean.TRUE.equals(p.getDangHoatDong())) continue;
            Map<String, Object> item = new HashMap<>();
            item.put("id", p.getId());
            item.put("sku", p.getSku());
            item.put("maVach", p.getMaVach());
            item.put("tenSanPham", p.getTenSanPham());
            item.put("donVi", p.getDonVi());
            item.put("vatPhantram", p.getVatPhantram());
            item.put("imageUrl", p.getImageUrl());
            item.put("giaNhapNcc", p.getGiaVon());
            item.put("maSanPhamNcc", null);
            item.put("laNccChinh", true);
            result.add(item);
        }

        return result;
    }

    @Transactional(readOnly = true)
    public List<com.erp.cuahangtienloi.entity.GiaNhapNcc> getPriceHistory(UUID productId, UUID nccId) {
        return giaNhapNccRepository.findByIdSanPhamAndIdNhaCungCapOrderByNgayHieuLucTuDesc(productId, nccId);
    }
}
