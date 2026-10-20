import { type FC } from 'react';
import { Button, Tag } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { AttendanceRecord } from '@/types';
import './AttendanceWelcomeBanner.css';

interface AttendanceWelcomeBannerProps {
  userName?: string;
  currentMonth: Dayjs;
  onMonthChange: (newMonth: Dayjs) => void;
  todayShift?: AttendanceRecord;
  onClockIn: (id: string) => void;
  onClockOut: (id: string) => void;
  loading?: boolean;
}

const getVietnameseWeekday = (d: Dayjs): string => {
  const day = d.day();
  switch (day) {
    case 0:
      return 'CHỦ NHẬT';
    case 1:
      return 'THỨ HAI';
    case 2:
      return 'THỨ BA';
    case 3:
      return 'THỨ TƯ';
    case 4:
      return 'THỨ NĂM';
    case 5:
      return 'THỨ SÁU';
    case 6:
      return 'THỨ BẢY';
    default:
      return '';
  }
};

export const AttendanceWelcomeBanner: FC<AttendanceWelcomeBannerProps> = ({
  userName = 'Nhân viên Circle K',
  currentMonth,
  onMonthChange,
  todayShift,
  onClockIn,
  onClockOut,
  loading = false,
}) => {
  const now = dayjs();
  const weekday = getVietnameseWeekday(now);
  const formattedToday = `${weekday}, ${now.format('DD/MM/YYYY')}`;

  const isCurrentMonth = currentMonth.isSame(now, 'month');

  const handlePrevMonth = () => {
    onMonthChange(currentMonth.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    onMonthChange(currentMonth.add(1, 'month'));
  };

  const handleGoToday = () => {
    onMonthChange(dayjs());
  };

  const hasCheckedIn = Boolean(todayShift?.clockInAt || todayShift?.checkInAt);
  const hasCheckedOut = Boolean(todayShift?.clockOutAt || todayShift?.checkOutAt);

  return (
    <div className="attendance-welcome-banner">
      <div className="banner-left-content">
        <div className="banner-today-tag">
          <CalendarOutlined style={{ marginRight: 6 }} />
          {formattedToday}
        </div>
        <h2 className="banner-greeting">
          Xin chào, {userName} 👋
        </h2>
        <p className="banner-subtext">
          Chúc bạn có một ngày làm việc hiệu quả và nhiều năng lượng!
        </p>
      </div>

      <div className="banner-right-content">
        {/* Bộ điều khiển tháng & Nút Hôm nay */}
        <div className="banner-month-picker">
          <Button
            type="text"
            icon={<LeftOutlined style={{ color: '#ffffff' }} />}
            onClick={handlePrevMonth}
            className="month-nav-btn"
          />
          <span className="month-label">
            Tháng {currentMonth.format('MM/YYYY')}
          </span>
          <Button
            type="text"
            icon={<RightOutlined style={{ color: '#ffffff' }} />}
            onClick={handleNextMonth}
            className="month-nav-btn"
          />
          <Button
            size="small"
            className={`today-btn ${isCurrentMonth ? 'active' : ''}`}
            onClick={handleGoToday}
          >
            HÔM NAY
          </Button>
        </div>

        {/* Nút Chấm công nhanh ca hôm nay */}
        {todayShift && (
          <div className="banner-clock-action">
            {!hasCheckedIn ? (
              <Button
                type="primary"
                size="large"
                className="banner-clockin-btn"
                icon={<LoginOutlined />}
                loading={loading}
                onClick={() => onClockIn(todayShift.id)}
              >
                Vào ca hôm nay
              </Button>
            ) : !hasCheckedOut ? (
              <Button
                type="primary"
                size="large"
                className="banner-clockout-btn"
                icon={<LogoutOutlined />}
                loading={loading}
                onClick={() => onClockOut(todayShift.id)}
              >
                Tan ca (Check-out)
              </Button>
            ) : (
              <Tag color="success" className="banner-done-tag">
                <CheckCircleOutlined /> Đã hoàn thành ca hôm nay
              </Tag>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
