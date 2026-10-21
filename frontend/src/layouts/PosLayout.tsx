import { useMemo, useState, useEffect, type FC } from 'react';
import { Avatar, Button, Dropdown, Layout, Select, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  IdcardOutlined,
  LogoutOutlined,
  ShopOutlined,
  SwapOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, setActiveBranch } from '@/store/slices/authSlice';
import { setPosBranch } from '@/store/slices/posSlice';
import {
  SHIFT_CODE,
  SHIFT_SHORT_LABEL,
  USER_ROLE,
  USER_ROLE_LABEL,
  type ShiftCode,
  type UserRole,
} from '@/types';
import logo from '@/assets/logo.png';
import { phienThuNganApi, type PhienThuNganRecord } from '@/api/phienThuNgan';
import { OpenShiftModal } from '@/features/cash-shift/OpenShiftModal';
import { CloseShiftModal } from '@/features/cash-shift/CloseShiftModal';
import { HandoverShiftModal } from '@/features/cash-shift/HandoverShiftModal';
import { ReceiveHandoverModal } from '@/features/cash-shift/ReceiveHandoverModal';
import { SafeDropModal } from '@/features/cash-shift/SafeDropModal';
import { ShiftHistoryModal } from '@/features/cash-shift/ShiftHistoryModal';
import { formatVND } from '@/utils/formatters';
import './PosLayout.css';

const { Header, Content } = Layout;

/** Ca làm việc tương ứng giờ hiện tại. */
const currentShift = (): ShiftCode => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return SHIFT_CODE.Morning;
  if (hour >= 14 && hour < 22) return SHIFT_CODE.Afternoon;
  return SHIFT_CODE.Night;
};

/**
 * Khung giao diện không gian bán hàng (POS).
 *
 * Vì sao POS cần layout riêng thay vì dùng chung `AdminLayout`:
 * 1. Thu ngân chỉ được phép vào đúng `/pos`, nên sidebar 13 module là thứ họ
 *    không bao giờ dùng nhưng vẫn ăn 256px chiều ngang của lưới sản phẩm.
 * 2. Breadcrumb và footer vô nghĩa ở quầy — thao tác tại đây là quét, bấm,
 *    thu tiền, không phải điều hướng.
 * 3. Topbar POS cần thông tin khác hẳn admin: ca bán hàng, số hoá đơn đã lập
 *    trong phiên, quầy đang bán. Không cần ô tìm kiếm toàn cục hay badge tồn kho.
 *
 * Quản lý và Admin chuỗi vẫn vào được `/pos`, nên có nút quay lại khu quản trị.
 */
export const PosLayout: FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const branchId = useAppSelector((state) => state.pos.branchId);
  const sessionOrderCount = useAppSelector((state) => state.pos.sessionOrderCount);
  const branches = useAppSelector((state) => state.branch.branches);

  const role: UserRole = user?.role ?? USER_ROLE.Cashier;
  /** Thu ngân không có quyền vào bất kỳ trang quản trị nào. */
  const isCashier = role === USER_ROLE.Cashier;

  /**
   * Quầy bán được: chỉ cửa hàng đang hoạt động (kho tổng không có POS), và
   * thu hẹp theo chi nhánh người dùng được phân công. Mảng rỗng = không giới hạn.
   *
   * Thu ngân / quản lý chi nhánh chỉ thấy đúng chi nhánh của mình — không
   * chọn được quầy khác. Vai trò trụ sở (branchId null) mới thấy toàn bộ.
   */
  const branchOptions = useMemo(() => {
    const allowed = user?.allowedBranchIds ?? [];
    const activeStores = branches.filter((b: { status: string }) => b.status === 'Active');
    const selectable =
      allowed.length === 0
        ? activeStores
        : activeStores.filter((branch: { id: string }) => allowed.includes(branch.id));

    const ownBranch = user?.branchId ?? null;
    const visible =
      ownBranch === null
        ? selectable
        : selectable.filter((branch: { id: string }) => branch.id === ownBranch);

    return visible.map((branch: { id: string; code: string; name: string }) => ({
      value: branch.id,
      label: `${branch.code} — ${branch.name}`,
    }));
  }, [user?.allowedBranchIds, user?.branchId, branches]);

  /**
   * Thu ngân bị khoá theo chi nhánh được phân công nên Select chỉ để hiển thị;
   * chỉ vai trò trụ sở (không có branchId) mới đổi được quầy.
   */
  const canSwitchBranch = (user?.branchId ?? null) === null;

  /** Đổi quầy bán: đồng bộ luôn chi nhánh đang xem của khu quản trị. */
  const handleBranchChange = (value: string): void => {
    dispatch(setPosBranch(value));
    dispatch(setActiveBranch(value));
  };

  const [currentShiftRecord, setCurrentShiftRecord] = useState<PhienThuNganRecord | null>(null);
  const [pendingHandoverShift, setPendingHandoverShift] = useState<PhienThuNganRecord | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isReceiveHandoverOpen, setIsReceiveHandoverOpen] = useState(false);
  const [isSafeDropModalOpen, setIsSafeDropModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const loadCurrentShift = async () => {
    try {
      const res = await phienThuNganApi.getHienTai();
      setCurrentShiftRecord(res);
      if (!res) {
        // Kiểm tra xem có ca nào đang bàn giao cho mình hoặc cùng chi nhánh không
        const pending = await phienThuNganApi.getPhienChoTiepQuan();
        setPendingHandoverShift(pending);
      } else {
        setPendingHandoverShift(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCurrentShift();
  }, [user]);

  /** Menu tài khoản: hồ sơ, đăng xuất. */
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'account',
      icon: <IdcardOutlined />,
      label: 'Tài khoản của tôi',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      dispatch(logout());
      navigate('/login', { replace: true });
      return;
    }

    if (key === 'account') {
      navigate('/account');
      return;
    }
  };

  const selectedBranchName = branchOptions.find((b) => b.value === branchId)?.label;

  return (
    <Layout className="pos-shell">
      <Header className="pos-topbar">
        <div className="pos-topbar-left">
          <div className="pos-brand">
            <img src={logo} alt="Circle K" className="pos-brand-logo" />
            <div className="pos-brand-text">
              <span className="pos-brand-name">CIRCLE K</span>
              <span className="pos-brand-tagline">Quầy bán hàng</span>
            </div>
          </div>

          <Select
            className="pos-branch-select"
            value={branchId || undefined}
            placeholder="Chưa gán chi nhánh"
            options={branchOptions}
            onChange={handleBranchChange}
            disabled={!canSwitchBranch || branchOptions.length === 0}
            prefix={<ShopOutlined className="pos-branch-icon" />}
            showSearch={canSwitchBranch}
            optionFilterProp="label"
          />
        </div>

        <div className="pos-topbar-right">
          {/* Trạng thái ca thu ngân & Quản lý quỹ */}
          {currentShiftRecord ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag
                color="green"
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '3px 8px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCircleOutlined />
                {currentShiftRecord.maPhien} ({currentShiftRecord.quaySo})
              </Tag>

              <Button
                size="small"
                icon={<SafetyCertificateOutlined />}
                onClick={() => setIsSafeDropModalOpen(true)}
                style={{ fontWeight: 600, color: '#0284c7', borderColor: '#38bdf8' }}
              >
                Nộp két
              </Button>

              <Button
                size="small"
                danger
                type="primary"
                icon={<CalculatorOutlined />}
                onClick={() => setIsCloseShiftModalOpen(true)}
                style={{ fontWeight: 600 }}
              >
                Chốt ca
              </Button>
            </div>
          ) : pendingHandoverShift ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button
                type="primary"
                size="small"
                icon={<SwapOutlined />}
                onClick={() => setIsReceiveHandoverOpen(true)}
                style={{
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  fontWeight: 700,
                  borderRadius: 6,
                  boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)',
                }}
              >
                ⚡ Tiếp quản ca ({pendingHandoverShift.tenThuNgan || pendingHandoverShift.maPhien})
              </Button>
              <Button
                size="small"
                icon={<DollarOutlined />}
                onClick={() => setIsOpenShiftModalOpen(true)}
                style={{ fontWeight: 600 }}
              >
                + Mở ca mới
              </Button>
            </div>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => setIsOpenShiftModalOpen(true)}
              style={{
                background: '#059669',
                borderColor: '#059669',
                fontWeight: 700,
                borderRadius: 6,
              }}
            >
              + Mở ca & Nhận quỹ
            </Button>
          )}

          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => setIsHistoryModalOpen(true)}
            style={{ fontWeight: 600 }}
          >
            Lịch sử ca
          </Button>

          <Tag className="pos-chip pos-chip-shift">
            Ca {SHIFT_SHORT_LABEL[currentShift()]}
          </Tag>

          <Tag className="pos-chip pos-chip-session">
            Đã bán:{' '}
            <Typography.Text className="pos-chip-count">
              {sessionOrderCount}
            </Typography.Text>
          </Tag>

          {/* Thu ngân không có quyền vào khu quản trị nên ẩn nút này. */}
          {!isCashier && (
            <Button
              type="text"
              className="pos-admin-btn"
              icon={<AppstoreOutlined />}
              onClick={() => navigate('/dashboard')}
            >
              <span className="pos-admin-btn-text">Khu quản trị</span>
            </Button>
          )}

          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
            arrow
          >
            <div className="pos-user-chip">
              <Avatar className="pos-user-avatar" size={30}>
                {user?.avatarText ?? 'CK'}
              </Avatar>
              <div className="pos-user-meta">
                <span className="pos-user-name">{user?.fullName ?? 'Khách'}</span>
                <span className="pos-user-role">{USER_ROLE_LABEL[role]}</span>
              </div>
              <SwapOutlined className="pos-user-chip-swap" />
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* Banner thông báo ca đang chờ tiếp quản */}
      {pendingHandoverShift && !currentShiftRecord && (
        <div
          style={{
            background: 'linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%)',
            borderBottom: '1px solid #bfdbfe',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag color="processing" style={{ fontWeight: 700, margin: 0 }}>
              CÓ CA ĐANG CHỜ TIẾP QUẢN
            </Tag>
            <span style={{ color: '#1e3a8a' }}>
              Thu ngân <strong>{pendingHandoverShift.tenThuNgan || 'Ca trước'}</strong> ({pendingHandoverShift.quaySo || 'Quầy 1'}) đã bàn giao ca <strong>{pendingHandoverShift.maPhien}</strong> với số tiền bàn giao{' '}
              <strong style={{ color: '#1d4ed8', fontSize: 14 }}>
                {formatVND(pendingHandoverShift.soTienBanGiao ?? pendingHandoverShift.tienThucDemCuoiCa ?? 0)}
              </strong>.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              size="small"
              type="primary"
              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}
              onClick={() => setIsReceiveHandoverOpen(true)}
            >
              Tiếp nhận bàn giao & Mở ca
            </Button>
          </div>
        </div>
      )}

      <Content className="pos-content">
        <Outlet />
      </Content>

      {/* Các Modals quản lý ca thu ngân */}
      <OpenShiftModal
        open={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onSuccess={() => {
          loadCurrentShift();
        }}
        branchId={branchId || undefined}
        branchName={selectedBranchName}
      />

      <ReceiveHandoverModal
        open={isReceiveHandoverOpen}
        shift={pendingHandoverShift}
        onClose={() => setIsReceiveHandoverOpen(false)}
        onSuccess={() => {
          setPendingHandoverShift(null);
          loadCurrentShift();
        }}
      />

      <CloseShiftModal
        open={isCloseShiftModalOpen}
        shift={currentShiftRecord}
        onClose={() => setIsCloseShiftModalOpen(false)}
        onSuccess={(closed) => {
          setCurrentShiftRecord(closed);
          setIsHandoverModalOpen(true);
        }}
      />

      <HandoverShiftModal
        open={isHandoverModalOpen}
        shift={currentShiftRecord}
        onClose={() => {
          setIsHandoverModalOpen(false);
          loadCurrentShift();
        }}
        onSuccess={() => {
          loadCurrentShift();
        }}
      />

      <SafeDropModal
        open={isSafeDropModalOpen}
        shift={currentShiftRecord}
        onClose={() => setIsSafeDropModalOpen(false)}
        onSuccess={() => {
          loadCurrentShift();
        }}
      />

      <ShiftHistoryModal
        open={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          loadCurrentShift();
        }}
        branchId={branchId || undefined}
        currentUserId={user?.id}
        currentEmployeeId={user?.idNhanVien || undefined}
        isManager={!isCashier}
        onTakeover={(shift) => {
          setPendingHandoverShift(shift);
          setIsReceiveHandoverOpen(true);
        }}
      />
    </Layout>
  );
};
