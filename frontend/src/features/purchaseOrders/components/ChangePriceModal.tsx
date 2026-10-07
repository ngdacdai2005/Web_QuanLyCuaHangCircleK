import {
    Alert,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Typography,
    message,
} from 'antd';
import { useEffect, useState } from 'react';

import {
    chiTietPhieuNhapApi,
    type ChiTietPhieuNhapDTO,
} from '@/api/chiTietPhieuNhap';

import {
    phieuNhapApi,
    type ChangePriceRequest,
} from '@/api/phieuNhap';

import type { PurchaseOrder } from '@/types';

import {useAppDispatch, useAppSelector} from '@/store/hooks';
import { fetchPurchaseOrders } from '@/store/slices/purchaseSlice';

const { Text } = Typography;

interface ChangePriceModalProps {
    open: boolean;
    order: PurchaseOrder | null;
    onClose: () => void;
    onSubmitted?: () => void;
}

interface ChangePriceFormValues {
    idChiTiet: string;
    donGiaNhapMoi: number;
    lyDo: string;
}

export function ChangePriceModal({open, order, onClose, onSubmitted,}: ChangePriceModalProps) {
    const dispatch = useAppDispatch();
    const [form] = Form.useForm<ChangePriceFormValues>();
    const products = useAppSelector((state) => state.product.products);
    const [details, setDetails] = useState<
        ChiTietPhieuNhapDTO[]
    >([]);

    const [loading, setLoading] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    const selectedId =
        Form.useWatch(
            'idChiTiet',
            form,
        );

    const selectedDetail =
        details.find(
            (detail) =>
                detail.id === selectedId,
        );

    useEffect(() => {
        if (!open || !order) {
            setDetails([]);
            form.resetFields();
            return;
        }

        let cancelled = false;

        const loadDetails = async () => {
            setLoading(true);

            try {
                const data =
                    await chiTietPhieuNhapApi.getByPhieuNhap(
                        order.id,
                    );

                if (cancelled) return;

                setDetails(data);

                form.resetFields();

                if (data.length > 0) {
                    form.setFieldsValue({
                        idChiTiet: data[0].id,
                        donGiaNhapMoi:
                        data[0].donGiaNhap,
                        lyDo: '',
                    });
                }
            } catch (error) {
                if (!cancelled) {
                    message.error(
                        error instanceof Error
                            ? error.message
                            : 'Lỗi tải chi tiết phiếu nhập',
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadDetails();

        return () => {
            cancelled = true;
        };
    }, [open, order, form]);

    useEffect(() => {
        if (!selectedDetail) return;

        form.setFieldValue(
            'donGiaNhapMoi',
            selectedDetail.donGiaNhap,
        );
    }, [
        selectedDetail,
        form,
    ]);

    const handleSubmit = async (
        values: ChangePriceFormValues,
    ) => {
        if (!order) return;

        const request: ChangePriceRequest = {
            donGiaNhapMoi:
            values.donGiaNhapMoi,
            lyDo: values.lyDo.trim(),
        };

        if (!request.lyDo) {
            message.error(
                'Vui lòng nhập lý do thay đổi giá.',
            );
            return;
        }

        if (request.donGiaNhapMoi <= 0) {
            message.error(
                'Đơn giá mới phải lớn hơn 0.',
            );
            return;
        }

        setSubmitting(true);

        try {
            await phieuNhapApi.updatePrice(
                order.id,
                values.idChiTiet,
                request,
            );

            message.success(
                `Đã cập nhật giá nhập cho phiếu ${order.code}.`,
            );

            onSubmitted?.();
            dispatch(fetchPurchaseOrders());

            form.resetFields();
            setDetails([]);
            onClose();
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : 'Lỗi cập nhật giá nhập',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            title={
                order
                    ? `Đổi giá nhập — ${order.code}`
                    : 'Đổi giá nhập'
            }
            okText="Lưu thay đổi"
            cancelText="Hủy"
            confirmLoading={submitting}
            onCancel={onClose}
            onOk={() =>
                void form.submit()
            }
        >
            <Alert
                type="warning"
                showIcon
                message="Lưu ý về điều chỉnh giá"
                description="Thay đổi giá chỉ điều chỉnh công nợ với nhà cung cấp và lưu lại giá cũ. Không hồi tố lại giá vốn của hàng đã được nhập kho."
                style={{
                    marginBottom: 16,
                }}
            />

            <Form
                form={form}
                layout="vertical"
                onFinish={(values) =>
                    void handleSubmit(values)
                }
            >
                <Form.Item
                    label="Dòng hàng"
                    name="idChiTiet"
                    rules={[
                        {
                            required: true,
                            message:
                                'Vui lòng chọn dòng hàng.',
                        },
                    ]}
                >
                    <Select
                        loading={loading}
                        placeholder="Chọn dòng hàng"
                        options={details.map((detail) => {
                            const product = products.find(
                                (item) => item.id === detail.idSanPham,
                            );

                            return {
                                value: detail.id,
                                label: `${product?.name ?? detail.idSanPham} — SL đặt ${detail.soLuongDat}`,
                            };
                        })}
                    />
                </Form.Item>

                <Form.Item label="Đơn giá hiện tại">
                    <Text>
                        {selectedDetail
                            ? `${selectedDetail.donGiaNhap.toLocaleString(
                                'vi-VN',
                            )} ₫`
                            : '—'}
                    </Text>
                </Form.Item>

                <Form.Item
                    label="Đơn giá nhập mới"
                    name="donGiaNhapMoi"
                    rules={[
                        {
                            required: true,
                            message:
                                'Vui lòng nhập đơn giá mới.',
                        },
                        {
                            type: 'number',
                            min: 1,
                            message:
                                'Đơn giá mới phải lớn hơn 0.',
                        },
                    ]}
                >
                    <InputNumber
                        style={{
                            width: '100%',
                        }}
                        min={1}
                        step={1000}
                        addonAfter="₫"
                    />
                </Form.Item>

                <Form.Item
                    label="Lý do thay đổi"
                    name="lyDo"
                    rules={[
                        {
                            required: true,
                            whitespace: true,
                            message:
                                'Vui lòng nhập lý do thay đổi giá.',
                        },
                        {
                            max: 500,
                            message:
                                'Lý do không được vượt quá 500 ký tự.',
                        },
                    ]}
                >
                    <Input.TextArea
                        rows={4}
                        maxLength={500}
                        showCount
                        placeholder="Nhập lý do thay đổi giá..."
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}