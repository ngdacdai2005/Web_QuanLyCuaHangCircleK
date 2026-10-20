import { useEffect, useState, type FC } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleFilled,
  CheckOutlined,
  KeyOutlined,
  LockOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createEmployee,
  fetchEmployees,
  setEmployeeModalOpen,
  updateEmployeeThunk,
} from '@/store/slices/employeeSlice';
import { fetchBranches } from '@/store/slices/branchSlice';
import {
  BRANCH_KIND,
  EMPLOYEE_POSITIONS,
  EMPLOYMENT_TYPE,
  POSITION_ROLE_MAP,
  RECORD_STATUS,
  SHIFT_CODE,
  SHIFT_LABEL,
  USER_ROLE,
  USER_ROLE_LABEL,
  positionForRole,
  type EmployeeFormValues,
  type UserRole,
} from '@/types';
import { today } from '@/utils/dateUtils';
import './EmployeeFormModal.css';

const { Text } = Typography;

const GENDER_OPTIONS = [
  { value: 'Nam', label: 'Nam' },
  { value: 'Nữ', label: 'Nữ' },
  { value: 'Khác', label: 'Khác' },
];

const CONTRACT_OPTIONS = [
  { value: EMPLOYMENT_TYPE.FullTime, label: 'Chính thức (Lương cứng theo tháng)' },
  { value: EMPLOYMENT_TYPE.PartTime, label: 'Bán thời gian (Lương theo giờ)' },
];

const SHIFT_OPTIONS = Object.values(SHIFT_CODE).map((shift) => ({
  value: shift,
  label: SHIFT_LABEL[shift],
}));

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Đang hoạt động' },
  { value: 'Inactive', label: 'Ngừng hoạt động' },
];

const generateNextEmployeeCode = (employees: Array<{ code: string }>): string => {
  let maxNum = 0;
  for (const emp of employees) {
    if (!emp.code) continue;
    const match = emp.code.trim().match(/^NV-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  let nextNum = maxNum + 1;
  let candidate = `NV-${String(nextNum).padStart(4, '0')}`;
  while (employees.some((e) => e.code?.toUpperCase() === candidate)) {
    nextNum += 1;
    candidate = `NV-${String(nextNum).padStart(4, '0')}`;
  }
  return candidate;
};

const WIZARD_STEPS = [
  { step: 0, title: 'Thông tin cá nhân' },
  { step: 1, title: 'Thông tin công việc' },
  { step: 2, title: 'Thông tin tài khoản' },
  { step: 3, title: 'Thông tin khác' },
  { step: 4, title: 'Xác nhận' },
];

export const EmployeeFormModal: FC = () => {
  const [form] = Form.useForm<EmployeeFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { isModalOpen, selectedEmployee, employees } = useAppSelector(
    (state) => state.employee,
  );
  const branches = useAppSelector((state) => state.branch.branches);
  const user = useAppSelector((state) => state.auth.user);
  const isEditing = selectedEmployee !== null;

  const isManager = user?.role === 'QUAN_LY';
  const createAccount = Form.useWatch('createAccount', form);
  const watchPosition = Form.useWatch('position', form);
  const watchRole = Form.useWatch('role', form);
  const watchEmploymentType = Form.useWatch('employmentType', form);
  const watchAvatarUrl = Form.useWatch('avatarUrl', form);
  const watchFullName = Form.useWatch('fullName', form);

  // Vai trò hệ thống được suy ra từ Chức vụ (position) đã chọn, hoặc từ role hiện thời
  const effectiveRole: UserRole = (
    (watchPosition && POSITION_ROLE_MAP[watchPosition]) ||
    watchRole ||
    (form.getFieldValue('role') as UserRole) ||
    USER_ROLE.Cashier
  ) as UserRole;

  // Lọc chi nhánh theo vai trò: THU_KHO chỉ được chọn Kho tổng
  const filterBranchesByRole = (role: string) => {
    let filtered = branches.filter((b) => b.status === RECORD_STATUS.Active);
    if (isManager) {
      filtered = filtered.filter((b) => b.id === user?.branchId);
    }
    if (role === USER_ROLE.WarehouseKeeper) {
      return filtered.filter((b) => b.kind === BRANCH_KIND.DistributionCenter);
    }
    return filtered;
  };

  // Tự động đồng bộ role vào form field khi position thay đổi
  useEffect(() => {
    if (watchPosition && POSITION_ROLE_MAP[watchPosition]) {
      const targetRole = POSITION_ROLE_MAP[watchPosition];
      if (form.getFieldValue('role') !== targetRole) {
        form.setFieldValue('role', targetRole);
      }
    }
  }, [watchPosition, form]);

  // Tải chi nhánh nếu chưa có khi mở modal
  useEffect(() => {
    if (isModalOpen && branches.length === 0) {
      dispatch(fetchBranches());
    }
  }, [isModalOpen, branches.length, dispatch]);

  // Khởi tạo dữ liệu form CHỈ khi modal mở hoặc selectedEmployee thay đổi
  useEffect(() => {
    if (!isModalOpen) return;
    setCurrentStep(0);

    if (selectedEmployee !== null) {
      form.setFieldsValue({
        ...selectedEmployee,
        dateOfBirth: selectedEmployee.dateOfBirth ? (dayjs(selectedEmployee.dateOfBirth) as any) : undefined,
        joinedAt: selectedEmployee.joinedAt ? (dayjs(selectedEmployee.joinedAt) as any) : undefined,
        citizenIdDate: selectedEmployee.citizenIdDate ? (dayjs(selectedEmployee.citizenIdDate) as any) : undefined,
        createAccount: selectedEmployee.hasAccount,
        username: selectedEmployee.accountUsername || '',
        initialPassword: '',
      });
      return;
    }

    form.resetFields();
    const autoCode = generateNextEmployeeCode(employees);
    const defaultRole = USER_ROLE.Cashier;
    const defaultPos = positionForRole(defaultRole);

    form.setFieldsValue({
      code: autoCode,
      role: defaultRole,
      position: defaultPos,
      employmentType: EMPLOYMENT_TYPE.FullTime,
      defaultShift: SHIFT_CODE.Morning,
      status: RECORD_STATUS.Active,
      gender: 'Nam',
      joinedAt: dayjs(today()) as any,
      branchId: isManager && user?.branchId ? user.branchId : (branches[0]?.id || ''),
      hourlyWage: 25000,
      baseSalary: 6500000,
      createAccount: true,
      username: autoCode.toLowerCase(),
      initialPassword: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, selectedEmployee]);

  const handlePositionChange = (position: string) => {
    const role = POSITION_ROLE_MAP[position] || USER_ROLE.Cashier;
    form.setFieldValue('role', role);
    const availableBranches = filterBranchesByRole(role);
    const currentBranchId = form.getFieldValue('branchId');
    if (['ADMIN', 'KE_TOAN'].includes(role)) {
      form.setFieldValue('branchId', null);
    } else if (!availableBranches.some((b) => b.id === currentBranchId)) {
      form.setFieldValue('branchId', availableBranches[0]?.id || null);
    }
  };

  const handleEmailBlur = () => {
    const email = form.getFieldValue('email');
    const currentUsername = form.getFieldValue('username');
    if (email && (!currentUsername || currentUsername.startsWith('nv-'))) {
      const suggested = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (suggested) {
        form.setFieldValue('username', suggested);
      }
    }
  };

  // Xác thực trước khi sang bước tiếp theo
  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['fullName', 'phone', 'email']);
      } else if (currentStep === 1) {
        await form.validateFields(['code', 'position', 'employmentType', 'branchId', 'joinedAt', 'defaultShift']);
      } else if (currentStep === 2) {
        if (createAccount || (isEditing && selectedEmployee?.hasAccount)) {
          await form.validateFields(['username']);
        }
      } else if (currentStep === 3) {
        await form.validateFields(['status']);
      }
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    } catch {
      // Form validation failed - Antd will highlight invalid fields
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Xác thực dữ liệu trước khi gửi
      try {
        await form.validateFields();
      } catch (validationErr: any) {
        if (validationErr?.errorFields?.length > 0) {
          const fieldName = validationErr.errorFields[0].name[0];
          if (['fullName', 'phone', 'email', 'citizenId', 'gender'].includes(fieldName)) {
            setCurrentStep(0);
          } else if (['code', 'position', 'employmentType', 'branchId', 'joinedAt', 'defaultShift', 'baseSalary', 'hourlyWage'].includes(fieldName)) {
            setCurrentStep(1);
          } else if (['username', 'initialPassword'].includes(fieldName)) {
            setCurrentStep(2);
          } else if (['status'].includes(fieldName)) {
            setCurrentStep(3);
          }
          message.warning(`Vui lòng kiểm tra: ${validationErr.errorFields[0].errors[0]}`);
          setSubmitting(false);
          return;
        }
      }

      const rawValues = form.getFieldsValue(true);
      const formattedValues: any = {
        ...rawValues,
        role: rawValues.role || effectiveRole,
        dateOfBirth: rawValues.dateOfBirth ? dayjs(rawValues.dateOfBirth).format('YYYY-MM-DD') : undefined,
        joinedAt: rawValues.joinedAt ? dayjs(rawValues.joinedAt).format('YYYY-MM-DD') : today(),
        citizenIdDate: rawValues.citizenIdDate ? dayjs(rawValues.citizenIdDate).format('YYYY-MM-DD') : undefined,
      };

      if (isEditing && selectedEmployee) {
        await dispatch(updateEmployeeThunk({ id: selectedEmployee.id, values: formattedValues })).unwrap();
        message.success('Cập nhật thông tin nhân viên thành công!');
      } else {
        await dispatch(createEmployee(formattedValues)).unwrap();
        message.success(
          formattedValues.createAccount
            ? 'Thêm nhân viên & cấp tài khoản thành công!'
            : 'Thêm nhân viên mới thành công!'
        );
      }
      dispatch(fetchEmployees());
      dispatch(setEmployeeModalOpen(false));
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi lưu thông tin nhân viên.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentValues = form.getFieldsValue(true);
  const selectedBranchObj = branches.find((b) => b.id === currentValues.branchId);

  return (
    <Modal
      open={isModalOpen}
      title={isEditing ? `Cập nhật nhân viên ${selectedEmployee?.code}` : 'Thêm mới nhân viên'}
      width={920}
      footer={null}
      destroyOnHidden
      className="employee-wizard-modal"
      onCancel={() => dispatch(setEmployeeModalOpen(false))}
    >
      <div className="employee-wizard-layout">
        {/* Cột Stepper bên trái */}
        <div className="employee-wizard-sidebar">
          {WIZARD_STEPS.map((s) => {
            const isCompleted = currentStep > s.step;
            const isActive = currentStep === s.step;
            const canClick = currentStep > s.step; // Chỉ cho phép quay lại bước đã hoàn thành
            return (
              <div
                key={s.step}
                className={`wizard-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${!canClick && !isActive ? 'disabled' : ''}`}
                onClick={() => {
                  if (canClick) setCurrentStep(s.step);
                }}
                title={
                  canClick
                    ? `Quay lại ${s.title}`
                    : isActive
                      ? s.title
                      : 'Hoàn thành bước hiện tại và nhấn "Tiếp tục >" để mở khóa'
                }
              >
                <div className="wizard-step-badge">
                  {isCompleted ? <CheckOutlined /> : s.step + 1}
                </div>
                <span>{s.title}</span>
              </div>
            );
          })}
        </div>

        {/* Vùng nội dung form bên phải */}
        <div className="employee-wizard-content">
          <Form form={form} layout="vertical" className="employee-form-body">
            {/* Hidden field để AntD Form luôn theo dõi và lưu trữ role */}
            <Form.Item name="role" hidden>
              <Input />
            </Form.Item>

            {/* BƯỚC 1: Thông tin cá nhân */}
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              <div className="wizard-step-header">
                <h3 className="wizard-step-title">Thông tin cá nhân</h3>
                <div className="wizard-step-desc">Điền đầy đủ họ tên, thông tin liên hệ và định danh cá nhân</div>
              </div>

              {/* Avatar preview & input URL */}
              <div className="avatar-upload-section">
                <div className="avatar-preview-box">
                  {watchAvatarUrl ? (
                    <img src={watchAvatarUrl} alt="Avatar preview" />
                  ) : (
                    watchFullName?.charAt(0)?.toUpperCase() || <UserOutlined />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <Form.Item name="avatarUrl" label="Link ảnh đại diện (URL)" style={{ marginBottom: 0 }}>
                    <Input placeholder="https://example.com/avatar.jpg" />
                  </Form.Item>
                </div>
              </div>

              <Row gutter={16}>
                <Col span={14}>
                  <Form.Item
                    name="fullName"
                    label="Họ và tên"
                    rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                  >
                    <Input placeholder="VD: Nguyễn Văn A" />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="gender" label="Giới tính">
                    <Select options={GENDER_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="phone"
                    label="Số điện thoại"
                    rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
                  >
                    <Input placeholder="VD: 0912345678" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Vui lòng nhập email' },
                      { type: 'email', message: 'Email không hợp lệ' },
                    ]}
                  >
                    <Input placeholder="VD: annguyen@circlek.vn" onBlur={handleEmailBlur} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="citizenId" label="Số CCCD (12 số)">
                    <Input placeholder="Nhập 12 số CCCD" maxLength={12} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="citizenIdDate" label="Ngày cấp">
                    <DatePicker style={{ width: '100%' }} placeholder="dd/mm/yyyy" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="citizenIdPlace" label="Nơi cấp">
                    <Input placeholder="VD: Cục CS QLHC..." />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="permanentAddress" label="Địa chỉ thường trú">
                    <Input placeholder="Nhập địa chỉ thường trú" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="currentAddress" label="Địa chỉ hiện tại">
                    <Input placeholder="Nhập địa chỉ hiện tại" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="note" label="Ghi chú">
                <Input.TextArea rows={2} placeholder="Nhập ghi chú thêm (nếu có)..." />
              </Form.Item>
            </div>

            {/* BƯỚC 2: Thông tin công việc */}
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <div className="wizard-step-header">
                <h3 className="wizard-step-title">Thông tin công việc</h3>
                <div className="wizard-step-desc">Thiết lập chi nhánh, chức vụ, hợp đồng và chế độ đãi ngộ</div>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="code"
                    label="Mã nhân viên"
                    tooltip="Mã nhân viên tự động sinh theo mẫu NV-XXXX. Bạn có thể chỉnh sửa nếu có mã riêng."
                    rules={[{ required: true, message: 'Vui lòng nhập mã NV' }]}
                  >
                    <Input placeholder="VD: NV-0001" />
                  </Form.Item>
                </Col>
                  <Col span={12}>
                    <Form.Item
                      name="employmentType"
                      label="Loại hợp đồng"
                      rules={[{ required: true, message: 'Chọn loại hợp đồng' }]}
                    >
                      <Select options={CONTRACT_OPTIONS} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="position"
                      label="Chức vụ"
                      rules={[{ required: true, message: 'Vui lòng chọn chức vụ' }]}
                    >
                      <Select
                        placeholder="Chọn chức vụ"
                        onChange={handlePositionChange}
                        options={EMPLOYEE_POSITIONS.map((pos) => ({
                          value: pos,
                          label: pos,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="branchId"
                      label="Chi nhánh làm việc"
                      rules={[
                        {
                          required: !['ADMIN', 'KE_TOAN'].includes(effectiveRole || ''),
                          message: 'Vui lòng chọn chi nhánh',
                        },
                      ]}
                    >
                      <Select
                        placeholder="Chọn chi nhánh"
                        disabled={['ADMIN', 'KE_TOAN'].includes(effectiveRole || '')}
                        options={filterBranchesByRole(effectiveRole || '').map((b) => ({
                          value: b.id,
                          label: `${b.code} - ${b.name}`,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="joinedAt"
                      label="Ngày vào công ty"
                      rules={[{ required: true, message: 'Chọn ngày vào' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="defaultShift"
                      label="Ca làm việc mặc định"
                      rules={[{ required: true, message: 'Chọn ca mặc định' }]}
                    >
                      <Select options={SHIFT_OPTIONS} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  {watchEmploymentType === EMPLOYMENT_TYPE.FullTime ? (
                    <Col span={12}>
                      <Form.Item
                        name="baseSalary"
                        label="Lương cứng (VNĐ/tháng)"
                        rules={[{ required: true, message: 'Nhập lương cứng' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          step={500000}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                        />
                      </Form.Item>
                    </Col>
                  ) : (
                    <Col span={12}>
                      <Form.Item
                        name="hourlyWage"
                        label="Lương theo giờ (VNĐ/h)"
                        rules={[{ required: true, message: 'Nhập lương giờ' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          step={1000}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                        />
                      </Form.Item>
                    </Col>
                  )}
                  <Col span={12}>
                    <Form.Item label="Vai trò hệ thống tương ứng">
                      <Input
                        value={
                          effectiveRole
                            ? `${USER_ROLE_LABEL[effectiveRole] || effectiveRole} (${effectiveRole})`
                            : ''
                        }
                        disabled
                        prefix={<LockOutlined style={{ color: '#0284c7' }} />}
                        style={{ backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 600 }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
            </div>

            {/* BƯỚC 3: Thông tin tài khoản */}
            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              <div className="wizard-step-header">
                <h3 className="wizard-step-title">Thông tin tài khoản</h3>
                <div className="wizard-step-desc">Thiết lập tài khoản đăng nhập và phân quyền hệ thống cho nhân viên</div>
              </div>

              {(!isEditing || !selectedEmployee?.hasAccount) && (
                <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Form.Item name="createAccount" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {isEditing ? 'Cấp tài khoản đăng nhập cho nhân viên này' : 'Cấp tài khoản đăng nhập cho nhân viên này ngay bây giờ'}
                  </span>
                </div>
              )}

              {isEditing && selectedEmployee?.hasAccount && (
                <div style={{ marginBottom: 16 }}>
                  <Space align="center" size={8}>
                    <Text strong>Trạng thái tài khoản:</Text>
                    <Tag color={selectedEmployee.accountStatus === 'ACTIVE' ? 'green' : 'error'}>
                      {selectedEmployee.accountStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                    </Tag>
                  </Space>
                </div>
              )}

              {createAccount || (isEditing && selectedEmployee?.hasAccount) ? (
                <>
                  {!isEditing && (
                    <Alert
                      className="account-init-alert"
                      icon={<KeyOutlined style={{ color: '#d97706', fontSize: 18 }} />}
                      showIcon
                      message="Mật khẩu khởi tạo"
                      description="Có thể để trống để hệ thống cấp mật khẩu mặc định: ChangeMe@123"
                    />
                  )}

                  <Form.Item
                    name="username"
                    label="Tên đăng nhập"
                    rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="VD: annguyen hoặc nv-0001"
                    />
                  </Form.Item>

                  <Form.Item
                    name="initialPassword"
                    label={isEditing ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo (tùy chọn)'}
                    extra={isEditing ? 'Để trống nếu không muốn đổi mật khẩu. Nhập tối thiểu 6 ký tự nếu muốn cấp lại.' : 'Mặc định: ChangeMe@123 nếu để trống'}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder={isEditing ? 'Nhập mật khẩu mới...' : 'Mặc định: ChangeMe@123'}
                    />
                  </Form.Item>

                  <Form.Item label="Vai trò / Quyền hạn được cấp">
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px', fontWeight: 600 }}>
                        {USER_ROLE_LABEL[effectiveRole] || effectiveRole} ({effectiveRole})
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                      * Vai trò được tự động phân quyền theo chức danh công việc ở Bước 2.
                    </Text>
                  </Form.Item>
                </>
              ) : (
                <Alert
                  type="info"
                  message="Không cấp tài khoản đăng nhập"
                  description="Nhân viên này sẽ chỉ được lưu hồ sơ nhân sự mà không thể đăng nhập vào hệ thống ERP. Bạn có thể bật công tắc phía trên để cấp tài khoản bất cứ lúc nào."
                  showIcon
                />
              )}
            </div>

            {/* BƯỚC 4: Thông tin khác */}
            <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
              <div className="wizard-step-header">
                <h3 className="wizard-step-title">Thông tin khác</h3>
                <div className="wizard-step-desc">Thiết lập tài khoản ngân hàng nhận lương và trạng thái làm việc</div>
              </div>

              <Form.Item
                name="status"
                label="Trạng thái làm việc"
                rules={[{ required: true, message: 'Chọn trạng thái' }]}
              >
                <Select options={STATUS_OPTIONS} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="bankName" label="Tên Ngân hàng">
                    <Input placeholder="VD: Vietcombank, MB Bank, Techcombank..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="bankAccount" label="Số tài khoản">
                    <Input placeholder="Số tài khoản nhận lương" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* BƯỚC 5: Xác nhận thông tin */}
            <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
              <div className="confirm-header-box">
                <CheckCircleFilled className="confirm-success-icon" />
                <div className="confirm-title">Xác nhận thông tin</div>
                <div className="confirm-subtitle">Vui lòng kiểm tra lại toàn bộ thông tin trước khi lưu hồ sơ</div>
              </div>

              <div className="confirm-grid">
                <div className="confirm-card">
                  <div className="confirm-card-title">Thông tin cơ bản</div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Họ và tên:</span>
                    <span className="confirm-card-value">{currentValues.fullName || '—'}</span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Giới tính:</span>
                    <span className="confirm-card-value">{currentValues.gender || '—'}</span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">SĐT:</span>
                    <span className="confirm-card-value">{currentValues.phone || '—'}</span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Email:</span>
                    <span className="confirm-card-value">{currentValues.email || '—'}</span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Số CCCD:</span>
                    <span className="confirm-card-value">{currentValues.citizenId || '—'}</span>
                  </div>
                </div>

                <div className="confirm-card">
                  <div className="confirm-card-title">Công việc & Tổ chức</div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Mã NV:</span>
                    <span className="confirm-card-value" style={{ color: '#dc2626' }}>
                      {currentValues.code || '—'}
                    </span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Loại HĐ:</span>
                    <span className="confirm-card-value">
                      {currentValues.employmentType === EMPLOYMENT_TYPE.FullTime ? 'Chính thức' : 'Bán thời gian'}
                    </span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Chi nhánh:</span>
                    <span className="confirm-card-value">{selectedBranchObj?.name || 'Trụ sở chính'}</span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Chức vụ:</span>
                    <span className="confirm-card-value">{watchPosition || currentValues.position || '—'}</span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Vai trò:</span>
                    <span className="confirm-card-value">
                      {USER_ROLE_LABEL[effectiveRole] || effectiveRole} ({effectiveRole})
                    </span>
                  </div>
                </div>

                <div className="confirm-card">
                  <div className="confirm-card-title">Tài khoản đăng nhập</div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Tài khoản ERP:</span>
                    <span className="confirm-card-value">
                      {currentValues.createAccount || (isEditing && selectedEmployee?.hasAccount) ? 'Đã cấp / Có' : 'Chưa cấp'}
                    </span>
                  </div>
                  {(currentValues.createAccount || (isEditing && selectedEmployee?.hasAccount)) && (
                    <>
                      <div className="confirm-card-row">
                        <span className="confirm-card-label">Tên đăng nhập:</span>
                        <span className="confirm-card-value" style={{ fontFamily: 'monospace' }}>
                          {currentValues.username || '—'}
                        </span>
                      </div>
                      <div className="confirm-card-row">
                        <span className="confirm-card-label">Mật khẩu:</span>
                        <span className="confirm-card-value">
                          {currentValues.initialPassword
                            ? '****** (Đổi mới)'
                            : isEditing
                            ? 'Giữ nguyên không đổi'
                            : 'ChangeMe@123 (Mặc định)'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="confirm-card">
                  <div className="confirm-card-title">Ngân hàng & Trạng thái</div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Trạng thái:</span>
                    <span className="confirm-card-value" style={{ color: currentValues.status === 'Active' ? '#10b981' : '#ef4444' }}>
                      {currentValues.status === 'Active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Ngân hàng:</span>
                    <span className="confirm-card-value">{currentValues.bankName || '—'}</span>
                  </div>
                  <div className="confirm-card-row">
                    <span className="confirm-card-label">Số tài khoản:</span>
                    <span className="confirm-card-value">{currentValues.bankAccount || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Form>

          {/* Action buttons chân modal */}
          <div className="wizard-footer">
            <Button onClick={() => dispatch(setEmployeeModalOpen(false))}>
              Hủy bỏ
            </Button>

            <Space size={10}>
              {currentStep > 0 && (
                <Button onClick={handleBack}>
                  Quay lại
                </Button>
              )}

              {currentStep < 4 ? (
                <Button type="primary" onClick={handleNext}>
                  Tiếp tục &gt;
                </Button>
              ) : (
                <Button
                  type="primary"
                  className="btn-submit-green"
                  icon={<SaveOutlined />}
                  loading={submitting}
                  onClick={handleSubmit}
                >
                  Lưu thông tin
                </Button>
              )}
            </Space>
          </div>
        </div>
      </div>
    </Modal>
  );
};
