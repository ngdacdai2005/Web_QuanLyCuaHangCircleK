import { useEffect, useMemo, useState, type FC } from 'react';
import { isInitialLoading } from '@/utils/tableLoading';
import {
  App as AntdApp,
  Avatar,
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  StopOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { RecordStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { nhanVienApi } from '@/api/nhanVien';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  deleteEmployeeThunk,
  fetchEmployees,
  setEmployeeModalOpen,
  setSelectedEmployee,
} from '@/store/slices/employeeSlice';
import { fetchBranches } from '@/store/slices/branchSlice';
import {
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_LABEL,
  RECORD_STATUS,
  SHIFT_CODE,
  SHIFT_LABEL,
  SHIFT_SHORT_LABEL,
  USER_ROLE_LABEL,
  type Employee,
  type ShiftCode,
} from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { compareDateDescWithId, formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { getErrorMessage } from '@/utils/apiError';
import { EmployeeFormModal } from './components/EmployeeFormModal';
import './EmployeesPage.css';

const { Text } = Typography;

const SHIFT_COLOR: Record<ShiftCode, string> = {
  MORNING: 'gold',
  AFTERNOON: 'orange',
  NIGHT: 'geekblue',
};

export const EmployeesPage: FC = () => {
  const dispatch = useAppDispatch();
  const { message, modal } = AntdApp.useApp();
  const { user, activeBranchId } = useAppSelector((state) => state.auth);
  const { employees, loading } = useAppSelector((state) => state.employee);
  const branchesState = useAppSelector((state) => state.branch.branches);
  const canManageAll = user?.role === 'ADMIN';

  const canManageRow = (row: Employee): boolean =>
      canManageAll ||
      (
          user?.role === 'QUAN_LY' &&
          row.role === 'THU_NGAN' &&
          row.branchId === user?.branchId
      );

  useEffect(() => {
    dispatch(fetchEmployees());
    if (branchesState.length === 0) {
      dispatch(fetchBranches());
    }
  }, [dispatch, branchesState.length]);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | null>(activeBranchId);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const scoped = useMemo(() => {
    const allowed = user?.allowedBranchIds ?? [];
    const enriched = employees.map((emp) => ({
      ...emp,
      branchName: emp.branchName || branchesState.find((b) => b.id === emp.branchId)?.name || '',
    }));
    if (allowed.length === 0) return enriched;
    return enriched.filter((employee) => employee.branchId !== null && allowed.includes(employee.branchId));
  }, [user?.allowedBranchIds, employees, branchesState]);

  const filtered = useMemo(
    () =>
      scoped.filter((employee) => {
        const matchSearch = matchKeyword(search, [
          employee.fullName,
          employee.code,
          employee.email,
          employee.phone,
          employee.position,
        ]);
        const matchBranch =
          branchFilter === null || employee.branchId === branchFilter;
        const matchShift = shiftFilter === null || employee.defaultShift === shiftFilter;
        const matchType = typeFilter === null || employee.employmentType === typeFilter;
        return matchSearch && matchBranch && matchShift && matchType;
      }).sort((a, b) => compareDateDescWithId(a, b, (row) => row.joinedAt)),
    [scoped, search, branchFilter, shiftFilter, typeFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const active = scoped.filter(
      (employee) => employee.status === RECORD_STATUS.Active,
    );
    const fullTime = active.filter(
      (employee) => employee.employmentType === EMPLOYMENT_TYPE.FullTime,
    );
    const nightShift = active.filter(
      (employee) => employee.defaultShift === SHIFT_CODE.Night,
    );
    const monthlyCost = active.reduce(
      (sum, employee) =>
        sum + (employee.baseSalary > 0 ? employee.baseSalary : employee.hourlyWage * 8 * 22),
      0,
    );

    return [
      {
        key: 'total',
        title: 'Tổng nhân sự đang làm',
        value: formatNumber(active.length),
        suffix: 'người',
        color: BRAND.primaryRed,
      },
      {
        key: 'fulltime',
        title: 'Lương cứng',
        value: formatNumber(fullTime.length),
        suffix: `/ ${active.length}`,
      },
      {
        key: 'night',
        title: 'Nhân sự trực ca đêm',
        value: formatNumber(nightShift.length),
        suffix: 'người',
        color: BRAND.info,
      },
      {
        key: 'cost',
        title: 'Chi phí nhân sự ước tính / tháng',
        value: formatVND(monthlyCost),
        color: BRAND.warning,
      },
    ];
  }, [scoped]);

  const branchOptions = useMemo(() => {
    const branches = branchesState;
    const allowed = user?.allowedBranchIds ?? [];
    const list =
      allowed.length === 0
        ? branches
        : branches.filter((branch) => allowed.includes(branch.id));
    return list.map((branch) => ({ value: branch.id, label: branch.name }));
  }, [branchesState, user?.allowedBranchIds]);

  const filters: ToolbarFilter[] = [
    {
      key: 'branch',
      placeholder: 'Chi nhánh',
      value: branchFilter,
      onChange: setBranchFilter,
      options: branchOptions,
      span: 6,
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
      key: 'type',
      placeholder: 'Hình thức trả lương',
      value: typeFilter,
      onChange: setTypeFilter,
      options: Object.values(EMPLOYMENT_TYPE).map((type) => ({
        value: type,
        label: EMPLOYMENT_TYPE_LABEL[type],
      })),
    },
  ];

  const handleEdit = (employee: Employee): void => {
    dispatch(setSelectedEmployee(employee));
    dispatch(setEmployeeModalOpen(true));
  };

  const handleAdd = (): void => {
    dispatch(setSelectedEmployee(null));
    dispatch(setEmployeeModalOpen(true));
  };

  const handleDelete = async (employee: Employee): Promise<void> => {
    try {
      await dispatch(deleteEmployeeThunk(employee.id)).unwrap();
      message.success(`Đã xoá nhân viên "${employee.fullName}" thành công.`);
      dispatch(fetchEmployees());
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Xoá nhân viên thất bại.'));
    }
  };

  const handleResetPassword = (employee: Employee): void => {
    modal.confirm({
      title: 'Đặt lại mật khẩu đăng nhập',
      content: `Đặt lại mật khẩu cho tài khoản "${employee.accountUsername || employee.code}" về mật khẩu mặc định (ChangeMe@123)?`,
      okText: 'Đặt lại',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await nhanVienApi.resetPassword(employee.id);
          message.success('Đặt lại mật khẩu thành công! Mật khẩu mới: ChangeMe@123');
        } catch (err: any) {
          message.error(err?.message || 'Không thể đặt lại mật khẩu');
        }
      },
    });
  };

  const handleToggleAccount = async (employee: Employee): Promise<void> => {
    try {
      await nhanVienApi.toggleAccount(employee.id);
      message.success('Cập nhật trạng thái tài khoản thành công!');
      dispatch(fetchEmployees());
    } catch (err: any) {
      message.error(err?.message || 'Không thể thay đổi trạng thái tài khoản');
    }
  };

  const columns: ColumnsType<Employee> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      width: 95,
      fixed: 'left',
      sorter: (a, b) => (a.code ?? '').localeCompare(b.code ?? ''),
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'fullName',
      width: 220,
      fixed: 'left',
      render: (name: string, row) => (
        <Space size={10}>
          <Avatar
            className="employee-avatar"
            size={36}
            src={row.avatarUrl || undefined}
          >
            {!row.avatarUrl && row.avatarText}
          </Avatar>
          <span className="employee-info">
            <Text strong className="employee-name">
              {name}
            </Text>
            <Text type="secondary" className="employee-sub">
              {row.position || '—'}
            </Text>
          </span>
        </Space>
      ),
    },
    {
      title: 'Tài khoản',
      key: 'account',
      width: 160,
      align: 'center',
      render: (_, row) =>
        row.hasAccount || row.accountUsername ? (
          <Space direction="vertical" size={2} align="center">
            <span className="mono-code" style={{ fontSize: 12 }}>
              <UserOutlined style={{ marginRight: 4 }} />
              {row.accountUsername}
            </span>
            <Tag color={row.accountStatus === 'ACTIVE' ? 'green' : 'error'} className="tag-no-margin">
              {row.accountStatus === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
            </Tag>
          </Space>
        ) : (
          <Tag color="default" className="tag-no-margin">
            Chưa cấp
          </Tag>
        ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 180,
      render: (value: string) => <Text className="emp-text-12-5">{value || 'Trụ sở chính'}</Text>,
    },
    {
      title: 'Vai trò hệ thống',
      dataIndex: 'role',
      width: 140,
      render: (role: Employee['role']) => (
        <Tag color="red" className="tag-no-margin">
          {USER_ROLE_LABEL[role]}
        </Tag>
      ),
    },
    {
      title: 'Ca mặc định',
      dataIndex: 'defaultShift',
      width: 170,
      render: (shift: ShiftCode) => (
        <Tag color={SHIFT_COLOR[shift]} className="tag-no-margin">
          {SHIFT_LABEL[shift]}
        </Tag>
      ),
    },
    {
      title: 'Hình thức trả lương',
      dataIndex: 'employmentType',
      width: 130,
      render: (type: Employee['employmentType']) => (
        <Tag
          color={type === EMPLOYMENT_TYPE.FullTime ? 'blue' : 'default'}
          className="tag-no-margin"
        >
          {EMPLOYMENT_TYPE_LABEL[type]}
        </Tag>
      ),
    },
    {
      title: 'Lương giờ',
      dataIndex: 'hourlyWage',
      align: 'right',
      width: 110,
      sorter: (a, b) => a.hourlyWage - b.hourlyWage,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Lương cứng',
      dataIndex: 'baseSalary',
      align: 'right',
      width: 130,
      sorter: (a, b) => a.baseSalary - b.baseSalary,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell">{formatVND(value)}</span>
        ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      width: 180,
      render: (_, row) => (
        <span>
          <Text className="emp-line">{row.phone}</Text>
          <Text type="secondary" className="emp-email">
            {row.email}
          </Text>
        </span>
      ),
    },
    {
      title: 'Vào làm',
      dataIndex: 'joinedAt',
      width: 110,
      sorter: (a, b) => a.joinedAt.localeCompare(b.joinedAt),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 130,
      fixed: 'right',
      render: (status: Employee['status']) => <RecordStatusTag status={status} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      width: 120,
      fixed: 'right',
      render: (_, row) => {
        if (!canManageRow(row)) {
          return null;
        }

        return (
          <Space size={2}>
            <Tooltip title="Chỉnh sửa hồ sơ">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined className="action-edit-icon" />}
                onClick={() => handleEdit(row)}
              />
            </Tooltip>

            {(row.hasAccount || row.accountUsername) && (
              <>
                <Tooltip title="Đặt lại mật khẩu (ChangeMe@123)">
                  <Button
                    type="text"
                    size="small"
                    icon={<KeyOutlined style={{ color: '#d97706' }} />}
                    onClick={() => handleResetPassword(row)}
                  />
                </Tooltip>

                <Tooltip title={row.accountStatus === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}>
                  <Button
                    type="text"
                    size="small"
                    icon={
                      row.accountStatus === 'ACTIVE' ? (
                        <StopOutlined style={{ color: '#ef4444' }} />
                      ) : (
                        <CheckCircleOutlined style={{ color: '#10b981' }} />
                      )
                    }
                    onClick={() => handleToggleAccount(row)}
                  />
                </Tooltip>
              </>
            )}

            <Popconfirm
              title="Xoá nhân viên?"
              description={`Xoá "${row.fullName}" khỏi danh sách?`}
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(row)}
            >
              <Tooltip title="Xóa nhân viên">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined className="action-delete-icon" />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'Mã NV', accessor: (row) => row.code },
        { header: 'Họ tên', accessor: (row) => row.fullName },
        { header: 'Vị trí', accessor: (row) => row.position },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        { header: 'Vai trò', accessor: (row) => USER_ROLE_LABEL[row.role] },
        { header: 'Ca mặc định', accessor: (row) => SHIFT_SHORT_LABEL[row.defaultShift] },
        {
          header: 'Hình thức trả lương',
          accessor: (row) => EMPLOYMENT_TYPE_LABEL[row.employmentType],
        },
        { header: 'Lương giờ', accessor: (row) => row.hourlyWage },
        { header: 'Lương cứng', accessor: (row) => row.baseSalary },
        { header: 'Điện thoại', accessor: (row) => row.phone },
        { header: 'Email', accessor: (row) => row.email },
        { header: 'Ngày vào làm', accessor: (row) => row.joinedAt },
      ],
      'Danh sach nhan vien Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC & NHÂN SỰ / MODULE 4"
        title="Quản lý nhân viên & tài khoản"
        description="Hồ sơ nhân sự, chức danh, chi nhánh làm việc và cấp tài khoản đăng nhập hệ thống."
        extra={
          <Space wrap>
            {(canManageAll || user?.role === 'QUAN_LY') && (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                >
                  Thêm nhân viên
                </Button>
            )}

            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {scoped.length} nhân sự
            </Tag>
          </Space>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo tên, mã NV, email, SĐT, chức vụ..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setBranchFilter(null);
            setShiftFilter(null);
            setTypeFilter(null);
          }}
        />

        <Table<Employee>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          loading={isInitialLoading(loading, employees)}
          scroll={{ x: 1700 }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `${total} nhân sự`,
          }}
        />
      </Card>

      <EmployeeFormModal />
    </>
  );
};
