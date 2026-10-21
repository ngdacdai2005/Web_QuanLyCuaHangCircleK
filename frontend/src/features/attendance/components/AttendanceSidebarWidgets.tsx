import { type FC } from 'react';
import { Button, Tag } from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { AttendanceRecord } from '@/types';
import './AttendanceSidebarWidgets.css';

interface AttendanceSidebarWidgetsProps {
  onOpenLeaveModal: () => void;
  onOpenSwapModal: () => void;
  onOpenOtModal: () => void;
  todayShift?: AttendanceRecord;
  onClockIn?: (id: string) => void;
  onClockOut?: (id: string) => void;
}

export const AttendanceSidebarWidgets: FC<AttendanceSidebarWidgetsProps> = ({
  onOpenLeaveModal,
  onOpenSwapModal,
  onOpenOtModal,
  todayShift,
  onClockIn,
  onClockOut,
}) => {
  const hasClockedIn = Boolean(todayShift?.clockInAt);
  const hasClockedOut = Boolean(todayShift?.clockOutAt);

  return (
    <div className="attendance-sidebar-wrap">
      <div className="sidebar-card">
        <h4 className="sidebar-card-title">Trạng thái đăng ký tháng này</h4>

        {/* MỤC 1: ĐƠN NGHỈ PHÉP */}
        <div className="sidebar-item" onClick={onOpenLeaveModal}>
          <div className="item-icon-box box-red">
            <CalendarOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">Đơn nghỉ phép</div>
            <div className="item-desc">Nghỉ phép thường niên</div>
          </div>
          <div className="item-status">
            <span className="status-badge badge-green">0 Đã duyệt</span>
            <span className="status-sub">Không có đơn chờ</span>
          </div>
        </div>

        {/* MỤC 2: ĐƠN ĐI CA / ONSITE / ĐỔI CA */}
        <div className="sidebar-item" onClick={onOpenSwapModal}>
          <div className="item-icon-box box-purple">
            <EnvironmentOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">Đơn đổi ca</div>
            <div className="item-desc">Công tác & đổi ca cửa hàng</div>
          </div>
          <div className="item-status">
            <span className="status-badge badge-green">0 Đã duyệt</span>
            <span className="status-sub">Không có đơn chờ</span>
          </div>
        </div>

        {/* MỤC 3: LÀM THÊM GIỜ (OT) */}
        <div className="sidebar-item" onClick={onOpenOtModal}>
          <div className="item-icon-box box-orange">
            <ClockCircleOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">Làm thêm (OT)</div>
            <div className="item-desc">Tăng ca ca đêm / lễ</div>
          </div>
          <div className="item-status">
            <span className="status-badge badge-green">0 Đã duyệt</span>
            <span className="status-sub">Không có đơn chờ</span>
          </div>
        </div>
      </div>

      {/* THẺ HÀNH ĐỘNG NHANH: CHẤM CÔNG CA HÔM NAY */}
      <div className="sidebar-card quick-action-card">
        <div className="quick-action-header">
          <ThunderboltOutlined style={{ color: '#eab308', fontSize: 18 }} />
          <span style={{ fontWeight: 700, color: '#0f172a' }}>Chấm công hôm nay</span>
        </div>

        {todayShift ? (
          <div className="shift-summary-box">
            <div className="shift-name">Ca làm: <strong>{todayShift.shift}</strong></div>
            <div className="shift-times">
              Trạng thái: {' '}
              {hasClockedOut ? (
                <Tag color="success">Đã hoàn thành</Tag>
              ) : hasClockedIn ? (
                <Tag color="processing">Đang làm việc</Tag>
              ) : (
                <Tag color="warning">Chưa vào ca</Tag>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              {!hasClockedIn ? (
                <Button
                  type="primary"
                  block
                  style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
                  onClick={() => onClockIn?.(todayShift.id)}
                >
                  Check-in vào ca
                </Button>
              ) : !hasClockedOut ? (
                <Button
                  type="primary"
                  block
                  style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 600 }}
                  onClick={() => onClockOut?.(todayShift.id)}
                >
                  Check-out tan ca
                </Button>
              ) : (
                <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: 13 }}>
                  <CheckCircleOutlined /> Bạn đã hoàn thành ca hôm nay
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="no-shift-box">
            Hôm nay bạn không có lịch ca làm việc hoặc là ngày nghỉ theo kế hoạch.
          </div>
        )}
      </div>
    </div>
  );
};
