package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.TaiKhoanResponseDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TaiKhoanMapper {

    private final NhanVienRepository nhanVienRepository;

    /**
     * Mapping tài khoản và tự truy vấn thông tin nhân viên.
     * Dùng khi chỉ có đối tượng TaiKhoan.
     */
    public TaiKhoanResponseDTO toResponse(TaiKhoan tk) {
        TaiKhoanResponseDTO dto = new TaiKhoanResponseDTO();

        dto.setId(tk.getId());
        dto.setTenDangNhap(tk.getTenDangNhap());
        dto.setTrangThai(tk.getTrangThai());
        dto.setNgayTao(tk.getNgayTao());
        dto.setIdNhanVien(tk.getIdNhanVien());

        if (tk.getIdNhanVien() != null) {
            nhanVienRepository.findById(tk.getIdNhanVien())
                    .ifPresent(nv -> {
                        dto.setEmail(nv.getEmail());
                        dto.setSoDienThoai(nv.getSoDienThoai());
                        dto.setHoTen(nv.getHoTen());
                        dto.setVaiTro(nv.getVaiTro());
                        dto.setIdChiNhanh(nv.getIdChiNhanh());
                    });
        }

        return dto;
    }

    /**
     * Mapping tài khoản khi đã có thông tin nhân viên.
     * Không truy vấn database.
     */
    public TaiKhoanResponseDTO toResponse(TaiKhoan tk, NhanVien nv) {
        TaiKhoanResponseDTO dto = new TaiKhoanResponseDTO();

        dto.setId(tk.getId());
        dto.setTenDangNhap(tk.getTenDangNhap());
        dto.setTrangThai(tk.getTrangThai());
        dto.setNgayTao(tk.getNgayTao());
        dto.setIdNhanVien(tk.getIdNhanVien());

        if (nv != null) {
            dto.setEmail(nv.getEmail());
            dto.setSoDienThoai(nv.getSoDienThoai());
            dto.setHoTen(nv.getHoTen());
            dto.setVaiTro(nv.getVaiTro());
            dto.setIdChiNhanh(nv.getIdChiNhanh());
        }

        return dto;
    }
}
