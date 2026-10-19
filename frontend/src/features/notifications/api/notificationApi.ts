import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from '@/api/http';
import { parseApiError } from '@/utils/apiError';
import type { NotificationFilterParams, NotificationItem } from '../types/notification';

export const notificationApi = {
  getAll: async (params?: NotificationFilterParams): Promise<NotificationItem[]> => {
    const query = new URLSearchParams();
    if (params?.unreadOnly !== undefined) query.set('unreadOnly', String(params.unreadOnly));
    if (params?.loai && params.loai !== 'ALL') query.set('loai', params.loai);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications${queryString}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tải thông báo');
    return res.json();
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/notifications/unread-count`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data?.count ?? 0;
    } catch {
      return 0;
    }
  },

  markAsRead: async (id: number): Promise<NotificationItem> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể đánh dấu đã đọc');
    return res.json();
  },

  markAllAsRead: async (): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể đánh dấu tất cả đã đọc');
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể xoá thông báo');
  },
};
