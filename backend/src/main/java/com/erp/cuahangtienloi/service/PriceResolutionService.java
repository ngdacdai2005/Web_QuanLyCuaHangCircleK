package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.PriceResolutionDTO;
import com.erp.cuahangtienloi.entity.HopDong;
import com.erp.cuahangtienloi.entity.HopDongChiTiet;
import com.erp.cuahangtienloi.entity.GiaNhapNcc;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.SanPhamNhaCungCap;
import com.erp.cuahangtienloi.repository.HopDongChiTietRepository;
import com.erp.cuahangtienloi.repository.HopDongRepository;
import com.erp.cuahangtienloi.repository.GiaNhapNccRepository;
import com.erp.cuahangtienloi.repository.SanPhamNhaCungCapRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PriceResolutionService {

    private final HopDongRepository hopDongRepository;
    private final HopDongChiTietRepository hopDongChiTietRepository;
    private final GiaNhapNccRepository giaNhapNccRepository;
    private final SanPhamNhaCungCapRepository sanPhamNhaCungCapRepository;
    private final SanPhamRepository sanPhamRepository;

    @Transactional(readOnly = true)
    public PriceResolutionDTO resolvePurchasePrice(UUID idNcc, UUID idSanPham, UUID idHopDong) {
        LocalDate today = LocalDate.now();

        // 1. Kiểm tra giá theo Hợp đồng mua bán cụ thể
        if (idHopDong != null) {
            Optional<HopDong> hdOpt = hopDongRepository.findById(idHopDong);
            if (hdOpt.isPresent()) {
                HopDong hd = hdOpt.get();
                boolean isActive = "ACTIVE".equalsIgnoreCase(hd.getTrangThai());
                boolean inRange = (hd.getNgayHieuLuc() == null || !today.isBefore(hd.getNgayHieuLuc()))
                        && (hd.getNgayHetHan() == null || !today.isAfter(hd.getNgayHetHan()));

                if (isActive && inRange) {
                    Optional<HopDongChiTiet> ctOpt = hopDongChiTietRepository.findByIdHopDongAndIdSanPham(idHopDong, idSanPham);
                    if (ctOpt.isPresent()) {
                        HopDongChiTiet ct = ctOpt.get();
                        return PriceResolutionDTO.builder()
                                .idSanPham(idSanPham)
                                .idNcc(idNcc)
                                .idHopDong(idHopDong)
                                .donGiaDeXuat(ct.getDonGiaCamKet())
                                .vatPhantram(ct.getVatPhantram() != null ? ct.getVatPhantram() : 8)
                                .nguonGia("HOP_DONG")
                                .maHopDong(hd.getMaHopDong())
                                .tenHopDong(hd.getTenHopDong())
                                .ghiChu("Giá cam kết theo hợp đồng " + hd.getMaHopDong())
                                .build();
                    }
                }
            }
        }

        // 2. Kiểm tra Bảng giá NCC có hiệu lực (gia_nhap_ncc)
        Optional<GiaNhapNcc> giaNccOpt = giaNhapNccRepository.findLatestEffectivePrice(idSanPham, idNcc, today);
        if (giaNccOpt.isPresent()) {
            GiaNhapNcc g = giaNccOpt.get();
            return PriceResolutionDTO.builder()
                    .idSanPham(idSanPham)
                    .idNcc(idNcc)
                    .idHopDong(null)
                    .donGiaDeXuat(g.getGiaNhap())
                    .vatPhantram(8)
                    .nguonGia("BANG_GIA_NCC")
                    .ghiChu("Giá niêm yết có hiệu lực của nhà cung cấp")
                    .build();
        }

        // 3. Fallback về quan hệ san_pham_nha_cung_cap hiện hành
        Optional<SanPhamNhaCungCap> spNccOpt = sanPhamNhaCungCapRepository.findByIdSanPhamAndIdNhaCungCap(idSanPham, idNcc);
        if (spNccOpt.isPresent() && spNccOpt.get().getGiaNhap() != null && spNccOpt.get().getGiaNhap().signum() > 0) {
            return PriceResolutionDTO.builder()
                    .idSanPham(idSanPham)
                    .idNcc(idNcc)
                    .idHopDong(null)
                    .donGiaDeXuat(spNccOpt.get().getGiaNhap())
                    .vatPhantram(8)
                    .nguonGia("SAN_PHAM_NCC")
                    .ghiChu("Giá mặc định theo danh mục cung ứng của nhà cung cấp")
                    .build();
        }

        // 4. Fallback về giá vốn hệ thống
        Optional<SanPham> spOpt = sanPhamRepository.findById(idSanPham);
        if (spOpt.isPresent()) {
            SanPham sp = spOpt.get();
            BigDecimal giaVon = sp.getGiaVon() != null ? sp.getGiaVon() : BigDecimal.ZERO;
            return PriceResolutionDTO.builder()
                    .idSanPham(idSanPham)
                    .idNcc(idNcc)
                    .idHopDong(null)
                    .donGiaDeXuat(giaVon)
                    .vatPhantram(sp.getVatPhantram() != null ? sp.getVatPhantram() : 8)
                    .nguonGia("GIA_VON_HE_THONG")
                    .ghiChu("Chưa có bảng giá NCC riêng, lấy theo giá vốn tham chiếu")
                    .build();
        }

        return PriceResolutionDTO.builder()
                .idSanPham(idSanPham)
                .idNcc(idNcc)
                .idHopDong(null)
                .donGiaDeXuat(BigDecimal.ZERO)
                .vatPhantram(8)
                .nguonGia("CHUA_CO_GIA")
                .ghiChu("Sản phẩm chưa có thông tin giá nhập")
                .build();
    }
}
