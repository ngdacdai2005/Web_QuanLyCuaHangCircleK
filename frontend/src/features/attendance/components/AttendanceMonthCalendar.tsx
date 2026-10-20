import { useMemo, type FC } from 'react';
import { Button, Popover } from 'antd';
import {
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  SHIFT_CODE,
  SHIFT_SHORT_LABEL,
  ATTENDANCE_STATUS,
  type AttendanceRecord,
} from '@/types';
import { formatTime } from '@/utils/dateUtils';
import './AttendanceMonthCalendar.css';

interface AttendanceMonthCalendarProps {
  currentMonth: Dayjs;
  attendanceRecords: AttendanceRecord[];
  onOpenLeaveModal: () => void;
  onOpenSwapModal: () => void;
  onSelectDay?: (dateStr: string, record: AttendanceRecord | null) => void;
}

interface DayCell {
  type: 'day';
  day: number;
  dateStr: string;
  isToday: boolean;
  records: AttendanceRecord[];
  key: string;
}

interface PaddingCell {
  type: 'padding-prev' | 'padding-next';
  key: string;
}

type CalendarCell = DayCell | PaddingCell;

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface ShiftDisplayConfig {
  cellClass: string;
  pillBg: string;
  pillColor: string;
  pillBorder: string;
  isDashed: boolean;
  pillTitle: string;
  pillSubtitle: string;
  statusLabel: string;
  statusColor: string;
}

const getShiftDisplayConfig = (
  dateStr: string,
  isToday: boolean,
  record?: AttendanceRecord,
): ShiftDisplayConfig => {
  const dateObj = dayjs(dateStr);
  const isPast = dateObj.isBefore(dayjs(), 'day');

  // TRƯỜNG HỢP 1: HÔM NAY
  if (isToday) {
    if (!record) {
      return {
        cellClass: 'cell-today is-today',
        pillBg: '#ffffff',
        pillColor: '#64748b',
        pillBorder: '#cbd5e1',
        isDashed: true,
        pillTitle: 'Không có ca',
        pillSubtitle: 'Nghỉ hôm nay',
        statusLabel: 'Nghỉ ca',
        statusColor: '#64748b',
      };
    }

    const hasClockIn = Boolean(record.clockInAt || record.checkInAt);
    const hasClockOut = Boolean(record.clockOutAt || record.checkOutAt);

    if (hasClockIn && !hasClockOut) {
      return {
        cellClass: 'cell-today is-today cell-working-now',
        pillBg: '#ecfdf5',
        pillColor: '#047857',
        pillBorder: '#10b981',
        isDashed: false,
        pillTitle: `🟢 Đang làm · ${SHIFT_SHORT_LABEL[record.shift] || record.shift}`,
        pillSubtitle: `Vào: ${formatTime(record.clockInAt || record.checkInAt)}`,
        statusLabel: 'Đang trong ca làm việc',
        statusColor: '#10b981',
      };
    }

    if (hasClockIn && hasClockOut) {
      return {
        cellClass: 'cell-today is-today',
        pillBg: '#f0fdf4',
        pillColor: '#15803d',
        pillBorder: '#86efac',
        isDashed: false,
        pillTitle: `✓ Hoàn thành · ${SHIFT_SHORT_LABEL[record.shift] || record.shift}`,
        pillSubtitle: `${record.actualHours || record.workedHours || 8}h làm việc`,
        statusLabel: 'Đã hoàn thành ca',
        statusColor: '#16a34a',
      };
    }

    return {
      cellClass: 'cell-today is-today',
      pillBg: '#eff6ff',
      pillColor: '#1d4ed8',
      pillBorder: '#3b82f6',
      isDashed: false,
      pillTitle: `👉 ${SHIFT_SHORT_LABEL[record.shift] || 'Ca hôm nay'}`,
      pillSubtitle: 'Chờ Check-in',
      statusLabel: 'Chờ vào ca',
      statusColor: '#2563eb',
    };
  }

  // TRƯỜNG HỢP 2: QUÁ KHỨ (PAST)
  if (isPast) {
    if (!record) {
      return {
        cellClass: 'cell-past-off',
        pillBg: 'transparent',
        pillColor: '#94a3b8',
        pillBorder: 'transparent',
        isDashed: false,
        pillTitle: 'Nghỉ ca',
        pillSubtitle: 'Không xếp ca',
        statusLabel: 'Ngày nghỉ',
        statusColor: '#94a3b8',
      };
    }

    // Nghỉ phép
    if (record.status === ATTENDANCE_STATUS.Leave) {
      return {
        cellClass: 'cell-past-leave',
        pillBg: '#fff7ed',
        pillColor: '#c2410c',
        pillBorder: '#fdba74',
        isDashed: false,
        pillTitle: '📋 Nghỉ phép',
        pillSubtitle: 'Nghỉ có phép',
        statusLabel: 'Nghỉ phép',
        statusColor: '#ea580c',
      };
    }

    // Vắng mặt hoặc quá khứ được xếp ca nhưng không đi làm
    const hasClockIn = Boolean(record.clockInAt || record.checkInAt);
    if (record.status === ATTENDANCE_STATUS.Absent || (!hasClockIn && record.status === ATTENDANCE_STATUS.Scheduled)) {
      return {
        cellClass: 'cell-past-absent',
        pillBg: '#fef2f2',
        pillColor: '#b91c1c',
        pillBorder: '#fca5a5',
        isDashed: false,
        pillTitle: '✕ Vắng / Nghỉ',
        pillSubtitle: 'Không chấm công',
        statusLabel: 'Vắng không phép',
        statusColor: '#ef4444',
      };
    }

    // Đi muộn
    if (record.status === ATTENDANCE_STATUS.Late) {
      return {
        cellClass: 'cell-past-late',
        pillBg: '#fffbeb',
        pillColor: '#b45309',
        pillBorder: '#fde68a',
        isDashed: false,
        pillTitle: `⚠ Muộn · ${SHIFT_SHORT_LABEL[record.shift] || record.shift}`,
        pillSubtitle: `${formatTime(record.clockInAt || record.checkInAt)} (${record.actualHours || record.workedHours || 8}h)`,
        statusLabel: 'Đi muộn',
        statusColor: '#f59e0b',
      };
    }

    // Đi làm hoàn thành
    return {
      cellClass: 'cell-past-worked',
      pillBg: '#f0fdf4',
      pillColor: '#166534',
      pillBorder: '#86efac',
      isDashed: false,
      pillTitle: `✓ ${SHIFT_SHORT_LABEL[record.shift] || record.shift}`,
      pillSubtitle: `${formatTime(record.clockInAt || record.checkInAt)} · ${record.actualHours || record.workedHours || 8}h`,
      statusLabel: 'Đã hoàn thành công',
      statusColor: '#16a34a',
    };
  }

  // TRƯỜNG HỢP 3: TƯƠNG LAI (FUTURE - KẾ HOẠCH DỰ KIẾN)
  if (!record) {
    return {
      cellClass: 'cell-future cell-future-off',
      pillBg: 'transparent',
      pillColor: '#94a3b8',
      pillBorder: 'transparent',
      isDashed: false,
      pillTitle: '',
      pillSubtitle: '',
      statusLabel: 'Chưa xếp ca',
      statusColor: '#94a3b8',
    };
  }

  if (record.status === ATTENDANCE_STATUS.Leave) {
    return {
      cellClass: 'cell-future cell-future-leave',
      pillBg: '#fffbeb',
      pillColor: '#b45309',
      pillBorder: '#fde68a',
      isDashed: true,
      pillTitle: '📋 Đã duyệt nghỉ',
      pillSubtitle: 'Nghỉ phép',
      statusLabel: 'Nghỉ phép (Dự kiến)',
      statusColor: '#d97706',
    };
  }

  // Ca kế hoạch tương lai theo từng ca
  let shiftPlanColor = '#2563eb';
  let shiftPlanBorder = '#bfdbfe';
  let shiftTimeStr = '06:00 - 14:00';

  if (record.shift === SHIFT_CODE.Afternoon) {
    shiftPlanColor = '#c2410c';
    shiftPlanBorder = '#fed7aa';
    shiftTimeStr = '14:00 - 22:00';
  } else if (record.shift === SHIFT_CODE.Night) {
    shiftPlanColor = '#7e22ce';
    shiftPlanBorder = '#e9d5ff';
    shiftTimeStr = '22:00 - 06:00';
  }

  return {
    cellClass: 'cell-future cell-future-scheduled',
    pillBg: '#ffffff',
    pillColor: shiftPlanColor,
    pillBorder: shiftPlanBorder,
    isDashed: true,
    pillTitle: `🗓 ${SHIFT_SHORT_LABEL[record.shift] || record.shift} (Dự kiến)`,
    pillSubtitle: shiftTimeStr,
    statusLabel: 'Lịch ca dự kiến',
    statusColor: shiftPlanColor,
  };
};

export const AttendanceMonthCalendar: FC<AttendanceMonthCalendarProps> = ({
  currentMonth,
  attendanceRecords,
  onOpenLeaveModal,
  onOpenSwapModal,
  onSelectDay,
}) => {
  const startOfMonth = currentMonth.startOf('month');
  const daysInMonth = currentMonth.daysInMonth();
  const todayStr = dayjs().format('YYYY-MM-DD');

  // dayjs().day(): 0 = CN, 1 = T2, ..., 6 = T7
  // Muốn T2 là cột đầu tiên (index 0), CN là cột cuối (index 6)
  const firstDayOfWeek = (startOfMonth.day() + 6) % 7;

  // Lập bản đồ tra cứu record theo ngày (YYYY-MM-DD)
  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    attendanceRecords.forEach((r) => {
      if (!map.has(r.workDate)) {
        map.set(r.workDate, []);
      }
      map.get(r.workDate)!.push(r);
    });
    return map;
  }, [attendanceRecords]);

  // Sinh danh sách các ô trong lưới lịch
  const calendarCells = useMemo<CalendarCell[]>(() => {
    const cells: CalendarCell[] = [];

    // Các ô trống đầu tháng
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({
        type: 'padding-prev',
        key: `prev-${i}`,
      });
    }

    // Các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = currentMonth.date(day);
      const dateStr = dateObj.format('YYYY-MM-DD');
      const dayRecords = recordsMap.get(dateStr) || [];
      const isToday = dateStr === todayStr;

      cells.push({
        type: 'day',
        day,
        dateStr,
        isToday,
        records: dayRecords,
        key: dateStr,
      });
    }

    // Các ô trống cuối tháng để tròn tuần
    const totalCells = cells.length;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      cells.push({
        type: 'padding-next',
        key: `next-${i}`,
      });
    }

    return cells;
  }, [firstDayOfWeek, daysInMonth, currentMonth, recordsMap, todayStr]);

  return (
    <div className="attendance-calendar-container">
      {/* Header lịch */}
      <div className="calendar-header-bar">
        <div>
          <h3 className="calendar-title">Lịch làm việc tháng</h3>
          <p className="calendar-subtitle">
            Chi tiết công, ca làm việc (Sáng/Chiều/Đêm), ngày phép và làm thêm giờ
          </p>
        </div>

        <div className="calendar-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="btn-leave-action"
            onClick={onOpenLeaveModal}
          >
            Đăng ký nghỉ phép
          </Button>
          <Button
            icon={<SwapOutlined />}
            onClick={onOpenSwapModal}
          >
            Đổi ca / OT
          </Button>
        </div>
      </div>

      {/* Thanh chú thích trạng thái màu */}
      <div className="calendar-legend-bar">
        <span className="legend-label">Chú thích:</span>
        <div className="legend-item">
          <span className="legend-dot dot-worked" />
          <span>Đã đi làm</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-late" />
          <span>Đi muộn</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-absent" />
          <span>Vắng / Nghỉ</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-leave" />
          <span>Nghỉ phép</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-future" />
          <span>Kế hoạch tương lai</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-today" />
          <span>Hôm nay</span>
        </div>
      </div>

      {/* Grid lịch */}
      <div className="calendar-grid-wrap">
        {/* Hàng tiêu đề thứ */}
        <div className="calendar-weekday-row">
          {WEEKDAYS.map((w, idx) => (
            <div key={w} className={`weekday-cell ${idx >= 5 ? 'weekend' : ''}`}>
              {w}
            </div>
          ))}
        </div>

        {/* Lưới các ngày */}
        <div className="calendar-days-grid">
          {calendarCells.map((cell) => {
            if (cell.type !== 'day') {
              return <div key={cell.key} className="day-cell day-padding" />;
            }

            const { day, isToday, records, dateStr } = cell;
            const primaryRecord = records[0];
            const config = getShiftDisplayConfig(dateStr, isToday, primaryRecord);

            return (
              <div
                key={cell.key}
                className={`day-cell ${config.cellClass} ${records.length > 0 ? 'has-shift' : ''}`}
                onClick={() => onSelectDay?.(dateStr, primaryRecord || null)}
                title="Nhấn để xem chi tiết / Check-in / Check-out"
              >
                <div className="day-cell-top">
                  <span className={`day-number ${isToday ? 'today-badge' : ''}`}>
                    {day}
                  </span>
                  {isToday && <span className="today-label">Hôm nay</span>}
                </div>

                {primaryRecord ? (
                  <Popover
                    trigger="hover"
                    title={`Chi tiết ngày ${dayjs(dateStr).format('DD/MM/YYYY')}`}
                    content={
                      <div style={{ maxWidth: 260, fontSize: 13 }}>
                        <div style={{ fontWeight: 700, color: config.statusColor, marginBottom: 4 }}>
                          {config.statusLabel}
                        </div>
                        <div>Ca làm: <strong>{SHIFT_SHORT_LABEL[primaryRecord.shift] || primaryRecord.shift}</strong></div>
                        <div>Giờ vào: <strong>{formatTime(primaryRecord.clockInAt || primaryRecord.checkInAt)}</strong></div>
                        <div>Giờ ra: <strong>{formatTime(primaryRecord.clockOutAt || primaryRecord.checkOutAt)}</strong></div>
                        <div>Số giờ làm: <strong>{primaryRecord.actualHours || primaryRecord.workedHours || 8}h</strong></div>
                        {primaryRecord.overtimeHours > 0 && (
                          <div style={{ color: '#d97706', fontWeight: 600 }}>Tăng ca: +{primaryRecord.overtimeHours}h OT</div>
                        )}
                        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                          Trạng thái: <strong>{primaryRecord.status}</strong>
                        </div>
                      </div>
                    }
                  >
                    <div
                      className={`shift-pill ${config.isDashed ? 'pill-dashed' : ''}`}
                      style={{
                        backgroundColor: config.pillBg,
                        color: config.pillColor,
                        borderColor: config.pillBorder,
                      }}
                    >
                      <div className="shift-pill-title">
                        {config.pillTitle}
                      </div>
                      <div className="shift-pill-time">
                        {config.pillSubtitle}
                      </div>
                    </div>
                  </Popover>
                ) : (
                  <div className="empty-day-slot">
                    {dayjs(dateStr).isBefore(dayjs(), 'day') && (
                      <span className="empty-day-text">Nghỉ ca</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
