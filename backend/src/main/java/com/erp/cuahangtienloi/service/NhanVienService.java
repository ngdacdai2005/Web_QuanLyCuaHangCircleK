package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.request.NhanVienRequestDTO;
import com.erp.cuahangtienloi.dto.response.NhanVienResponseDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.mapper.NhanVienMapper;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import com.erp.cuahangtienloi.repository.ChamCongRepository;
import com.erp.cuahangtienloi.entity.ChamCong;
import lombok.RequiredArgsConstructor;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@Service
public class NhanVienService {

    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final TaiKhoanRepository taiKhoanRepository;
    private final BranchAccessService branchAccessService;
    private final NhanVienMapper nhanVienMapper;
    private final PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private ChamCongRepository chamCongRepository;

    @Autowired
    public NhanVienService(
            NhanVienRepository nhanVienRepository,
            ChiNhanhRepository chiNhanhRepository,
            TaiKhoanRepository taiKhoanRepository,
            BranchAccessService branchAccessService,
            NhanVienMapper nhanVienMapper,
            PasswordEncoder passwordEncoder
    ) {
        this.nhanVienRepository = nhanVienRepository;
        this.chiNhanhRepository = chiNhanhRepository;
        this.taiKhoanRepository = taiKhoanRepository;
        this.branchAccessService = branchAccessService;
        this.nhanVienMapper = nhanVienMapper;
        this.passwordEncoder = passwordEncoder;
    }

    // Constructor for tests
    public NhanVienService(
            NhanVienRepository nhanVienRepository,
            ChiNhanhRepository chiNhanhRepository,
            TaiKhoanRepository taiKhoanRepository,
            BranchAccessService branchAccessService,
            NhanVienMapper nhanVienMapper
    ) {
        this(nhanVienRepository, chiNhanhRepository, taiKhoanRepository, branchAccessService, nhanVienMapper,
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder());
    }

    public List<NhanVienResponseDTO> getAll(NhanVien actor) {
        List<TaiKhoan> allAccounts = taiKhoanRepository.findAll();
        Map<UUID, TaiKhoan> accountByNvId = allAccounts.stream()
                .filter(tk -> tk.getIdNhanVien() != null)
                .collect(Collectors.toMap(
                        TaiKhoan::getIdNhanVien,
                        tk -> tk,
                        (existing, replacing) -> existing
                ));

        return nhanVienRepository.findAll().stream()
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv))
                .map(nv -> {
                    NhanVienResponseDTO dto = nhanVienMapper.toResponse(nv);
                    TaiKhoan tk = accountByNvId.get(nv.getId());
                    if (tk != null) {
                        dto.setHasTaiKhoan(true);
                        dto.setTenDangNhap(tk.getTenDangNhap());
                        dto.setTaiKhoanTrangThai(tk.getTrangThai());
                    } else {
                        dto.setHasTaiKhoan(false);
                        dto.setTaiKhoanTrangThai("CHUA_TAO");
                    }
                    return dto;
                })
                .toList();
    }

    public Optional<NhanVienResponseDTO> getById(UUID id, NhanVien actor) {
        return nhanVienRepository.findById(id)
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv))
                .map(nv -> {
                    NhanVienResponseDTO dto = nhanVienMapper.toResponse(nv);
                    taiKhoanRepository.findByIdNhanVien(nv.getId()).ifPresent(tk -> {
                        dto.setHasTaiKhoan(true);
                        dto.setTenDangNhap(tk.getTenDangNhap());
                        dto.setTaiKhoanTrangThai(tk.getTrangThai());
                    });
                    return dto;
                });
    }

    public List<NhanVienResponseDTO> getByChiNhanh(UUID idChiNhanh, NhanVien actor) {
        branchAccessService.requireReadableBranch(actor, idChiNhanh);
        return nhanVienRepository.findAll().stream()
                .filter(nv -> idChiNhanh.equals(nv.getIdChiNhanh()))
                .map(nhanVienMapper::toResponse)
                .toList();
    }

    public List<NhanVienResponseDTO> getActive(NhanVien actor) {
        return nhanVienRepository.findAll().stream()
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv))
                .filter(nv -> nv.getTrangThai() != null && !"INACTIVE".equals(nv.getTrangThai()))
                .map(nhanVienMapper::toResponse)
                .toList();
    }

    @Transactional
    public NhanVienResponseDTO create(NhanVienRequestDTO request, NhanVien actor) {
        request.setHoTen(requireText(request.getHoTen(), "Họ tên", 1, 255));
        optionalEmail(request.getEmail());
        optionalPhone(request.getSoDienThoai(), "Số điện thoại");
        oneOf(request.getVaiTro(), "Vai trò", Set.of("ADMIN", "KE_TOAN", "THU_KHO", "QUAN_LY", "THU_NGAN"));
        nonNegative(request.getLuongCung(), "Lương cứng");
        nonNegative(request.getLuongTheoGio(), "Lương theo giờ");
        if (request.getTrangThai() != null) {
            oneOf(request.getTrangThai(), "Trạng thái", Set.of("ACTIVE", "INACTIVE"));
        }
        if (request.getEmail() != null && nhanVienRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã tồn tại");
        }
        if (request.getMaNhanVien() == null || request.getMaNhanVien().trim().isEmpty()) {
            request.setMaNhanVien(generateNextMaNhanVien());
        }
        if (nhanVienRepository.existsByMaNhanVien(request.getMaNhanVien())) {
            throw new IllegalArgumentException("Mã nhân viên đã tồn tại");
        }

        String scopeError = managerScopeError(
                actor,
                request.getVaiTro(),
                request.getIdChiNhanh()
        );

        if (scopeError != null) {
            throw new IllegalArgumentException(scopeError);
        }

        NhanVien nv = new NhanVien();
        nv.setId(UUID.randomUUID());
        nv.setMaNhanVien(request.getMaNhanVien());
        String username = request.getMaNhanVien() != null ? request.getMaNhanVien() : ("nv_" + UUID.randomUUID().toString().substring(0, 8));
        nv.setTenDangNhap(username);
        nv.setMatKhau("$2a$10$PLACEHOLDER_HASH_user_will_reset");
        nv.setHoTen(request.getHoTen());
        nv.setEmail(request.getEmail());
        nv.setSoDienThoai(request.getSoDienThoai());
        nv.setVaiTro(request.getVaiTro());
        nv.setViTri(request.getViTri());
        nv.setLoaiHopDong(request.getLoaiHopDong() != null ? request.getLoaiHopDong() : "FULL_TIME");
        nv.setCaMacDinh(request.getCaMacDinh() != null ? request.getCaMacDinh() : "MORNING");
        nv.setLuongTheoGio(request.getLuongTheoGio());
        nv.setLuongCung(request.getLuongCung());
        String vaiTro = request.getVaiTro();
        String branchError = branchAssignmentError(vaiTro, request.getIdChiNhanh());
        if (branchError != null) {
            throw new IllegalArgumentException(branchError);
        }
        nv.setIdChiNhanh("ADMIN".equals(vaiTro) || "KE_TOAN".equals(vaiTro)
                ? null : request.getIdChiNhanh());
        nv.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "ACTIVE");
        nv.setSoTaiKhoan(request.getSoTaiKhoan());
        nv.setTenNganHang(request.getTenNganHang());
        nv.setNgayVaoLam(request.getNgayVaoLam());
        nv.setNguoiTao(request.getNguoiTao());
        nv.setNgayTao(LocalDateTime.now());
        nv.setNgayCapNhat(LocalDateTime.now());
        if (nv.getNgayVaoLam() == null) {
            nv.setNgayVaoLam(java.time.LocalDate.now());
        }

        // Thông tin mở rộng
        nv.setAnhDaiDien(request.getAnhDaiDien());
        nv.setGioiTinh(request.getGioiTinh());
        nv.setNgaySinh(request.getNgaySinh());
        nv.setSoCccd(request.getSoCccd());
        nv.setNgayCapCccd(request.getNgayCapCccd());
        nv.setNoiCapCccd(request.getNoiCapCccd());
        nv.setDiaChiThuongTru(request.getDiaChiThuongTru());
        nv.setDiaChiHienTai(request.getDiaChiHienTai());
        nv.setGhiChu(request.getGhiChu());

        NhanVien saved = nhanVienRepository.save(nv);

        // Tạo tài khoản đồng thời nếu được yêu cầu
        boolean shouldCreateAccount = Boolean.TRUE.equals(request.getTaoTaiKhoan())
                || (request.getTenDangNhap() != null && !request.getTenDangNhap().isBlank());

        if (shouldCreateAccount) {
            String accUsername = request.getTenDangNhap();
            if (accUsername == null || accUsername.isBlank()) {
                if (request.getEmail() != null && !request.getEmail().isBlank()) {
                    accUsername = request.getEmail().split("@")[0];
                } else {
                    accUsername = saved.getMaNhanVien().toLowerCase();
                }
            }
            accUsername = accUsername.trim().toLowerCase();

            if (taiKhoanRepository.findByTenDangNhap(accUsername).isPresent()) {
                accUsername = accUsername + "_" + (int) (Math.random() * 900 + 100);
            }

            String rawPassword = request.getMatKhau();
            if (rawPassword == null || rawPassword.trim().isEmpty()) {
                rawPassword = "ChangeMe@123";
            }

            TaiKhoan tk = new TaiKhoan();
            tk.setId(UUID.randomUUID());
            tk.setIdNhanVien(saved.getId());
            tk.setTenDangNhap(accUsername);
            tk.setMatKhauHash(passwordEncoder.encode(rawPassword));
            tk.setTrangThai("ACTIVE");
            tk.setNgayTao(LocalDateTime.now());
            taiKhoanRepository.save(tk);

            saved.setTenDangNhap(accUsername);
            saved.setMatKhau(tk.getMatKhauHash());
            saved = nhanVienRepository.save(saved);
        }

        NhanVienResponseDTO response = nhanVienMapper.toResponse(saved);
        response.setHasTaiKhoan(shouldCreateAccount);
        response.setTaiKhoanTrangThai(shouldCreateAccount ? "ACTIVE" : "CHUA_TAO");
        return response;
    }

    @Transactional
    public Optional<NhanVienResponseDTO> update(UUID id, NhanVienRequestDTO request, NhanVien actor) {
        return nhanVienRepository.findById(id).map(nv -> {
            if (actor != null && "QUAN_LY".equals(actor.getVaiTro())) {
                UUID ownBranch = branchAccessService.requiredOwnBranch(actor);

                String scopeError = managerScopeError(
                        actor,
                        nv.getVaiTro(),
                        nv.getIdChiNhanh()
                );

                if (scopeError != null) {
                    throw new IllegalArgumentException(scopeError);
                }

                if (request.getVaiTro() != null && !"THU_NGAN".equals(request.getVaiTro())) {
                    throw new IllegalArgumentException("Quản lý không được đổi vai trò khác THU_NGAN");
                }

                if (request.getIdChiNhanh() != null && !ownBranch.equals(request.getIdChiNhanh())) {
                    throw new IllegalArgumentException("Quản lý không được điều chuyển thu ngân sang chi nhánh khác");
                }
            }

            if (request.getHoTen() != null) {
                request.setHoTen(requireText(request.getHoTen(), "Họ tên", 1, 255));
            }
            optionalEmail(request.getEmail());
            optionalPhone(request.getSoDienThoai(), "Số điện thoại");
            nonNegative(request.getLuongCung(), "Lương cứng");
            nonNegative(request.getLuongTheoGio(), "Lương theo giờ");
            if (request.getEmail() != null) {
                NhanVien duplicate = nhanVienRepository.findByEmail(request.getEmail()).orElse(null);
                if (duplicate != null && !duplicate.getId().equals(id)) {
                    throw new IllegalArgumentException("Email đã tồn tại");
                }
            }
            if (request.getVaiTro() != null) {
                oneOf(request.getVaiTro(), "Vai trò", Set.of("ADMIN", "KE_TOAN", "THU_KHO", "QUAN_LY", "THU_NGAN"));
            }
            if (request.getTrangThai() != null) {
                oneOf(request.getTrangThai(), "Trạng thái", Set.of("ACTIVE", "INACTIVE"));
            }
            if (request.getHoTen() != null) nv.setHoTen(request.getHoTen());
            if (request.getEmail() != null) nv.setEmail(request.getEmail());
            if (request.getSoDienThoai() != null) nv.setSoDienThoai(request.getSoDienThoai());
            if (request.getVaiTro() != null) nv.setVaiTro(request.getVaiTro());
            if (request.getViTri() != null) nv.setViTri(request.getViTri());
            if (request.getLoaiHopDong() != null) nv.setLoaiHopDong(request.getLoaiHopDong());
            if (request.getCaMacDinh() != null && !request.getCaMacDinh().isBlank()) {
                String oldCa = nv.getCaMacDinh();
                String newCa = request.getCaMacDinh().trim();
                nv.setCaMacDinh(newCa);
                if (oldCa != null && !newCa.equalsIgnoreCase(oldCa.trim())) {
                    syncFutureScheduledShifts(nv.getId(), newCa);
                }
            }
            if (request.getLuongTheoGio() != null) nv.setLuongTheoGio(request.getLuongTheoGio());
            if (request.getLuongCung() != null) nv.setLuongCung(request.getLuongCung());
            String effectiveRole = request.getVaiTro() != null ? request.getVaiTro() : nv.getVaiTro();
            UUID effectiveBranchId = ("ADMIN".equals(effectiveRole) || "KE_TOAN".equals(effectiveRole))
                    ? null
                    : (request.getIdChiNhanh() != null ? request.getIdChiNhanh() : nv.getIdChiNhanh());
            if (request.getVaiTro() != null || request.getIdChiNhanh() != null) {
                String branchError = branchAssignmentError(effectiveRole, effectiveBranchId);
                if (branchError != null) {
                    throw new IllegalArgumentException(branchError);
                }
            }
            ChiNhanh primaryBranch = chiNhanhRepository.findByIdQuanLy(nv.getId()).orElse(null);
            if (primaryBranch != null) {
                String responsibilityError = responsibilityEligibilityError(
                        primaryBranch, effectiveRole, effectiveBranchId,
                        request.getTrangThai() != null ? request.getTrangThai() : nv.getTrangThai());
                if (responsibilityError != null) {
                    throw new IllegalArgumentException("Không thể sửa nhân viên đang là người phụ trách: " + responsibilityError);
                }
            }
            nv.setIdChiNhanh(effectiveBranchId);
            if (request.getTrangThai() != null) nv.setTrangThai(request.getTrangThai());
            if (request.getMaNhanVien() != null && !request.getMaNhanVien().isBlank()) {
                String newCode = request.getMaNhanVien().trim();
                if (!newCode.equalsIgnoreCase(nv.getMaNhanVien())) {
                    NhanVien dupCode = nhanVienRepository.findByMaNhanVien(newCode).orElse(null);
                    if (dupCode != null && !dupCode.getId().equals(id)) {
                        throw new IllegalArgumentException("Mã nhân viên đã tồn tại");
                    }
                    nv.setMaNhanVien(newCode);
                }
            }

            if (request.getAnhDaiDien() != null) nv.setAnhDaiDien(request.getAnhDaiDien());
            if (request.getGioiTinh() != null) nv.setGioiTinh(request.getGioiTinh());
            if (request.getNgaySinh() != null) nv.setNgaySinh(request.getNgaySinh());
            if (request.getSoCccd() != null) nv.setSoCccd(request.getSoCccd());
            if (request.getNgayCapCccd() != null) nv.setNgayCapCccd(request.getNgayCapCccd());
            if (request.getNoiCapCccd() != null) nv.setNoiCapCccd(request.getNoiCapCccd());
            if (request.getDiaChiThuongTru() != null) nv.setDiaChiThuongTru(request.getDiaChiThuongTru());
            if (request.getDiaChiHienTai() != null) nv.setDiaChiHienTai(request.getDiaChiHienTai());
            if (request.getGhiChu() != null) nv.setGhiChu(request.getGhiChu());
            if (request.getSoTaiKhoan() != null) nv.setSoTaiKhoan(request.getSoTaiKhoan());
            if (request.getTenNganHang() != null) nv.setTenNganHang(request.getTenNganHang());
            if (request.getNgayVaoLam() != null) nv.setNgayVaoLam(request.getNgayVaoLam());

            // Đồng bộ hoặc cấp tài khoản đăng nhập
            String newUsername = request.getTenDangNhap();
            if (newUsername != null) {
                newUsername = newUsername.trim().toLowerCase();
            }

            Optional<TaiKhoan> existingTkOpt = taiKhoanRepository.findByIdNhanVien(nv.getId());
            if (existingTkOpt.isPresent()) {
                TaiKhoan tk = existingTkOpt.get();
                if (newUsername != null && !newUsername.isBlank() && !newUsername.equals(tk.getTenDangNhap())) {
                    Optional<TaiKhoan> dup = taiKhoanRepository.findByTenDangNhap(newUsername);
                    if (dup.isPresent() && !dup.get().getId().equals(tk.getId())) {
                        throw new IllegalArgumentException("Tên đăng nhập đã tồn tại trong hệ thống");
                    }
                    tk.setTenDangNhap(newUsername);
                    nv.setTenDangNhap(newUsername);
                }
                if (request.getMatKhau() != null && !request.getMatKhau().trim().isEmpty()) {
                    String rawPassword = request.getMatKhau().trim();
                    if (rawPassword.length() < 6) {
                        throw new IllegalArgumentException("Mật khẩu phải từ 6 ký tự trở lên");
                    }
                    String hash = passwordEncoder.encode(rawPassword);
                    tk.setMatKhauHash(hash);
                    nv.setMatKhau(hash);
                }
                if (request.getTrangThai() != null) {
                    tk.setTrangThai(request.getTrangThai());
                }
                taiKhoanRepository.save(tk);
            } else if (Boolean.TRUE.equals(request.getTaoTaiKhoan()) || (newUsername != null && !newUsername.isBlank())) {
                String accUsername = newUsername;
                if (accUsername == null || accUsername.isBlank()) {
                    if (request.getEmail() != null && !request.getEmail().isBlank()) {
                        accUsername = request.getEmail().split("@")[0];
                    } else {
                        accUsername = nv.getMaNhanVien().toLowerCase();
                    }
                }
                accUsername = accUsername.trim().toLowerCase();
                if (taiKhoanRepository.findByTenDangNhap(accUsername).isPresent()) {
                    throw new IllegalArgumentException("Tên đăng nhập đã tồn tại trong hệ thống");
                }

                String rawPassword = request.getMatKhau();
                if (rawPassword == null || rawPassword.trim().isEmpty()) {
                    rawPassword = "ChangeMe@123";
                }

                TaiKhoan tk = new TaiKhoan();
                tk.setId(UUID.randomUUID());
                tk.setIdNhanVien(nv.getId());
                tk.setTenDangNhap(accUsername);
                tk.setMatKhauHash(passwordEncoder.encode(rawPassword.trim()));
                tk.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "ACTIVE");
                tk.setNgayTao(LocalDateTime.now());
                taiKhoanRepository.save(tk);

                nv.setTenDangNhap(accUsername);
                nv.setMatKhau(tk.getMatKhauHash());
            }

            nv.setNgayCapNhat(LocalDateTime.now());
            NhanVien savedNv = nhanVienRepository.save(nv);

            NhanVienResponseDTO resp = nhanVienMapper.toResponse(savedNv);
            taiKhoanRepository.findByIdNhanVien(savedNv.getId()).ifPresent(tk -> {
                resp.setHasTaiKhoan(true);
                resp.setTenDangNhap(tk.getTenDangNhap());
                resp.setTaiKhoanTrangThai(tk.getTrangThai());
            });
            return resp;
        });
    }

    @Transactional
    public Optional<NhanVienResponseDTO> update(UUID id, NhanVienRequestDTO request) {
        return update(id, request, null);
    }

    @Transactional
    public void delete(UUID id, NhanVien actor) {
        NhanVien target = nhanVienRepository.findById(id).orElse(null);
        if (target == null) {
            throw new IllegalArgumentException("Nhân viên không tồn tại");
        }

        if (actor != null) {
            String scopeError = managerScopeError(
                    actor,
                    target.getVaiTro(),
                    target.getIdChiNhanh()
            );

            if (scopeError != null) {
                throw new IllegalArgumentException(scopeError);
            }
        }

        if (chiNhanhRepository.findByIdQuanLy(id).isPresent()) {
            throw new IllegalArgumentException("Không thể xóa người phụ trách chi nhánh; hãy thay thế hoặc bỏ phân công trước");
        }

        taiKhoanRepository.findByIdNhanVien(id).ifPresent(taiKhoanRepository::delete);

        nhanVienRepository.deleteById(id);
    }

    public String branchAssignmentError(String role, UUID branchId) {
        if ("ADMIN".equals(role) || "KE_TOAN".equals(role)) return null;
        if (branchId == null) return "Vai trò " + role + " bắt buộc phải có chi nhánh";

        ChiNhanh branch = chiNhanhRepository.findById(branchId).orElse(null);
        if (branch == null) return "Chi nhánh không tồn tại";
        if (!Boolean.TRUE.equals(branch.getDangHoatDong())) {
            return "Không thể gán nhân viên vào chi nhánh ngừng hoạt động";
        }
        if ("THU_KHO".equals(role) && !"KHO_TONG".equals(branch.getLoai())) {
            return "THU_KHO chỉ được gán vào Kho tổng";
        }
        if (("QUAN_LY".equals(role) || "THU_NGAN".equals(role))
                && !"CUA_HANG_BAN_LE".equals(branch.getLoai())) {
            return role + " chỉ được gán vào Cửa hàng bán lẻ";
        }
        return null;
    }

    public String responsibilityEligibilityError(
            ChiNhanh branch, String role, UUID branchId, String status) {
        if ("INACTIVE".equals(status)) return "người phụ trách phải đang hoạt động";
        if (!branch.getId().equals(branchId)) return "người phụ trách phải làm việc tại chi nhánh này";
        String expectedRole = "KHO_TONG".equals(branch.getLoai()) ? "THU_KHO" : "QUAN_LY";
        if (!expectedRole.equals(role)) return "vai trò không còn phù hợp với loại điểm";
        return null;
    }

    public String managerScopeError(
            NhanVien actor,
            String targetRole,
            UUID targetBranchId
    ) {
        if (actor == null || !"QUAN_LY".equals(actor.getVaiTro())) {
            return null;
        }

        if (!"THU_NGAN".equals(targetRole)) {
            return "Quản lý chỉ được quản lý nhân viên thu ngân (THU_NGAN)";
        }

        UUID ownBranch = branchAccessService.requiredOwnBranch(actor);

        if (targetBranchId == null || !ownBranch.equals(targetBranchId)) {
            return "Quản lý chỉ được quản lý nhân viên tại chi nhánh của mình";
        }

        return null;
    }

    public String generateNextMaNhanVien() {
        List<NhanVien> all = nhanVienRepository.findAll();
        int max = 0;
        for (NhanVien nv : all) {
            String code = nv.getMaNhanVien();
            if (code != null) {
                String trimmed = code.trim().toUpperCase();
                if (trimmed.startsWith("NV-")) {
                    String sub = trimmed.substring(3);
                    try {
                        int val = Integer.parseInt(sub);
                        if (val > max) max = val;
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        int nextVal = max + 1;
        String nextCode = String.format("NV-%04d", nextVal);
        while (nhanVienRepository.existsByMaNhanVien(nextCode)) {
            nextVal++;
            nextCode = String.format("NV-%04d", nextVal);
        }
        return nextCode;
    }

    @Transactional
    public void resetAccountPassword(UUID idNhanVien, String newPassword) {
        TaiKhoan tk = taiKhoanRepository.findByIdNhanVien(idNhanVien)
                .orElseThrow(() -> new IllegalArgumentException("Nhân viên này chưa có tài khoản"));
        String pass = (newPassword == null || newPassword.isBlank()) ? "ChangeMe@123" : newPassword;
        tk.setMatKhauHash(passwordEncoder.encode(pass));
        taiKhoanRepository.save(tk);
    }

    @Transactional
    public String toggleAccountStatus(UUID idNhanVien) {
        TaiKhoan tk = taiKhoanRepository.findByIdNhanVien(idNhanVien)
                .orElseThrow(() -> new IllegalArgumentException("Nhân viên này chưa có tài khoản"));
        String newStatus = "ACTIVE".equalsIgnoreCase(tk.getTrangThai()) ? "INACTIVE" : "ACTIVE";
        tk.setTrangThai(newStatus);
        taiKhoanRepository.save(tk);
        return newStatus;
    }

    @Transactional
    public TaiKhoan createAccountForEmployee(UUID idNhanVien, String username, String password) {
        NhanVien nv = nhanVienRepository.findById(idNhanVien)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên"));

        if (taiKhoanRepository.findByIdNhanVien(idNhanVien).isPresent()) {
            throw new IllegalArgumentException("Nhân viên này đã có tài khoản");
        }

        String finalUsername = (username != null && !username.isBlank())
                ? username.trim().toLowerCase()
                : (nv.getEmail() != null && !nv.getEmail().isBlank() ? nv.getEmail().split("@")[0].toLowerCase() : nv.getMaNhanVien().toLowerCase());

        if (taiKhoanRepository.findByTenDangNhap(finalUsername).isPresent()) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại, vui lòng chọn tên khác");
        }

        String finalPass = (password != null && !password.isBlank()) ? password : "ChangeMe@123";

        TaiKhoan tk = new TaiKhoan();
        tk.setId(UUID.randomUUID());
        tk.setIdNhanVien(idNhanVien);
        tk.setTenDangNhap(finalUsername);
        tk.setMatKhauHash(passwordEncoder.encode(finalPass));
        tk.setTrangThai("ACTIVE");
        tk.setNgayTao(LocalDateTime.now());

        nv.setTenDangNhap(finalUsername);
        nv.setMatKhau(tk.getMatKhauHash());
        nhanVienRepository.save(nv);

        return taiKhoanRepository.save(tk);
    }

    private static final Map<String, int[]> SHIFT_HOURS_MAP = Map.of(
            "MORNING", new int[]{6, 14},
            "AFTERNOON", new int[]{14, 22},
            "NIGHT", new int[]{22, 30}
    );

    private LocalDateTime calculatePlannedCheckIn(LocalDate workDate, String caLamViec) {
        int[] h = SHIFT_HOURS_MAP.getOrDefault(caLamViec, new int[]{8, 17});
        return LocalDateTime.of(workDate, java.time.LocalTime.of(h[0] % 24, 0));
    }

    private LocalDateTime calculatePlannedCheckOut(LocalDate workDate, String caLamViec) {
        int[] h = SHIFT_HOURS_MAP.getOrDefault(caLamViec, new int[]{8, 17});
        int endHour = h[1];
        LocalDate endDate = endHour >= 24 ? workDate.plusDays(1) : workDate;
        return LocalDateTime.of(endDate, java.time.LocalTime.of(endHour % 24, 0));
    }

    private void syncFutureScheduledShifts(UUID idNhanVien, String newCa) {
        if (chamCongRepository == null || newCa == null || newCa.isBlank()) return;
        LocalDate today = LocalDate.now();
        List<ChamCong> futureShifts = chamCongRepository.findByIdNhanVienAndWorkDateGreaterThanEqual(idNhanVien, today);
        for (ChamCong cc : futureShifts) {
            if ("SCHEDULED".equals(cc.getTrangThai()) && cc.getClockInAt() == null) {
                if (newCa.equals(cc.getCaLamViec())) continue;
                Optional<ChamCong> dup = chamCongRepository.findByIdNhanVienAndWorkDateAndCaLamViec(idNhanVien, cc.getWorkDate(), newCa);
                if (dup.isPresent()) {
                    chamCongRepository.delete(cc);
                } else {
                    cc.setCaLamViec(newCa);
                    cc.setCheckInAt(calculatePlannedCheckIn(cc.getWorkDate(), newCa));
                    cc.setCheckOutAt(calculatePlannedCheckOut(cc.getWorkDate(), newCa));
                    cc.setNgayCapNhat(LocalDateTime.now());
                    chamCongRepository.save(cc);
                }
            }
        }
    }
}
