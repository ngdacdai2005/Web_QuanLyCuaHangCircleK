package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.config.JwtService;
import com.erp.cuahangtienloi.dto.request.LoginRequestDTO;
import com.erp.cuahangtienloi.dto.response.LoginResponseDTO;
import com.erp.cuahangtienloi.dto.response.TaiKhoanResponseDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.mapper.TaiKhoanMapper;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TaiKhoanRepository taiKhoanRepository;
    private final NhanVienRepository nhanVienRepository;
    private final TaiKhoanMapper taiKhoanMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    @Transactional
    public LoginResponseDTO login(LoginRequestDTO request) {
        String username = request.getUsername() != null ? request.getUsername().trim() : "";
        TaiKhoan taiKhoan = taiKhoanRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new RuntimeException("Tài khoản hoặc mật khẩu không đúng"));

        // 1. Kiểm tra tài khoản có đang bị tạm khóa không
        if (taiKhoan.getLockedUntil() != null && taiKhoan.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Tài khoản đang bị tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau.");
        }

        // 2. Kiểm tra mật khẩu
        if (!passwordEncoder.matches(request.getPassword(), taiKhoan.getMatKhauHash())) {
            int failed = (taiKhoan.getFailedLoginCount() != null ? taiKhoan.getFailedLoginCount() : 0) + 1;
            taiKhoan.setFailedLoginCount(failed);
            if (failed >= 5) {
                taiKhoan.setLockedUntil(LocalDateTime.now().plusMinutes(15));
                taiKhoanRepository.save(taiKhoan);
                throw new RuntimeException("Bạn đã nhập sai mật khẩu 5 lần. Tài khoản bị tạm khóa 15 phút.");
            }
            taiKhoanRepository.save(taiKhoan);
            throw new RuntimeException("Tài khoản hoặc mật khẩu không đúng");
        }

        // 3. Kiểm tra trạng thái tài khoản
        if (!"ACTIVE".equals(taiKhoan.getTrangThai())) {
            throw new RuntimeException("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.");
        }

        // 4. Kiểm tra trạng thái nhân viên liên kết
        NhanVien nhanVien = null;
        if (taiKhoan.getIdNhanVien() != null) {
            nhanVien = nhanVienRepository.findById(taiKhoan.getIdNhanVien()).orElse(null);
            if (nhanVien != null && nhanVien.getTrangThai() != null) {
                String nvStatus = nhanVien.getTrangThai();
                if ("DA_NGHI_VIEC".equalsIgnoreCase(nvStatus) || "INACTIVE".equalsIgnoreCase(nvStatus)) {
                    throw new RuntimeException("Nhân viên liên kết tài khoản này đã nghỉ việc hoặc bị tạm ngừng.");
                }
            }
        }

        // 5. Đăng nhập thành công -> Reset số lần sai và ghi nhận thời gian đăng nhập
        taiKhoan.setFailedLoginCount(0);
        taiKhoan.setLockedUntil(null);
        taiKhoan.setLastLoginAt(LocalDateTime.now());
        taiKhoanRepository.save(taiKhoan);

        String token = jwtService.generateToken(
                taiKhoan.getId(),
                nhanVien != null ? nhanVien.getVaiTro() : "THU_NGAN",
                nhanVien != null ? nhanVien.getId() : null,
                nhanVien != null ? nhanVien.getIdChiNhanh() : null
        );

        return new LoginResponseDTO(
                token,
                taiKhoanMapper.toResponse(taiKhoan, nhanVien),
                Instant.now().plusMillis(expirationMs).toString()
        );
    }

    @Transactional(readOnly = true)
    public TaiKhoanResponseDTO getCurrentUser(HttpServletRequest request) {
        Object userIdObj = request.getAttribute("authenticatedUserId");
        if (userIdObj == null) {
            throw new RuntimeException("Chưa đăng nhập");
        }
        UUID userId = UUID.fromString(userIdObj.toString());
        TaiKhoan taiKhoan = taiKhoanRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản"));

        NhanVien nhanVien = null;
        if (taiKhoan.getIdNhanVien() != null) {
            nhanVien = nhanVienRepository.findById(taiKhoan.getIdNhanVien()).orElse(null);
        }

        return taiKhoanMapper.toResponse(taiKhoan, nhanVien);
    }
}
