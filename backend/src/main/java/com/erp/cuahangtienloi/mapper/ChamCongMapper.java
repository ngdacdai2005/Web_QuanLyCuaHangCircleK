package com.erp.cuahangtienloi.mapper;

import com.erp.cuahangtienloi.dto.response.ChamCongResponseDTO;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChamCongMapper {

    private final NhanVienRepository nhanVienRepository;

    public ChamCongResponseDTO toResponse(ChamCong cc) {
        ChamCongResponseDTO dto = new ChamCongResponseDTO();

        dto.setId(cc.getId());
        dto.setIdNhanVien(cc.getIdNhanVien());
        dto.setWorkDate(cc.getWorkDate());
        dto.setCaLamViec(cc.getCaLamViec());
        dto.setCheckInAt(cc.getCheckInAt());
        dto.setCheckOutAt(cc.getCheckOutAt());
        dto.setClockInAt(cc.getClockInAt());
        dto.setClockOutAt(cc.getClockOutAt());
        dto.setDiTrePhut(cc.getDiTrePhut());
        dto.setOvertimeHours(cc.getOvertimeHours());
        dto.setBreakHours(cc.getBreakHours());
        dto.setTongGioLam(cc.getTongGioLam());
        dto.setTrangThai(cc.getTrangThai());
        dto.setDaThanhToan(cc.getDaThanhToan());
        dto.setGhiChu(cc.getGhiChu());

        if (cc.getIdNhanVien() != null) {
            nhanVienRepository.findById(cc.getIdNhanVien())
                    .ifPresent(nv -> {
                        dto.setTenNhanVien(nv.getHoTen());
                        dto.setMaNhanVien(nv.getMaNhanVien());
                        dto.setIdChiNhanh(nv.getIdChiNhanh());
                    });
        }

        return dto;
    }

    public ChamCong toEntity(com.erp.cuahangtienloi.dto.request.ChamCongRequestDTO dto) {
        if (dto == null) return null;
        ChamCong cc = new ChamCong();
        cc.setIdNhanVien(dto.getIdNhanVien());
        cc.setWorkDate(dto.getWorkDate());
        cc.setCaLamViec(dto.getCaLamViec());
        cc.setCheckInAt(dto.getCheckInAt());
        cc.setCheckOutAt(dto.getCheckOutAt());
        cc.setClockInAt(dto.getClockInAt());
        cc.setClockOutAt(dto.getClockOutAt());
        cc.setDiTrePhut(dto.getDiTrePhut());
        cc.setOvertimeHours(dto.getOvertimeHours());
        cc.setBreakHours(dto.getBreakHours());
        cc.setTongGioLam(dto.getTongGioLam());
        cc.setTrangThai(dto.getTrangThai());
        cc.setDaThanhToan(dto.getDaThanhToan());
        cc.setGhiChu(dto.getGhiChu());
        return cc;
    }
}
