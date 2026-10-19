import { useState, useEffect, useCallback, type FC } from 'react';
import {
  Modal,
  Table,
  Button,
  Form,
  Select,
  InputNumber,
  Input,
  Checkbox,
  Space,
  Tag,
  Popconfirm,
  App as AntdApp,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  StarFilled,
  ShopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { sanPhamApi, type SanPhamNhaCungCapDTO } from '@/api/sanPham';
import { formatVND } from '@/utils/formatters';
import type { Product } from '@/types';
import { useAppSelector } from '@/store/hooks';

const { Text } = Typography;

interface ProductSuppliersModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const ProductSuppliersModal: FC<ProductSuppliersModalProps> = ({
  open,
  product,
  onClose,
  onUpdated,
}) => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const suppliers = useAppSelector((state) => state.supplier.suppliers);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supplierLinks, setSupplierLinks] = useState<SanPhamNhaCungCapDTO[]>([]);

  const loadData = useCallback(async () => {
    if (!product?.id) return;
    try {
      setLoading(true);
      const res = await sanPhamApi.getSuppliers(product.id);
      setSupplierLinks(res);
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải danh sách nhà cung cấp của sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [product?.id, message]);

  useEffect(() => {
    if (open && product?.id) {
      loadData();
      form.resetFields();
      if (product.costPrice) {
        form.setFieldsValue({ giaNhap: product.costPrice });
      }
    }
  }, [open, product?.id, loadData, form, product?.costPrice]);

  const handleSave = async (values: any) => {
    if (!product?.id) return;
    try {
      setSubmitting(true);
      await sanPhamApi.saveSupplier(product.id, {
        idNhaCungCap: values.idNhaCungCap,
        giaNhap: values.giaNhap,
        maSanPhamNcc: values.maSanPhamNcc?.trim() || undefined,
        laNccChinh: values.laNccChinh || false,
        ghiChu: values.ghiChu?.trim() || undefined,
      });
      message.success('Đã lưu liên kết nhà cung cấp cho sản phẩm');
      form.resetFields();
      await loadData();
      onUpdated?.();
    } catch (e: any) {
      message.error(e?.message || 'Không thể lưu liên kết nhà cung cấp');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (nccId: string) => {
    if (!product?.id) return;
    try {
      await sanPhamApi.setPrimarySupplier(product.id, nccId);
      message.success('Đã đặt làm nhà cung cấp chính mặc định');
      await loadData();
      onUpdated?.();
    } catch (e: any) {
      message.error(e?.message || 'Không thể đặt nhà cung cấp chính');
    }
  };

  const handleRemove = async (nccId: string) => {
    if (!product?.id) return;
    try {
      await sanPhamApi.removeSupplier(product.id, nccId);
      message.success('Đã gỡ liên kết nhà cung cấp');
      await loadData();
      onUpdated?.();
    } catch (e: any) {
      message.error(e?.message || 'Không thể gỡ liên kết nhà cung cấp');
    }
  };

  const columns: ColumnsType<SanPhamNhaCungCapDTO> = [
    {
      title: 'Nhà cung cấp',
      key: 'ncc',
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.tenNcc || 'Chưa rõ'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Mã: {row.maNcc || '—'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Mã hàng NCC',
      dataIndex: 'maSanPhamNcc',
      key: 'maSanPhamNcc',
      render: (val: string) => val ? <Tag color="blue">{val}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Giá nhập riêng',
      dataIndex: 'giaNhap',
      key: 'giaNhap',
      align: 'right',
      render: (val: number) => (
        <Text strong style={{ color: '#1677ff' }}>
          {formatVND(val || 0)}
        </Text>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'laNccChinh',
      key: 'laNccChinh',
      align: 'center',
      render: (isPrimary: boolean, row) =>
        isPrimary ? (
          <Tag icon={<StarFilled />} color="gold">
            NCC Chính
          </Tag>
        ) : (
          <Button
            size="small"
            type="link"
            onClick={() => handleSetPrimary(row.idNhaCungCap)}
          >
            Đặt làm chính
          </Button>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      width: 80,
      render: (_, row) => (
        <Popconfirm
          title="Gỡ nhà cung cấp này?"
          description="Sản phẩm sẽ không còn được nhập từ nhà cung cấp này nữa."
          okText="Gỡ bỏ"
          cancelText="Huỷ"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleRemove(row.idNhaCungCap)}
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const assignedNccIds = new Set(supplierLinks.map((l) => l.idNhaCungCap));
  const availableSuppliers = suppliers.filter((s) => s.status === 'Active');

  return (
    <Modal
      open={open}
      title={
        <Space>
          <ShopOutlined style={{ color: '#1677ff' }} />
          <span>
            Nhà cung cấp cung ứng — {product?.name} ({product?.sku})
          </span>
        </Space>
      }
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={780}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Cấu hình danh sách các Nhà cung cấp có thể cung ứng sản phẩm này. Khi tạo Phiếu Nhập Hàng,
          hệ thống sẽ tự động áp dụng giá nhập riêng tương ứng với nhà cung cấp được chọn.
        </Text>
      </div>

      <Table<SanPhamNhaCungCapDTO>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={supplierLinks}
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Chưa có nhà cung cấp nào được liên kết' }}
        style={{ marginBottom: 24 }}
      />

      <div style={{ margin: '20px 0 12px', borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
        <strong style={{ fontSize: 14 }}>Thêm / Cập nhật Nhà Cung Cấp</strong>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          giaNhap: product?.costPrice || 0,
          laNccChinh: supplierLinks.length === 0,
        }}
      >
        <Space style={{ display: 'flex', width: '100%' }} align="start" size={12}>
          <Form.Item
            name="idNhaCungCap"
            label="Nhà cung cấp"
            rules={[{ required: true, message: 'Vui lòng chọn NCC' }]}
            style={{ width: 260 }}
          >
            <Select
              placeholder="Chọn nhà cung cấp"
              showSearch
              optionFilterProp="label"
              options={availableSuppliers.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.code})`,
                disabled: assignedNccIds.has(s.id),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="giaNhap"
            label="Giá nhập thỏa thuận (VND)"
            rules={[{ required: true, message: 'Nhập giá nhập' }]}
            style={{ width: 180 }}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              min={0}
              step={1000}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => (v ? Number(v.replace(/\$\s?|(,*)/g, '')) : 0)}
            />
          </Form.Item>

          <Form.Item
            name="maSanPhamNcc"
            label="Mã hàng NCC (nếu có)"
            style={{ width: 170 }}
          >
            <Input placeholder="VD: CC-330-CAN" />
          </Form.Item>
        </Space>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Form.Item name="laNccChinh" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Đặt làm Nhà cung cấp chính (mặc định tính giá vốn)</Checkbox>
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={submitting}
          >
            Lưu liên kết
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
