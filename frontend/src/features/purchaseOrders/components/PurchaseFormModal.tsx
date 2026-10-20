import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPurchaseOrders, type PurchaseDraftLine } from '@/store/slices/purchaseSlice';
import { stockOf } from '@/store/slices/stockSlice';
import { phieuNhapApi } from '@/api/phieuNhap';
import { hopDongApi, type HopDongDTO } from '@/api/hopDongApi';
import { sanPhamApi, type SuppliedProductDTO } from '@/api/sanPham';
import { fetchBranches  } from '@/store/slices/branchSlice';
import { fetchProducts } from '@/store/slices/productSlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import { PRODUCT_UNIT_LABEL, USER_ROLE } from '@/types';
import { BRANCH_KIND } from '@/types/branchTypes';
import { DISTRIBUTION_CENTER_ID } from '@/config/businessRules';
import { dayjs, today } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';
import type { Dayjs } from 'dayjs';
import './PurchaseFormModal.css';

const { Text, Paragraph } = Typography;

interface PurchaseFormValues {
  supplierId: string;
  contractId?: string;
  orderDate: Dayjs;
  note: string;
}

/** Một dòng hàng trên form, `productId` rỗng nghĩa là dòng chưa chọn sản phẩm. */
interface DraftRow extends PurchaseDraftLine {
  key: string;
}

interface PurchaseFormModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyRow = (): DraftRow => ({
  key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '',
  quantity: 0,
  unitCost: 0,
  vatPercent: 8,
});

/**
 * Form lập phiếu nhập hàng từ nhà cung cấp (module 8).
 *
 * Luồng:
 * 1. Tạo phiếu ở trạng thái PENDING_CONFIRMATION.
 * 2. Kế toán duyệt phiếu → PENDING_RECEIVING.
 * 3. Thủ kho bắt đầu kiểm nhận → RECEIVING.
 * 4. Thủ kho xác nhận số lượng thực nhận và xử lý hàng thừa.
 * 5. Hệ thống cộng tồn Kho Tổng, ghi thẻ kho và tạo lô hàng → COMPLETED.
 *
 * Vì vậy form này chỉ ghi nhận số lượng ĐẶT.
 * Số lượng THỰC NHẬN được xác định tại ReceivingModal.
 *
 * BR-05: hàng luôn vào Kho Tổng, không cho chọn chi nhánh.
 * Chỉ hiện sản phẩm do chính nhà cung cấp đã chọn cung ứng.
 */
export const PurchaseFormModal: FC<PurchaseFormModalProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<PurchaseFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const user = useAppSelector((state) => state.auth.user);
  const suppliers = useAppSelector((state) => state.supplier.suppliers);
  const balances = useAppSelector((state) => state.stock.balances);
  const products = useAppSelector((state) => state.product.products);
  const branches = useAppSelector((state) => state.branch.branches);
  const branchLoading = useAppSelector((state) => state.branch.loading);

  useEffect(() => {
    if (open) {
      dispatch(fetchProducts());
      dispatch(fetchSuppliers());

      // Phòng thủ: nếu branch chưa load
      // (ví dụ mở form trước khi AppBootstrap hoàn tất)
      if (branches.length === 0) {
        dispatch(fetchBranches());
      }
    }
  }, [open, dispatch, branches.length]);

  const sellableProducts = products.filter((p) => p.status === 'Active');
  const branchNameById = (id: string): string => {
    const branch = branches.find((b) => b.id === id);
    return branch?.name ?? 'Kho Tổng';
  };

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<HopDongDTO[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [suppliedProducts, setSuppliedProducts] = useState<SuppliedProductDTO[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);

  // Tải danh sách sản phẩm được liên kết với nhà cung cấp đang chọn
  useEffect(() => {
    if (!supplierId) {
      setSuppliedProducts([]);
      return;
    }
    let cancelled = false;
    sanPhamApi
      .getSuppliedProducts(supplierId)
      .then((res) => {
        if (!cancelled) setSuppliedProducts(res);
      })
      .catch(() => {
        if (!cancelled) setSuppliedProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  const suppliedMap = useMemo(() => {
    const map = new Map<string, SuppliedProductDTO>();
    suppliedProducts.forEach((p) => map.set(p.id, p));
    return map;
  }, [suppliedProducts]);

  /**
   * Dọn form sau khi modal đóng hẳn.
   */
  const handleAfterClose = (): void => {
    form.resetFields();
    setSupplierId(null);
    setContracts([]);
    setSelectedContractId(null);
    setSuppliedProducts([]);
    setBranchId(null);
    setRows([emptyRow()]);
  };

  /** Kho nhận chỉ được phép chọn Kho Tổng (BR-05) — loại DISTRIBUTION_CENTER. */
  const khoTongBranches = useMemo(
      () => branches.filter((b) => b.kind === BRANCH_KIND.DistributionCenter),
      [branches],
  );
  const isWarehouseKeeper = user?.role === USER_ROLE.WarehouseKeeper;
  const ownDistributionCenter = useMemo(
    () => khoTongBranches.find((branch) => branch.id === user?.branchId) ?? null,
    [khoTongBranches, user?.branchId],
  );
  const selectableDistributionCenters = isWarehouseKeeper
    ? (ownDistributionCenter ? [ownDistributionCenter] : [])
    : khoTongBranches;
  useEffect(() => {
    if (!open) return;
    if (isWarehouseKeeper) {
      setBranchId(ownDistributionCenter?.id ?? null);
    } else if (branchId === null && khoTongBranches.length > 0) {
      setBranchId(khoTongBranches[0].id);
    }
  }, [open, branchId, khoTongBranches, isWarehouseKeeper, ownDistributionCenter?.id]);

  /** Sản phẩm NCC đang chọn cung ứng: ưu tiên bảng liên kết nhiều-nhiều, fallback về product.supplierId */
  const supplierProducts = useMemo(() => {
    if (supplierId === null) return [];
    if (suppliedProducts.length > 0) {
      return sellableProducts.filter((p) => suppliedMap.has(p.id));
    }
    return products.filter(
      (product) => product.status === 'Active' && product.supplierId === supplierId,
    );
  }, [supplierId, suppliedProducts, suppliedMap, sellableProducts, products]);

  /** Sản phẩm đã có trên form, để không cho chọn trùng. */
  const usedProductIds = useMemo(
    () => new Set(rows.map((row) => row.productId).filter((id) => id !== '')),
    [rows],
  );

  const validRows = useMemo(
    () => rows.filter((row) => row.productId !== '' && row.quantity > 0),
    [rows],
  );

  const totals = useMemo(() => {
    const subTotal = validRows.reduce(
      (sum, row) => sum + row.quantity * row.unitCost,
      0,
    );
    const vatTotal = validRows.reduce((sum, row) => {
      return sum + (row.quantity * row.unitCost * row.vatPercent) / 100;
    }, 0);

    return {
      subTotal,
      vatTotal: Math.round(vatTotal),
      grandTotal: subTotal + Math.round(vatTotal),
    };
  }, [validRows]);

  const updateRow = (key: string, patch: Partial<DraftRow>): void => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  /** Đổi NCC làm các dòng hàng cũ không còn hợp lệ, nên xoá hết. */
  const handleSupplierChange = (value: string): void => {
    setSupplierId(value);
    setRows([emptyRow()]);
    setSelectedContractId(null);
    form.setFieldValue('contractId', undefined);
    hopDongApi.list({ idNcc: value, trangThai: 'ACTIVE' })
      .then(setContracts)
      .catch(() => setContracts([]));
  };

  const handleSubmit = async (): Promise<void> => {
    if (isSubmittingRef.current) return;
    try {
      const values = await form.validateFields();

      if (branchId === null) {
        message.error('Chưa xác định được Kho Tổng nhận hàng.');
        return;
      }
      if (isWarehouseKeeper && branchId !== ownDistributionCenter?.id) {
        message.error('Thủ kho chỉ được lập phiếu nhập cho Kho Tổng được phân công.');
        return;
      }

      if (validRows.length === 0) {
        message.error('Phiếu nhập phải có ít nhất một dòng hàng hợp lệ.');
        return;
      }

      if (validRows.some((row) => row.unitCost <= 0)) {
        message.error('Đơn giá nhập phải lớn hơn 0.');
        return;
      }

      isSubmittingRef.current = true;
      setSubmitting(true);

      // Bước 1 của luồng mới: tạo phiếu ở trạng thái PENDING_CONFIRMATION.
      // Chưa duyệt, chưa kiểm nhận và chưa cộng tồn Kho Tổng.
      const createdOrder = await phieuNhapApi.createWithLines({
        idChiNhanh: branchId,
        idNcc: values.supplierId,
        idHopDong: selectedContractId || null,
        ngayDatHang: values.orderDate.format('YYYY-MM-DD'),
        ghiChu: values.note?.trim() ?? '',
        lines: validRows.map((row) => ({
          idSanPham: row.productId,
          soLuong: row.quantity,
          donGiaNhap: row.unitCost,
          vatPhantram: row.vatPercent,
        })),
      });

      message.success(
          `Đã lưu phiếu nhập ${createdOrder.maPhieu} — trạng thái "Chờ duyệt". ` +
          'Kế toán duyệt, sau đó Thủ kho kiểm nhận thì tồn Kho Tổng mới tăng.',
      );
      dispatch(fetchPurchaseOrders());
      onClose();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.message || 'Có lỗi xảy ra khi lưu phiếu nhập');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const lineColumns: ColumnsType<DraftRow> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      render: (value: string, row) => (
        <Select
          className="purchase-line-product"
          value={value === '' ? undefined : value}
          placeholder={
            supplierId === null ? 'Chọn nhà cung cấp trước' : 'Chọn sản phẩm'
          }
          disabled={supplierId === null}
          showSearch
          optionFilterProp="label"
          onChange={async (productId: string) => {
            const product = sellableProducts.find((item) => item.id === productId);
            const supplied = suppliedMap.get(productId);
            let unitCost = supplied && supplied.giaNhapNcc > 0
              ? supplied.giaNhapNcc
              : (product?.costPrice ?? 0);
            let vatPercent = product?.vatPercent ?? 8;

            if (supplierId) {
              try {
                const resolved = await phieuNhapApi.resolvePrice(supplierId, productId, selectedContractId || undefined);
                if (resolved && resolved.donGiaDeXuat > 0) {
                  unitCost = resolved.donGiaDeXuat;
                  vatPercent = resolved.vatPhantram;
                }
              } catch {}
            }

            updateRow(row.key, {
              productId,
              unitCost,
              vatPercent,
            });
          }}
          options={supplierProducts.map((product) => {
            const supplied = suppliedMap.get(product.id);
            const priceLabel = supplied && supplied.giaNhapNcc > 0
              ? ` — Giá nhập: ${formatVND(supplied.giaNhapNcc)}`
              : '';
            return {
              value: product.id,
              label: `${product.name} (${product.sku})${priceLabel}`,
              // Đã có trên phiếu thì không cho chọn lại.
              disabled: usedProductIds.has(product.id) && product.id !== value,
            };
          })}
        />
      ),
    },
    {
      title: 'Tồn Kho Tổng',
      key: 'currentStock',
      align: 'right',
      width: 110,
      render: (_, row) =>
        row.productId === '' ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell">
            {stockOf(balances, branchId || DISTRIBUTION_CENTER_ID, row.productId)}
          </span>
        ),
    },
    {
      title: 'Số lượng nhập',
      dataIndex: 'quantity',
      align: 'right',
      width: 130,
      render: (value: number, row) => (
        <InputNumber<number>
          className="purchase-line-input"
          min={0}
          step={1}
          value={value}
          disabled={row.productId === ''}
          onChange={(quantity) => updateRow(row.key, { quantity: quantity ?? 0 })}
        />
      ),
    },
    {
      title: 'Đơn giá nhập',
      dataIndex: 'unitCost',
      align: 'right',
      width: 150,
      render: (value: number) => (
        <InputNumber<number>
          className="purchase-line-input"
          min={1}
          step={1_000}
          value={value}
          disabled
          formatter={(input) => `${input ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(input) => Number((input ?? '0').replace(/\./g, ''))}
        />
      ),
    },
    {
      title: 'Thành tiền',
      key: 'lineTotal',
      align: 'right',
      width: 140,
      render: (_, row) => (
        <Text strong className="numeric-cell">
          {formatVND(row.quantity * row.unitCost)}
        </Text>
      ),
    },
    {
      title: 'Đơn vị',
      key: 'unit',
      align: 'center',
      width: 80,
      render: (_, row) => {
        const product = sellableProducts.find((item) => item.id === row.productId);
        return product === undefined ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="purchase-line-unit">
            {PRODUCT_UNIT_LABEL[product.unit]}
          </Text>
        );
      },
    },
    {
      key: 'actions',
      align: 'center',
      width: 50,
      render: (_, row) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          // Luôn giữ lại ít nhất một dòng để form không trống trơn.
          disabled={rows.length === 1}
          onClick={() =>
            setRows((current) => current.filter((item) => item.key !== row.key))
          }
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="Lập phiếu nhập hàng từ nhà cung cấp"
      okText="Lưu phiếu nhập"
      cancelText="Huỷ"
      onOk={handleSubmit}
      onCancel={onClose}
      afterClose={handleAfterClose}
      destroyOnHidden
      width={1000}
      confirmLoading={submitting}
      okButtonProps={{ loading: submitting, disabled: submitting || branchId === null }}
      cancelButtonProps={{ disabled: submitting }}
    >
      <Alert
          type="info"
          showIcon
          className="purchase-alert"
          message={`Hàng nhập vào ${branchNameById(branchId || DISTRIBUTION_CENTER_ID)}`}
          description="Lưu phiếu xong ở trạng thái “Chờ duyệt”. Kế toán duyệt phiếu, sau đó Thủ kho kiểm nhận số thực tế, xử lý hàng thừa và xác nhận nhận hàng. Khi kiểm nhận hoàn tất, hệ thống mới cộng tồn Kho Tổng, ghi thẻ kho và tạo lô hàng."
      />

      <Form<PurchaseFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        // Ngày nhập mặc định là hôm nay; `afterClose` sẽ đưa về lại giá trị này.
        initialValues={{ orderDate: dayjs(today()), note: '' }}
      >
        <Space size={16} wrap className="purchase-head-fields">
          <Form.Item
            name="supplierId"
            label="Nhà cung cấp"
            rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp.' }]}
            className="purchase-field-supplier"
          >
            <Select
              placeholder="Chọn nhà cung cấp"
              showSearch
              optionFilterProp="label"
              onChange={handleSupplierChange}
              options={suppliers
                .filter((supplier) => supplier.status === 'Active')
                .map((supplier) => ({
                  value: supplier.id,
                  label: `${supplier.code} — ${supplier.name}`,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="contractId"
            label="Hợp đồng tham chiếu"
            style={{ minWidth: 260 }}
          >
            <Select
              placeholder="Chọn hợp đồng (nếu có)"
              allowClear
              disabled={supplierId === null}
              value={selectedContractId ?? undefined}
              onChange={(val) => {
                setSelectedContractId(val ?? null);
                if (supplierId) {
                  rows.forEach(async (r) => {
                    if (r.productId) {
                      try {
                        const res = await phieuNhapApi.resolvePrice(supplierId, r.productId, val);
                        if (res && res.donGiaDeXuat > 0) {
                          updateRow(r.key, { unitCost: res.donGiaDeXuat, vatPercent: res.vatPhantram });
                        }
                      } catch {}
                    }
                  });
                }
              }}
              options={contracts.map((c) => ({
                value: c.id,
                label: `${c.maHopDong} — ${c.tenHopDong}`,
              }))}
            />
          </Form.Item>

          <Form.Item label="Kho nhận (chỉ Kho Tổng)">
            <Select
                placeholder="Chọn Kho Tổng"
                value={branchId}
                onChange={setBranchId}
                disabled={isWarehouseKeeper}
                loading={branchLoading}
                showSearch
                optionFilterProp="label"
                notFoundContent="Không có Kho Tổng nào"
                options={selectableDistributionCenters.map((b) => ({
                  value: b.id,
                  label: `${b.code} - ${b.name}`,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="orderDate"
            label="Ngày nhập kho"
            rules={[{ required: true, message: 'Vui lòng chọn ngày.' }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              allowClear={false}
              // Không ghi nhận hàng nhập ở tương lai.
              maxDate={dayjs(today())}
              disabled
            />
          </Form.Item>
        </Space>

        <Form.Item name="note" label="Ghi chú">
          <Input placeholder="Ví dụ: Giao thiếu 2 thùng, NCC hẹn bù tuần sau." />
        </Form.Item>
      </Form>

      {supplierId !== null && supplierProducts.length === 0 && (
        <Alert
          type="warning"
          showIcon
          className="purchase-alert"
          message= "Nhà cung cấp này chưa có sản phẩm nào để nhập."
          description= "Không có sản phẩm đang kinh doanh (Active) thuộc nhóm hàng cung ứng của nhà cung cấp, hoặc sản phẩm chưa được gán nhà cung cấp."
        />
      )}

      <Table<DraftRow>
        columns={lineColumns}
        dataSource={rows}
        rowKey="key"
        size="small"
        pagination={false}
        className="purchase-line-table"
      />

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        disabled={supplierId === null}
        className="purchase-add-row"
        onClick={() => setRows((current) => [...current, emptyRow()])}
      >
        Thêm dòng hàng
      </Button>

      <Descriptions bordered size="small" column={3} className="purchase-totals">
        <Descriptions.Item label="Tiền hàng">
          {formatVND(totals.subTotal)}
        </Descriptions.Item>
        <Descriptions.Item label="Thuế VAT">
          {formatVND(totals.vatTotal)}
        </Descriptions.Item>
        <Descriptions.Item label="Tổng phải trả">
          <Text strong className="purchase-grand-total">
            {formatVND(totals.grandTotal)}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Paragraph type="secondary" className="purchase-foot-note">
        {validRows.length} dòng hàng hợp lệ. Phiếu sẽ ở trạng thái Chờ duyệt.
        Công nợ nhà cung cấp được theo dõi sau khi phiếu hoàn tất kiểm nhận và có thể
        thanh toán nhiều lần.
      </Paragraph>
    </Modal>
  );
};
