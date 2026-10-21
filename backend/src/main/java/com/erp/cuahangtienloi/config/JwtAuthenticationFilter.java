package com.erp.cuahangtienloi.config;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Cache quyền theo từng vai trò trong bộ nhớ RAM.
     * Tránh việc MỖI request API đều phải chạy 3 câu SQL truy vấn Database.
     */
    private final Map<String, List<GrantedAuthority>> roleAuthoritiesCache = new ConcurrentHashMap<>();

    public void clearCache() {
        roleAuthoritiesCache.clear();
    }

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
                String taiKhoanId = claims.getSubject();
                String role = claims.get("role", String.class);
                if (role == null || role.isBlank()) {
                    role = "THU_NGAN";
                }

                String idNhanVien = claims.get("idNhanVien", String.class);
                String idChiNhanh = claims.get("idChiNhanh", String.class);

                // Lấy danh sách quyền từ RAM cache, chỉ query database 1 lần duy nhất khi khởi động
                List<GrantedAuthority> authorities = roleAuthoritiesCache.computeIfAbsent(role, r -> {
                    List<GrantedAuthority> auths = new ArrayList<>();
                    auths.add(new SimpleGrantedAuthority("ROLE_" + r));

                    try {
                        List<String> perms;
                        if ("ADMIN".equalsIgnoreCase(r)) {
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
                                    r
                            );
                        }
                        for (String perm : perms) {
                            auths.add(new SimpleGrantedAuthority(perm));
                        }
                    } catch (Exception ignored) {
                        // Fallback an toàn nếu database permissions chưa sẵn sàng
                    }
                    return auths;
                });

                var auth = new UsernamePasswordAuthenticationToken(
                        taiKhoanId,
                        null,
                        authorities
                );

                SecurityContextHolder.getContext().setAuthentication(auth);

                request.setAttribute("authenticatedUserId", taiKhoanId);
                if (idNhanVien != null) {
                    request.setAttribute("authenticatedIdNhanVien", idNhanVien);
                }
                if (idChiNhanh != null) {
                    request.setAttribute("authenticatedIdChiNhanh", idChiNhanh);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}