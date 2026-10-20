import { useEffect, useMemo, useState, type FC } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
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
    Steps,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
    DeleteOutlined,
    PlusOutlined,
    UploadOutlined,
    CalculatorOutlined,
    WarningOutlined,
    FileTextOutlined,
    SafetyCertificateOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createHopDong, updateHopDong } from '@/store/slices/hopDongSlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import { fetchProducts } from '@/store/slices/productSlice';
import { sanPhamApi, type SuppliedProductDTO } from '@/api/sanPham';
import { hopDongApi } from '@/api/hopDongApi';
import {
    HOP_DONG_LOAI,
    HOP_DONG_LOAI_LABEL,
    type ActiveContractLine,
    type HopDong,
    type HopDongChiTiet,
    type HopDongFormValues,
} from '@/types';
import { DATE_FORMAT_ISO, formatDate } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';

const { Text } = Typography;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];

/** Dòng mặt hàng cam kết trên form */
interface ContractLineDraft {
    key: string;
    idSanPham: string;
    soLuongCamKet: number;
    donGiaCamKet: number;
    vatPhantram: number;
    moq: number;
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
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Theo dõi NCC đang được chọn trên form để tải danh mục sản phẩm của NCC & kiểm tra HĐ hiệu lực
    const selectedNccId = Form.useWatch('idNcc', form);
    const [suppliedProducts, setSuppliedProducts] = useState<SuppliedProductDTO[]>([]);
    const [loadingSupplied, setLoadingSupplied] = useState(false);
    const [filterByNccOnly, setFilterByNccOnly] = useState(true);
    const [activeContractLines, setActiveContractLines] = useState<ActiveContractLine[]>([]);

    // Tự nạp danh sách NCC & sản phẩm nếu chưa có dữ liệu.
    useEffect(() => {
        if (open) {
            if (suppliers.length === 0) dispatch(fetchSuppliers());
            if (products.length === 0) dispatch(fetchProducts());
        }
    }, [open, suppliers.length, products.length, dispatch]);

    // Tải danh mục sản phẩm & các dòng hợp đồng đang hiệu lực của NCC được chọn
    useEffect(() => {
        if (!selectedNccId) {
            setSuppliedProducts([]);
            setActiveContractLines([]);
            return;
        }
        let cancelled = false;
        setLoadingSupplied(true);

        Promise.all([
            sanPhamApi.getSuppliedProducts(selectedNccId).catch(() => []),
            hopDongApi.activeLines(selectedNccId).catch(() => []),
        ])
            .then(([supplied, active]) => {
                if (!cancelled) {
                    setSuppliedProducts(supplied);
                    setFilterByNccOnly(supplied.length > 0);
                    // Lọc bỏ các dòng thuộc chính hợp đồng đang sửa (nếu có)
                    const otherActive = editing ? active.filter((a) => a.idHopDong !== editing.id) : active;
                    setActiveContractLines(otherActive);
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingSupplied(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedNccId, editing]);

    // Map nhanh ID sản phẩm -> HĐ hiệu lực cũ của NCC
    const activeConflictMap = useMemo(() => {
        const map = new Map<string, ActiveContractLine>();
        activeContractLines.forEach((l) => map.set(l.idSanPham, l));
        return map;
    }, [activeContractLines]);

    // Map nhanh ID sản phẩm NCC đang cung cấp
    const suppliedMap = useMemo(() => {
        const map = new Map<string, SuppliedProductDTO>();
        suppliedProducts.forEach((p) => map.set(p.id, p));
        return map;
    }, [suppliedProducts]);

    // Danh sách sản phẩm khả dụng cho dropdown
    const productOptions = useMemo(() => {
        if (filterByNccOnly && suppliedProducts.length > 0) {
            return suppliedProducts.map((p) => {
                const conflict = activeConflictMap.get(p.id);
                return {
                    value: p.id,
                    label: `${p.tenSanPham} (${p.sku || p.maVach || 'SP'}) — Giá hiện tại: ${formatVND(p.giaNhapNcc)}${conflict ? ` [⚠️ Đang có HĐ ${conflict.maHopDong}]` : ''}`,
                    defaultPrice: p.giaNhapNcc,
                    defaultVat: p.vatPhantram,
                    conflict,
                };
            });
        }

        return products.map((p) => {
            const supplied = suppliedMap.get(p.id);
            const conflict = activeConflictMap.get(p.id);
            return {
                value: p.id,
                label: `${p.name} (${p.sku || p.barcode || 'SP'})${supplied ? ` [NCC cung cấp - ${formatVND(supplied.giaNhapNcc)}]` : ''}${conflict ? ` [⚠️ Đang có HĐ ${conflict.maHopDong}]` : ''}`,
                defaultPrice: supplied ? supplied.giaNhapNcc : (p.costPrice || 0),
                defaultVat: p.vatPercent ?? 8,
                conflict,
            };
        });
    }, [filterByNccOnly, suppliedProducts, products, suppliedMap, activeConflictMap]);

    // Nạp dữ liệu mỗi lần mở modal
    useEffect(() => {
        if (!open) return;
        setFileList([]);
        setCurrentStep(0);

        if (editing !== null) {
            form.setFieldsValue({
                tenHopDong: editing.tenHopDong,
                loaiHopDong: editing.loaiHopDong,
                idNcc: editing.idNcc,
                soHopDongDoiTac: editing.soHopDongDoiTac,
                ngayKy: dayjs(editing.ngayKy),
                ngayHieuLuc: dayjs(editing.ngayHieuLuc),
                ngayHetHan: editing.ngayHetHan ? dayjs(editing.ngayHetHan) : undefined,
                giaTriHopDong: editing.giaTriHopDong != null ? Number(editing.giaTriHopDong) : undefined,
                hanMucHopDong: editing.hanMucHopDong != null ? Number(editing.hanMucHopDong) : undefined,
                dieuKhoanThanhToan: editing.dieuKhoanThanhToan,
                soNgayDuocNo: editing.soNgayDuocNo,
                noiDung: editing.noiDung,
                nguoiDaiDienNcc: editing.nguoiDaiDienNcc,
                chucVuNcc: editing.chucVuNcc,
                nguoiDaiDienBenMua: editing.nguoiDaiDienBenMua,
                diaDiemGiaoHang: editing.diaDiemGiaoHang || 'Kho Tổng Phân Phối Circle K (DC)',
                thoiGianGiaoHang: editing.thoiGianGiaoHang || 'Trong vòng 24 - 48 giờ sau khi xác nhận đơn đặt hàng (PO)',
                chietKhauPhantram: editing.chietKhauPhantram != null ? Number(editing.chietKhauPhantram) : 0,
                chinhSachDoiTra: editing.chinhSachDoiTra || 'Được đổi trả 100% đối với hàng lỗi do NCC, hàng cận date trước 30 ngày.',
                tuDongGiaHan: Boolean(editing.tuDongGiaHan),
            });

            if (editing.lines && editing.lines.length > 0) {
                setLines(
                    editing.lines.map((l, index) => ({
                        key: l.id || `line-${index}-${Date.now()}`,
                        idSanPham: l.idSanPham,
                        soLuongCamKet: l.soLuongCamKet ?? 0,
                        donGiaCamKet: Number(l.donGiaCamKet || 0),
                        vatPhantram: l.vatPhantram ?? 8,
                        moq: l.moq ?? 1,
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
                diaDiemGiaoHang: 'Kho Tổng Phân Phối Circle K (DC)',
                thoiGianGiaoHang: 'Trong vòng 24 - 48 giờ sau khi xác nhận đơn đặt hàng (PO)',
                chietKhauPhantram: 0,
                chinhSachDoiTra: 'Được đổi trả 100% đối với hàng lỗi do NCC, hàng cận date trước 30 ngày.',
                tuDongGiaHan: false,
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
                moq: 1,
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

    // Chuyển sang bước tiếp theo với validation từng bước
    const handleNext = async (): Promise<void> => {
        try {
            if (currentStep === 0) {
                await form.validateFields([
                    'tenHopDong',
                    'loaiHopDong',
                    'idNcc',
                    'ngayKy',
                    'ngayHieuLuc',
                    'ngayHetHan',
                ]);
                setCurrentStep(1);
            } else if (currentStep === 1) {
                setCurrentStep(2);
            }
        } catch {
            message.warning('Vui lòng hoàn thành các trường bắt buộc trước khi tiếp tục.');
        }
    };

    const handlePrev = (): void => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const handleStepClick = async (step: number): Promise<void> => {
        if (step < currentStep) {
            setCurrentStep(step);
        } else if (step > currentStep) {
            try {
                if (currentStep === 0) {
                    await form.validateFields([
                        'tenHopDong',
                        'loaiHopDong',
                        'idNcc',
                        'ngayKy',
                        'ngayHieuLuc',
                        'ngayHetHan',
                    ]);
                }
                setCurrentStep(step);
            } catch {
                message.warning('Vui lòng hoàn thành các trường bắt buộc ở bước hiện tại.');
            }
        }
    };

    const handleSubmit = async (): Promise<void> => {
        try {
            setSubmitting(true);
            const values = await form.validateFields();

            const validLines: HopDongChiTiet[] = lines
                .filter((l) => Boolean(l.idSanPham))
                .map((l) => ({
                    idSanPham: l.idSanPham,
                    soLuongCamKet: l.soLuongCamKet || 0,
                    donGiaCamKet: l.donGiaCamKet || 0,
                    vatPhantram: l.vatPhantram ?? 8,
                    moq: l.moq != null ? Math.max(1, l.moq) : 1,
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
                chietKhauPhantram: values.chietKhauPhantram != null ? Number(values.chietKhauPhantram) : 0,
                tuDongGiaHan: Boolean(values.tuDongGiaHan),
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
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            title={editing !== null ? `Chỉnh sửa hợp đồng ${editing.maHopDong}` : 'Tạo hợp đồng nhà cung cấp'}
            width={980}
            onCancel={onClose}
            destroyOnHidden
            footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        {currentStep > 0 ? (
                            <Button onClick={handlePrev}>
                                ← Quay lại
                            </Button>
                        ) : (
                            <Button onClick={onClose}>
                                Huỷ
                            </Button>
                        )}
                    </div>
                    <Space size={12}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Bước {currentStep + 1} / 3
                        </Text>
                        {currentStep < 2 ? (
                            <Button type="primary" onClick={handleNext}>
                                {currentStep === 0 ? 'Tiếp theo: Điều khoản & Pháp lý ➜' : 'Tiếp theo: Mặt hàng cam kết ➜'}
                            </Button>
                        ) : (
                            <Button type="primary" onClick={handleSubmit} loading={submitting}>
                                {editing !== null ? 'Lưu thay đổi hợp đồng' : 'Tạo hợp đồng'}
                            </Button>
                        )}
                    </Space>
                </div>
            }
        >
            <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
                {/* Thanh tiến trình Steps */}
                <Steps
                    current={currentStep}
                    onChange={handleStepClick}
                    style={{ marginBottom: 20, paddingTop: 4 }}
                    items={[
                        {
                            title: 'Thông tin chung',
                            description: 'Thời hạn & Giá trị',
                            icon: <FileTextOutlined />,
                        },
                        {
                            title: 'Điều khoản & Pháp lý',
                            description: 'Đại diện & Giao nhận',
                            icon: <SafetyCertificateOutlined />,
                        },
                        {
                            title: 'Mặt hàng cam kết',
                            description: `${lines.filter((l) => Boolean(l.idSanPham)).length} sản phẩm`,
                            icon: <ShoppingCartOutlined />,
                        },
                    ]}
                />

                {/* BƯỚC 1: Thông tin chung & Thời hạn */}
                <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="tenHopDong"
                                label="Tên hợp đồng"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập tên hợp đồng.' },
                                    { max: 200, message: 'Tên hợp đồng tối đa 200 ký tự.' },
                                ]}
                            >
                                <Input placeholder="VD: Hợp đồng nguyên tắc cung ứng nước giải khát Q4/2026" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item
                                name="loaiHopDong"
                                label="Loại hợp đồng"
                                rules={[{ required: true, message: 'Chọn loại hợp đồng.' }]}
                            >
                                <Select options={Object.entries(HOP_DONG_LOAI_LABEL).map(([value, label]) => ({ value, label }))} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item name="soHopDongDoiTac" label="Số HĐ đối tác (nếu có)">
                                <Input placeholder="VD: HD-COCA-2026" />
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
                                if (lines.some((l) => Boolean(l.idSanPham))) {
                                    message.warning('Bạn vừa đổi Nhà cung cấp. Hãy kiểm tra lại danh sách mặt hàng cam kết ở bước 3.');
                                }
                            }}
                        />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col xs={24} md={6}>
                            <Form.Item name="ngayKy" label="Ngày ký" rules={[{ required: true, message: 'Chọn ngày ký.' }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item name="ngayHieuLuc" label="Ngày hiệu lực" rules={[{ required: true, message: 'Chọn ngày hiệu lực.' }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
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
                        <Col xs={24} md={6}>
                            <Form.Item name="tuDongGiaHan" valuePropName="checked" label="Tự động gia hạn">
                                <Switch checkedChildren="Có" unCheckedChildren="Không" />
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
                                <Input placeholder="VD: Chuyển khoản trong vòng 30 ngày kể từ ngày nhận đủ hóa đơn" />
                            </Form.Item>
                        </Col>
                    </Row>

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
                </div>

                {/* BƯỚC 2: Điều khoản & Pháp lý */}
                <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item name="nguoiDaiDienNcc" label="Đại diện phía NCC">
                                <Input placeholder="Họ tên người ký đại diện NCC" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item name="chucVuNcc" label="Chức vụ đại diện NCC">
                                <Input placeholder="VD: Giám đốc / Trưởng phòng Kinh doanh" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item name="nguoiDaiDienBenMua" label="Đại diện Circle K">
                                <Input placeholder="Họ tên người ký đại diện bên mua" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="diaDiemGiaoHang" label="Địa điểm giao hàng">
                                <Input placeholder="VD: Kho Tổng Phân Phối Circle K (DC) / Giao trực tiếp Cửa hàng" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="thoiGianGiaoHang" label="Thời gian giao hàng cam kết">
                                <Input placeholder="VD: Trong vòng 24 - 48 giờ sau khi nhận đơn đặt hàng (PO)" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={6}>
                            <Form.Item name="chietKhauPhantram" label="Chiết khấu thương mại (%)">
                                <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} addonAfter="%" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={18}>
                            <Form.Item name="chinhSachDoiTra" label="Chính sách đổi trả hàng (Hạn sử dụng / Hàng lỗi)">
                                <Input placeholder="VD: Đổi trả 100% đối với hàng hỏng do NCC, hàng cận date trước 30 ngày" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="noiDung" label="Tóm tắt điều khoản khác">
                        <Input.TextArea rows={4} maxLength={2000} placeholder="Tóm tắt các điều khoản phạt vi phạm, cam kết chất lượng, bảo mật..." />
                    </Form.Item>
                </div>

                {/* BƯỚC 3: Mặt hàng cam kết */}
                <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <Space direction="vertical" size={2}>
                            <Text strong style={{ fontSize: 14 }}>
                                Chi tiết mặt hàng cam kết (hop_dong_chi_tiet)
                            </Text>
                            {selectedNccId && (
                                <Space size={8} wrap>
                                    <Tag color={suppliedProducts.length > 0 ? 'blue' : 'orange'}>
                                        NCC có {suppliedProducts.length} sản phẩm cung ứng
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
                            style={{ marginBottom: 12, fontSize: 13 }}
                            message="Vui lòng quay lại Bước 1 để chọn Nhà cung cấp trước khi thêm mặt hàng cam kết."
                        />
                    )}

                    {selectedNccId && suppliedProducts.length === 0 && !loadingSupplied && (
                        <Alert
                            type="warning"
                            showIcon
                            style={{ marginBottom: 12, fontSize: 12 }}
                            message="Nhà cung cấp này chưa có sản phẩm nào được gắn trước đó. Các sản phẩm bạn thêm vào hợp đồng sẽ tự động được liên kết vào danh mục NCC sau khi hợp đồng được duyệt."
                        />
                    )}

                    {selectedNccId && activeContractLines.length > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            style={{ marginBottom: 12, fontSize: 12 }}
                            message={
                                <span>
                                    <strong>Lưu ý xung đột hợp đồng:</strong> Nhà cung cấp này đang có{' '}
                                    <strong>{activeContractLines.length}</strong> mặt hàng thuộc hợp đồng còn hiệu lực. Các dòng có nhãn{' '}
                                    <Tag color="gold" icon={<WarningOutlined />}>Đang có HĐ hiệu lực</Tag> nên ký ngày hiệu lực nối tiếp hoặc sẽ cập nhật lại bảng giá khi duyệt.
                                </span>
                            }
                        />
                    )}

                    <Table
                        size="small"
                        pagination={false}
                        rowKey="key"
                        dataSource={lines}
                        locale={{
                            emptyText: selectedNccId
                                ? 'Chưa có mặt hàng cam kết. Bấm "+ Thêm mặt hàng" để chọn sản phẩm.'
                                : 'Vui lòng chọn NCC trước khi thêm mặt hàng.',
                        }}
                        columns={[
                            {
                                title: 'Sản phẩm (*)',
                                dataIndex: 'idSanPham',
                                width: '34%',
                                render: (value: string, record: ContractLineDraft) => {
                                    const conflict = activeConflictMap.get(value);
                                    return (
                                        <div>
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
                                            {conflict && (
                                                <div style={{ marginTop: 4 }}>
                                                    <Tooltip
                                                        title={`Sản phẩm đang thuộc HĐ ${conflict.maHopDong} (Hiệu lực: ${formatDate(conflict.ngayHieuLuc)} - ${formatDate(conflict.ngayHetHan ?? null)}, Giá: ${formatVND(conflict.donGiaCamKet)}).`}
                                                    >
                                                        <Tag color="gold" icon={<WarningOutlined />} style={{ fontSize: 11 }}>
                                                            Đang trong HĐ {conflict.maHopDong} ({formatVND(conflict.donGiaCamKet)})
                                                        </Tag>
                                                    </Tooltip>
                                                </div>
                                            )}
                                        </div>
                                    );
                                },
                            },
                            {
                                title: 'Đơn giá cam kết (*)',
                                dataIndex: 'donGiaCamKet',
                                width: '20%',
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
                                width: '14%',
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
                                title: (
                                    <Tooltip title="Số lượng đặt hàng tối thiểu mỗi lần nhập (Minimum Order Quantity)">
                                        <span>MOQ (?)</span>
                                    </Tooltip>
                                ),
                                dataIndex: 'moq',
                                width: '12%',
                                render: (value: number, record: ContractLineDraft) => (
                                    <InputNumber<number>
                                        style={{ width: '100%' }}
                                        min={1}
                                        value={value ?? 1}
                                        onChange={(val) => handleUpdateLine(record.key, 'moq', val ?? 1)}
                                        placeholder="MOQ"
                                    />
                                ),
                            },
                            {
                                title: 'VAT (%)',
                                dataIndex: 'vatPhantram',
                                width: '12%',
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
                                width: '8%',
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
            </Form>
        </Modal>
    );
};