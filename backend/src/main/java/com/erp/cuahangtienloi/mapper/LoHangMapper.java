
package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.LoHangResponseDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.LoHang;
import com.erp.cuahangtienloi.entity.SanPham;
import org.springframework.stereotype.Component;

@Component
public class LoHangMapper {

    public LoHangResponseDTO toResponse(
            LoHang lo,
            SanPham sp,
            ChiNhanh cn) {

        LoHangResponseDTO dto = new LoHangResponseDTO();

        dto.setId(lo.getId());
        dto.setMaLo(lo.getMaLo());
        dto.setIdSanPham(lo.getIdSanPham());
        dto.setTenSanPham(sp != null ? sp.getTenSanPham() : "");
        dto.setSku(sp != null ? sp.getSku() : "");
        dto.setIdChiNhanh(lo.getIdChiNhanh());
        dto.setTenChiNhanh(cn != null ? cn.getTenChiNhanh() : "");
        dto.setSoLuongTon(lo.getSoLuongTon());
        dto.setHanSuDung(lo.getHanSuDung());
        dto.setNgaySanXuat(lo.getNgaySanXuat());
        dto.setGiaVon(lo.getGiaVon());
        dto.setTrangThai(lo.getTrangThai());
        dto.setNgayTao(lo.getNgayTao());
        dto.setNgayCapNhat(lo.getNgayCapNhat());

        return dto;
    }
}