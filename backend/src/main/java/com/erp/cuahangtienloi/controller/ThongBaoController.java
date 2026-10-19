package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.response.ApiResponse;
import com.erp.cuahangtienloi.dto.response.ThongBaoDTO;
import com.erp.cuahangtienloi.entity.ThongBao;
import com.erp.cuahangtienloi.service.ThongBaoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/notifications", "/api/notifications"})
@RequiredArgsConstructor
public class ThongBaoController {

    private final ThongBaoService thongBaoService;

    @GetMapping
    @PreAuthorize("hasAuthority('notification:read') or hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'THU_NGAN', 'KE_TOAN')")
    public ResponseEntity<List<ThongBaoDTO>> getNotifications(
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(required = false) String loai
    ) {
        return ResponseEntity.ok(thongBaoService.getNotifications(unreadOnly, loai));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAuthority('notification:read') or hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'THU_NGAN', 'KE_TOAN')")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count", thongBaoService.countUnread()));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("hasAuthority('notification:update') or hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'THU_NGAN', 'KE_TOAN')")
    public ResponseEntity<ThongBaoDTO> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(thongBaoService.markAsRead(id));
    }

    @PutMapping("/read-all")
    @PreAuthorize("hasAuthority('notification:update') or hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'THU_NGAN', 'KE_TOAN')")
    public ResponseEntity<ApiResponse> markAllAsRead() {
        thongBaoService.markAllAsRead();
        return ResponseEntity.ok(new ApiResponse(true, "Đã đánh dấu tất cả thông báo là đã đọc"));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('notification:create') or hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<ThongBaoDTO> createNotification(@RequestBody ThongBao thongBao) {
        return ResponseEntity.ok(thongBaoService.createNotification(thongBao));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('notification:delete') or hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<ApiResponse> deleteNotification(@PathVariable Long id) {
        thongBaoService.deleteNotification(id);
        return ResponseEntity.ok(new ApiResponse(true, "Đã xoá thông báo thành công"));
    }
}
