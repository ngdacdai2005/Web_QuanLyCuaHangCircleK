import { useCallback, useEffect, useState, type FC, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Empty,
  Popconfirm,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import {
  AuditOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { notificationApi } from './api/notificationApi';
import type { NotificationItem, NotificationType } from './types/notification';
import './NotificationsPage.css';

const { Title } = Typography;

export const NotificationsPage: FC = () => {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [selectedLoai, setSelectedLoai] = useState<string>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [list, count] = await Promise.all([
        notificationApi.getAll({
          unreadOnly: activeTab === 'UNREAD',
          loai: selectedLoai,
        }),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedLoai, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (!item.daDoc) {
      try {
        await notificationApi.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, daDoc: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently ignore error on quick click
      }
    }

    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await notificationApi.markAllAsRead();
      message.success('Đã đánh dấu tất cả thông báo là đã đọc');
      await loadData();
    } catch (e: any) {
      message.error(e?.message || 'Không thể đánh dấu đã đọc');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await notificationApi.delete(id);
      message.success('Đã xoá thông báo');
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const newCount = await notificationApi.getUnreadCount();
      setUnreadCount(newCount);
    } catch (e: any) {
      message.error(e?.message || 'Không thể xoá thông báo');
    }
  };

  const getNotificationIcon = (type: NotificationType): { icon: ReactNode; className: string } => {
    switch (type) {
      case 'LICH_LAM':
        return { icon: <CalendarOutlined />, className: 'notif-avatar-lich-lam' };
      case 'KHO_HANG':
        return { icon: <InboxOutlined />, className: 'notif-avatar-kho-hang' };
      case 'KIEM_KE':
        return { icon: <AuditOutlined />, className: 'notif-avatar-kiem-ke' };
      case 'HOA_DON':
        return { icon: <DollarCircleOutlined />, className: 'notif-avatar-hoa-don' };
      case 'HOP_DONG':
        return { icon: <FileTextOutlined />, className: 'notif-avatar-hop-dong' };
      default:
        return { icon: <BellOutlined />, className: 'notif-avatar-he-thong' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="notif-page-container">
      {/* Header */}
      <div className="notif-header-row">
        <div className="notif-header-left">
          <Title level={3} className="notif-title">
            Thông báo
          </Title>
          <div className="notif-subtitle">
            Quản lý các thông báo liên quan đến hoạt động của cửa hàng
          </div>
        </div>

        <Button
          icon={<CheckCircleOutlined />}
          onClick={handleMarkAllAsRead}
          loading={markingAll}
          className="notif-btn-mark-all"
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {/* Filter Tabs & Loai */}
      <div className="notif-filter-bar">
        <div className="notif-tabs-group">
          <button
            type="button"
            className={`notif-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`notif-tab-btn ${activeTab === 'UNREAD' ? 'active' : ''}`}
            onClick={() => setActiveTab('UNREAD')}
          >
            <span>Chưa đọc</span>
            {unreadCount > 0 && (
              <span className="notif-badge-unread">{unreadCount}</span>
            )}
          </button>
        </div>

        <Space>
          <Select
            value={selectedLoai}
            onChange={setSelectedLoai}
            style={{ width: 170 }}
            options={[
              { value: 'ALL', label: 'Tất cả loại nghiệp vụ' },
              { value: 'LICH_LAM', label: 'Lịch & Ca làm' },
              { value: 'KHO_HANG', label: 'Kho & Hàng hoá' },
              { value: 'KIEM_KE', label: 'Kiểm kê' },
              { value: 'HOA_DON', label: 'Hoá đơn & POS' },
              { value: 'HOP_DONG', label: 'Hợp đồng NCC' },
            ]}
          />
        </Space>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="notif-empty-box">
          <Empty description="Không có thông báo nào" />
        </div>
      ) : (
        <div className="notif-list-container">
          {notifications.map((item) => {
            const { icon, className } = getNotificationIcon(item.loaiThongBao);
            return (
              <div
                key={item.id}
                className={`notif-card-item ${!item.daDoc ? 'unread' : ''}`}
                onClick={() => handleMarkAsRead(item)}
              >
                <div className="notif-card-left">
                  {/* Dot status */}
                  <div className="notif-dot-wrap">
                    {!item.daDoc && <div className="notif-unread-dot" />}
                  </div>

                  {/* Icon */}
                  <div className={`notif-avatar-box ${className}`}>
                    {icon}
                  </div>

                  {/* Title & Description */}
                  <div className="notif-text-content">
                    <div className="notif-card-title">{item.tieuDe}</div>
                    <div className="notif-card-desc">{item.noiDung}</div>
                  </div>
                </div>

                {/* Date & Actions */}
                <div className="notif-card-right">
                  <span className="notif-date-text">{formatDate(item.ngayTao)}</span>
                  <div className="notif-delete-btn" onClick={(e) => e.stopPropagation()}>
                    <Popconfirm
                      title="Xoá thông báo này?"
                      okText="Xoá"
                      cancelText="Huỷ"
                      okButtonProps={{ danger: true }}
                      onConfirm={(e) => handleDelete(e as any, item.id)}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
