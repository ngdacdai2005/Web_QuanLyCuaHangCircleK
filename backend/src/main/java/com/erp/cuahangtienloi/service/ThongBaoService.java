package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.response.ThongBaoDTO;
import com.erp.cuahangtienloi.entity.ThongBao;

import java.util.List;

public interface ThongBaoService {

    List<ThongBaoDTO> getNotifications(Boolean unreadOnly, String loai);

    long countUnread();

    ThongBaoDTO markAsRead(Long id);

    void markAllAsRead();

    ThongBaoDTO createNotification(ThongBao thongBao);

    void deleteNotification(Long id);
}
