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
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

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

    public LoginResponseDTO login(LoginRequestDTO request) {
        TaiKhoan taiKhoan = taiKhoanRepository.findByTenDangNhap(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Tài khoản hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), taiKhoan.getMatKhauHash())) {
            throw new RuntimeException("Tài khoản hoặc mật khẩu không đúng");
        }

        if (!"ACTIVE".equals(taiKhoan.getTrangThai())) {
            throw new RuntimeException("Tài khoản đã bị vô hiệu hóa");
        }

        NhanVien nhanVien = null;
        if (taiKhoan.getIdNhanVien() != null) {
            nhanVien = nhanVienRepository.findById(taiKhoan.getIdNhanVien()).orElse(null);
        }

        String token = jwtService.generateToken(
                taiKhoan.getId(),
                nhanVien != null
                        ? nhanVien.getVaiTro()
                        : "THU_NGAN",
                nhanVien != null
                        ? nhanVien.getId()
                        : null,
                nhanVien != null
                        ? nhanVien.getIdChiNhanh()
                        : null
        );
//        String expiresAt = LocalDateTime.now().plusHours(24).toString();

        return new LoginResponseDTO(
                token,
                taiKhoanMapper.toResponse(taiKhoan, nhanVien),
                Instant.now()
                        .plusMillis(expirationMs)
                        .toString()
        );
    }


}
