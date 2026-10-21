import { type FC } from 'react';
import { Tag } from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { AttendanceRecord } from '@/types';
import './AttendanceSidebarWidgets.css';

interface AttendanceSidebarWidgetsProps {
  onOpenLeaveList: () => void;
  onOpenSwapList: () => void;
  onOpenOtList: () => void;
  todayShift?: AttendanceRecord;
  onClockIn?: (id: string) => void;
  onClockOut?: (id: string) => void;
  leaveApprovedCount?: number;
  leavePendingCount?: number;
  leaveRejectedCount?: number;
  swapApprovedCount?: number;
  swapPendingCount?: number;
  otApprovedCount?: number;
  otPendingCount?: number;
  isManager?: boolean;
}

export const AttendanceSidebarWidgets: FC<AttendanceSidebarWidgetsProps> = ({
  onOpenLeaveList,
  onOpenSwapList,
  onOpenOtList,
  todayShift,
  onClockIn,
  onClockOut,
  leaveApprovedCount = 0,
  leavePendingCount = 0,
  leaveRejectedCount = 0,
  swapApprovedCount = 1,
  swapPendingCount = 0,
  otApprovedCount = 0,
  otPendingCount = 1,
  isManager = false,
}) => {
  const hasClockedIn = Boolean(todayShift?.clockInAt);
  const hasClockedOut = Boolean(todayShift?.clockOutAt);

  return (
    <div className="attendance-sidebar-wrap">
      <div className="sidebar-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 className="sidebar-card-title" style={{ margin: 0 }}>Trạng thái đăng ký tháng này</h4>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Bấm để xem list</span>
        </div>

        {/* MỤC 1: ĐƠN NGHỈ PHÉP */}
        <div
          className="sidebar-item"
          onClick={onOpenLeaveList}
          title="Nhấn để xem danh sách & tiến độ duyệt các đơn nghỉ phép"
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <div className="item-icon-box box-red">
            <CalendarOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">
              Đơn nghỉ phép
              {isManager && <span style={{ fontSize: 11, marginLeft: 4, color: '#0284c7', fontWeight: 600 }}>(Duyệt)</span>}
            </div>
            <div className="item-desc">Nghỉ phép thường niên & ốm đau</div>
          </div>
          <div className="item-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="status-badge badge-green">{leaveApprovedCount} Đã duyệt</span>
            {leavePendingCount > 0 ? (
              <span className="status-sub" style={{ color: '#ea580c', fontWeight: 700 }}>
                {leavePendingCount} Chờ duyệt
              </span>
            ) : leaveRejectedCount > 0 ? (
              <span className="status-sub" style={{ color: '#ef4444', fontWeight: 600 }}>
                {leaveRejectedCount} Bị từ chối
              </span>
            ) : (
              <span className="status-sub">Không có đơn chờ</span>
            )}
          </div>
          <RightOutlined style={{ fontSize: 12, color: '#cbd5e1', marginLeft: 8 }} />
        </div>

        {/* MỤC 2: ĐƠN ĐI CA / ONSITE / ĐỔI CA */}
        <div
          className="sidebar-item"
          onClick={onOpenSwapList}
          title="Nhấn để xem danh sách & tiến độ duyệt các yêu cầu đổi ca"
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <div className="item-icon-box box-purple">
            <EnvironmentOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">Đơn đổi ca</div>
            <div className="item-desc">Công tác & đổi ca cửa hàng</div>
          </div>
          <div className="item-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="status-badge badge-green">{swapApprovedCount} Đã duyệt</span>
            {swapPendingCount > 0 ? (
              <span className="status-sub" style={{ color: '#ea580c', fontWeight: 700 }}>
                {swapPendingCount} Chờ duyệt
              </span>
            ) : (
              <span className="status-sub">Không có đơn chờ</span>
            )}
          </div>
          <RightOutlined style={{ fontSize: 12, color: '#cbd5e1', marginLeft: 8 }} />
        </div>

        {/* MỤC 3: LÀM THÊM GIỜ (OT) */}
        <div
          className="sidebar-item"
          onClick={onOpenOtList}
          title="Nhấn để xem danh sách & tiến độ duyệt các yêu cầu làm thêm OT"
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <div className="item-icon-box box-orange">
            <ClockCircleOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">Làm thêm (OT)</div>
            <div className="item-desc">Tăng ca ca đêm / lễ</div>
          </div>
          <div className="item-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="status-badge badge-green">{otApprovedCount} Đã duyệt</span>
            {otPendingCount > 0 ? (
              <span className="status-sub" style={{ color: '#ea580c', fontWeight: 700 }}>
                {otPendingCount} Chờ duyệt
              </span>
            ) : (
              <span className="status-sub">Không có đơn chờ</span>
            )}
          </div>
          <RightOutlined style={{ fontSize: 12, color: '#cbd5e1', marginLeft: 8 }} />
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
                <button
                  type="button"
                  className="ant-btn ant-btn-primary ant-btn-block"
                  style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600, height: 38, borderRadius: 6 }}
                  onClick={() => onClockIn?.(todayShift.id)}
                >
                  Check-in vào ca
                </button>
              ) : !hasClockedOut ? (
                <button
                  type="button"
                  className="ant-btn ant-btn-primary ant-btn-block"
                  style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 600, height: 38, borderRadius: 6 }}
                  onClick={() => onClockOut?.(todayShift.id)}
                >
                  Check-out tan ca
                </button>
              ) : (
                <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: 13 }}>
                  ✓ Bạn đã hoàn thành ca hôm nay
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
