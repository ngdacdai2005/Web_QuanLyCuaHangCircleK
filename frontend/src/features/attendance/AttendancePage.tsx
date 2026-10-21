import { useEffect, useMemo, useState, type FC } from 'react';
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  LoginOutlined,
  LogoutOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ToolbarFilter } from '@/components/TableToolbar';
import { AttendanceStatusTag } from '@/components/StatusTag';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchEmployees } from '@/store/slices/employeeSlice';
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
import { AttendanceWelcomeBanner } from './components/AttendanceWelcomeBanner';
import { AttendanceKpiStrip } from './components/AttendanceKpiStrip';
import { AttendanceMonthCalendar } from './components/AttendanceMonthCalendar';
import { AttendanceSidebarWidgets } from './components/AttendanceSidebarWidgets';
import { LeaveRequestModal } from './components/LeaveRequestModal';
import { LeaveApprovalModal } from './components/LeaveApprovalModal';
import { ShiftSwapModal } from './components/ShiftSwapModal';
import { ShiftRequestListModal } from './components/ShiftRequestListModal';
import { ShiftActionModal } from './components/ShiftActionModal';
import { donNghiPhepApi } from '@/api/donNghiPhep';
import type { LeaveRequestRecord } from '@/types/employeeTypes';
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

  const employees = useAppSelector((state) => state.employee.employees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

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
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveApprovalOpen, setLeaveApprovalOpen] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapModalType, setSwapModalType] = useState<'SWAP' | 'OT'>('SWAP');
  const [shiftListModalOpen, setShiftListModalOpen] = useState(false);
  const [shiftListType, setShiftListType] = useState<'SWAP' | 'OT'>('SWAP');
  const [shiftActionOpen, setShiftActionOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<Dayjs | null>(null);
  const [modalDefaultShift, setModalDefaultShift] = useState<ShiftCode | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('overview');
  const isSelfServiceRole = user?.role === USER_ROLE.Cashier
    || user?.role === USER_ROLE.WarehouseKeeper;

  const leaveStats = useMemo(() => {
    const approved = leaveRequests.filter((r) => r.trangThai === 'APPROVED').length;
    const pending = leaveRequests.filter((r) => r.trangThai === 'PENDING').length;
    const rejected = leaveRequests.filter((r) => r.trangThai === 'REJECTED').length;
    return { approved, pending, rejected };
  }, [leaveRequests]);

  const currentViewEmployeeId = selectedEmployeeId || (user?.idNhanVien ?? user?.id);
  const currentViewEmployee = employees.find((e) => e.id === currentViewEmployeeId);
  const currentViewName = currentViewEmployee
    ? `${currentViewEmployee.fullName} (${currentViewEmployee.code})`
    : (user?.fullName || 'Nhân viên Circle K');

  const handleSelectDay = (dateStr: string, record: AttendanceRecord | null) => {
    setSelectedDateStr(dateStr);
    setSelectedRecord(record);
    setShiftActionOpen(true);
  };

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

  const loadLeaveRequests = async () => {
    try {
      if (!isSelfServiceRole) {
        const res = await donNghiPhepApi.getAll({
          idChiNhanh: branchFilter || undefined,
        });
        setLeaveRequests(res);
      } else {
        const res = await donNghiPhepApi.getMyRequests();
        setLeaveRequests(res);
      }
    } catch (e) {
      console.error('Lỗi tải danh sách đơn nghỉ phép:', e);
    }
  };

  useEffect(() => {
    void loadLeaveRequests();
  }, [isSelfServiceRole, branchFilter]);

  // Tải danh sách nhân viên nếu có quyền quản lý để cho phép chọn xem lịch
  useEffect(() => {
    if (!isSelfServiceRole && employees.length === 0) {
      void dispatch(fetchEmployees());
    }
  }, [dispatch, isSelfServiceRole, employees.length]);

  // Sinh lịch ca tự động cho nhân viên đang xem (hoặc bản thân)
  useEffect(() => {
    if (currentViewEmployeeId) {
      void dispatch(scheduleAttendance({ idNhanVien: currentViewEmployeeId, days: 7 }))
        .unwrap()
        .catch((e: any) => {
          console.warn('Không thể sinh lịch ca tự động:', e?.message || e);
        });
    }
  }, [dispatch, currentViewEmployeeId]);

  useEffect(() => {
    void dispatch(fetchAttendance({
      from: attendanceRange[0].format('YYYY-MM-DD'),
      to: attendanceRange[1].format('YYYY-MM-DD'),
    }));
  }, [dispatch, attendanceRange]);

  useEffect(() => {
    const monthStart = currentMonth.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
    const monthEnd = currentMonth.endOf('month').add(7, 'day').format('YYYY-MM-DD');
    void dispatch(fetchAttendance({
      from: monthStart,
      to: monthEnd,
    }));
  }, [dispatch, currentMonth]);

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

  const branches = useAppSelector((state) => state.branch.branches);

  const monthPrefix = currentMonth.format('YYYY-MM');
  const myMonthRecords = useMemo(() => {
    return attendanceRecords.filter(
      (record) => record.employeeId === currentViewEmployeeId && record.workDate.startsWith(monthPrefix),
    );
  }, [attendanceRecords, currentViewEmployeeId, monthPrefix]);

  const completedCount = useMemo(
    () =>
      myMonthRecords.filter(
        (r) => r.status === ATTENDANCE_STATUS.Present || Boolean(r.clockInAt),
      ).length,
    [myMonthRecords],
  );

  const monthOtHours = useMemo(
    () => myMonthRecords.reduce((acc, cur) => acc + (cur.overtimeHours || 0), 0),
    [myMonthRecords],
  );

  const todayShift = useMemo(() => {
    const todayStr = today();
    return attendanceRecords.find((r) => r.employeeId === currentViewEmployeeId && r.workDate === todayStr);
  }, [attendanceRecords, currentViewEmployeeId]);

  const activeBranchName = useMemo(() => {
    if (!activeBranchId) return 'Toàn chuỗi Circle K';
    const b = branches.find((item) => item.id === activeBranchId);
    return b ? `${b.code} - ${b.name}` : 'Chi nhánh làm việc';
  }, [branches, activeBranchId]);
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
    <div className="attendance-page-container">
      <Card styles={{ body: { padding: '12px 20px' } }} className="attendance-card-wrapper">
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
              key: 'overview',
              label: (
                <span>
                  <CalendarOutlined style={{ marginRight: 6 }} />
                  Lịch công &amp; Tổng quan cá nhân
                </span>
              ),
              children: (
                <div className="attendance-overview-tab">
                  {/* Banner chào mừng & chọn tháng */}
                  <AttendanceWelcomeBanner
                    userName={currentViewName}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                    todayShift={todayShift}
                    onClockIn={handleClockIn}
                    onClockOut={handleClockOut}
                    loading={attendanceLoading}
                  />

                  {/* Thanh chọn nhân viên xem lịch (Dành cho Admin / Quản lý / Kế toán) */}
                  {!isSelfServiceRole && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        backgroundColor: '#ffffff',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        marginBottom: 16,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <Space size={10} align="center">
                        <UserOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                          Xem lịch công của:
                        </span>
                        <Select
                          style={{ width: 340 }}
                          value={currentViewEmployeeId}
                          onChange={(val) => setSelectedEmployeeId(val)}
                          showSearch
                          placeholder="Chọn nhân viên..."
                          filterOption={(input, option) =>
                            (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={[
                            {
                              value: user?.idNhanVien ?? user?.id,
                              label: `👤 Lịch của tôi (${user?.fullName || 'Tôi'})`,
                            },
                            ...employees
                              .filter((e) => e.id !== (user?.idNhanVien ?? user?.id))
                              .map((e) => ({
                                value: e.id,
                                label: `${e.fullName} (${e.code}) — ${USER_ROLE_LABEL[e.role] || e.role}`,
                              })),
                          ]}
                        />
                      </Space>

                      {selectedEmployeeId && selectedEmployeeId !== (user?.idNhanVien ?? user?.id) && (
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          onClick={() => setSelectedEmployeeId(null)}
                        >
                          Quay lại lịch của tôi
                        </Button>
                      )}

                      <Button
                        type={leaveStats.pending > 0 ? 'primary' : 'default'}
                        danger={leaveStats.pending > 0}
                        onClick={() => setLeaveApprovalOpen(true)}
                        style={{ fontWeight: 600 }}
                      >
                        Duyệt đơn nghỉ phép {leaveStats.pending > 0 ? `(${leaveStats.pending} chờ)` : ''}
                      </Button>
                    </div>
                  )}

                  {/* Dải 5 thẻ KPI màu sắc */}
                  <AttendanceKpiStrip
                    totalTargetDays={24}
                    completedDays={completedCount}
                    actualWorkedDays={completedCount}
                    overtimeHours={monthOtHours}
                    totalShifts={myMonthRecords.length}
                    branchName={activeBranchName}
                    leaveDaysTaken={leaveStats.approved}
                    remainingLeaveDays={Math.max(0, 12 - leaveStats.approved)}
                  />

                  {/* Bố cục 2 cột: Cột trái 70% Lịch làm việc tháng, Cột phải 30% Widget trạng thái */}
                  <div className="attendance-main-split">
                    <div className="attendance-split-left">
                      <AttendanceMonthCalendar
                        currentMonth={currentMonth}
                        attendanceRecords={myMonthRecords}
                        onOpenLeaveModal={() => {
                          setModalDefaultDate(null);
                          setLeaveModalOpen(true);
                        }}
                        onOpenSwapModal={() => {
                          setModalDefaultDate(null);
                          setModalDefaultShift(undefined);
                          setSwapModalType('SWAP');
                          setSwapModalOpen(true);
                        }}
                        onSelectDay={handleSelectDay}
                      />
                    </div>
                    <div className="attendance-split-right">
                      <AttendanceSidebarWidgets
                        onOpenLeaveList={() => setLeaveApprovalOpen(true)}
                        onOpenSwapList={() => {
                          setShiftListType('SWAP');
                          setShiftListModalOpen(true);
                        }}
                        onOpenOtList={() => {
                          setShiftListType('OT');
                          setShiftListModalOpen(true);
                        }}
                        leaveApprovedCount={leaveStats.approved}
                        leavePendingCount={leaveStats.pending}
                        leaveRejectedCount={leaveStats.rejected}
                        swapApprovedCount={1}
                        swapPendingCount={0}
                        otApprovedCount={0}
                        otPendingCount={1}
                        todayShift={todayShift}
                        onClockIn={handleClockIn}
                        onClockOut={handleClockOut}
                        isManager={!isSelfServiceRole}
                      />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'my-shifts',
              label: `Danh sách ca (${myAttendance.length})`,
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
                    label: (
                      <span>
                        <UnorderedListOutlined style={{ marginRight: 6 }} />
                        Bảng chấm công chi nhánh ({attendanceRegister.length})
                      </span>
                    ),
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
              label: (
                <span>
                  <DollarOutlined style={{ marginRight: 6 }} />
                  {isSelfServiceRole
                    ? `Lương của tôi ${formatPeriod(payrollPeriod)}`
                    : `Bảng lương ${formatPeriod(payrollPeriod)}`}
                </span>
              ),
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
      <LeaveRequestModal
        open={leaveModalOpen}
        defaultDate={modalDefaultDate}
        idNhanVien={currentViewEmployeeId}
        idChiNhanh={activeBranchId || undefined}
        onClose={() => {
          setLeaveModalOpen(false);
          setModalDefaultDate(null);
        }}
        onSubmitSuccess={() => {
          void loadLeaveRequests();
          const monthStart = currentMonth.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
          const monthEnd = currentMonth.endOf('month').add(7, 'day').format('YYYY-MM-DD');
          void dispatch(fetchAttendance({
            from: monthStart,
            to: monthEnd,
          }));
        }}
      />
      <LeaveApprovalModal
        open={leaveApprovalOpen}
        onClose={() => setLeaveApprovalOpen(false)}
        isManager={!isSelfServiceRole}
        branchId={branchFilter || activeBranchId}
        onOpenCreateModal={() => setLeaveModalOpen(true)}
        onUpdated={() => {
          void loadLeaveRequests();
          const monthStart = currentMonth.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
          const monthEnd = currentMonth.endOf('month').add(7, 'day').format('YYYY-MM-DD');
          void dispatch(fetchAttendance({
            from: monthStart,
            to: monthEnd,
          }));
        }}
      />
      <ShiftRequestListModal
        open={shiftListModalOpen}
        type={shiftListType}
        onClose={() => setShiftListModalOpen(false)}
        onOpenCreateModal={() => {
          setSwapModalType(shiftListType);
          setSwapModalOpen(true);
        }}
        isManager={!isSelfServiceRole}
      />
      <ShiftSwapModal
        open={swapModalOpen}
        type={swapModalType}
        defaultDate={modalDefaultDate}
        defaultShift={modalDefaultShift}
        onClose={() => {
          setSwapModalOpen(false);
          setModalDefaultDate(null);
          setModalDefaultShift(undefined);
        }}
      />
      <ShiftActionModal
        open={shiftActionOpen}
        onClose={() => setShiftActionOpen(false)}
        dateStr={selectedDateStr}
        record={selectedRecord}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        onOpenLeaveWithDate={(date) => {
          setModalDefaultDate(date);
          setLeaveModalOpen(true);
        }}
        onOpenSwapWithDate={(date, shift) => {
          setModalDefaultDate(date);
          setModalDefaultShift(shift);
          setSwapModalType('SWAP');
          setSwapModalOpen(true);
        }}
        branchName={activeBranchName}
        loading={attendanceLoading}
      />
    </div>
  );
};
