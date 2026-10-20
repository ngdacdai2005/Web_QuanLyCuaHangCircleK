import { type FC } from 'react';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import './AttendanceKpiStrip.css';

interface AttendanceKpiStripProps {
  totalTargetDays?: number;
  completedDays?: number;
  actualWorkedDays?: number;
  overtimeHours?: number;
  totalShifts?: number;
  branchName?: string;
  leaveDaysTaken?: number;
  remainingLeaveDays?: number;
}

export const AttendanceKpiStrip: FC<AttendanceKpiStripProps> = ({
  totalTargetDays = 24,
  completedDays = 0,
  actualWorkedDays = 0,
  overtimeHours = 0,
  totalShifts = 0,
  branchName = 'Circle K',
  leaveDaysTaken = 0,
  remainingLeaveDays = 12,
}) => {
  const remainingDays = Math.max(0, totalTargetDays - completedDays);
  const completionRate = totalTargetDays > 0 ? Math.round((completedDays / totalTargetDays) * 100) : 0;

  return (
    <div className="attendance-kpi-grid">
      {/* CARD 1: TỔNG CÔNG HƯỞNG LƯƠNG */}
      <div className="kpi-card kpi-purple">
        <div className="kpi-top">
          <span className="kpi-title">TỔNG CÔNG HƯỞNG LƯƠNG</span>
          <div className="kpi-icon-pill pill-purple">
            <CalendarOutlined />
          </div>
        </div>
        <div className="kpi-main-val">
          <span className="kpi-number">{completedDays}</span>
          <span className="kpi-unit">/ {totalTargetDays} công</span>
        </div>
        <div className="kpi-subtext">
          Còn lại <strong>{remainingDays}</strong> công cần làm
        </div>
      </div>

      {/* CARD 2: TỔNG CÔNG THỰC TẾ */}
      <div className="kpi-card kpi-green">
        <div className="kpi-top">
          <span className="kpi-title">TỔNG CÔNG THỰC TẾ</span>
          <div className="kpi-icon-pill pill-green">
            <CheckCircleOutlined />
          </div>
        </div>
        <div className="kpi-main-val">
          <span className="kpi-number">{actualWorkedDays}</span>
          <span className="kpi-unit">ngày</span>
        </div>
        <div className="kpi-subtext">
          <strong style={{ color: '#10b981' }}>{completionRate}%</strong> hoàn thành tháng
        </div>
      </div>

      {/* CARD 3: LÀM THÊM GIỜ (OT) */}
      <div className="kpi-card kpi-orange">
        <div className="kpi-top">
          <span className="kpi-title">LÀM THÊM GIỜ (OT)</span>
          <div className="kpi-icon-pill pill-orange">
            <ClockCircleOutlined />
          </div>
        </div>
        <div className="kpi-main-val">
          <span className="kpi-number">{overtimeHours}</span>
          <span className="kpi-unit">giờ</span>
        </div>
        <div className="kpi-subtext">
          Đã tích lũy: <strong>{overtimeHours}h</strong> ngoài ca
        </div>
      </div>

      {/* CARD 4: CA LÀM CHI NHÁNH */}
      <div className="kpi-card kpi-amber">
        <div className="kpi-top">
          <span className="kpi-title">CA LÀM TẠI CHI NHÁNH</span>
          <div className="kpi-icon-pill pill-amber">
            <EnvironmentOutlined />
          </div>
        </div>
        <div className="kpi-main-val">
          <span className="kpi-number">{totalShifts}</span>
          <span className="kpi-unit">ca</span>
        </div>
        <div className="kpi-subtext" title={branchName}>
          Tại: <strong>{branchName}</strong>
        </div>
      </div>

      {/* CARD 5: NGHỈ PHÉP THÁNG */}
      <div className="kpi-card kpi-red">
        <div className="kpi-top">
          <span className="kpi-title">NGHỈ PHÉP THÁNG</span>
          <div className="kpi-icon-pill pill-red">
            <HeartOutlined />
          </div>
        </div>
        <div className="kpi-main-val">
          <span className="kpi-number">{leaveDaysTaken}</span>
          <span className="kpi-unit">ngày</span>
        </div>
        <div className="kpi-subtext">
          Số dư phép năm: còn <strong>{remainingLeaveDays}</strong> ngày
        </div>
      </div>
    </div>
  );
};
