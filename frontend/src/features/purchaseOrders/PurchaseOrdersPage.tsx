import {
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactElement,
} from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';

import { isInitialLoading } from '@/utils/tableLoading';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import {
  TableToolbar,
  type ToolbarFilter,
} from '@/components/TableToolbar';
import { DocumentStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPurchaseOrders } from '@/store/slices/purchaseSlice';
import { fetchEmployees } from '@/store/slices/employeeSlice';

import { phieuNhapApi } from '@/api/phieuNhap';
import {
  chiTietPhieuNhapApi,
  type ChiTietPhieuNhapDTO,
} from '@/api/chiTietPhieuNhap';

import {
  DOCUMENT_STATUS,
  DOCUMENT_STATUS_LABEL,
  PURCHASE_STATUSES,
  USER_ROLE,
  type DocumentStatus,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from '@/types';

import { formatDate } from '@/utils/dateUtils';
import {
  compareDateDescWithId,
  formatNumber,
  formatVND,
  matchKeyword,
} from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';

import { PurchaseFormModal } from './components/PurchaseFormModal';
import { ReceivingModal } from './components/ReceivingModal';
import { PayModal } from './components/PayModal';
import { ChangePriceModal } from './components/ChangePriceModal';

import './PurchaseOrdersPage.css';

const { Text } = Typography;

/**
 * Module 8 — Nhập kho từ nhà cung cấp.
 *
 * Luồng:
 * PENDING_CONFIRMATION
 *   → Kế toán/Admin duyệt hoặc từ chối
 *   → PENDING_RECEIVING
 *   → Thủ kho/Admin bắt đầu kiểm nhận
 *   → RECEIVING
 *   → Thủ kho/Admin kiểm nhận
 *   → COMPLETED
 *
 * Thanh toán không còn là bước bắt buộc trước khi nhận hàng.
 * Sau khi hoàn tất, Kế toán/Admin có thể thanh toán công nợ nhiều lần.
 *
 * Đổi giá sau hoàn tất chỉ điều chỉnh công nợ NCC và lưu giá cũ;
 * không hồi tố lại giá vốn của hàng đã nhập kho.
 */
export const PurchaseOrdersPage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const user = useAppSelector((state) => state.auth.user);
  const { orders, loading } = useAppSelector(
      (state) => state.purchase,
  );

  const suppliers = useAppSelector(
      (state) => state.supplier.suppliers,
  );
  const products = useAppSelector(
      (state) => state.product.products,
  );
  const branches = useAppSelector(
      (state) => state.branch.branches,
  );
  const employees = useAppSelector(
      (state) => state.employee.employees,
  );

  const [isFormOpen, setFormOpen] = useState(false);

  const [rejectTarget, setRejectTarget] =
      useState<PurchaseOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [payTarget, setPayTarget] =
      useState<PurchaseOrder | null>(null);

  const [changePriceTarget, setChangePriceTarget] =
      useState<PurchaseOrder | null>(null);

  const [receivingTarget, setReceivingTarget] =
      useState<PurchaseOrder | null>(null);

  const [actionLoading, setActionLoading] = useState<
      string | null
  >(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
      useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] =
      useState<string | null>(null);

  /**
   * Cache chi tiết phiếu nhập theo orderId.
   */
  const [detailsCache, setDetailsCache] = useState<
      Record<string, ChiTietPhieuNhapDTO[]>
  >({});

  const loadDetails = async (orderId: string) => {
    if (detailsCache[orderId] !== undefined) return;

    try {
      const data =
          await chiTietPhieuNhapApi.getByPhieuNhap(orderId);

      setDetailsCache((prev) => ({
        ...prev,
        [orderId]: data,
      }));
    } catch {
      setDetailsCache((prev) => ({
        ...prev,
        [orderId]: [],
      }));
    }
  };

  const invalidateDetails = (orderId: string) => {
    setDetailsCache((prev) => {
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const missing = orders.filter(
        (order) => detailsCache[order.id] === undefined,
    );

    if (missing.length === 0) return;

    void Promise.all(
        missing.map(async (order) => {
          try {
            const data =
                await chiTietPhieuNhapApi.getByPhieuNhap(order.id);

            return {
              id: order.id,
              data,
            };
          } catch {
            return {
              id: order.id,
              data: [],
            };
          }
        }),
    ).then((results) => {
      if (cancelled) return;

      setDetailsCache((prev) => {
        const next = { ...prev };

        results.forEach((result) => {
          next[result.id] = result.data;
        });

        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [orders, detailsCache]);

  useEffect(() => {
    dispatch(fetchPurchaseOrders());
  }, [dispatch]);

  useEffect(() => {
    if (employees.length === 0) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, employees.length]);

  /**
   * Enrich orders: thêm tên NCC + tên kho.
   */
  const enrichedOrders = useMemo(
      () =>
          orders.map((o) => ({
            ...o,
            supplierName:
                o.supplierName ||
                suppliers.find(
                    (s) => s.id === o.supplierId,
                )?.name ||
                '',
            branchName:
                o.branchName ||
                branches.find(
                    (b) => b.id === o.branchId,
                )?.name ||
                '',
          })),
      [orders, suppliers, branches],
  );

  /**
   * Thủ kho chỉ lập phiếu NCC tại Kho Tổng được gán cho chính mình.
   */
  const assignedBranch = branches.find(
      (branch) => branch.id === user?.branchId,
  );

  const canCreate =
      user?.role === USER_ROLE.Admin ||
      (user?.role === USER_ROLE.WarehouseKeeper &&
          assignedBranch?.kind === 'DISTRIBUTION_CENTER');

  /**
   * Kế toán/Admin: duyệt, từ chối, thanh toán, đổi giá.
   */
  const isApprover =
      user?.role === USER_ROLE.Accountant ||
      user?.role === USER_ROLE.Admin;

  /**
   * Thủ kho/Admin: bắt đầu kiểm nhận, kiểm nhận, hủy kiểm nhận.
   */
  const canReceive =
      user?.role === USER_ROLE.WarehouseKeeper ||
      user?.role === USER_ROLE.Admin;

  /**
   * Lấy tên nhân viên từ ID.
   */
  const nameOf = (id?: string | null): string | null =>
      id
          ? employees.find((employee) => employee.id === id)?.fullName ?? id
          : null;

  /**
   * Duyệt phiếu.
   */
  const handleApprove = async (
      order: PurchaseOrder,
  ): Promise<void> => {
    setActionLoading(order.id);

    try {
      await phieuNhapApi.approve(order.id);

      message.success(
          `Đã duyệt phiếu ${order.code}. Phiếu chuyển sang "Chờ kiểm nhận".`,
      );

      dispatch(fetchPurchaseOrders());
    } catch (error) {
      message.error(
          error instanceof Error
              ? error.message
              : 'Lỗi duyệt phiếu nhập',
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Từ chối phiếu.
   */
  const handleReject = async (): Promise<void> => {
    if (!rejectTarget) return;

    const reason = rejectReason.trim();

    if (!reason) {
      message.error('Vui lòng nhập lý do từ chối.');
      return;
    }

    setActionLoading(rejectTarget.id);

    try {
      await phieuNhapApi.reject(
          rejectTarget.id,
          reason,
      );

      message.success(
          `Đã từ chối phiếu ${rejectTarget.code}.`,
      );

      dispatch(fetchPurchaseOrders());

      setRejectTarget(null);
      setRejectReason('');
    } catch (error) {
      message.error(
          error instanceof Error
              ? error.message
              : 'Lỗi từ chối phiếu nhập',
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Bắt đầu kiểm nhận:
   * PENDING_RECEIVING → RECEIVING.
   */
  const handleStartReceiving = async (
      order: PurchaseOrder,
  ): Promise<void> => {
    setActionLoading(order.id);

    try {
      await phieuNhapApi.startReceiving(order.id);

      message.success(
          `Đã bắt đầu kiểm nhận phiếu ${order.code}.`,
      );

      dispatch(fetchPurchaseOrders());
    } catch (error) {
      message.error(
          error instanceof Error
              ? error.message
              : 'Lỗi bắt đầu kiểm nhận',
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Hủy phiếu.
   */
  const handleCancel = async (
      order: PurchaseOrder,
  ): Promise<void> => {
    setActionLoading(order.id);

    try {
      await phieuNhapApi.cancel(order.id);

      message.success(
          `Đã hủy phiếu ${order.code}.`,
      );

      dispatch(fetchPurchaseOrders());
    } catch (error) {
      message.error(
          error instanceof Error
              ? error.message
              : 'Lỗi hủy phiếu nhập',
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Hủy kiểm nhận:
   * RECEIVING → PENDING_RECEIVING.
   */
  const handleCancelReceiving = async (
      order: PurchaseOrder,
  ): Promise<void> => {
    setActionLoading(order.id);

    try {
      await phieuNhapApi.cancelReceiving(order.id);

      message.success(
          `Đã hủy phiên kiểm nhận phiếu ${order.code}.`,
      );

      dispatch(fetchPurchaseOrders());
    } catch (error) {
      message.error(
          error instanceof Error
              ? error.message
              : 'Lỗi hủy kiểm nhận',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(
      () =>
          enrichedOrders
              .filter((order) => {
                const matchSearch = matchKeyword(search, [
                  order.code,
                  order.supplierName,
                  order.createdBy,
                ]);

                const matchStatus =
                    statusFilter === null ||
                    order.status === statusFilter;

                const matchSupplier =
                    supplierFilter === null ||
                    order.supplierId === supplierFilter;

                return (
                    matchSearch &&
                    matchStatus &&
                    matchSupplier
                );
              })
              .sort((a, b) =>
                  compareDateDescWithId(
                      a,
                      b,
                      (row) => row.orderDate,
                  ),
              ),
      [
        enrichedOrders,
        search,
        statusFilter,
        supplierFilter,
      ],
  );

  /**
   * Summary:
   * - Phiếu chờ xử lý = 3 trạng thái đầu của PURCHASE_STATUSES.
   * - Phiếu hoàn tất mới tính vào giá trị thực nhập kho.
   * - Phiếu chưa hoàn tất dùng giá trị dự kiến.
   */
  const summary = useMemo<SummaryItem[]>(() => {
    const completed = orders.filter(
        (order) =>
            order.status === DOCUMENT_STATUS.Completed,
    );

    const pending = orders.filter((order) =>
        PURCHASE_STATUSES.slice(0, 3).includes(
            order.status as never,
        ),
    );

    const totalValue = orders.reduce(
        (sum, order) =>
            sum +
            (order.status === DOCUMENT_STATUS.Completed
                ? order.grandTotal
                : (order.estimatedTotal ??
                    order.grandTotal)),
        0,
    );

    const totalItems = completed.reduce(
        (sum, order) => {
          const lines =
              detailsCache[order.id] ?? order.lines;

          return (
              sum +
              lines.reduce(
                  (count, line) =>
                      count + line.soLuongNhan,
                  0,
              )
          );
        },
        0,
    );

    const totalDebt = orders.reduce(
        (sum, order) => sum + order.debtAmount,
        0,
    );

    return [
      {
        key: 'orders',
        title: 'Tổng phiếu nhập',
        value: formatNumber(orders.length),
        suffix: 'phiếu',
        color: BRAND.primaryRed,
      },
      {
        key: 'value',
        title: 'Giá trị phiếu nhập',
        value: formatVND(totalValue),
      },
      {
        key: 'items',
        title: 'Số lượng hàng đã nhận',
        value: formatNumber(totalItems),
        suffix: 'đơn vị',
      },
      {
        key: 'pending',
        title: 'Phiếu chờ xử lý',
        value: formatNumber(pending.length),
        suffix: 'phiếu',
        color: BRAND.warning,
      },
      {
        key: 'debt',
        title: 'Tổng công nợ NCC',
        value: formatVND(totalDebt),
      },
    ];
  }, [orders, detailsCache]);

  const filters: ToolbarFilter[] = [
    {
      key: 'supplier',
      placeholder: 'Nhà cung cấp',
      value: supplierFilter,
      onChange: setSupplierFilter,
      options: suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
      span: 6,
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter,
      options: PURCHASE_STATUSES.map((status) => ({
        value: status,
        label: DOCUMENT_STATUS_LABEL[status],
      })),
      span: 5,
    },
  ];

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'code',
      width: 165,
      fixed: 'left',
      render: (code: string) => (
          <span className="mono-code">{code}</span>
      ),
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplierName',
      width: 280,
      render: (value: string) => (
          <Text strong className="po-text-12-5">
            {value}
          </Text>
      ),
    },
    {
      title: 'Kho nhận',
      dataIndex: 'branchName',
      width: 210,
      render: (value: string) => (
          <Text className="po-text-12-5">
            {value}
          </Text>
      ),
    },
    {
      title: 'Số mặt hàng',
      width: 110,
      align: 'center',
      render: (_: unknown, row: PurchaseOrder) => {
        const details = detailsCache[row.id];

        if (details === undefined) {
          return (
              <Text type="secondary">...</Text>
          );
        }

        if (details.length === 0) {
          return (
              <Text type="secondary">—</Text>
          );
        }

        return (
            <Tag color="blue">
              {details.length}
            </Tag>
        );
      },
    },
    {
      title: 'Số lượng nhận',
      width: 120,
      align: 'right',
      render: (_: unknown, row: PurchaseOrder) => {
        const details = detailsCache[row.id];

        if (details === undefined) {
          return (
              <Text type="secondary">...</Text>
          );
        }

        if (details.length === 0) {
          return (
              <Text type="secondary">—</Text>
          );
        }

        const total = details.reduce(
            (sum, detail) =>
                sum + (detail.soLuongNhan || 0),
            0,
        );

        return (
            <Text strong>
              {formatNumber(total)}
            </Text>
        );
      },
    },
    {
      title: 'Ngày nhập kho',
      dataIndex: 'orderDate',
      width: 125,
      sorter: (a, b) =>
          a.orderDate.localeCompare(b.orderDate),
      defaultSortOrder: 'descend',
      render: (value: string) =>
          formatDate(value),
    },
    {
      title: 'Tiền hàng',
      dataIndex: 'subTotal',
      align: 'right',
      width: 130,
      render: (value: number) => (
          <Text className="numeric-cell">
            {formatVND(value)}
          </Text>
      ),
    },
    {
      title: 'Thuế VAT',
      dataIndex: 'vatTotal',
      align: 'right',
      width: 120,
      render: (value: number) => (
          <Text className="numeric-cell">
            {formatVND(value)}
          </Text>
      ),
    },
    {
      title: 'Giá trị dự kiến',
      align: 'right',
      width: 140,
      render: (_: unknown, row: PurchaseOrder) => {
        const value = row.estimatedTotal;

        return value === null || value === 0 ? (
            <Text type="secondary">—</Text>
        ) : (
            <Text className="numeric-cell">
              {formatVND(value)}
            </Text>
        );
      },
    },
    {
      title: 'Công nợ còn lại',
      align: 'right',
      width: 145,
      render: (_: unknown, row: PurchaseOrder) =>
          row.debtAmount === 0 ? (
              <Text type="secondary">—</Text>
          ) : (
              <Text
                  strong
                  type="danger"
                  className="numeric-cell"
              >
                {formatVND(row.debtAmount)}
              </Text>
          ),
    },
    {
      title: 'Tổng tiền',
      align: 'right',
      width: 140,
      sorter: (a, b) => {
        const aValue =
            a.status === DOCUMENT_STATUS.Completed
                ? a.grandTotal
                : (a.estimatedTotal ??
                    a.grandTotal);

        const bValue =
            b.status === DOCUMENT_STATUS.Completed
                ? b.grandTotal
                : (b.estimatedTotal ??
                    b.grandTotal);

        return aValue - bValue;
      },
      render: (_: unknown, row: PurchaseOrder) => {
        const shown =
            row.status === DOCUMENT_STATUS.Completed
                ? row.grandTotal
                : (row.estimatedTotal ??
                    row.grandTotal);

        return (
            <Text
                strong
                className="numeric-cell po-total-due"
            >
              {formatVND(shown)}
            </Text>
        );
      },
    },
    {
      title: 'Người nhập',
      dataIndex: 'createdBy',
      width: 160,
      render: (value: string) => (
          <Text className="inv-text-12-5">
            {value || '—'}
          </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 170,
      render: (status: DocumentStatus) => (
          <DocumentStatusTag status={status} />
      ),
    },
    ...((isApprover || canReceive)
        ? [
          {
            title: 'Thao tác',
            key: 'actions',
            align: 'center' as const,
            width: 260,
            fixed: 'right' as const,
            render: (
                _: unknown,
                row: PurchaseOrder,
            ) => {
              const isLoading =
                  actionLoading === row.id;

              if (
                  row.status ===
                  DOCUMENT_STATUS.PendingConfirmation &&
                  isApprover
              ) {
                return (
                    <Space wrap>
                      <Popconfirm
                          title="Duyệt phiếu nhập?"
                          description={`Duyệt phiếu ${row.code} để chuyển sang "Chờ kiểm nhận".`}
                          okText="Duyệt"
                          cancelText="Đóng"
                          onConfirm={() =>
                              void handleApprove(row)
                          }
                      >
                        <Button
                            type="primary"
                            size="small"
                            loading={isLoading}
                            disabled={
                                actionLoading !== null
                            }
                        >
                          Duyệt
                        </Button>
                      </Popconfirm>

                      <Button
                          danger
                          size="small"
                          onClick={() => {
                            setRejectTarget(row);
                            setRejectReason('');
                          }}
                          disabled={
                              actionLoading !== null
                          }
                      >
                        Từ chối
                      </Button>

                      <Popconfirm
                          title="Hủy phiếu nhập?"
                          description="Phiếu sẽ chuyển sang trạng thái Hủy."
                          okText="Hủy phiếu"
                          cancelText="Đóng"
                          okButtonProps={{
                            danger: true,
                          }}
                          onConfirm={() =>
                              void handleCancel(row)
                          }
                      >
                        <Button
                            danger
                            type="text"
                            size="small"
                            disabled={
                                actionLoading !== null
                            }
                        >
                          Hủy
                        </Button>
                      </Popconfirm>
                    </Space>
                );
              }

              if (
                  row.status ===
                  DOCUMENT_STATUS.PendingReceiving &&
                  canReceive
              ) {
                return (
                    <Space wrap>
                      <Button
                          type="primary"
                          size="small"
                          loading={isLoading}
                          disabled={
                              actionLoading !== null
                          }
                          onClick={() =>
                              void handleStartReceiving(row)
                          }
                      >
                        Bắt đầu kiểm nhận
                      </Button>

                      <Popconfirm
                          title="Hủy phiếu nhập?"
                          description="Phiếu sẽ chuyển sang trạng thái Hủy."
                          okText="Hủy phiếu"
                          cancelText="Đóng"
                          okButtonProps={{
                            danger: true,
                          }}
                          onConfirm={() =>
                              void handleCancel(row)
                          }
                      >
                        <Button
                            danger
                            type="text"
                            size="small"
                            disabled={
                                actionLoading !== null
                            }
                        >
                          Hủy
                        </Button>
                      </Popconfirm>
                    </Space>
                );
              }

              if (
                  row.status ===
                  DOCUMENT_STATUS.Receiving &&
                  canReceive
              ) {
                return (
                    <Space wrap>
                      <Button
                          type="primary"
                          size="small"
                          onClick={() =>
                              setReceivingTarget(row)
                          }
                          disabled={
                              actionLoading !== null
                          }
                      >
                        Kiểm nhận
                      </Button>

                      <Popconfirm
                          title="Hủy phiên kiểm nhận?"
                          description="Phiếu sẽ quay lại trạng thái Chờ kiểm nhận."
                          okText="Hủy kiểm nhận"
                          cancelText="Đóng"
                          okButtonProps={{
                            danger: true,
                          }}
                          onConfirm={() =>
                              void handleCancelReceiving(
                                  row,
                              )
                          }
                      >
                        <Button
                            danger
                            type="text"
                            size="small"
                            disabled={
                                actionLoading !== null
                            }
                        >
                          Hủy kiểm nhận
                        </Button>
                      </Popconfirm>

                      <Popconfirm
                          title="Hủy phiếu nhập?"
                          description="Phiếu sẽ chuyển sang trạng thái Hủy."
                          okText="Hủy phiếu"
                          cancelText="Đóng"
                          okButtonProps={{
                            danger: true,
                          }}
                          onConfirm={() =>
                              void handleCancel(row)
                          }
                      >
                        <Button
                            danger
                            type="text"
                            size="small"
                            disabled={
                                actionLoading !== null
                            }
                        >
                          Hủy
                        </Button>
                      </Popconfirm>
                    </Space>
                );
              }

              if (
                  row.status ===
                  DOCUMENT_STATUS.Completed &&
                  isApprover
              ) {
                return (
                    <Space wrap>
                      <Button
                          type="primary"
                          size="small"
                          onClick={() =>
                              setPayTarget(row)
                          }
                          disabled={row.debtAmount <= 0}
                      >
                        Thanh toán
                      </Button>

                      <Button
                          size="small"
                          onClick={() =>
                              setChangePriceTarget(row)
                          }
                      >
                        Đổi giá
                      </Button>
                    </Space>
                );
              }

              return null;
            },
          } as ColumnsType<PurchaseOrder>[number],
        ]
        : []),
  ];

  /**
   * Bảng chi tiết mặt hàng khi mở rộng một phiếu.
   */
  const renderDetail = (
      order: PurchaseOrder,
  ): ReactElement => {
    const details =
        detailsCache[order.id] || [];

    const mappedLines: PurchaseOrderLine[] =
        details.length > 0
            ? details.map((d) => {
              const product = products.find(
                  (p) => p.id === d.idSanPham,
              );

              return {
                id: d.id,
                productId: d.idSanPham,
                sku: product?.sku || '',
                productName:
                    product?.name || '',
                unit: product?.unit || '',
                orderedQuantity: d.soLuongDat,
                receivedQuantity: d.soLuongNhan,
                unitCost: d.donGiaNhap,
                vatPercent: d.vatPhantram,
                lineTotal: d.thanhTien,
                expiryDate:
                    d.hanSuDung || null,

                surplusQuantity:
                    d.soLuongThua ?? 0,
                surplusHandling:
                    d.xuLyThua ??
                    'CHUA_XU_LY',
                previousUnitCost:
                    d.donGiaNhapCu ?? null,
                lineDiscrepancyReason:
                    d.lyDoChenhLechDong ??
                    null,
              };
            })
            : order.lines;

    const lineColumns: ColumnsType<PurchaseOrderLine> =
        [
          {
            title: 'SKU',
            dataIndex: 'sku',
            width: 150,
            render: (value: string) => (
                <span className="mono-code">
              {value || '—'}
            </span>
            ),
          },
          {
            title: 'Sản phẩm',
            dataIndex: 'productName',
          },
          {
            title: 'Số lượng nhận',
            dataIndex: 'receivedQuantity',
            align: 'right',
            width: 120,
            render: (
                value: number,
                row,
            ) => (
                <Text
                    strong
                    className={`numeric-cell${
                        value > 0 &&
                        value < row.orderedQuantity
                            ? ' po-received-short'
                            : ''
                    }`}
                >
                  {value}

                  {value <
                      row.orderedQuantity && (
                          <Text
                              type="secondary"
                              className="po-text-12-5"
                          >
                            {' '}
                            / {row.orderedQuantity} đặt
                          </Text>
                      )}
                </Text>
            ),
          },
          {
            title: 'Đơn giá',
            dataIndex: 'unitCost',
            align: 'right',
            width: 110,
            render: (value: number) =>
                formatVND(value),
          },
          {
            title: 'VAT',
            dataIndex: 'vatPercent',
            align: 'center',
            width: 65,
            render: (value: number) =>
                `${value}%`,
          },
          {
            title: 'Thành tiền',
            dataIndex: 'lineTotal',
            align: 'right',
            width: 130,
            render: (value: number) => (
                <Text
                    strong
                    className="numeric-cell"
                >
                  {formatVND(value)}
                </Text>
            ),
          },
          {
            title: 'SL thừa',
            dataIndex: 'surplusQuantity',
            align: 'right',
            width: 90,
            render: (value: number) =>
                value > 0 ? (
                    <Text type="warning">
                      {formatNumber(value)}
                    </Text>
                ) : (
                    <Text type="secondary">
                      —
                    </Text>
                ),
          },
          {
            title: 'Cách xử lý',
            dataIndex: 'surplusHandling',
            width: 120,
            render: (value: string) => {
              if (value === 'NHAP_KHO') {
                return (
                    <Text type="success">
                      Nhập thêm
                    </Text>
                );
              }

              if (value === 'TRA_LAI_NCC') {
                return (
                    <Text type="danger">
                      Trả NCC
                    </Text>
                );
              }

              return (
                  <Text type="secondary">
                    —
                  </Text>
              );
            },
          },
          {
            title: 'Giá cũ',
            dataIndex: 'previousUnitCost',
            align: 'right',
            width: 120,
            render: (
                value: number | null,
            ) =>
                value === null ? (
                    <Text type="secondary">
                      —
                    </Text>
                ) : (
                    <Text type="secondary">
                      {formatVND(value)}
                    </Text>
                ),
          },
          {
            title: 'Lý do chênh lệch',
            dataIndex:
                'lineDiscrepancyReason',
            width: 220,
            render: (
                value: string | null,
            ) =>
                value ? (
                    <Text>{value}</Text>
                ) : (
                    <Text type="secondary">
                      —
                    </Text>
                ),
          },
          {
            title: 'HSD lô hàng',
            dataIndex: 'expiryDate',
            width: 120,
            render: (
                value: string | null,
            ) =>
                value === null ? (
                    <Text type="secondary">
                      —
                    </Text>
                ) : (
                    formatDate(value)
                ),
          },
        ];

    return (
        <Space
            direction="vertical"
            size={14}
            className="po-detail-full"
        >
          {details.length === 0 ? (
              <Text
                  type="secondary"
                  style={{
                    padding: 12,
                    display: 'block',
                  }}
              >
                Đang tải chi tiết...
              </Text>
          ) : (
              <Table<PurchaseOrderLine>
                  columns={lineColumns}
                  dataSource={mappedLines}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 1400 }}
              />
          )}

          <Descriptions
              bordered
              size="small"
              column={4}
          >
            <Descriptions.Item label="Tiền hàng">
              {formatVND(order.subTotal)}
            </Descriptions.Item>

            <Descriptions.Item label="Thuế VAT">
              {formatVND(order.vatTotal)}
            </Descriptions.Item>

            <Descriptions.Item
                label="Tổng tiền"
                span={2}
            >
              <Text
                  strong
                  className="po-total-due"
              >
                {formatVND(
                    order.grandTotal,
                )}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item
                label="Công nợ còn lại"
                span={2}
            >
              <Text
                  strong
                  type={
                    order.debtAmount > 0
                        ? 'danger'
                        : undefined
                  }
              >
                {order.debtAmount > 0
                    ? formatVND(
                        order.debtAmount,
                    )
                    : '—'}
              </Text>
            </Descriptions.Item>

            {order.estimatedTotal !==
                null && (
                    <Descriptions.Item
                        label="Giá trị dự kiến"
                        span={2}
                    >
                      {formatVND(
                          order.estimatedTotal,
                      )}
                    </Descriptions.Item>
                )}

            {order.approvedAt && (
                <>
                  <Descriptions.Item label="Người duyệt">
                    {nameOf(
                        order.approverId,
                    ) ?? '—'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày duyệt">
                    {formatDate(
                        order.approvedAt,
                    )}
                  </Descriptions.Item>
                </>
            )}

            {order.rejectReason && (
                <Descriptions.Item
                    label="Lý do từ chối"
                    span={2}
                >
                  {order.rejectReason}
                </Descriptions.Item>
            )}

            {order.receivedAt && (
                <>
                  <Descriptions.Item label="Người kiểm nhận">
                    {nameOf(
                        order.receiverId,
                    ) ?? '—'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày kiểm nhận">
                    {formatDate(
                        order.receivedAt,
                    )}
                  </Descriptions.Item>
                </>
            )}

            {order.discrepancyReason && (
                <Descriptions.Item
                    label="Lý do chênh lệch"
                    span={2}
                >
                  {order.discrepancyReason}
                </Descriptions.Item>
            )}

            {order.discount > 0 && (
                <Descriptions.Item
                    label="Giảm giá"
                    span={2}
                >
                  {formatVND(
                      order.discount,
                  )}
                </Descriptions.Item>
            )}

            <Descriptions.Item
                label="Người nhập"
                span={2}
            >
              {order.createdBy || '—'}
            </Descriptions.Item>

            <Descriptions.Item
                label="Ghi chú"
                span={2}
            >
              {order.note === ''
                  ? '—'
                  : order.note}
            </Descriptions.Item>
          </Descriptions>
        </Space>
    );
  };

  const handleExport = (): void => {
    exportToExcel(
        filtered,
        [
          {
            header: 'Mã phiếu',
            accessor: (row) => row.code,
          },
          {
            header: 'Nhà cung cấp',
            accessor: (row) =>
                row.supplierName,
          },
          {
            header: 'Kho nhận',
            accessor: (row) =>
                row.branchName,
          },
          {
            header: 'Ngày nhập kho',
            accessor: (row) =>
                row.orderDate,
          },
          {
            header: 'Số mặt hàng',
            accessor: (row) => {
              const lines =
                  detailsCache[row.id] ?? row.lines;

              return lines.length;
            },
          },
          {
            header: 'Số lượng nhận',
            accessor: (row) => {
              const lines =
                  detailsCache[row.id] ?? row.lines;

              return lines.reduce(
                  (sum, line) =>
                      sum + line.soLuongNhan,
                  0,
              );
            },
          },
          {
            header: 'Tiền hàng',
            accessor: (row) =>
                row.subTotal,
          },
          {
            header: 'VAT',
            accessor: (row) =>
                row.vatTotal,
          },
          {
            header: 'Giá trị dự kiến',
            accessor: (row) =>
                row.estimatedTotal ??
                '',
          },
          {
            header: 'Công nợ còn lại',
            accessor: (row) =>
                row.debtAmount,
          },
          {
            header: 'Tổng tiền',
            accessor: (row) =>
                row.status ===
                DOCUMENT_STATUS.Completed
                    ? row.grandTotal
                    : (row.estimatedTotal ??
                        row.grandTotal),
          },
          {
            header: 'Người nhập',
            accessor: (row) =>
                row.createdBy,
          },
          {
            header: 'Trạng thái',
            accessor: (row) =>
                DOCUMENT_STATUS_LABEL[
                    row.status
                    ],
          },
        ],
        'Phieu nhap kho',
    );
  };

  return (
      <>
        <PageHeader
            eyebrow="QUẢN TRỊ KHO / MODULE 8"
            title="Nhập kho từ nhà cung cấp"
            description="Lập phiếu nhập → Kế toán duyệt → Thủ kho kiểm nhận (điều chỉnh số thực nhận, xử lý hàng thừa) → phiếu hoàn tất, ghi thẻ kho và tính tồn Kho Tổng. Công nợ NCC được thanh toán nhiều lần sau đó."
            extra={
              <Space wrap>
                <Tag
                    color="red"
                    className="tag-no-margin"
                >
                  {filtered.length} /{' '}
                  {orders.length} phiếu
                </Tag>

                {canCreate && (
                    <Button
                        type="primary"
                        icon={
                          <PlusOutlined />
                        }
                        onClick={() =>
                            setFormOpen(true)
                        }
                    >
                      Lập phiếu nhập
                    </Button>
                )}
              </Space>
            }
        />

        <SummaryStrip items={summary} />

        <Card
            styles={{
              body: {
                padding:
                    '18px 18px 8px',
              },
            }}
        >
          <TableToolbar
              searchValue={search}
              searchPlaceholder="Tìm theo mã phiếu, nhà cung cấp, người tạo..."
              onSearchChange={setSearch}
              filters={filters}
              onExport={handleExport}
              onReset={() => {
                setSearch('');
                setStatusFilter(null);
                setSupplierFilter(null);
              }}
          />

          <Table<PurchaseOrder>
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              size="middle"
              loading={isInitialLoading(
                  loading,
                  orders,
              )}
              scroll={{ x: 2300 }}
              expandable={{
                expandedRowRender: (
                    record,
                ) => {
                  try {
                    return renderDetail(
                        record,
                    );
                  } catch (error) {
                    console.error(
                        '[PurchaseOrders] renderDetail error:',
                        error,
                    );

                    return (
                        <Text type="danger">
                          Lỗi render chi tiết
                        </Text>
                    );
                  }
                },
                columnWidth: 44,
                onExpand: (
                    expanded,
                    record,
                ) => {
                  if (expanded) {
                    void loadDetails(
                        record.id,
                    );
                  }
                },
              }}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: [
                  '10',
                  '20',
                  '50',
                  '100',
                ],
                showTotal: (total) =>
                    `${total} phiếu nhập`,
              }}
          />
        </Card>

        <PurchaseFormModal
            open={isFormOpen}
            onClose={() =>
                setFormOpen(false)
            }
        />

        <Modal
            open={rejectTarget !== null}
            title={`Từ chối phiếu ${
                rejectTarget?.code ?? ''
            }`}
            okText="Từ chối phiếu"
            cancelText="Hủy"
            okButtonProps={{
              danger: true,
              disabled:
                  !rejectReason.trim(),
              loading:
                  rejectTarget !== null &&
                  actionLoading ===
                  rejectTarget.id,
            }}
            onOk={() =>
                void handleReject()
            }
            onCancel={() => {
              setRejectTarget(null);
              setRejectReason('');
            }}
        >
          <Input.TextArea
              rows={3}
              required
              maxLength={500}
              showCount
              placeholder="Lý do từ chối (bắt buộc)"
              value={rejectReason}
              onChange={(event) =>
                  setRejectReason(
                      event.target.value,
                  )
              }
          />
        </Modal>

        <ReceivingModal
            open={
                receivingTarget !== null
            }
            order={receivingTarget}
            onSubmitted={() => {
              if (receivingTarget) {
                invalidateDetails(
                    receivingTarget.id,
                );
              }
            }}
            onClose={() =>
                setReceivingTarget(null)
            }
        />

        <PayModal
            open={payTarget !== null}
            order={payTarget}
            onClose={() =>
                setPayTarget(null)
            }
        />

        <ChangePriceModal
            open={
                changePriceTarget !== null
            }
            order={changePriceTarget}
            onSubmitted={() => {
              if (changePriceTarget) {
                invalidateDetails(changePriceTarget.id);
              }
            }}
            onClose={() =>
                setChangePriceTarget(null)
            }
        />
      </>
  );
};