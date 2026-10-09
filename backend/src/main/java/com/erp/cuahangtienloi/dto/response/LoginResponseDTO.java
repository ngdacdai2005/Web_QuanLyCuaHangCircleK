package com.erp.cuahangtienloi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponseDTO {
    private String token;
    private TaiKhoanResponseDTO user;
    private String expiresAt;
}
