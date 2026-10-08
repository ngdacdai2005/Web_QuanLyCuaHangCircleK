import { useEffect, useState, type FC } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
    App as AntdApp, Button,
    Col,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Typography,
    Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { UploadOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createHopDong, updateHopDong } from '@/store/slices/hopDongSlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import {
    HOP_DONG_LOAI,
    HOP_DONG_LOAI_LABEL,
    type HopDong,
    type HopDongFormValues,
} from '@/types';
import { DATE_FORMAT_ISO } from '@/utils/dateUtils';

const { Text } = Typography;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — khớp backend FileStorageService
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];

/** Form làm việc với dayjs ở 3 trường ngày; serialize về ISO string khi submit. */
type ContractFormValues = Omit<HopDongFormValues, 'ngayKy' | 'ngayHieuLuc' | 'ngayHetHan' | 'giaTriHopDong' | 'soNgayDuocNo'> & {
    ngayKy: Dayjs;
    ngayHieuLuc: Dayjs;
    ngayHetHan?: Dayjs;
    giaTriHopDong?: number;
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
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    // Tự nạp danh sách NCC nếu slice supplier chưa có dữ liệu.
    useEffect(() => {
        if (open && suppliers.length === 0) dispatch(fetchSuppliers());
    }, [open, suppliers.length, dispatch]);

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
                dieuKhoanThanhToan: editing.dieuKhoanThanhToan,
                soNgayDuocNo: editing.soNgayDuocNo,
                noiDung: editing.noiDung,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                loaiHopDong: HOP_DONG_LOAI.MUA_HANG,
                soNgayDuocNo: 0,
            });
        }
    }, [open, editing, form]);

    const nccOptions = suppliers.map((s) => ({
        value: s.id,
        label: `${s.code} — ${s.name}${s.status === 'Inactive' ? ' (Ngừng hợp tác)' : ''}`,
        // Tạo mới: khóa mọi NCC ngừng hợp tác.
        // Sửa: chỉ giữ chọn được NCC hiện tại của hợp đồng, các NCC ngừng hợp tác khác vẫn bị khóa.
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
        return false; // chặn upload thật, giữ file ở client để gửi kèm FormData khi submit
    };

    const handleSubmit = async (): Promise<void> => {
        try {
            const values = await form.validateFields();
            const payload: HopDongFormValues = {
                ...values,
                ngayKy: values.ngayKy.format(DATE_FORMAT_ISO),
                ngayHieuLuc: values.ngayHieuLuc.format(DATE_FORMAT_ISO),
                ngayHetHan: values.ngayHetHan?.format(DATE_FORMAT_ISO),
                giaTriHopDong: values.giaTriHopDong != null ? String(values.giaTriHopDong) : undefined,
                soNgayDuocNo: values.soNgayDuocNo != null ? String(values.soNgayDuocNo) : undefined,
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
            width={760}
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
                            rules={[{ required: true, message: 'Vui lòng nhập tên hợp đồng.' },
                                { max: 200, message: 'Tên hợp đồng tối đa 200 ký tự.' }]}
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
                            rules={[{ required: true, message: 'Chọn ngày hết hạn.' },
                                {
                                    validator: (_, value: Dayjs | undefined) => {
                                        const start: Dayjs | undefined = form.getFieldValue('ngayHieuLuc');
                                        if (start && value && value.isBefore(start, 'day')) {
                                            return Promise.reject(new Error('Ngày hết hạn phải sau hoặc bằng ngày hiệu lực.'));
                                        }
                                        return Promise.resolve();
                                    },
                                }]}
                        >
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={24} md={8}>
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
                    <Col xs={24} md={8}>
                        <Form.Item name="soNgayDuocNo" label="Số ngày được nợ">
                            <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter="ngày" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="dieuKhoanThanhToan" label="Điều khoản thanh toán">
                            <Input placeholder="VD: Thanh toán sau 30 ngày kể từ ngày giao hàng" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="noiDung" label="Nội dung hợp đồng">
                    <Input.TextArea rows={4} maxLength={2000} placeholder="Tóm tắt điều khoản chính, phạm vi công việc..." />
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