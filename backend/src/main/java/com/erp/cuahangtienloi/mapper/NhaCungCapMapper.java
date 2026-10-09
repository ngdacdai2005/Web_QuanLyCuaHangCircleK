package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.NhaCungCapResponseDTO;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.NhaCungCapDanhMuc;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapDanhMucRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class NhaCungCapMapper {

    private final NhaCungCapDanhMucRepository nccDanhMucRepository;
    private final DanhMucRepository danhMucRepository;

    public NhaCungCapResponseDTO toResponse(NhaCungCap ncc) {
        NhaCungCapResponseDTO dto = new NhaCungCapResponseDTO();

        dto.setId(ncc.getId());
        dto.setMaNcc(ncc.getMaNcc());
        dto.setTenNcc(ncc.getTenNcc());
        dto.setMaSoThue(ncc.getMaSoThue());
        dto.setSoDienThoai(ncc.getSoDienThoai());
        dto.setEmail(ncc.getEmail());
        dto.setDiaChi(ncc.getDiaChi());
        dto.setNguoiLienHe(ncc.getNguoiLienHe());
        dto.setChucDanhLienHe(ncc.getChucDanhLienHe());
        dto.setSdtLienHe(ncc.getSdtLienHe());
        dto.setDieuKhoanThanhToan(ncc.getDieuKhoanThanhToan());
        dto.setSoNgayDuocNo(ncc.getSoNgayDuocNo());
        dto.setTongCongNo(ncc.getTongCongNo());
        dto.setTongDonHang(ncc.getTongDonHang());
        dto.setDangHoatDong(ncc.getDangHoatDong());
        dto.setGhiChu(ncc.getGhiChu());
        dto.setNgayTao(ncc.getNgayTao());
        dto.setNgayCapNhat(ncc.getNgayCapNhat());

        List<NhaCungCapDanhMuc> links =
                nccDanhMucRepository.findByIdNhaCungCap(ncc.getId());

        List<NhaCungCapResponseDTO.DanhMucSummary> categories =
                links.stream()
                        .map(link -> danhMucRepository.findById(link.getIdDanhMuc())
                                .map(dm -> {
                                    NhaCungCapResponseDTO.DanhMucSummary summary =
                                            new NhaCungCapResponseDTO.DanhMucSummary();

                                    summary.setId(dm.getId());
                                    summary.setTenDanhMuc(dm.getTenDanhMuc());
                                    summary.setIconEmoji(dm.getIconEmoji());
                                    summary.setMauHex(dm.getMauHex());

                                    return summary;
                                })
                                .orElse(null))
                        .filter(Objects::nonNull)
                        .toList();

        dto.setCategories(categories);
        dto.setCategoryIds(
                categories.stream()
                        .map(NhaCungCapResponseDTO.DanhMucSummary::getId)
                        .toList()
        );

        return dto;
    }
}
