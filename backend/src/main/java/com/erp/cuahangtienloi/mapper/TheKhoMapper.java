package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.TheKhoResponseDTO;
import com.erp.cuahangtienloi.entity.TheKho;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TheKhoMapper {

    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;

    public TheKhoResponseDTO toResponse(TheKho tk) {
        TheKhoResponseDTO dto = new TheKhoResponseDTO();

        dto.setId(tk.getId());
        dto.setNgayPhatSinh(tk.getNgayPhatSinh());
        dto.setIdSanPham(tk.getIdSanPham());
        dto.setIdChiNhanh(tk.getIdChiNhanh());
        dto.setLoaiGiaoDich(tk.getLoaiGiaoDich());
        dto.setSoLuong(tk.getSoLuong());
        dto.setDonGia(tk.getDonGia());
        dto.setThanhTien(tk.getThanhTien());
        dto.setTonTruoc(tk.getTonTruoc());
        dto.setTonSau(tk.getTonSau());
        dto.setMaChungTu(tk.getMaChungTu());
        dto.setNguoiThucHien(tk.getNguoiThucHien());
        dto.setHanSuDung(tk.getHanSuDung());
        dto.setGhiChu(tk.getGhiChu());

        if (tk.getIdSanPham() != null) {
            sanPhamRepository.findById(tk.getIdSanPham())
                    .ifPresent(sp -> {
                        dto.setTenSanPham(sp.getTenSanPham());
                        dto.setMaVach(sp.getMaVach());
                    });
        }

        if (tk.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(tk.getIdChiNhanh())
                    .ifPresent(cn ->
                            dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        return dto;
    }
}
