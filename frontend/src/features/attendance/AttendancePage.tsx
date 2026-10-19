import { useEffect, useMemo, useState, type FC } from 'react';
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Popconfirm,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  DollarOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import type { ToolbarFilter } from '@/components/TableToolbar';
import { AttendanceStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  canApprovePayment,
  canConfirmHours,
  approvePayrollPayment,
  approvePayrollPaymentBatch,
  confirmPayrollHours,
  fetchPayroll,
  generatePayroll,
  openHourAdjust,
} from '@/store/slices/payrollSlice';
import { clockInApi, clockOutApi, fetchAttendance, scheduleAttendance } from '@/store/slices/attendanceSlice';
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  PAYROLL_STATUS,
  PAYROLL_STATUS_COLOR,
  PAYROLL_STATUS_LABEL,
  SHIFT_CODE,
  SHIFT_SHORT_LABEL,
  USER_ROLE,
  USER_ROLE_LABEL,
  type AttendanceRecord,
  type AttendanceStatus,
  type PayrollRow,
  type PayrollStatus,
  type ShiftCode,
} from '@/types';
import { today } from '@/utils/dateUtils';
import { formatDate, formatPeriod, formatTime } from '@/utils/dateUtils';
import dayjs, { type Dayjs } from 'dayjs';
import { formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { HourAdjustModal } from './components/HourAdjustModal';
import { AttendanceRegisterTab } from './components/AttendanceRegisterTab';
import { PayrollTab } from './components/PayrollTab';
import './AttendancePage.css';

/** Kỳ lương hiện tại theo tháng thực (MM-YYYY). */
const CURRENT_PAYROLL_PERIOD = dayjs().format('MM-YYYY');

const { Text } = Typography;

const ATTENDANCE_DISPLAY_LIMIT = 600;
const DEFAULT_ATTENDANCE_FROM = dayjs().subtract(29, 'day');
const DEFAULT_ATTENDANCE_TO = dayjs().add(6, 'day');

const comparePayrollPeriodDesc = (a: string, b: string): number => {
  const [aMonth, aYear] = a.split('-').map(Number);
  const [bMonth, bYear] = b.split('-').map(Number);
  return bYear - aYear || bMonth - aMonth;
};

export const AttendancePage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { user, activeBranchId } = useAppSelector((state) => state.auth);
  const payrollRows = useAppSelector((state) => state.payroll.rows);
  const attendanceRecords = useAppSelector((state) => state.attendance.records);
  const attendanceLoading = useAppSelector((state) => state.attendance.loading);
  const attendanceError = useAppSelector((state) => state.attendance.error);
  const payrollLoading = useAppSelector((state) => state.payroll.loading);
  const payrollError = useAppSelector((state) => state.payroll.error);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | null>(activeBranchId);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [attendanceRange, setAttendanceRange] = useState<[Dayjs, Dayjs]>([
    DEFAULT_ATTENDANCE_FROM,
    DEFAULT_ATTENDANCE_TO,
  ]);
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<string | null>(null);
  const [payrollPeriod, setPayrollPeriod] = useState(CURRENT_PAYROLL_PERIOD);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('my-shifts');
  const isSelfServiceRole = user?.role === USER_ROLE.Cashier
    || user?.role === USER_ROLE.WarehouseKeeper;

  const handleClockIn = async (id: string): Promise<void> => {
    try {
      await dispatch(clockInApi(id)).unwrap();
      message.success('Đã check-in thành công.');
    } catch (e: any) {
      message.error(e?.message || 'Check-in thất bại');
    }
  };

  const handleClockOut = async (id: string): Promise<void> => {
    try {
      await dispatch(clockOutApi(id)).unwrap();
      message.success('Đã check-out thành công.');
    } catch (e: any) {
      message.error(e?.message || 'Check-out thất bại');
    }
  };

  useEffect(() => {
    if (user?.idNhanVien) {
      void dispatch(scheduleAttendance({ idNhanVien: user.idNhanVien, days: 7 }))
        .unwrap()
        .catch((e: any) => {
          console.warn('Không thể sinh lịch ca tự động:', e?.message || e);
        });
    }
  }, [dispatch, user?.idNhanVien]);

  useEffect(() => {
    void dispatch(fetchAttendance({
      from: attendanceRange[0].format('YYYY-MM-DD'),
      to: attendanceRange[1].format('YYYY-MM-DD'),
    }));
  }, [dispatch, attendanceRange]);

  useEffect(() => {
    void dispatch(fetchPayroll({
      scope: isSelfServiceRole ? 'SELF' : 'SCOPED',
      period: payrollPeriod,
    }));
  }, [dispatch, isSelfServiceRole, payrollPeriod]);

  const actor = useMemo(
    () => ({
      actorId: user?.idNhanVien ?? user?.id ?? '',
      actorName:
        user === null ? 'Không xác định' : `${user.fullName} (${user.employeeCode})`,
      actorRole: user?.role ?? USER_ROLE.Cashier,
      actorBranchId: activeBranchId ?? null,
    }),
    [user, activeBranchId],
  );

  const myAttendance = useMemo(
    () =>
      attendanceRecords
        .filter((record) => record.employeeId === (user?.idNhanVien ?? user?.id))
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .slice(0, ATTENDANCE_DISPLAY_LIMIT),
    [attendanceRecords, user?.idNhanVien, user?.id],
  );

  const attendanceRegister = useMemo(
    () =>
      attendanceRecords
        .filter((record) => {
          const matchSearch = matchKeyword(search, [
            record.employeeName,
            record.employeeCode,
          ]);
          const matchBranch =
            branchFilter === null || record.branchId === branchFilter;
          const matchShift = shiftFilter === null || record.shift === shiftFilter;
          const matchStatus = statusFilter === null || record.status === statusFilter;
          return matchSearch && matchBranch && matchShift && matchStatus;
        })
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .slice(0, ATTENDANCE_DISPLAY_LIMIT),
    [search, branchFilter, shiftFilter, statusFilter, attendanceRecords],
  );

  const payroll = useMemo(
    () =>
      payrollRows.filter((row) => {
        const matchSearch = matchKeyword(search, [row.employeeName, row.employeeCode]);
        const matchBranch =
          branchFilter === null || row.branchId === branchFilter;
        const matchStatus =
          payrollStatusFilter === null || row.status === payrollStatusFilter;
        return matchSearch && matchBranch && matchStatus;
      }).sort((a, b) => {
        const periodDiff = comparePayrollPeriodDesc(a.period, b.period);
        if (periodDiff !== 0) return periodDiff;
        return a.employeeName.localeCompare(b.employeeName);
      }),
    [payrollRows, search, branchFilter, payrollStatusFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const todayRecs = attendanceRecords.filter((r) => r.workDate === today());
    const scheduled = todayRecs.length;
    const present = todayRecs.filter((r) => r.status === ATTENDANCE_STATUS.Present).length;
    const late = todayRecs.filter((r) => r.status === ATTENDANCE_STATUS.Late).length;
    const pendingHours = payrollRows.filter(
      (r) => r.status === PAYROLL_STATUS.PendingConfirm,
    ).length;
    const pendingPayment = payrollRows.filter(
      (r) => r.status === PAYROLL_STATUS.Confirmed,
    ).length;

    return [
      {
        key: 'scheduled',
        title: 'Ca hôm nay',
        value: `${scheduled} ca`,
        hint: `${present} đã vào ca`,
      },
      {
        key: 'presentRate',
        title: 'Đúng giờ',
        value: `${present}/${scheduled}`,
        color: BRAND.success,
      },
      {
        key: 'late',
        title: 'Đi muộn hôm nay',
        value: `${late} ca`,
        color: late > 0 ? BRAND.warning : undefined,
      },
      {
        key: 'pendingPayment',
        title: 'Chờ thanh toán',
        value: `${pendingPayment} bảng`,
        color: pendingPayment > 0 ? BRAND.primaryRed : undefined,
        hint: `${pendingHours} chờ xác nhận giờ`,
      },
    ];
  }, [attendanceRecords, payrollRows]);

  const branches = useAppSelector((state) => state.branch.branches);
  const attendanceFilters: ToolbarFilter[] = [
    {
      key: 'branch',
      placeholder: 'Tất cả chi nhánh',
      value: branchFilter,
      onChange: setBranchFilter,
      options: branches.map((b) => ({ value: b.id, label: b.name })),
      span: 5,
    },
    {
      key: 'shift',
      placeholder: 'Ca làm việc',
      value: shiftFilter,
      onChange: setShiftFilter,
      options: Object.values(SHIFT_CODE).map((shift) => ({
        value: shift,
        label: SHIFT_SHORT_LABEL[shift],
      })),
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter,
      options: Object.values(ATTENDANCE_STATUS).map((status) => ({
        value: status,
        label: ATTENDANCE_STATUS_LABEL[status],
      })),
    },
  ];

  const payrollFilters: ToolbarFilter[] = [
    attendanceFilters[0] as ToolbarFilter,
    {
      key: 'payrollStatus',
      placeholder: 'Trạng thái duyệt',
      value: payrollStatusFilter,
      onChange: setPayrollStatusFilter,
      options: Object.values(PAYROLL_STATUS).map((status) => ({
        value: status,
        label: PAYROLL_STATUS_LABEL[status],
      })),
      span: 5,
    },
  ];

  const isOwnAndToday = (row: AttendanceRecord): boolean =>
    row.employeeId === (user?.idNhanVien ?? user?.id) && row.workDate === today();

  const isOwnAndCheckoutDay = (row: AttendanceRecord): boolean =>
    row.employeeId === (user?.idNhanVien ?? user?.id)
    && (row.workDate === today()
      || (row.shift === SHIFT_CODE.Night
        && dayjs(row.workDate).add(1, 'day').format('YYYY-MM-DD') === today()));

  const renderClockIn = (value: string | null, row: AttendanceRecord) => {
    if (
      value === null && isOwnAndToday(row)
      && (row.status === ATTENDANCE_STATUS.Scheduled || row.status === ATTENDANCE_STATUS.Present)
    ) {
      return (
        <Button
          type="primary"
          size="small"
          icon={<LoginOutlined />}
          onClick={() => handleClockIn(row.id)}
        >
          Check In
        </Button>
      );
    }
    return formatTime(value);
  };

  const renderClockOut = (value: string | null, row: AttendanceRecord) => {
    if (value === null && isOwnAndCheckoutDay(row) && row.clockInAt !== null) {
      return (
        <Button
          type="primary"
          size="small"
          icon={<LogoutOutlined />}
          onClick={() => handleClockOut(row.id)}
        >
          Check Out
        </Button>
      );
    }
    if (value === null && row.clockInAt === null) {
      return <Text type="secondary">Chưa check-in</Text>;
    }
    return formatTime(value);
  };

  const attendanceColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      width: 110,
      fixed: 'left',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      width: 230,
      render: (name: string, row) => (
        <span>
          <Text strong className="att-name">
            {name}
          </Text>
          <Text type="secondary" className="att-sub">
            {row.employeeCode}
          </Text>
        </span>
      ),
    },
    {
      title: 'Ca',
      dataIndex: 'shift',
      align: 'center',
      width: 90,
      render: (shift: ShiftCode) => (
        <Tag color={shift === SHIFT_CODE.Night ? 'geekblue' : 'gold'} className="tag-no-margin">
          {SHIFT_SHORT_LABEL[shift]}
        </Tag>
      ),
    },
    {
      title: 'Check In',
      dataIndex: 'clockInAt',
      align: 'center',
      width: 90,
      render: renderClockIn,
    },
    {
      title: 'Check Out',
      dataIndex: 'clockOutAt',
      align: 'center',
      width: 90,
      render: renderClockOut,
    },
    {
      title: 'Nghỉ',
      dataIndex: 'breakDuration',
      align: 'right',
      width: 70,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="numeric-cell">{value}h</Text>
        ),
    },
    {
      title: 'Thực tế',
      dataIndex: 'actualHours',
      align: 'right',
      width: 90,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {value.toFixed(1)}h
        </Text>
      ),
    },
    {
      title: 'Ngoài giờ',
      dataIndex: 'overtimeHours',
      align: 'right',
      width: 95,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text strong className="numeric-cell att-overtime">
            +{value}h
          </Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 140,
      render: (status: AttendanceStatus) => (
        <AttendanceStatusTag status={status} />
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      ellipsis: true,
      render: (value: string) =>
        value.length === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text type="secondary">{value}</Text>
        ),
    },
  ];

  const myShiftColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Ngày làm việc',
      dataIndex: 'workDate',
      width: 130,
      render: (value: string) => (
        <Text strong>{formatDate(value)}</Text>
      ),
    },
    {
      title: 'Ca',
      dataIndex: 'shift',
      align: 'center',
      width: 90,
      render: (shift: ShiftCode) => (
        <Tag color={shift === SHIFT_CODE.Night ? 'geekblue' : 'gold'}>
          {SHIFT_SHORT_LABEL[shift]}
        </Tag>
      ),
    },
    {
      title: 'Check In',
      dataIndex: 'clockInAt',
      align: 'center',
      width: 120,
      render: renderClockIn,
    },
    {
      title: 'Check Out',
      dataIndex: 'clockOutAt',
      align: 'center',
      width: 120,
      render: renderClockOut,
    },
    {
      title: 'Giờ làm',
      dataIndex: 'actualHours',
      align: 'right',
      width: 100,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {value > 0 ? `${value.toFixed(1)}h` : '—'}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 140,
      render: (status: AttendanceStatus) => (
        <AttendanceStatusTag status={status} />
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      render: (value: string) =>
        value ? <Text type="secondary">{value}</Text> : <Text type="secondary">—</Text>,
    },
  ];

  const handleConfirm = async (row: PayrollRow): Promise<void> => {
    try {
      await dispatch(confirmPayrollHours(row.id)).unwrap();
      message.success(`Đã xác nhận giờ làm cho ${row.employeeName}. Chờ duyệt chi.`);
    } catch (e: any) {
      message.error(e?.message || 'Lỗi xác nhận giờ làm');
    }
  };

  const handleApprove = async (row: PayrollRow): Promise<void> => {
    try {
      await dispatch(approvePayrollPayment(row.id)).unwrap();
      message.success(
        `Đã duyệt chi ${formatVND(row.netPay)} cho ${row.employeeName}. Tự động ghi Sổ Quỹ.`,
      );
    } catch (e: any) {
      message.error(e?.message || 'Lỗi duyệt chi lương');
    }
  };

  const handleApproveBatch = async (): Promise<void> => {
    if (selectedIds.length === 0) return;
    try {
      const rows = await dispatch(approvePayrollPaymentBatch(selectedIds)).unwrap();
      const totalAmount = rows.reduce((sum, r) => sum + r.netPay, 0);
      message.success(
        `Đã duyệt chi ${rows.length} bảng lương (tổng ${formatVND(
          totalAmount,
        )}). Tự động ghi Sổ Quỹ.`,
      );
      setSelectedIds([]);
    } catch (e: any) {
      message.error(e?.message || 'Lỗi duyệt chi hàng loạt');
    }
  };

  const handleGeneratePayroll = async (): Promise<void> => {
    try {
      await dispatch(generatePayroll(payrollPeriod)).unwrap();
      message.success(`Đã tạo bảng lương ${formatPeriod(payrollPeriod)} từ chấm công.`);
    } catch (e: any) {
      message.error(e?.message || 'Lỗi tạo bảng lương');
    }
  };

  const payrollColumns: ColumnsType<PayrollRow> = [
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      width: 230,
      fixed: 'left',
      render: (name: string, row) => (
        <span>
          <Text strong className="pay-name">
            {name}
          </Text>
          <Text type="secondary" className="pay-sub">
            {row.employeeCode} · {USER_ROLE_LABEL[row.role]}
          </Text>
        </span>
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 190,
      render: (value: string) => <Text className="pay-text-12-5">{value}</Text>,
    },
    {
      title: 'Kỳ lương',
      dataIndex: 'period',
      width: 110,
      sorter: (a, b) => a.period.localeCompare(b.period),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 150,
      render: (status: PayrollStatus) => (
        <Tag color={PAYROLL_STATUS_COLOR[status]} className="tag-no-margin">
          {PAYROLL_STATUS_LABEL[status]}
        </Tag>
      ),
    },
    {
      title: 'Số ca',
      dataIndex: 'totalShifts',
      align: 'center',
      width: 80,
      sorter: (a, b) => a.totalShifts - b.totalShifts,
    },
    {
      title: 'Giờ làm',
      key: 'hours',
      align: 'right',
      width: 130,
      render: (_, row) =>
        row.adjustedHours === null ? (
          <span className="numeric-cell">{row.totalHours.toFixed(1)}h</span>
        ) : (
          <Tooltip title={`Lý do: ${row.adjustReason}`}>
            <Space direction="vertical" size={0} className="pay-hours-stack">
              <Text strong className="numeric-cell pay-hours-adjusted">
                {row.adjustedHours.toFixed(1)}h
              </Text>
              <Text type="secondary" delete className="pay-hours-origin">
                {row.totalHours.toFixed(1)}h
              </Text>
            </Space>
          </Tooltip>
        ),
    },
    {
      title: 'Ngoài giờ',
      dataIndex: 'overtimeHours',
      align: 'right',
      width: 95,
      render: (value: number) => <span className="numeric-cell">{value}h</span>,
    },
    {
      title: 'Lương cứng',
      dataIndex: 'baseSalary',
      align: 'right',
      width: 130,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell">{formatVND(value)}</span>
        ),
    },
    {
      title: 'Lương theo ca',
      dataIndex: 'shiftPay',
      align: 'right',
      width: 130,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell">{formatVND(value)}</span>
        ),
    },
    {
      title: 'Ngoài giờ',
      dataIndex: 'overtimePay',
      align: 'right',
      width: 120,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell pay-overtime">{formatVND(value)}</span>
        ),
    },
    {
      title: 'Thưởng',
      dataIndex: 'bonus',
      align: 'right',
      width: 120,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell pay-bonus">+{formatVND(value)}</span>
        ),
    },
    {
      title: 'Trừ',
      dataIndex: 'deduction',
      align: 'right',
      width: 120,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Tooltip title="Trừ do đi muộn hoặc vắng không phép">
            <span className="numeric-cell pay-deduction">-{formatVND(value)}</span>
          </Tooltip>
        ),
    },
    {
      title: 'Thực nhận',
      dataIndex: 'netPay',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.netPay - b.netPay,
      render: (value: number) => (
        <Text strong className="numeric-cell pay-net">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, row) => {
        const canConfirm = canConfirmHours(
          row,
          actor.actorId,
          actor.actorRole,
          actor.actorBranchId,
        );
        const canApprove = canApprovePayment(row, actor.actorId, actor.actorRole);
        const isOwnPayroll =
          row.employeeId === (user?.idNhanVien ?? user?.id);

        return (
          <Space size={4}>
            {row.status === PAYROLL_STATUS.PendingConfirm && canConfirm && (
              <>
                <Tooltip title="Điều chỉnh giờ làm trước khi xác nhận">
                  <Button
                    type="text"
                    size="small"
                    onClick={() => dispatch(openHourAdjust(row.id))}
                  >
                    Sửa giờ
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Xác nhận giờ làm?"
                  description="Bảng lương sẽ chuyển sang chờ Kế toán duyệt chi."
                  okText="Xác nhận"
                  cancelText="Huỷ"
                  onConfirm={() => handleConfirm(row)}
                >
                  <Tooltip title="Xác nhận giờ làm (Tầng 1)">
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckCircleOutlined className="pay-action-confirm" />}
                    />
                  </Tooltip>
                </Popconfirm>
              </>
            )}

            {canApprove && (
              <Popconfirm
                title="Duyệt chi lương?"
                description={`Chi ${formatVND(row.netPay)} cho ${row.employeeName}.`}
                okText="Duyệt chi"
                cancelText="Huỷ"
                onConfirm={() => handleApprove(row)}
              >
                <Button type="primary" size="small" icon={<DollarOutlined />}>
                  Duyệt chi
                </Button>
              </Popconfirm>
            )}

            {isOwnPayroll && (
              <Tooltip title="Không ai được tự duyệt lương cho chính mình.">
                <Text type="secondary" className="pay-own-note">
                  Lương của bạn
                </Text>
              </Tooltip>
            )}

            {!isOwnPayroll && !canConfirm && !canApprove && (
              <Text type="secondary">—</Text>
            )}
          </Space>
        );
      },
    },
  ];

  const handleExportAttendance = (): void => {
    const data = activeTab === 'my-shifts' ? myAttendance : attendanceRegister;
    exportToExcel(
      data,
      [
        { header: 'Ngày', accessor: (row) => row.workDate },
        { header: 'Mã NV', accessor: (row) => row.employeeCode },
        { header: 'Nhân viên', accessor: (row) => row.employeeName },
        { header: 'Ca', accessor: (row) => SHIFT_SHORT_LABEL[row.shift] },
        {
          header: 'Giờ vào',
          accessor: (row) => (row.clockInAt === null ? '' : formatTime(row.clockInAt)),
        },
        {
          header: 'Giờ ra',
          accessor: (row) => (row.clockOutAt === null ? '' : formatTime(row.clockOutAt)),
        },
        { header: 'Giờ làm', accessor: (row) => row.workedHours },
        { header: 'Ngoài giờ', accessor: (row) => row.overtimeHours },
        {
          header: 'Trạng thái',
          accessor: (row) => ATTENDANCE_STATUS_LABEL[row.status],
        },
        { header: 'Ghi chú', accessor: (row) => row.note },
      ],
      'Bang cham cong Circle K',
    );
  };

  const handleExportPayroll = (): void => {
    exportToExcel(
      payroll,
      [
        { header: 'Kỳ lương', accessor: (row) => row.period },
        { header: 'Mã NV', accessor: (row) => row.employeeCode },
        { header: 'Nhân viên', accessor: (row) => row.employeeName },
        { header: 'Vai trò', accessor: (row) => USER_ROLE_LABEL[row.role] },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        {
          header: 'Loại hợp đồng',
          accessor: (row) => EMPLOYMENT_TYPE_LABEL[row.employmentType],
        },
        { header: 'Số ca', accessor: (row) => row.totalShifts },
        { header: 'Giờ hệ thống', accessor: (row) => row.totalHours },
        { header: 'Giờ điều chỉnh', accessor: (row) => row.adjustedHours ?? '' },
        { header: 'Lý do điều chỉnh', accessor: (row) => row.adjustReason },
        { header: 'Giờ ngoài', accessor: (row) => row.overtimeHours },
        { header: 'Lương cứng', accessor: (row) => row.baseSalary },
        { header: 'Lương theo ca', accessor: (row) => row.shiftPay },
        { header: 'Lương ngoài giờ', accessor: (row) => row.overtimePay },
        { header: 'Thưởng', accessor: (row) => row.bonus },
        { header: 'Khoản trừ', accessor: (row) => row.deduction },
        { header: 'Thực nhận', accessor: (row) => row.netPay },
        {
          header: 'Trạng thái',
          accessor: (row) => PAYROLL_STATUS_LABEL[row.status],
        },
        { header: 'Xác nhận giờ (T1)', accessor: (row) => row.confirmedBy ?? '' },
        { header: 'Duyệt chi (T2)', accessor: (row) => row.paidBy ?? '' },
      ],
      `Bang luong ${payrollPeriod}`,
    );
  };

  const approvableSelected = useMemo(
    () =>
      payroll.filter(
        (row) =>
          selectedIds.includes(row.id)
          && canApprovePayment(row, actor.actorId, actor.actorRole),
      ),
    [payroll, selectedIds, actor],
  );

  return (
    <>
      <PageHeader
        eyebrow="TÀI CHÍNH & BÁO CÁO / MODULE 11"
        title="Chấm công & bảng lương"
        description={`Theo dõi chấm công 30 ngày gần nhất, lịch 7 ngày tới và bảng lương ${formatPeriod(payrollPeriod)}.`}
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '8px 18px 8px' } }}>
        {attendanceError !== null && (
          <Alert
            type="error"
            showIcon
            className="attendance-load-alert"
            message="Không tải được dữ liệu chấm công"
            description={attendanceError}
            action={
              <Button
                size="small"
                onClick={() =>
                  void dispatch(
                    fetchAttendance({
                      from: attendanceRange[0].format('YYYY-MM-DD'),
                      to: attendanceRange[1].format('YYYY-MM-DD'),
                    }),
                  )
                }
              >
                Tải lại
              </Button>
            }
          />
        )}
        {payrollError !== null && (
          <Alert
            type="error"
            showIcon
            className="attendance-load-alert"
            message="Không tải được dữ liệu bảng lương"
            description={payrollError}
            action={
              <Button
                size="small"
                onClick={() =>
                  void dispatch(
                    fetchPayroll({
                      scope: isSelfServiceRole ? 'SELF' : 'SCOPED',
                      period: payrollPeriod,
                    }),
                  )
                }
              >
                Tải lại
              </Button>
            }
          />
        )}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'my-shifts',
              label: `Ca của tôi (${myAttendance.length})`,
              children: (
                <AttendanceRegisterTab
                  search={search}
                  onSearchChange={setSearch}
                  filters={[]}
                  attendanceRange={attendanceRange}
                  onRangeChange={setAttendanceRange}
                  onReset={() => setSearch('')}
                  onExport={handleExportAttendance}
                  columns={myShiftColumns}
                  dataSource={myAttendance}
                  loading={attendanceLoading}
                  scrollX={1000}
                  emptyText="Chưa có dữ liệu chấm công ca của bạn."
                />
              ),
            },
            ...(!isSelfServiceRole
              ? [
                  {
                    key: 'register',
                    label: `Bảng chấm công (${attendanceRegister.length})`,
                    children: (
                      <AttendanceRegisterTab
                        search={search}
                        onSearchChange={setSearch}
                        filters={attendanceFilters}
                        attendanceRange={attendanceRange}
                        onRangeChange={setAttendanceRange}
                        onReset={() => {
                          setSearch('');
                          setBranchFilter(null);
                          setShiftFilter(null);
                          setStatusFilter(null);
                          setAttendanceRange([DEFAULT_ATTENDANCE_FROM, DEFAULT_ATTENDANCE_TO]);
                        }}
                        onExport={handleExportAttendance}
                        columns={attendanceColumns}
                        dataSource={attendanceRegister}
                        loading={attendanceLoading}
                        scrollX={1420}
                      />
                    ),
                  },
                ]
              : []),
            {
              key: 'payroll',
              label: isSelfServiceRole
                ? `Lương của tôi ${formatPeriod(payrollPeriod)}`
                : `Bảng lương ${formatPeriod(payrollPeriod)}`,
              children: (
                <PayrollTab
                  search={search}
                  onSearchChange={setSearch}
                  filters={payrollFilters}
                  payrollPeriod={payrollPeriod}
                  onPeriodChange={setPayrollPeriod}
                  isSelfServiceRole={isSelfServiceRole}
                  approvableSelected={approvableSelected}
                  onGeneratePayroll={() => void handleGeneratePayroll()}
                  onApproveBatch={handleApproveBatch}
                  onExport={handleExportPayroll}
                  onReset={() => {
                    setSearch('');
                    setBranchFilter(null);
                    setPayrollStatusFilter(null);
                    setSelectedIds([]);
                  }}
                  columns={payrollColumns}
                  dataSource={payroll}
                  loading={payrollLoading}
                  selectedIds={selectedIds}
                  onSelectChange={setSelectedIds}
                  canApprovePaymentRow={(row) =>
                    canApprovePayment(row, actor.actorId, actor.actorRole)
                  }
                />
              ),
            },
          ]}
        />
      </Card>

      <HourAdjustModal />
    </>
  );
};
