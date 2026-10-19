package com.erp.cuahangtienloi.config;

import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final TaiKhoanRepository taiKhoanRepository;
    private final NhanVienRepository nhanVienRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {

            String token = header.substring(7);

            Claims claims = jwtService.parseToken(token);

            if (claims != null) {
                UUID taiKhoanId;

                try {
                    taiKhoanId = UUID.fromString(claims.getSubject());
                } catch (RuntimeException e) {
                    filterChain.doFilter(request, response);
                    return;
                }

                Optional<TaiKhoan> tkOpt = taiKhoanRepository.findById(taiKhoanId);

                if (tkOpt.isEmpty()) {
                    filterChain.doFilter(request, response);
                    return;
                }

                TaiKhoan taiKhoan = tkOpt.get();

                if (!"ACTIVE".equals(taiKhoan.getTrangThai())) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String role;
                String idNhanVien = null;
                String idChiNhanh = null;

                if (taiKhoan.getIdNhanVien() != null) {
                    Optional<NhanVien> nvOpt =
                            nhanVienRepository.findById(taiKhoan.getIdNhanVien());

                    if (nvOpt.isPresent()) {
                        NhanVien nv = nvOpt.get();

                        role = nv.getVaiTro();
                        idNhanVien = nv.getId().toString();

                        if (nv.getIdChiNhanh() != null) {
                            idChiNhanh = nv.getIdChiNhanh().toString();
                        }
                    } else {
                        role = claims.get("role", String.class);
                        idNhanVien = claims.get("idNhanVien", String.class);
                        idChiNhanh = claims.get("idChiNhanh", String.class);
                    }
                } else {
                    role = claims.get("role", String.class);

                    if (role == null) {
                        role = "THU_NGAN";
                    }
                }

                List<GrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role));

                // Nạp quyền động từ database cho vai trò
                try {
                    List<String> perms;
                    if ("ADMIN".equalsIgnoreCase(role)) {
                        perms = jdbcTemplate.queryForList(
                                "SELECT name FROM permissions WHERE deleted = 0 AND status = 0",
                                String.class
                        );
                    } else {
                        perms = jdbcTemplate.queryForList("""
                                SELECT p.name 
                                FROM permissions p
                                JOIN role_permissions rp ON p.id = rp.permission_id
                                JOIN vai_tro v ON v.id = rp.role_id
                                WHERE v.ten_vai_tro = ? AND p.deleted = 0 AND p.status = 0
                                """,
                                String.class,
                                role
                        );
                    }
                    for (String perm : perms) {
                        authorities.add(new SimpleGrantedAuthority(perm));
                    }
                } catch (Exception ignored) {
                    // Fallback an toàn nếu bảng permissions đang khởi tạo
                }

                var auth = new UsernamePasswordAuthenticationToken(
                        taiKhoanId.toString(),
                        null,
                        authorities
                );

                SecurityContextHolder.getContext().setAuthentication(auth);

                request.setAttribute(
                        "authenticatedUserId",
                        taiKhoanId.toString()
                );

                if (idNhanVien != null) {
                    request.setAttribute(
                            "authenticatedIdNhanVien",
                            idNhanVien
                    );
                }

                if (idChiNhanh != null) {
                    request.setAttribute(
                            "authenticatedIdChiNhanh",
                            idChiNhanh
                    );
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}