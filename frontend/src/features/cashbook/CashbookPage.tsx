import { useEffect, useMemo, useState, type FC } from 'react';
import { Button, Card, DatePicker, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BankOutlined,
  PlusOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { BRAND } from '@/config/brand';
import { phienThuNganApi, type TongQuanQuyDTO } from '@/api/phienThuNgan';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCashbook } from '@/store/slices/cashbookSlice';
import {
  CASH_CATEGORY,
  CASH_CATEGORY_LABEL,
  CASH_FLOW_DIRECTION,
  CASH_FLOW_DIRECTION_LABEL,
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL,
  USER_ROLE,
  type CashEntry,
  type CashFlowDirection,
  type CashBookSummary,
} from '@/types';
import { dayjs, formatDate, lastNDays } from '@/utils/dateUtils';
import { compareDateDescWithId, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { CapitalInjectionModal } from './components/CapitalInjectionModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import './CashbookPage.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * Module 12 – Sổ quỹ (Thu/Chi).
 *
 * Bảng nhấn màu theo chiều tiền: thu màu xanh, chi màu đỏ. Cột "Số dư" là số
 * lũy kế theo thời gian nên chỉ đúng khi xem toàn bộ (không lọc chi nhánh).
 *
 * Phiếu được sinh tự động từ 3 nguồn (bán hàng POS, duyệt chi lương, nhập kho);
 * Admin lập tay phiếu cấp vốn.
 */
export const CashbookPage: FC = () => {
  const dispatch = useAppDispatch();
  const { user, activeBranchId } = useAppSelector((state) => state.auth);
  const isBranchScoped = user?.role === USER_ROLE.StoreManager;
  const allEntries = useAppSelector((state) => state.cashbook.entries);

  // Nạp sổ quỹ từ backend khi vào trang.
  useEffect(() => {
    void dispatch(fetchCashbook());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canInjectCapital = user?.role === USER_ROLE.Admin;
  const [isCapitalModalOpen, setCapitalModalOpen] = useState(false);
  const [isManualModalOpen, setManualModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(activeBranchId);
  const [range, setRange] = useState(() => lastNDays(30));

  // Phạm vi chi nhánh có hiệu lực:
  // Nếu là Quản lý chi nhánh: BẮT BUỘC gán theo chi nhánh của mình (user.branchId || activeBranchId).
  // Nếu là Admin / Kế toán: lấy theo bộ lọc chi nhánh (null = Toàn chuỗi).
  const effectiveBranchId = isBranchScoped
    ? (user?.branchId || activeBranchId)
    : branchFilter;

  const [tongQuanQuy, setTongQuanQuy] = useState<TongQuanQuyDTO | null>(null);
  const [loadingTongQuan, setLoadingTongQuan] = useState(false);

  const loadTongQuanQuy = async () => {
    try {
      setLoadingTongQuan(true);
      const data = await phienThuNganApi.getTongQuanQuy(effectiveBranchId || undefined);
      setTongQuanQuy(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTongQuan(false);
    }
  };

  useEffect(() => {
    void loadTongQuanQuy();
  }, [effectiveBranchId]);

  useEffect(() => {
    if (activeBranchId && !isBranchScoped) {
      setBranchFilter(activeBranchId);
    }
  }, [activeBranchId, isBranchScoped]);

  useEffect(() => {
    if (isBranchScoped && user?.branchId) {
      setBranchFilter(user.branchId);
    }
  }, [isBranchScoped, user?.branchId]);

  const filtered = useMemo(() => {
    const matched = allEntries.filter((entry) => {
      const matchSearch = matchKeyword(search, [
        entry.code,
        entry.counterparty,
        entry.description,
        entry.referenceCode ?? '',
      ]);
      const matchDirection =
        directionFilter === null || entry.direction === directionFilter;
      const matchCategory =
        categoryFilter === null || entry.category === categoryFilter;
      const matchBranch =
        effectiveBranchId === null || entry.branchId === effectiveBranchId;
      const matchRange =
        entry.entryDate >= range.from && entry.entryDate <= range.to;
      return (
        matchSearch && matchDirection && matchCategory && matchBranch && matchRange
      );
    });

    // Nếu lọc theo chi nhánh: tính runningBalance lũy kế riêng cho chi nhánh
    if (effectiveBranchId !== null) {
      const ascending = [...matched].sort((a, b) =>
        compareDateDescWithId(b, a, (row) => row.entryDate),
      );
      let running = 0;
      const result = ascending.map((item) => {
        running +=
          item.direction === CASH_FLOW_DIRECTION.Receipt ? item.amount : -item.amount;
        return {
          ...item,
          branchRunningBalance: running,
        };
      });
      return result.reverse();
    }

    return matched.sort((a, b) => compareDateDescWithId(a, b, (row) => row.entryDate));
  }, [allEntries, search, directionFilter, categoryFilter, effectiveBranchId, range]);

  const summarizeCashBook = (entries: CashEntry[]): CashBookSummary => {
    const totalReceipt = entries
      .filter((e) => e.direction === CASH_FLOW_DIRECTION.Receipt)
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPayment = entries
      .filter((e) => e.direction === CASH_FLOW_DIRECTION.Payment)
      .reduce((sum, e) => sum + e.amount, 0);

    // Khi lọc theo chi nhánh cụ thể hoặc Quản lý chi nhánh:
    // Số dư cuối kỳ = Tổng thu - Tổng chi trong kỳ của chi nhánh.
    // Khi xem Toàn chuỗi (Admin / Kế toán): Số dư cuối kỳ = runningBalance của phiếu mới nhất toàn công ty.
    const isFilteredBranch = effectiveBranchId !== null;
    const closingBalance = isFilteredBranch
      ? totalReceipt - totalPayment
      : (entries[0]?.runningBalance ?? (totalReceipt - totalPayment));

    return {
      openingBalance: isFilteredBranch
        ? 0
        : (entries.find((entry) => entry.code === 'OPENING')?.runningBalance ?? 0),
      totalReceipt,
      totalPayment,
      closingBalance,
      cashOnHand: entries
        .filter((e) => e.paymentMethod === PAYMENT_METHOD.Cash)
        .reduce((sum, e) => sum + (e.direction === CASH_FLOW_DIRECTION.Receipt ? e.amount : -e.amount), 0),
      bankBalance: entries
        .filter((e) => e.paymentMethod !== PAYMENT_METHOD.Cash)
        .reduce((sum, e) => sum + (e.direction === CASH_FLOW_DIRECTION.Receipt ? e.amount : -e.amount), 0),
    };
  };

  const bookSummary = useMemo(() => summarizeCashBook(filtered), [filtered]);

  const summary = useMemo<SummaryItem[]>(
    () => [
      {
        key: 'receipt',
        title: 'Tổng thu trong kỳ',
        value: formatVND(bookSummary.totalReceipt),
        color: BRAND.success,
      },
      {
        key: 'payment',
        title: 'Tổng chi trong kỳ',
        value: formatVND(bookSummary.totalPayment),
        color: BRAND.error,
      },
      {
        key: 'net',
        title: 'Dòng tiền thuần',
        value: formatVND(bookSummary.totalReceipt - bookSummary.totalPayment),
        color:
          bookSummary.totalReceipt >= bookSummary.totalPayment
            ? BRAND.success
            : BRAND.error,
      },
      {
        key: 'cash',
        title: 'Phát sinh tiền mặt trong kỳ',
        value: formatVND(bookSummary.cashOnHand),
        color: '#d97706',
      },
      {
        key: 'pos-drawer',
        title: 'Tiền ngăn kéo POS thực tế',
        value: formatVND(tongQuanQuy?.tongTienNganKeo ?? 0),
        color: '#059669',
      },
      {
        key: 'closing',
        title: 'Số dư quỹ cuối kỳ',
        value: formatVND(bookSummary.closingBalance),
        color: BRAND.neutralDark,
      },
    ],
    [bookSummary, tongQuanQuy],
  );

  const branches = useAppSelector((state) => state.branch.branches);
  const filters: ToolbarFilter[] = [
    {
      key: 'direction',
      placeholder: 'Thu / Chi',
      value: directionFilter,
      onChange: setDirectionFilter,
      options: Object.values(CASH_FLOW_DIRECTION).map((direction) => ({
        value: direction,
        label: CASH_FLOW_DIRECTION_LABEL[direction],
      })),
    },
    {
      key: 'category',
      placeholder: 'Hạng mục',
      value: categoryFilter,
      onChange: setCategoryFilter,
      options: Object.values(CASH_CATEGORY).map((category) => ({
        value: category,
        label: CASH_CATEGORY_LABEL[category],
      })),
      span: 5,
    },
    ...(!isBranchScoped ? [{
      key: 'branch',
      placeholder: 'Chi nhánh',
      value: branchFilter,
      onChange: setBranchFilter,
      options: branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
      })),
      span: 5,
    } as ToolbarFilter] : []),
  ];

  const columns: ColumnsType<CashEntry> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'code',
      width: 165,
      fixed: 'left',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Ngày',
      dataIndex: 'entryDate',
      width: 105,
      sorter: (a, b) => a.entryDate.localeCompare(b.entryDate),
      defaultSortOrder: 'descend',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Loại',
      dataIndex: 'direction',
      align: 'center',
      width: 110,
      render: (direction: CashFlowDirection) =>
        direction === CASH_FLOW_DIRECTION.Receipt ? (
          <Tag color="green" className="tag-no-margin">
            <ArrowUpOutlined /> Thu
          </Tag>
        ) : (
          <Tag color="red" className="tag-no-margin">
            <ArrowDownOutlined /> Chi
          </Tag>
        ),
    },
    {
      title: 'Hạng mục',
      dataIndex: 'category',
      width: 200,
      render: (category: CashEntry['category']) => (
        <Text className="cash-text-12-5">{CASH_CATEGORY_LABEL[category]}</Text>
      ),
    },
    {
      title: 'Nội dung',
      dataIndex: 'description',
      width: 320,
      render: (value: string, row) => (
        <span>
          <Text className="cash-desc">{value}</Text>
          <Text type="secondary" className="cash-sub">
            {row.counterparty}
            {row.referenceCode !== null && ` · ${row.referenceCode}`}
          </Text>
        </span>
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 190,
      render: (value: string) => (
        <Text className="cash-text-12-5">{value}</Text>
      ),
    },
    {
      title: 'Hình thức',
      dataIndex: 'paymentMethod',
      width: 130,
      render: (method: CashEntry['paymentMethod']) => (
        <Tag
          color={method === PAYMENT_METHOD.Cash ? 'gold' : 'blue'}
          className="tag-no-margin"
        >
          {PAYMENT_METHOD_LABEL[method]}
        </Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.amount - b.amount,
      render: (value: number, row) => (
        <Text
          strong
          className={`numeric-cell ${
            row.direction === CASH_FLOW_DIRECTION.Receipt
              ? 'amount-in'
              : 'amount-out'
          }`}
        >
          {row.direction === CASH_FLOW_DIRECTION.Receipt ? '+' : '-'}
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Số dư luỹ kế',
      dataIndex: 'runningBalance',
      align: 'right',
      width: 160,
      fixed: 'right',
      render: (value: number, row: CashEntry) => (
        <Text className="numeric-cell cash-balance">
          {formatVND(row.branchRunningBalance ?? value)}
        </Text>
      ),
    },
  ];

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'Mã phiếu', accessor: (row) => row.code },
        { header: 'Ngày', accessor: (row) => row.entryDate },
        {
          header: 'Loại',
          accessor: (row) => CASH_FLOW_DIRECTION_LABEL[row.direction],
        },
        { header: 'Hạng mục', accessor: (row) => CASH_CATEGORY_LABEL[row.category] },
        { header: 'Nội dung', accessor: (row) => row.description },
        { header: 'Đối tượng', accessor: (row) => row.counterparty },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        {
          header: 'Hình thức',
          accessor: (row) => PAYMENT_METHOD_LABEL[row.paymentMethod],
        },
        {
          header: 'Số tiền',
          accessor: (row) =>
            row.direction === CASH_FLOW_DIRECTION.Receipt ? row.amount : -row.amount,
        },
        { header: 'Chứng từ liên quan', accessor: (row) => row.referenceCode ?? '' },
        { header: 'Số dư luỹ kế', accessor: (row) => row.runningBalance },
      ],
      'So quy thu chi Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="TÀI CHÍNH & BÁO CÁO / MODULE 12"
        title="Sổ quỹ thu chi"
        description="Theo dõi dòng tiền mặt và chuyển khoản tại cửa hàng cùng tổng công ty."
        extra={
          <Space wrap>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setManualModalOpen(true)}
            >
              Thêm phiếu
            </Button>
            {canInjectCapital && (
              <Button
                type="primary"
                icon={<BankOutlined />}
                onClick={() => setCapitalModalOpen(true)}
              >
                Cấp vốn
              </Button>
            )}
            <RangePicker
              value={[dayjs(range.from), dayjs(range.to)]}
              format="DD/MM/YYYY"
              allowClear={false}
              onChange={(values) => {
                if (values === null) return;
                const [from, to] = values;
                if (from === null || to === null) return;
                setRange({
                  from: from.format('YYYY-MM-DD'),
                  to: to.format('YYYY-MM-DD'),
                });
              }}
            />
          </Space>
        }
      />

      <SummaryStrip items={summary} columns={6} />

      {/* Khối theo dõi Quỹ tiền mặt tại các Quầy POS & Két an toàn */}
      <Card
        size="small"
        style={{
          marginTop: 16,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderColor: '#cbd5e1',
          borderRadius: 8,
        }}
        styles={{ body: { padding: '14px 18px' } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShopOutlined style={{ color: '#0284c7', fontSize: 16 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Quỹ tiền mặt tại các Quầy POS & Két an toàn — {tongQuanQuy?.tenChiNhanh || 'Chi nhánh'}
              </span>
            </div>
            <Button
              size="small"
              icon={<ReloadOutlined spin={loadingTongQuan} />}
              onClick={loadTongQuanQuy}
              style={{ fontSize: 12 }}
            >
              Cập nhật số dư quầy
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {/* Card ngăn kéo POS */}
          <div
            style={{
              border: '1px solid #bbf7d0',
              background: '#f0fdf4',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                <WalletOutlined style={{ marginRight: 6 }} />
                TIỀN MẶT TRONG NGĂN KÉO POS (REAL-TIME)
              </span>
              <Tag color="green" style={{ fontWeight: 700, margin: 0 }}>
                {tongQuanQuy?.soQuayDangMo ?? 0} quầy đang mở
              </Tag>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', marginBottom: 8 }}>
              {formatVND(tongQuanQuy?.tongTienNganKeo ?? 0)}
            </div>
            {tongQuanQuy?.danhSachQuayDangMo && tongQuanQuy.danhSachQuayDangMo.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                {tongQuanQuy.danhSachQuayDangMo.map((q) => (
                  <div
                    key={q.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #dcfce7',
                    }}
                  >
                    <span>
                      <strong style={{ color: '#0f172a' }}>{q.quaySo || 'Quầy 1'}</strong> ({q.tenThuNgan}):
                    </span>
                    <strong style={{ color: '#166534', fontSize: 13 }}>
                      {formatVND(q.tienDuKienCuoiCa ?? q.quyDauCaThucTe ?? 0)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                Hiện không có quầy nào đang mở ca bán hàng
              </span>
            )}
          </div>

          {/* Card két sắt ngầm */}
          <div
            style={{
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                KÉT SẮT AN TOÀN DƯỚI QUẦY (DROP SAFE)
              </span>
              <Tag color="blue" style={{ fontWeight: 600, margin: 0 }}>
                Chờ nộp NH
              </Tag>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8', marginBottom: 8 }}>
              {formatVND(tongQuanQuy?.tongTienKetAnToan ?? 0)}
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
              Tiền nộp két an toàn tích lũy từ các ca bán hàng được lưu giữ an toàn dưới quầy, chờ Quản lý thu gom làm thủ tục nộp vào tài khoản ngân hàng.
            </div>
          </div>
        </div>
      </Card>

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo mã phiếu, mã tham chiếu, nội dung, đối tượng..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setDirectionFilter(null);
            setCategoryFilter(null);
            setBranchFilter(isBranchScoped ? (user?.branchId || activeBranchId) : null);
            setRange(lastNDays(30));
          }}
        />

        <Table<CashEntry>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="small"
          scroll={{ x: 1800 }}
          className="dense-table"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `${total} phiếu thu chi`,
          }}
        />
      </Card>

      <CapitalInjectionModal
        open={isCapitalModalOpen}
        onClose={() => setCapitalModalOpen(false)}
      />
      <ManualEntryModal
        open={isManualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />
    </>
  );
};
