package com.erp.cuahangtienloi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private TaiKhoanDTO user;
    private String expiresAt;
}
