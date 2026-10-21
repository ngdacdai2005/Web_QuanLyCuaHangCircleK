import { useState, useEffect, type FC } from 'react';
import {
  Modal,
  Button,
  Tag,
  Alert,
  Popconfirm,
  Input,
  Select,
  message,
} from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  LoginOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  FormOutlined,
  HourglassOutlined,
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
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [explanationType, setExplanationType] = useState('MISSED_CHECKOUT');
  const [explanationReason, setExplanationReason] = useState('');
  const [explanationLoading, setExplanationLoading] = useState(false);

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
  const isPast = dateObj.isBefore(dayjs(), 'day');

  const shiftInfo = getShiftBadge(record?.shift);
  const hasClockedIn = Boolean(record?.clockInAt);
  const hasClockedOut = Boolean(record?.clockOutAt);

  const formattedDate = dateObj.format('dddd, [ngày] DD/MM/YYYY');
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Xác định khung giờ kế hoạch (Quy định)
  let plannedStartStr = record?.checkInAt ? formatTime(record.checkInAt) : '06:00';
  let plannedEndStr = record?.checkOutAt ? formatTime(record.checkOutAt) : '14:00';
  if (!record?.checkInAt) {
    if (record?.shift === SHIFT_CODE.Morning) {
      plannedStartStr = '06:00';
      plannedEndStr = '14:00';
    } else if (record?.shift === SHIFT_CODE.Afternoon) {
      plannedStartStr = '14:00';
      plannedEndStr = '22:00';
    } else if (record?.shift === SHIFT_CODE.Night) {
      plannedStartStr = '22:00';
      plannedEndStr = '06:00';
    }
  }

  // Tính toán thời gian cho ca hôm nay
  let workedHoursStr = '00 giờ 00 phút';
  let isLateCheckIn = false;
  let lateDurationStr = '';
  let isEarlyCheckOut = false;
  let earlyRemainingStr = '';

  if (isToday && record?.clockInAt) {
    const clockInMoment = dayjs(record.clockInAt);
    const now = dayjs();
    const elapsedMinutes = Math.max(0, now.diff(clockInMoment, 'minute'));
    const h = Math.floor(elapsedMinutes / 60);
    const m = elapsedMinutes % 60;
    workedHoursStr = `${h.toString().padStart(2, '0')} giờ ${m.toString().padStart(2, '0')} phút`;

    // Kiểm tra đi muộn (> 15 phút so với giờ bắt đầu ca quy định)
    if (record.checkInAt) {
      const plannedStartMoment = dayjs(record.checkInAt);
      const diffStartMin = clockInMoment.diff(plannedStartMoment, 'minute');
      if (diffStartMin > 15) {
        isLateCheckIn = true;
        const lateH = Math.floor(diffStartMin / 60);
        const lateM = diffStartMin % 60;
        lateDurationStr = `${lateH > 0 ? `${lateH} giờ ` : ''}${lateM} phút`;
      }
    }

    // Kiểm tra về sớm (nếu bấm check-out trước giờ tan ca)
    if (record.checkOutAt) {
      const plannedEndMoment = dayjs(record.checkOutAt);
      if (now.isBefore(plannedEndMoment)) {
        isEarlyCheckOut = true;
        const earlyDiffMin = plannedEndMoment.diff(now, 'minute');
        const eH = Math.floor(earlyDiffMin / 60);
        const eM = earlyDiffMin % 60;
        earlyRemainingStr = `${eH > 0 ? `${eH} giờ ` : ''}${eM} phút`;
      }
    }
  }

  // Tag trạng thái tiếng Việt cho ca quá khứ
  const getPastStatusTag = () => {
    if (!record) return <Tag color="default">Không xếp ca</Tag>;
    if (record.status === 'LEAVE') return <Tag color="orange">Nghỉ phép</Tag>;
    if (record.status === 'ABSENT') return <Tag color="error">Vắng mặt (Không phép)</Tag>;

    if (hasClockedIn && hasClockedOut) {
      if (record.status === 'LATE') {
        return <Tag color="warning">Đi làm muộn</Tag>;
      }
      return <Tag color="success">Đã hoàn thành</Tag>;
    }

    if (hasClockedIn && !hasClockedOut) {
      return <Tag color="error">Thiếu Check-out (Quên chấm)</Tag>;
    }

    if (!hasClockedIn && hasClockedOut) {
      return <Tag color="error">Thiếu Check-in</Tag>;
    }

    return <Tag color="error">Chưa chấm công</Tag>;
  };

  // Xử lý gửi giải trình điều chỉnh công
  const handleSendExplanation = async () => {
    if (!explanationReason.trim()) {
      message.warning('Vui lòng nhập lý do / nội dung giải trình!');
      return;
    }
    setExplanationLoading(true);
    setTimeout(() => {
      setExplanationLoading(false);
      setExplanationOpen(false);
      setExplanationReason('');
      message.success('Đã gửi yêu cầu giải trình & điều chỉnh công tới Quản lý cửa hàng!');
    }, 600);
  };

  return (
    <>
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
        width={520}
        className="shift-action-modal"
        onCancel={onClose}
      >
        <div className="shift-modal-body">
          {/* Card tổng quan ngày & địa điểm */}
          <div className="shift-overview-card">
            <div className="shift-date-line">{capitalizedDate}</div>
            <div className="shift-badge-line">
              <Tag color={shiftInfo.color} style={{ fontSize: 13, padding: '4px 10px', fontWeight: 600 }}>
                {shiftInfo.label} ({plannedStartStr} - {plannedEndStr})
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

          {/* TRƯỜNG HỢP 1: NGÀY HÔM NAY */}
          {isToday && (
            <div className="today-action-section">
              {/* Bộ đếm thời gian: Giờ hiện tại & Thời gian đã làm việc */}
              <div className="time-display-container">
                <div className="time-card live-card">
                  <div className="time-card-label">
                    <ClockCircleOutlined style={{ marginRight: 4 }} /> Thời gian hiện tại
                  </div>
                  <div className="time-card-value">{liveTime}</div>
                </div>

                {hasClockedIn && !hasClockedOut && (
                  <div className="time-card worked-card">
                    <div className="time-card-label">
                      <HourglassOutlined style={{ marginRight: 4 }} /> Đã làm việc (Tạm tính)
                    </div>
                    <div className="time-card-value worked-value">{workedHoursStr}</div>
                  </div>
                )}
              </div>

              {record ? (
                <div className="shift-schedule-compare">
                  {/* Bảng so sánh Kế hoạch vs Thực tế */}
                  <div className="compare-grid">
                    <div className="compare-col">
                      <span className="compare-label">Giờ vào dự kiến:</span>
                      <span className="compare-val">{plannedStartStr}</span>
                    </div>
                    <div className="compare-col">
                      <span className="compare-label">Check-in thực tế:</span>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        <span className="compare-val" style={{ color: hasClockedIn ? '#10b981' : '#64748b' }}>
                          {hasClockedIn ? formatTime(record.clockInAt) : 'Chưa chấm'}
                        </span>
                        {isLateCheckIn && (
                          <span className="mini-late-pill">Muộn {lateDurationStr}</span>
                        )}
                      </div>
                    </div>
                    <div className="compare-col">
                      <span className="compare-label">Giờ ra dự kiến:</span>
                      <span className="compare-val">{plannedEndStr}</span>
                    </div>
                    <div className="compare-col">
                      <span className="compare-label">Check-out thực tế:</span>
                      <span className="compare-val" style={{ color: hasClockedOut ? '#10b981' : '#64748b' }}>
                        {hasClockedOut ? formatTime(record.clockOutAt) : hasClockedIn ? 'Đang làm' : 'Chưa chấm'}
                      </span>
                    </div>
                  </div>

                  {/* THÔNG BÁO TRẠNG THÁI CA THIẾT KẾ ĐỒNG BỘ HIỆN ĐẠI (THAY THẾ 2 ALERT XẾP CHỒNG) */}
                  {hasClockedIn && !hasClockedOut && (
                    <div className="current-shift-status-card">
                      <div className="status-card-header">
                        <div className="status-live-badge">
                          <span className="pulse-indicator" />
                          <span>ĐANG TRONG CA LÀM VIỆC</span>
                        </div>
                        {isLateCheckIn ? (
                          <Tag color="warning" className="status-tag-late">
                            <WarningOutlined style={{ marginRight: 4 }} /> Vào muộn {lateDurationStr}
                          </Tag>
                        ) : (
                          <Tag color="success" className="status-tag-ontime">
                            Đúng giờ
                          </Tag>
                        )}
                      </div>

                      <div className="status-card-body">
                        <div className="status-info-row">
                          <span>Đã vào ca lúc <strong>{formatTime(record.clockInAt)}</strong></span>
                          {isLateCheckIn && (
                            <span className="late-hint-text">(Giờ quy định: {plannedStartStr})</span>
                          )}
                        </div>
                        <div className="status-help-text">
                          Hãy nhấn nút Check-out khi hết ca để ghi nhận đầy đủ giờ công.
                        </div>
                      </div>
                    </div>
                  )}

                  {hasClockedIn && hasClockedOut && (
                    <div className="current-shift-status-card completed">
                      <div className="status-card-header">
                        <div className="status-live-badge completed">
                          <CheckCircleOutlined style={{ color: '#16a34a', marginRight: 6 }} />
                          <span>CA LÀM VIỆC ĐÃ HOÀN THÀNH</span>
                        </div>
                        {isLateCheckIn && (
                          <Tag color="warning" className="status-tag-late">
                            Vào muộn {lateDurationStr}
                          </Tag>
                        )}
                      </div>
                      <div className="status-card-body">
                        <div className="completed-summary-row">
                          <span>Vào: <strong>{formatTime(record.clockInAt)}</strong></span>
                          <span>•</span>
                          <span>Ra: <strong>{formatTime(record.clockOutAt)}</strong></span>
                          <span>•</span>
                          <span>Tổng: <strong style={{ color: '#16a34a' }}>{record.actualHours || record.workedHours || 8}h làm việc</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Thao tác Chấm công */}
                  <div className="clock-actions-wrap" style={{ marginTop: 14 }}>
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
                        {/* Nếu về sớm: Có Popconfirm xác nhận tránh bấm nhầm */}
                        {isEarlyCheckOut ? (
                          <Popconfirm
                            title="Xác nhận Check-out sớm?"
                            description={
                              <div style={{ maxWidth: 260 }}>
                                Ca làm của bạn kết thúc lúc <strong>{plannedEndStr}</strong> (còn khoảng <strong>{earlyRemainingStr}</strong> nữa). Bạn có chắc chắn muốn kết thúc ca sớm không?
                              </div>
                            }
                            okText="Xác nhận về sớm"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                            onConfirm={async () => {
                              await onClockOut(record.id);
                              onClose();
                            }}
                          >
                            <Button
                              type="primary"
                              size="large"
                              block
                              className="btn-large-checkout"
                              icon={<LogoutOutlined />}
                              loading={loading}
                            >
                              Check-out tan ca
                            </Button>
                          </Popconfirm>
                        ) : (
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
                            Check-out tan ca (Hết giờ làm)
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
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

          {/* TRƯỜNG HỢP 2: LỊCH SỬ CHẤM CÔNG (NGÀY QUÁ KHỨ & TƯƠNG LAI CÓ LỊCH) */}
          {!isToday && record && (
            <div className="shift-history-section">
              <h4 className="section-title">Nhật ký chấm công</h4>
              <div className="history-grid">
                <div className="history-item">
                  <span className="history-label">Giờ vào dự kiến:</span>
                  <span className="history-value">{plannedStartStr}</span>
                </div>
                <div className="history-item">
                  <span className="history-label">Giờ vào thực tế:</span>
                  <span className="history-value">
                    {hasClockedIn ? formatTime(record.clockInAt) : 'Chưa chấm'}
                  </span>
                </div>
                <div className="history-item">
                  <span className="history-label">Giờ ra dự kiến:</span>
                  <span className="history-value">{plannedEndStr}</span>
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
                    {isFuture ? (
                      <Tag color="processing">Lịch dự kiến</Tag>
                    ) : (
                      getPastStatusTag()
                    )}
                  </span>
                </div>
              </div>

              {/* Cảnh báo nếu ca quá khứ có bất thường (quên check-out, vắng mặt) */}
              {isPast && (hasClockedIn && !hasClockedOut) && (
                <Alert
                  type="warning"
                  showIcon
                  message="Thiếu lượt Check-out"
                  description="Bạn đã check-in nhưng chưa ghi nhận giờ ra ca. Hãy gửi giải trình để Quản lý bổ sung giờ công cho bạn."
                  style={{ marginTop: 10, borderRadius: 8 }}
                />
              )}

              {/* Nút gửi yêu cầu giải trình / điều chỉnh công (CHỈ HIỆN KHI LÀ NGÀY QUÁ KHỨ) */}
              {isPast && (
                <div style={{ marginTop: 12 }}>
                  <Button
                    block
                    icon={<FormOutlined />}
                    style={{ borderColor: '#6366f1', color: '#4f46e5', fontWeight: 600 }}
                    onClick={() => setExplanationOpen(true)}
                  >
                    Yêu cầu giải trình / Điều chỉnh công
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TRƯỜNG HỢP 3: CA TƯƠNG LAI — TIỆN ÍCH ĐỔI CA / NGHỈ PHÉP */}
          {isFuture && record && (
            <div className="future-shift-section" style={{ marginTop: 14 }}>
              {/* Thông báo tinh tế, hài hòa với form chi tiết (thay cho hộp Alert thô) */}
              <div className="future-plan-hint-card">
                <div className="hint-card-title">
                  <CalendarOutlined style={{ color: '#0284c7', marginRight: 6 }} />
                  <span>Ca làm việc theo kế hoạch</span>
                </div>
                <div className="hint-card-desc">
                  Ca làm việc này đã được xếp lịch trước. Nếu có việc đột xuất, bạn có thể nộp đơn xin nghỉ hoặc gửi yêu cầu đổi ca cho đồng nghiệp.
                </div>
              </div>

              <div className="future-actions-bar">
                <Button
                  size="large"
                  icon={<SwapOutlined />}
                  style={{ flex: 1, height: 44, borderRadius: 8, fontWeight: 600 }}
                  onClick={() => {
                    onClose();
                    onOpenSwapWithDate?.(dateObj, record?.shift);
                  }}
                >
                  Yêu cầu đổi ca này
                </Button>
                <Button
                  size="large"
                  type="primary"
                  ghost
                  icon={<CalendarOutlined />}
                  style={{ flex: 1, height: 44, borderRadius: 8, fontWeight: 600 }}
                  onClick={() => {
                    onClose();
                    onOpenLeaveWithDate?.(dateObj);
                  }}
                >
                  Xin nghỉ phép ngày này
                </Button>
              </div>
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

      {/* Modal gửi giải trình điều chỉnh công */}
      <Modal
        open={explanationOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <FormOutlined style={{ color: '#4f46e5' }} />
            <span>Yêu cầu giải trình / Điều chỉnh công</span>
          </div>
        }
        centered
        destroyOnHidden
        onCancel={() => setExplanationOpen(false)}
        onOk={handleSendExplanation}
        confirmLoading={explanationLoading}
        okText="Gửi yêu cầu tới Quản lý"
        cancelText="Hủy"
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <Alert
            type="info"
            message={`Ngày cần giải trình: ${capitalizedDate}`}
            description="Yêu cầu của bạn sẽ được gửi trực tiếp tới Quản lý cửa hàng Circle K để phê duyệt bổ sung giờ công."
            showIcon
          />

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#334155' }}>
              Loại điều chỉnh:
            </label>
            <Select
              style={{ width: '100%' }}
              value={explanationType}
              onChange={(val) => setExplanationType(val)}
              options={[
                { value: 'MISSED_CHECKOUT', label: 'Quên bấm Check-out khi tan ca' },
                { value: 'MISSED_CHECKIN', label: 'Quên bấm Check-in khi vào ca' },
                { value: 'LATE_REASON', label: 'Giải trình vào ca muộn (Có lý do chính đáng)' },
                { value: 'OT_UNLOGGED', label: 'Bổ sung giờ làm thêm (OT) chưa ghi nhận' },
                { value: 'OTHER', label: 'Lý do khác' },
              ]}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#334155' }}>
              Nội dung giải trình chi tiết:
            </label>
            <Input.TextArea
              rows={4}
              placeholder="Vui lòng nêu rõ lý do và thời gian thực tế bạn đã làm việc (ví dụ: Tan ca lúc 14:05 nhưng do máy POS bận bàn giao nên quên bấm Check-out...)"
              value={explanationReason}
              onChange={(e) => setExplanationReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};
