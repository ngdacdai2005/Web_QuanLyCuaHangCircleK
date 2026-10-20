import { useEffect, useMemo, useState, type FC } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
    Alert,
    App as AntdApp,
    Button,
    Col,
    DatePicker,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { DeleteOutlined, PlusOutlined, UploadOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createHopDong, updateHopDong } from '@/store/slices/hopDongSlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import { fetchProducts } from '@/store/slices/productSlice';
import { sanPhamApi, type SuppliedProductDTO } from '@/api/sanPham';
import {
    HOP_DONG_LOAI,
    HOP_DONG_LOAI_LABEL,
    type HopDong,
    type HopDongChiTiet,
    type HopDongFormValues,
} from '@/types';
import { DATE_FORMAT_ISO } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';

const { Text } = Typography;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — khớp backend FileStorageService
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];

/** Dòng mặt hàng cam kết trên form */
interface ContractLineDraft {
    key: string;
    idSanPham: string;
    soLuongCamKet: number;
    donGiaCamKet: number;
    vatPhantram: number;
    ghiChu?: string;
}

/** Form làm việc với dayjs ở 3 trường ngày; serialize về ISO string khi submit. */
type ContractFormValues = Omit<
    HopDongFormValues,
    'ngayKy' | 'ngayHieuLuc' | 'ngayHetHan' | 'giaTriHopDong' | 'hanMucHopDong' | 'soNgayDuocNo' | 'lines'
> & {
    ngayKy: Dayjs;
    ngayHieuLuc: Dayjs;
    ngayHetHan?: Dayjs;
    giaTriHopDong?: number;
    hanMucHopDong?: number;
    soNgayDuocNo?: number;
};

interface HopDongFormModalProps {
    open: boolean;
    /** Khác `null` = chế độ sửa; `null` = tạo mới. */
    editing: HopDong | null;
    onClose: () => void;
}

export const HopDongFormModal: FC<HopDongFormModalProps> = ({ open, editing, onClose }) => {
    const [form] = Form.useForm<ContractFormValues>();
    const dispatch = useAppDispatch();
    const { message } = AntdApp.useApp();
    const suppliers = useAppSelector((state) => state.supplier.suppliers);
    const products = useAppSelector((state) => state.product.products);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [lines, setLines] = useState<ContractLineDraft[]>([]);

    // Theo dõi NCC đang được chọn trên form để tải danh mục sản phẩm của NCC
    const selectedNccId = Form.useWatch('idNcc', form);
    const [suppliedProducts, setSuppliedProducts] = useState<SuppliedProductDTO[]>([]);
    const [loadingSupplied, setLoadingSupplied] = useState(false);
    const [filterByNccOnly, setFilterByNccOnly] = useState(true);

    // Tự nạp danh sách NCC & sản phẩm nếu chưa có dữ liệu.
    useEffect(() => {
        if (open) {
            if (suppliers.length === 0) dispatch(fetchSuppliers());
            if (products.length === 0) dispatch(fetchProducts());
        }
    }, [open, suppliers.length, products.length, dispatch]);

    // Tải danh mục sản phẩm của NCC được chọn
    useEffect(() => {
        if (!selectedNccId) {
            setSuppliedProducts([]);
            return;
        }
        let cancelled = false;
        setLoadingSupplied(true);
        sanPhamApi
            .getSuppliedProducts(selectedNccId)
            .then((res) => {
                if (!cancelled) {
                    setSuppliedProducts(res);
                    // Nếu NCC có sản phẩm thì mặc định lọc theo NCC; nếu chưa có thì tắt lọc để người dùng chọn sản phẩm toàn hệ thống
                    setFilterByNccOnly(res.length > 0);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSuppliedProducts([]);
                    setFilterByNccOnly(false);
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingSupplied(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedNccId]);

    // Map nhanh ID sản phẩm NCC đang cung cấp
    const suppliedMap = useMemo(() => {
        const map = new Map<string, SuppliedProductDTO>();
        suppliedProducts.forEach((p) => map.set(p.id, p));
        return map;
    }, [suppliedProducts]);

    // Danh sách sản phẩm khả dụng cho dropdown
    const productOptions = useMemo(() => {
        if (filterByNccOnly && suppliedProducts.length > 0) {
            return suppliedProducts.map((p) => ({
                value: p.id,
                label: `${p.tenSanPham} (${p.sku || p.maVach || 'SP'}) — Giá nhập hiện tại: ${formatVND(p.giaNhapNcc)}`,
                defaultPrice: p.giaNhapNcc,
                defaultVat: p.vatPhantram,
            }));
        }

        return products.map((p) => {
            const supplied = suppliedMap.get(p.id);
            return {
                value: p.id,
                label: `${p.name} (${p.sku || p.barcode || 'SP'})${supplied ? ` [NCC cung cấp - ${formatVND(supplied.giaNhapNcc)}]` : ''}`,
                defaultPrice: supplied ? supplied.giaNhapNcc : (p.costPrice || 0),
                defaultVat: p.vatPercent ?? 8,
            };
        });
    }, [filterByNccOnly, suppliedProducts, products, suppliedMap]);

    // Nạp dữ liệu mỗi lần mở modal để không dùng lại giá trị lần trước.
    useEffect(() => {
        if (!open) return;
        setFileList([]);
        if (editing !== null) {
            form.setFieldsValue({
                tenHopDong: editing.tenHopDong,
                loaiHopDong: editing.loaiHopDong,
                idNcc: editing.idNcc,
                ngayKy: dayjs(editing.ngayKy),
                ngayHieuLuc: dayjs(editing.ngayHieuLuc),
                ngayHetHan: editing.ngayHetHan ? dayjs(editing.ngayHetHan) : undefined,
                giaTriHopDong: editing.giaTriHopDong != null ? Number(editing.giaTriHopDong) : undefined,
                hanMucHopDong: editing.hanMucHopDong != null ? Number(editing.hanMucHopDong) : undefined,
                dieuKhoanThanhToan: editing.dieuKhoanThanhToan,
                soNgayDuocNo: editing.soNgayDuocNo,
                noiDung: editing.noiDung,
            });

            if (editing.lines && editing.lines.length > 0) {
                setLines(
                    editing.lines.map((l, index) => ({
                        key: l.id || `line-${index}-${Date.now()}`,
                        idSanPham: l.idSanPham,
                        soLuongCamKet: l.soLuongCamKet ?? 0,
                        donGiaCamKet: Number(l.donGiaCamKet || 0),
                        vatPhantram: l.vatPhantram ?? 8,
                        ghiChu: l.ghiChu || '',
                    }))
                );
            } else {
                setLines([]);
            }
        } else {
            form.resetFields();
            form.setFieldsValue({
                loaiHopDong: HOP_DONG_LOAI.MUA_HANG,
                soNgayDuocNo: 0,
            });
            setLines([]);
        }
    }, [open, editing, form]);

    const nccOptions = suppliers.map((s) => ({
        value: s.id,
        label: `${s.code} — ${s.name}${s.status === 'Inactive' ? ' (Ngừng hợp tác)' : ''}`,
        disabled: s.status === 'Inactive' && (editing === null || s.id !== editing.idNcc),
    }));

    const handleBeforeUpload = (file: File): boolean => {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXT.includes(ext)) {
            message.error('Chỉ chấp nhận file PDF hoặc ảnh (JPG/PNG).');
            return Upload.LIST_IGNORE as unknown as boolean;
        }
        if (file.size > MAX_FILE_SIZE) {
            message.error('File vượt quá dung lượng cho phép (tối đa 10MB).');
            return Upload.LIST_IGNORE as unknown as boolean;
        }
        return false;
    };

    const handleAddLine = (): void => {
        setLines((prev) => [
            ...prev,
            {
                key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                idSanPham: '',
                soLuongCamKet: 0,
                donGiaCamKet: 0,
                vatPhantram: 8,
                ghiChu: '',
            },
        ]);
    };

    const handleSelectProduct = (key: string, productId: string): void => {
        const opt = productOptions.find((o) => o.value === productId);
        setLines((prev) =>
            prev.map((l) => {
                if (l.key !== key) return l;
                return {
                    ...l,
                    idSanPham: productId,
                    donGiaCamKet: l.donGiaCamKet > 0 ? l.donGiaCamKet : (opt?.defaultPrice || 0),
                    vatPhantram: opt?.defaultVat ?? l.vatPhantram ?? 8,
                };
            })
        );
    };

    const handleUpdateLine = (key: string, field: keyof ContractLineDraft, value: any): void => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
    };

    const handleRemoveLine = (key: string): void => {
        setLines((prev) => prev.filter((l) => l.key !== key));
    };

    const totalLinesValue = lines.reduce((acc, l) => {
        const qty = l.soLuongCamKet || 0;
        const price = l.donGiaCamKet || 0;
        const vat = l.vatPhantram || 0;
        return acc + qty * price * (1 + vat / 100);
    }, 0);

    const handleApplyCalculatedTotal = (): void => {
        if (totalLinesValue > 0) {
            form.setFieldValue('giaTriHopDong', Math.round(totalLinesValue));
            message.success(`Đã cập nhật giá trị hợp đồng: ${formatVND(Math.round(totalLinesValue))}`);
        } else {
            message.info('Vui lòng nhập số lượng và giá cam kết ở các dòng mặt hàng trước.');
        }
    };

    const handleSubmit = async (): Promise<void> => {
        try {
            const values = await form.validateFields();

            const validLines: HopDongChiTiet[] = lines
                .filter((l) => Boolean(l.idSanPham))
                .map((l) => ({
                    idSanPham: l.idSanPham,
                    soLuongCamKet: l.soLuongCamKet || 0,
                    donGiaCamKet: l.donGiaCamKet || 0,
                    vatPhantram: l.vatPhantram ?? 8,
                    ghiChu: l.ghiChu,
                }));

            const payload: HopDongFormValues = {
                ...values,
                ngayKy: values.ngayKy.format(DATE_FORMAT_ISO),
                ngayHieuLuc: values.ngayHieuLuc.format(DATE_FORMAT_ISO),
                ngayHetHan: values.ngayHetHan?.format(DATE_FORMAT_ISO),
                giaTriHopDong: values.giaTriHopDong != null ? String(values.giaTriHopDong) : undefined,
                hanMucHopDong: values.hanMucHopDong != null ? String(values.hanMucHopDong) : undefined,
                soNgayDuocNo: values.soNgayDuocNo != null ? String(values.soNgayDuocNo) : undefined,
                lines: validLines,
            };
            const file = fileList[0]?.originFileObj as File | undefined;

            if (editing !== null) {
                await dispatch(updateHopDong({ id: editing.id, values: payload, file })).unwrap();
                message.success('Đã cập nhật hợp đồng.');
            } else {
                await dispatch(createHopDong({ values: payload, file })).unwrap();
                message.success('Đã tạo hợp đồng nháp.');
            }
            onClose();
        } catch (error: any) {
            message.error(error?.message || 'Có lỗi xảy ra');
        }
    };

    return (
        <Modal
            open={open}
            title={editing !== null ? `Chỉnh sửa hợp đồng ${editing.maHopDong}` : 'Tạo hợp đồng nhà cung cấp'}
            okText={editing !== null ? 'Lưu thay đổi' : 'Tạo hợp đồng'}
            cancelText="Huỷ"
            width={960}
            onOk={handleSubmit}
            onCancel={onClose}
            destroyOnHidden
        >
            <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
                <Row gutter={16}>
                    <Col xs={24} md={16}>
                        <Form.Item
                            name="tenHopDong"
                            label="Tên hợp đồng"
                            rules={[
                                { required: true, message: 'Vui lòng nhập tên hợp đồng.' },
                                { max: 200, message: 'Tên hợp đồng tối đa 200 ký tự.' },
                            ]}
                        >
                            <Input placeholder="VD: Hợp đồng cung cấp nước giải khát Q4/2026" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="loaiHopDong"
                            label="Loại hợp đồng"
                            rules={[{ required: true, message: 'Chọn loại hợp đồng.' }]}
                        >
                            <Select options={Object.entries(HOP_DONG_LOAI_LABEL).map(([value, label]) => ({ value, label }))} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="idNcc"
                    label="Nhà cung cấp"
                    rules={[{ required: true, message: 'Chọn nhà cung cấp.' }]}
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn nhà cung cấp đang hợp tác"
                        options={nccOptions}
                        onChange={() => {
                            // Khi đổi NCC, nếu đã có các dòng mặt hàng, thông báo cho người dùng
                            if (lines.some((l) => Boolean(l.idSanPham))) {
                                message.warning('Bạn vừa đổi Nhà cung cấp. Hãy kiểm tra lại danh sách mặt hàng cam kết bên dưới.');
                            }
                        }}
                    />
                </Form.Item>

                <Row gutter={16}>
                    <Col xs={24} md={8}>
                        <Form.Item name="ngayKy" label="Ngày ký" rules={[{ required: true, message: 'Chọn ngày ký.' }]}>
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="ngayHieuLuc" label="Ngày hiệu lực" rules={[{ required: true, message: 'Chọn ngày hiệu lực.' }]}>
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="ngayHetHan"
                            label="Ngày hết hạn"
                            dependencies={['ngayHieuLuc']}
                            rules={[
                                { required: true, message: 'Chọn ngày hết hạn.' },
                                {
                                    validator: (_, value: Dayjs | undefined) => {
                                        const start: Dayjs | undefined = form.getFieldValue('ngayHieuLuc');
                                        if (start && value && value.isBefore(start, 'day')) {
                                            return Promise.reject(new Error('Ngày hết hạn phải sau hoặc bằng ngày hiệu lực.'));
                                        }
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={24} md={6}>
                        <Form.Item name="giaTriHopDong" label="Giá trị hợp đồng (VND)">
                            <InputNumber<number>
                                min={0}
                                step={100_000}
                                style={{ width: '100%' }}
                                placeholder="Tùy chọn"
                                formatter={(value) => `${value ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                parser={(value) => Number((value ?? '0').replace(/\./g, ''))}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                        <Form.Item
                            name="hanMucHopDong"
                            label={
                                <Space size={4}>
                                    <span>Hạn mức tối đa (VND)</span>
                                    <Tooltip title="Hạn mức tối đa ngân sách được phép nhập theo hợp đồng này. Khi các phiếu nhập đạt hạn mức sẽ cảnh báo hoặc chặn.">
                                        <Text type="secondary" style={{ cursor: 'pointer', fontSize: 12 }}>(?)</Text>
                                    </Tooltip>
                                </Space>
                            }
                        >
                            <InputNumber<number>
                                min={0}
                                step={1_000_000}
                                style={{ width: '100%' }}
                                placeholder="Hạn mức ngân sách"
                                formatter={(value) => `${value ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                parser={(value) => Number((value ?? '0').replace(/\./g, ''))}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={4}>
                        <Form.Item name="soNgayDuocNo" label="Số ngày nợ">
                            <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter="ngày" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="dieuKhoanThanhToan" label="Điều khoản thanh toán">
                            <Input placeholder="VD: Thanh toán sau 30 ngày kể từ ngày giao hàng" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '12px 0' }} />

                {/* Phần chi tiết từng mặt hàng cam kết hop_dong_chi_tiet */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <Space direction="vertical" size={2}>
                            <Text strong style={{ fontSize: 14 }}>
                                Chi tiết mặt hàng cam kết (hop_dong_chi_tiet)
                            </Text>
                            {selectedNccId && (
                                <Space size={8} wrap>
                                    <Tag color={suppliedProducts.length > 0 ? 'blue' : 'orange'}>
                                        NCC đang có {suppliedProducts.length} sản phẩm cung ứng
                                    </Tag>
                                    <Switch
                                        size="small"
                                        checked={filterByNccOnly}
                                        checkedChildren="Chỉ SP của NCC"
                                        unCheckedChildren="Tất cả SP"
                                        onChange={(checked) => setFilterByNccOnly(checked)}
                                        disabled={suppliedProducts.length === 0}
                                    />
                                    {loadingSupplied && <Text type="secondary" style={{ fontSize: 12 }}>Đang tải SP...</Text>}
                                </Space>
                            )}
                        </Space>
                        <Space>
                            {totalLinesValue > 0 && (
                                <Tooltip title="Tính tổng thành tiền các dòng có số lượng & đơn giá để gán vào ô Giá trị hợp đồng">
                                    <Button
                                        size="small"
                                        icon={<CalculatorOutlined />}
                                        onClick={handleApplyCalculatedTotal}
                                    >
                                        Áp dụng tổng tiền ({formatVND(Math.round(totalLinesValue))})
                                    </Button>
                                </Tooltip>
                            )}
                            <Button
                                size="small"
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={handleAddLine}
                                disabled={!selectedNccId}
                            >
                                Thêm mặt hàng
                            </Button>
                        </Space>
                    </div>

                    {!selectedNccId && (
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 8, fontSize: 13 }}
                            message="Vui lòng chọn Nhà cung cấp ở trên để hệ thống tự động liên kết danh mục sản phẩm của NCC đó."
                        />
                    )}

                    {selectedNccId && suppliedProducts.length === 0 && !loadingSupplied && (
                        <Alert
                            type="warning"
                            showIcon
                            style={{ marginBottom: 8, fontSize: 12 }}
                            message="Nhà cung cấp này chưa có sản phẩm nào được gắn trước đó. Bạn có thể chọn bất kỳ sản phẩm nào bên dưới, hệ thống sẽ tự động liên kết sản phẩm đó cho NCC khi hợp đồng được duyệt."
                        />
                    )}

                    {selectedNccId && !filterByNccOnly && suppliedProducts.length > 0 && (
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 8, fontSize: 12 }}
                            message="Đang xem tất cả sản phẩm hệ thống. Nếu chọn mặt hàng mới ngoài danh mục của NCC, hệ thống sẽ tự động liên kết sản phẩm đó vào NCC sau khi duyệt hợp đồng."
                        />
                    )}

                    <Table
                        size="small"
                        pagination={false}
                        rowKey="key"
                        dataSource={lines}
                        locale={{
                            emptyText: selectedNccId
                                ? 'Chưa có mặt hàng cam kết. Bấm "+ Thêm mặt hàng" để chọn sản phẩm của NCC.'
                                : 'Vui lòng chọn NCC trước khi thêm mặt hàng cam kết.',
                        }}
                        columns={[
                            {
                                title: 'Sản phẩm (*)',
                                dataIndex: 'idSanPham',
                                width: '38%',
                                render: (value: string, record: ContractLineDraft) => (
                                    <Select
                                        style={{ width: '100%' }}
                                        showSearch
                                        placeholder={filterByNccOnly ? 'Chọn sản phẩm của NCC' : 'Chọn sản phẩm'}
                                        optionFilterProp="label"
                                        value={value || undefined}
                                        onChange={(val) => handleSelectProduct(record.key, val)}
                                        options={productOptions}
                                        disabled={!selectedNccId}
                                    />
                                ),
                            },
                            {
                                title: 'Đơn giá cam kết (*)',
                                dataIndex: 'donGiaCamKet',
                                width: '22%',
                                render: (value: number, record: ContractLineDraft) => (
                                    <InputNumber<number>
                                        style={{ width: '100%' }}
                                        min={0}
                                        step={1_000}
                                        value={value}
                                        onChange={(val) => handleUpdateLine(record.key, 'donGiaCamKet', val ?? 0)}
                                        formatter={(val) => `${val ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                        parser={(val) => Number((val ?? '0').replace(/\./g, ''))}
                                        placeholder="Đơn giá"
                                    />
                                ),
                            },
                            {
                                title: 'SL cam kết',
                                dataIndex: 'soLuongCamKet',
                                width: '16%',
                                render: (value: number, record: ContractLineDraft) => (
                                    <InputNumber<number>
                                        style={{ width: '100%' }}
                                        min={0}
                                        value={value}
                                        onChange={(val) => handleUpdateLine(record.key, 'soLuongCamKet', val ?? 0)}
                                        placeholder="SL dự kiến"
                                    />
                                ),
                            },
                            {
                                title: 'VAT (%)',
                                dataIndex: 'vatPhantram',
                                width: '14%',
                                render: (value: number, record: ContractLineDraft) => (
                                    <Select
                                        style={{ width: '100%' }}
                                        value={value ?? 8}
                                        onChange={(val) => handleUpdateLine(record.key, 'vatPhantram', val)}
                                        options={[
                                            { value: 0, label: '0%' },
                                            { value: 5, label: '5%' },
                                            { value: 8, label: '8%' },
                                            { value: 10, label: '10%' },
                                        ]}
                                    />
                                ),
                            },
                            {
                                title: '',
                                key: 'action',
                                width: '10%',
                                align: 'center',
                                render: (_: any, record: ContractLineDraft) => (
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleRemoveLine(record.key)}
                                    />
                                ),
                            },
                        ]}
                    />
                </div>

                <Form.Item name="noiDung" label="Nội dung hợp đồng">
                    <Input.TextArea rows={3} maxLength={2000} placeholder="Tóm tắt điều khoản chính, phạm vi công việc..." />
                </Form.Item>

                <Form.Item label="File scan hợp đồng" style={{ marginBottom: 0 }}>
                    <Upload
                        beforeUpload={handleBeforeUpload}
                        maxCount={1}
                        accept=".pdf,.jpg,.jpeg,.png"
                        fileList={fileList}
                        onChange={({ fileList: list }) => setFileList(list.slice(-1))}
                    >
                        <Button icon={<UploadOutlined />} style={{ width: '100%' }}>
                            Chọn file PDF / ảnh (tối đa 10MB)
                        </Button>
                    </Upload>
                    <Space direction="vertical" size={0} style={{ marginTop: 4 }}>
                        {editing !== null && editing.fileCo && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                File hiện tại: {editing.fileTenGoc}
                            </Text>
                        )}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {editing !== null
                                ? 'Tải lên khi sửa: nếu để trống sẽ giữ file cũ. File sẽ bắt buộc khi trình duyệt.'
                                : 'Có thể để trống khi tạo nháp. File sẽ bắt buộc khi trình duyệt.'}
                        </Text>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
};