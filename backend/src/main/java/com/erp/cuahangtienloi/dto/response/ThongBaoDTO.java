package com.erp.cuahangtienloi.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThongBaoDTO {
    private Long id;
    private String tieuDe;
    private String noiDung;
    private String loaiThongBao;
    private String actionUrl;
    private String mucDo;
    private String nguoiGuiTen;
    private UUID idNhanVienNhan;
    private Boolean daDoc;
    private LocalDateTime ngayTao;
    private LocalDateTime ngayDoc;
}
