package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.response.TheKhoResponseDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TheKho;
import com.erp.cuahangtienloi.mapper.TheKhoMapper;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.repository.TheKhoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TheKhoService {

    private final TheKhoRepository theKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final BranchAccessService branchAccessService;
    private final TheKhoMapper theKhoMapper;

    @Transactional(readOnly = true)
    public List<TheKhoResponseDTO> getAll(NhanVien employee) {
        List<TheKho> source = branchAccessService.isSystemWide(employee)
                ? theKhoRepository.findAll()
                : theKhoRepository.findByIdChiNhanhOrderByNgayPhatSinhDesc(
                        branchAccessService.requiredOwnBranch(employee));
        return source.stream().map(theKhoMapper::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<TheKhoResponseDTO> getById(UUID id, NhanVien employee) {
        return theKhoRepository.findById(id)
                .map(tk -> {
                    branchAccessService.requireReadableBranch(employee, tk.getIdChiNhanh());
                    return theKhoMapper.toResponse(tk);
                });
    }

    @Transactional(readOnly = true)
    public List<TheKhoResponseDTO> getByProductAndBranch(UUID idSanPham, UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return theKhoRepository.findByIdSanPhamAndIdChiNhanhOrderByNgayPhatSinhDesc(idSanPham, idChiNhanh).stream()
                .map(theKhoMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheKhoResponseDTO> getByBranch(UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return theKhoRepository.findByIdChiNhanhOrderByNgayPhatSinhDesc(idChiNhanh).stream()
                .map(theKhoMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheKhoResponseDTO> getByTypeAndBranch(String loaiGiaoDich, UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return theKhoRepository.findByLoaiGiaoDichAndIdChiNhanhOrderByNgayPhatSinhDesc(loaiGiaoDich, idChiNhanh).stream()
                .map(theKhoMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheKhoResponseDTO> getByBranchAndDateRange(UUID idChiNhanh, LocalDateTime from, LocalDateTime to, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return theKhoRepository.findByIdChiNhanhAndNgayPhatSinhBetweenOrderByNgayPhatSinhDesc(idChiNhanh, from, to).stream()
                .map(theKhoMapper::toResponse)
                .collect(Collectors.toList());
    }
    
}
