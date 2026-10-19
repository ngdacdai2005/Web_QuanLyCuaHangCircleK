package com.erp.cuahangtienloi.service.impl;

import com.erp.cuahangtienloi.dto.response.ThongBaoDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.entity.ThongBao;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import com.erp.cuahangtienloi.repository.ThongBaoRepository;
import com.erp.cuahangtienloi.service.ThongBaoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ThongBaoServiceImpl implements ThongBaoService {

    private final ThongBaoRepository thongBaoRepository;
    private final TaiKhoanRepository taiKhoanRepository;
    private final NhanVienRepository nhanVienRepository;

    private static class UserContextInfo {
        boolean isAdmin;
        boolean isSystemWide; // ADMIN, KE_TOAN, THU_KHO xem toàn hệ thống
        Set<String> allowedTypes;
        UUID nhanVienId;
        UUID chiNhanhId;
    }

    private UserContextInfo resolveCurrentUserContext() {
        UserContextInfo ctx = new UserContextInfo();
        ctx.allowedTypes = new HashSet<>();
        ctx.isAdmin = false;
        ctx.isSystemWide = false;
        ctx.nhanVienId = null;
        ctx.chiNhanhId = null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            ctx.allowedTypes.add("HE_THONG");
            ctx.isSystemWide = true;
            return ctx;
        }

        Set<String> authorities = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        // Kiểm tra quyền ADMIN
        if (authorities.contains("ROLE_ADMIN")) {
            ctx.isAdmin = true;
            ctx.isSystemWide = true;
            return ctx;
        }

        // Lấy thông tin nhân viên và chi nhánh
        try {
            UUID taiKhoanId = UUID.fromString(auth.getName());
            Optional<TaiKhoan> tkOpt = taiKhoanRepository.findById(taiKhoanId);
            if (tkOpt.isPresent() && tkOpt.get().getIdNhanVien() != null) {
                ctx.nhanVienId = tkOpt.get().getIdNhanVien();
                Optional<NhanVien> nvOpt = nhanVienRepository.findById(ctx.nhanVienId);
                if (nvOpt.isPresent()) {
                    ctx.chiNhanhId = nvOpt.get().getIdChiNhanh();
                }
            }
        } catch (Exception ignored) {
        }

        // Xác định phạm vi xem theo chi nhánh:
        // - Trụ sở / Kho tổng (ADMIN, KE_TOAN, THU_KHO): xem được toàn bộ thông báo của các chi nhánh
        // - Cửa hàng bán lẻ (QUAN_LY, THU_NGAN): chỉ xem thông báo của chi nhánh mình hoặc thông báo chung
        if (authorities.contains("ROLE_KE_TOAN") || authorities.contains("ROLE_THU_KHO")) {
            ctx.isSystemWide = true;
        } else {
            ctx.isSystemWide = false;
        }

        // Phân quyền theo Permissions động & Fallback Vai trò mặc định:
        // 1. Kho hàng
        if (authorities.contains("notification:read_inventory")
                || authorities.contains("ROLE_QUAN_LY")
                || authorities.contains("ROLE_THU_KHO")
                || authorities.contains("ROLE_KE_TOAN")) {
            ctx.allowedTypes.add("KHO_HANG");
        }

        // 2. Kiểm kê
        if (authorities.contains("notification:read_stocktake")
                || authorities.contains("ROLE_QUAN_LY")
                || authorities.contains("ROLE_THU_KHO")) {
            ctx.allowedTypes.add("KIEM_KE");
        }

        // 3. Lịch làm việc / Phân ca
        if (authorities.contains("notification:read_shift")
                || authorities.contains("ROLE_QUAN_LY")
                || authorities.contains("ROLE_THU_NGAN")) {
            ctx.allowedTypes.add("LICH_LAM");
        }

        // 4. Hóa đơn / Bán hàng POS
        if (authorities.contains("notification:read_order")
                || authorities.contains("ROLE_QUAN_LY")
                || authorities.contains("ROLE_KE_TOAN")
                || authorities.contains("ROLE_THU_NGAN")) {
            ctx.allowedTypes.add("HOA_DON");
        }

        // 5. Hợp đồng NCC
        if (authorities.contains("notification:read_contract")
                || authorities.contains("ROLE_QUAN_LY")
                || authorities.contains("ROLE_KE_TOAN")) {
            ctx.allowedTypes.add("HOP_DONG");
        }

        // 6. Hệ thống chung: luôn cho phép tất cả các tài khoản hợp lệ
        ctx.allowedTypes.add("HE_THONG");

        return ctx;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ThongBaoDTO> getNotifications(Boolean unreadOnly, String loai) {
        UserContextInfo ctx = resolveCurrentUserContext();
        boolean isUnread = Boolean.TRUE.equals(unreadOnly);
        String filterLoai = (loai != null && !loai.isBlank() && !"ALL".equalsIgnoreCase(loai))
                ? loai.trim().toUpperCase()
                : null;

        // Nếu người dùng filter theo 1 loại cụ thể, nhưng họ không có quyền xem loại đó (và không phải admin)
        if (!ctx.isAdmin && filterLoai != null && !ctx.allowedTypes.contains(filterLoai)) {
            return Collections.emptyList();
        }

        Collection<String> types = ctx.allowedTypes.isEmpty() ? List.of("__NONE__") : ctx.allowedTypes;
        List<ThongBao> list = thongBaoRepository.findFiltered(
                ctx.isAdmin,
                ctx.isSystemWide,
                types,
                ctx.chiNhanhId,
                ctx.nhanVienId,
                isUnread,
                filterLoai
        );

        return list.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnread() {
        UserContextInfo ctx = resolveCurrentUserContext();
        Collection<String> types = ctx.allowedTypes.isEmpty() ? List.of("__NONE__") : ctx.allowedTypes;
        return thongBaoRepository.countUnreadFiltered(
                ctx.isAdmin,
                ctx.isSystemWide,
                types,
                ctx.chiNhanhId,
                ctx.nhanVienId
        );
    }

    @Override
    @Transactional
    public ThongBaoDTO markAsRead(Long id) {
        ThongBao tb = thongBaoRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy thông báo id: " + id));

        if (!Boolean.TRUE.equals(tb.getDaDoc())) {
            tb.setDaDoc(true);
            tb.setNgayDoc(LocalDateTime.now());
            tb = thongBaoRepository.save(tb);
        }

        return mapToDTO(tb);
    }

    @Override
    @Transactional
    public void markAllAsRead() {
        UserContextInfo ctx = resolveCurrentUserContext();
        Collection<String> types = ctx.allowedTypes.isEmpty() ? List.of("__NONE__") : ctx.allowedTypes;
        thongBaoRepository.markAllAsReadFiltered(
                ctx.isAdmin,
                ctx.isSystemWide,
                types,
                ctx.chiNhanhId,
                ctx.nhanVienId
        );
    }

    @Override
    @Transactional
    public ThongBaoDTO createNotification(ThongBao thongBao) {
        if (thongBao.getNgayTao() == null) {
            thongBao.setNgayTao(LocalDateTime.now());
        }
        if (thongBao.getDaDoc() == null) {
            thongBao.setDaDoc(false);
        }
        if (thongBao.getMucDo() == null) {
            thongBao.setMucDo("INFO");
        }

        // Tự động gán chi nhánh người tạo nếu chưa có
        if (thongBao.getIdChiNhanh() == null) {
            UserContextInfo ctx = resolveCurrentUserContext();
            if (ctx.chiNhanhId != null) {
                thongBao.setIdChiNhanh(ctx.chiNhanhId);
            }
        }

        ThongBao saved = thongBaoRepository.save(thongBao);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public void deleteNotification(Long id) {
        if (!thongBaoRepository.existsById(id)) {
            throw new NoSuchElementException("Không tìm thấy thông báo id: " + id);
        }
        thongBaoRepository.deleteById(id);
    }

    private ThongBaoDTO mapToDTO(ThongBao tb) {
        return ThongBaoDTO.builder()
                .id(tb.getId())
                .tieuDe(tb.getTieuDe())
                .noiDung(tb.getNoiDung())
                .loaiThongBao(tb.getLoaiThongBao())
                .actionUrl(tb.getActionUrl())
                .mucDo(tb.getMucDo())
                .nguoiGuiTen(tb.getNguoiGuiTen())
                .idNhanVienNhan(tb.getIdNhanVienNhan())
                .idChiNhanh(tb.getIdChiNhanh())
                .daDoc(tb.getDaDoc())
                .ngayTao(tb.getNgayTao())
                .ngayDoc(tb.getNgayDoc())
                .build();
    }
}
