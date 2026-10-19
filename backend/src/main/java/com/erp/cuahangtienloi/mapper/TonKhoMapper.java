package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.TonKhoResponseDTO;
import com.erp.cuahangtienloi.entity.TonKho;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TonKhoMapper {

    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;

    public TonKhoResponseDTO toResponse(TonKho tk) {
        TonKhoResponseDTO dto = new TonKhoResponseDTO();

        dto.setIdSanPham(tk.getIdSanPham());
        dto.setIdChiNhanh(tk.getIdChiNhanh());
        dto.setSoLuongTon(tk.getSoLuongTon());
        dto.setGiaVonTrungBinh(tk.getGiaVonTrungBinh());
        dto.setGiaTriTon(tk.getGiaTriTon());
        dto.setTonToiThieu(tk.getTonToiThieu());
        dto.setTonToiDa(tk.getTonToiDa());
        dto.setHanSuDungGanNhat(tk.getHanSuDungGanNhat());
        dto.setLanBienDongCuoi(tk.getLanBienDongCuoi());

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

    public TonKho toEntity(com.erp.cuahangtienloi.dto.request.TonKhoRequestDTO dto) {
        if (dto == null) return null;
        TonKho tk = new TonKho();
        tk.setIdSanPham(dto.getIdSanPham());
        tk.setIdChiNhanh(dto.getIdChiNhanh());
        tk.setTonToiThieu(dto.getTonToiThieu() != null ? dto.getTonToiThieu() : 0);
        tk.setTonToiDa(dto.getTonToiDa() != null ? dto.getTonToiDa() : 0);
        tk.setHanSuDungGanNhat(dto.getHanSuDungGanNhat());
        return tk;
    }
}
