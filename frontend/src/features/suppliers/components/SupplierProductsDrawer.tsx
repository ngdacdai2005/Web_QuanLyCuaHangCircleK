import { useEffect, useState, useMemo, type FC } from 'react';
import {
    App as AntdApp,
    Button,
    Drawer,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
    Switch,
    Table,
    Tooltip,
    Typography,
} from 'antd';
import {
    DeleteOutlined,
    PlusOutlined,
    StarFilled,
    StarOutlined,
} from '@ant-design/icons';
import { sanPhamApi, type SuppliedProductDTO } from '@/api/sanPham';
import { useAppSelector } from '@/store/hooks';
import type { Supplier } from '@/types';
import { formatVND } from '@/utils/formatters';

const { Text } = Typography;

interface SupplierProductsDrawerProps {
    supplier: Supplier | null;
    open: boolean;
    onClose: () => void;
    onUpdated?: () => void;
}

export const SupplierProductsDrawer: FC<SupplierProductsDrawerProps> = ({
    supplier,
    open,
    onClose,
    onUpdated,
}) => {
    const { message } = AntdApp.useApp();
    const products = useAppSelector((state) => state.product.products);

    const [loading, setLoading] = useState(false);
    const [suppliedList, setSuppliedList] = useState<SuppliedProductDTO[]>([]);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const fetchSupplied = async (): Promise<void> => {
        if (!supplier) return;
        setLoading(true);
        try {
            const data = await sanPhamApi.getSuppliedProducts(supplier.id);
            setSuppliedList(data);
        } catch (e: any) {
            message.error(e?.message || 'Không thể tải danh sách sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && supplier) {
            fetchSupplied();
        } else {
            setSuppliedList([]);
        }
    }, [open, supplier]);

    // Các sản phẩm chưa được gắn cho NCC này
    const availableProducts = useMemo(() => {
        const suppliedIds = new Set(suppliedList.map((p) => p.id));
        return products.filter((p) => !suppliedIds.has(p.id) && p.status === 'Active');
    }, [products, suppliedList]);

    const handleRemoveProduct = async (productId: string): Promise<void> => {
        if (!supplier) return;
        try {
            await sanPhamApi.removeSupplier(productId, supplier.id);
            message.success('Đã gỡ sản phẩm khỏi danh mục của NCC');
            fetchSupplied();
            onUpdated?.();
        } catch (e: any) {
            message.error(e?.message || 'Không thể gỡ sản phẩm');
        }
    };

    const handleSetPrimary = async (productId: string): Promise<void> => {
        if (!supplier) return;
        try {
            await sanPhamApi.setPrimarySupplier(productId, supplier.id);
            message.success('Đã đặt NCC này làm nhà cung cấp chính cho sản phẩm');
            fetchSupplied();
            onUpdated?.();
        } catch (e: any) {
            message.error(e?.message || 'Không thể đặt làm NCC chính');
        }
    };

    const handleAddSubmit = async (): Promise<void> => {
        if (!supplier) return;
        try {
            const values = await addForm.validateFields();
            setSubmitting(true);
            await sanPhamApi.saveSupplier(values.productId, {
                idNhaCungCap: supplier.id,
                giaNhap: values.giaNhap,
                maSanPhamNcc: values.maSanPhamNcc,
                laNccChinh: Boolean(values.laNccChinh),
            });
            message.success('Đã gán sản phẩm cho nhà cung cấp');
            setAddModalOpen(false);
            addForm.resetFields();
            fetchSupplied();
            onUpdated?.();
        } catch (e: any) {
            message.error(e?.message || 'Không thể gán sản phẩm');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                width={720}
                title={
                    supplier ? (
                        <Space direction="vertical" size={2}>
                            <Text strong style={{ fontSize: 16 }}>
                                Danh mục sản phẩm cung ứng
                            </Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {supplier.name} ({supplier.code})
                            </Text>
                        </Space>
                    ) : (
                        'Sản phẩm cung ứng'
                    )
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            addForm.resetFields();
                            setAddModalOpen(true);
                        }}
                    >
                        Gán thêm sản phẩm
                    </Button>
                }
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                        Các sản phẩm này sẽ hiển thị trong danh mục ưu tiên khi lập <strong>Hợp đồng</strong> và bắt buộc khi tạo <strong>Phiếu nhập hàng</strong> từ nhà cung cấp này.
                    </Text>
                </div>

                <Table
                    size="small"
                    loading={loading}
                    rowKey="id"
                    dataSource={suppliedList}
                    locale={{ emptyText: 'Nhà cung cấp này chưa được gán sản phẩm nào.' }}
                    columns={[
                        {
                            title: 'Sản phẩm',
                            key: 'product',
                            render: (_, row: SuppliedProductDTO) => (
                                <div>
                                    <Text strong>{row.tenSanPham}</Text>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            SKU: {row.sku || '—'} | ĐVT: {row.donVi || '—'}
                                        </Text>
                                    </div>
                                    {row.maSanPhamNcc && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Mã NCC: {row.maSanPhamNcc}
                                        </Text>
                                    )}
                                </div>
                            ),
                        },
                        {
                            title: 'Giá nhập',
                            dataIndex: 'giaNhapNcc',
                            align: 'right',
                            width: 130,
                            render: (val: number) => (
                                <Text strong style={{ color: '#1890ff' }}>
                                    {formatVND(val)}
                                </Text>
                            ),
                        },
                        {
                            title: 'NCC chính',
                            dataIndex: 'laNccChinh',
                            align: 'center',
                            width: 100,
                            render: (isPrimary: boolean, row: SuppliedProductDTO) => (
                                <Tooltip title={isPrimary ? 'Là NCC chính của sản phẩm này' : 'Bấm để đặt làm NCC chính'}>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={
                                            isPrimary ? (
                                                <StarFilled style={{ color: '#faad14', fontSize: 16 }} />
                                            ) : (
                                                <StarOutlined style={{ color: '#bfbfbf', fontSize: 16 }} />
                                            )
                                        }
                                        onClick={() => !isPrimary && handleSetPrimary(row.id)}
                                    />
                                </Tooltip>
                            ),
                        },
                        {
                            title: '',
                            key: 'actions',
                            align: 'center',
                            width: 60,
                            render: (_, row: SuppliedProductDTO) => (
                                <Popconfirm
                                    title="Gỡ sản phẩm khỏi NCC?"
                                    description={`Gỡ liên kết "${row.tenSanPham}" khỏi nhà cung cấp này?`}
                                    onConfirm={() => handleRemoveProduct(row.id)}
                                    okText="Gỡ"
                                    cancelText="Huỷ"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            </Drawer>

            {/* Modal gán thêm sản phẩm cho NCC */}
            <Modal
                open={addModalOpen}
                title={`Gán sản phẩm cho ${supplier?.name}`}
                okText="Gán sản phẩm"
                cancelText="Huỷ"
                confirmLoading={submitting}
                onOk={handleAddSubmit}
                onCancel={() => setAddModalOpen(false)}
                destroyOnHidden
            >
                <Form form={addForm} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item
                        name="productId"
                        label="Chọn sản phẩm"
                        rules={[{ required: true, message: 'Vui lòng chọn sản phẩm.' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Tìm kiếm theo tên sản phẩm, SKU..."
                            optionFilterProp="label"
                            options={availableProducts.map((p) => ({
                                value: p.id,
                                label: `${p.name} (${p.sku || p.barcode || 'SP'})`,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="giaNhap"
                        label="Giá nhập từ NCC này (VND)"
                        rules={[{ required: true, message: 'Vui lòng nhập giá nhập.' }]}
                    >
                        <InputNumber<number>
                            style={{ width: '100%' }}
                            min={0}
                            step={1_000}
                            placeholder="VD: 15.000"
                            formatter={(value) => `${value ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            parser={(value) => Number((value ?? '0').replace(/\./g, ''))}
                        />
                    </Form.Item>

                    <Form.Item name="maSanPhamNcc" label="Mã sản phẩm phía NCC (tùy chọn)">
                        <Input placeholder="VD: NCC-SP-001" maxLength={50} />
                    </Form.Item>

                    <Form.Item name="laNccChinh" valuePropName="checked" label="Đặt làm Nhà cung cấp chính?">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};
