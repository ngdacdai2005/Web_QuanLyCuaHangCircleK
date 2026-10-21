import { useState, useEffect, type FC } from 'react';
import { Modal, Button, Tag, Space, Alert } from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  LoginOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  SHIFT_CODE,
  SHIFT_LABEL,
  type AttendanceRecord,
  type ShiftCode,
} from '@/types';
import { formatTime, today } from '@/utils/dateUtils';
import './ShiftActionModal.css';

interface ShiftActionModalProps {
  open: boolean;
  onClose: () => void;
  dateStr: string;
  record?: AttendanceRecord | null;
  onClockIn: (id: string) => Promise<void> | void;
  onClockOut: (id: string) => Promise<void> | void;
  onOpenLeaveWithDate?: (date: Dayjs) => void;
  onOpenSwapWithDate?: (date: Dayjs, shift?: ShiftCode) => void;
  branchName?: string;
  loading?: boolean;
}

const getShiftBadge = (shift?: ShiftCode) => {
  switch (shift) {
    case SHIFT_CODE.Morning:
      return { label: SHIFT_LABEL.MORNING, color: 'blue' };
    case SHIFT_CODE.Afternoon:
      return { label: SHIFT_LABEL.AFTERNOON, color: 'orange' };
    case SHIFT_CODE.Night:
      return { label: SHIFT_LABEL.NIGHT, color: 'purple' };
    default:
      return { label: 'Chưa phân ca', color: 'default' };
  }
};

export const ShiftActionModal: FC<ShiftActionModalProps> = ({
  open,
  onClose,
  dateStr,
  record,
  onClockIn,
  onClockOut,
  onOpenLeaveWithDate,
  onOpenSwapWithDate,
  branchName = 'Circle K',
  loading = false,
}) => {
  const [liveTime, setLiveTime] = useState(dayjs().format('HH:mm:ss'));

  // Cập nhật đồng hồ thời gian thực mỗi giây
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setLiveTime(dayjs().format('HH:mm:ss'));
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const dateObj = dayjs(dateStr || today());
  const todayIso = today();
  const isToday = dateStr === todayIso;
  const isFuture = dateObj.isAfter(dayjs(), 'day');

  const shiftInfo = getShiftBadge(record?.shift);
  const hasClockedIn = Boolean(record?.clockInAt);
  const hasClockedOut = Boolean(record?.clockOutAt);

  const formattedDate = dateObj.format('dddd, [ngày] DD/MM/YYYY');
  // Chuyển chữ cái đầu thành viết hoa (VD: "thứ ba" -> "Thứ Ba")
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <Modal
      open={open}
      title={
        <div className="shift-modal-header">
          <CalendarOutlined style={{ color: '#4f46e5', marginRight: 8 }} />
          <span>Chi tiết ca làm việc</span>
        </div>
      }
      footer={null}
      destroyOnHidden
      centered
      width={500}
      className="shift-action-modal"
      onCancel={onClose}
    >
      <div className="shift-modal-body">
        {/* Banner thông tin ngày & ca làm */}
        <div className="shift-overview-card">
          <div className="shift-date-line">{capitalizedDate}</div>
          <div className="shift-badge-line">
            <Tag color={shiftInfo.color} style={{ fontSize: 13, padding: '4px 10px', fontWeight: 600 }}>
              {shiftInfo.label}
            </Tag>
            {isToday && (
              <Tag color="success" style={{ fontWeight: 700 }}>
                HÔM NAY
              </Tag>
            )}
          </div>
          <div className="shift-branch-line">
            <EnvironmentOutlined style={{ color: '#ea580c', marginRight: 6 }} />
            <span>Địa điểm: <strong>{branchName}</strong></span>
          </div>
        </div>

        {/* TRƯỜNG HỢP 1: NGÀY HÔM NAY — KHU VỰC CHẤM CÔNG THỜI GIAN THỰC */}
        {isToday && (
          <div className="live-clock-section">
            <div className="live-clock-title">Thời gian hiện tại</div>
            <div className="live-clock-digits">{liveTime}</div>

            {record ? (
              <div className="clock-actions-wrap">
                {!hasClockedIn ? (
                  <Button
                    type="primary"
                    size="large"
                    block
                    className="btn-large-checkin"
                    icon={<LoginOutlined />}
                    loading={loading}
                    onClick={async () => {
                      await onClockIn(record.id);
                      onClose();
                    }}
                  >
                    Check-in vào ca ngay
                  </Button>
                ) : !hasClockedOut ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Alert
                      type="info"
                      showIcon
                      message="Đang trong ca làm việc"
                      description={`Đã vào ca lúc ${formatTime(record.clockInAt)}. Hãy nhấn Check-out khi hết giờ làm.`}
                    />
                    <Button
                      type="primary"
                      size="large"
                      block
                      className="btn-large-checkout"
                      icon={<LogoutOutlined />}
                      loading={loading}
                      onClick={async () => {
                        await onClockOut(record.id);
                        onClose();
                      }}
                    >
                      Check-out tan ca
                    </Button>
                  </div>
                ) : (
                  <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined style={{ fontSize: 18 }} />}
                    message="Ca làm việc đã hoàn thành"
                    description={`Đã check-in: ${formatTime(record.clockInAt)} | Check-out: ${formatTime(record.clockOutAt)} (Tổng ${record.actualHours || record.workedHours || 8}h)`}
                  />
                )}
              </div>
            ) : (
              <Alert
                type="warning"
                showIcon
                message="Chưa có lịch ca cho hôm nay"
                description="Bạn không có ca làm việc được xếp trong hôm nay. Nếu bạn đi làm tăng cường, hãy liên hệ Quản lý cửa hàng để xếp ca."
              />
            )}
          </div>
        )}

        {/* TRƯỜNG HỢP 2: LỊCH SỬ CHẤM CÔNG (NGÀY QUÁ KHỨ) */}
        {!isToday && record && (
          <div className="shift-history-section">
            <h4 className="section-title">Nhật ký chấm công</h4>
            <div className="history-grid">
              <div className="history-item">
                <span className="history-label">Giờ vào thực tế:</span>
                <span className="history-value">
                  {hasClockedIn ? formatTime(record.clockInAt) : 'Chưa chấm'}
                </span>
              </div>
              <div className="history-item">
                <span className="history-label">Giờ ra thực tế:</span>
                <span className="history-value">
                  {hasClockedOut ? formatTime(record.clockOutAt) : 'Chưa chấm'}
                </span>
              </div>
              <div className="history-item">
                <span className="history-label">Tổng giờ làm:</span>
                <span className="history-value" style={{ fontWeight: 700, color: '#10b981' }}>
                  {record.actualHours || record.workedHours || 0} giờ
                </span>
              </div>
              <div className="history-item">
                <span className="history-label">Giờ làm thêm (OT):</span>
                <span className="history-value" style={{ fontWeight: 700, color: '#f59e0b' }}>
                  {record.overtimeHours ? `+${record.overtimeHours} giờ` : '0 giờ'}
                </span>
              </div>
              <div className="history-item full-width">
                <span className="history-label">Trạng thái công:</span>
                <span className="history-value">
                  <Tag color={record.status === 'PRESENT' ? 'success' : 'error'}>
                    {record.status === 'PRESENT' ? 'Đã hoàn thành' : record.status}
                  </Tag>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TRƯỜNG HỢP 3: CA TƯƠNG LAI — TIỆN ÍCH ĐỔI CA / NGHỈ PHÉP */}
        {isFuture && (
          <div className="future-shift-section">
            <Alert
              type="info"
              showIcon
              message="Ca làm việc theo kế hoạch"
              description="Ca làm việc này đã được xếp lịch trước. Nếu có việc đột xuất, bạn có thể nộp đơn xin nghỉ hoặc gửi yêu cầu đổi ca cho đồng nghiệp."
              style={{ marginBottom: 16 }}
            />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button
                icon={<SwapOutlined />}
                style={{ flex: 1 }}
                onClick={() => {
                  onClose();
                  onOpenSwapWithDate?.(dateObj, record?.shift);
                }}
              >
                Yêu cầu đổi ca này
              </Button>
              <Button
                type="primary"
                ghost
                icon={<CalendarOutlined />}
                style={{ flex: 1 }}
                onClick={() => {
                  onClose();
                  onOpenLeaveWithDate?.(dateObj);
                }}
              >
                Xin nghỉ phép ngày này
              </Button>
            </Space>
          </div>
        )}

        {/* TRƯỜNG HỢP 4: NGÀY TRỐNG CHƯA CÓ LỊCH CA */}
        {!isToday && !record && (
          <div className="empty-shift-section">
            <Alert
              type="info"
              showIcon
              message="Ngày nghỉ / Chưa có ca làm"
              description="Ngày này hiện chưa có ca làm việc nào được phân công cho bạn."
              style={{ marginBottom: 16 }}
            />
            {isFuture && (
              <Button
                type="primary"
                ghost
                block
                icon={<CalendarOutlined />}
                onClick={() => {
                  onClose();
                  onOpenLeaveWithDate?.(dateObj);
                }}
              >
                Đăng ký nghỉ phép trước ngày này
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
