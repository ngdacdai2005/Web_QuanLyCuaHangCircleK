import {
    Alert,
    Form,
    InputNumber,
    Modal,
    Select,
    Typography,
    message,
} from 'antd';
import { useEffect, useState } from 'react';

import {
    phieuNhapApi,
} from '@/api/phieuNhap';

import {
    PAYMENT_METHOD,
    PAYMENT_METHOD_LABEL,
    type PurchaseOrder,
} from '@/types';

import { useAppDispatch } from '@/store/hooks';
import { fetchPurchaseOrders } from '@/store/slices/purchaseSlice';
import { fetchCashbook } from '@/store/slices/cashbookSlice';

const { Text } = Typography;

interface PayModalProps {
    open: boolean;
    order: PurchaseOrder | null;
    onClose: () => void;
}

interface PayFormValues {
    daThanhToan: number;
    hinhThucTt: string;
}

export function PayModal({
                             open,
                             order,
                             onClose,
                         }: PayModalProps) {
    const dispatch = useAppDispatch();
    const [form] = Form.useForm<PayFormValues>();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open || !order) {
            form.resetFields();
            return;
        }

        form.setFieldsValue({
            daThanhToan:
                order.debtAmount > 0
                    ? order.debtAmount
                    : 1,
            hinhThucTt: Object.values(
                PAYMENT_METHOD,
            )[0],
        });
    }, [open, order, form]);

    const handleSubmit = async (
        values: PayFormValues,
    ) => {
        if (!order) return;

        // Không cho gửi 2 lần liên tiếp.
        if (submitting) return;

        // Phiếu đã thanh toán đủ thì không được thanh toán tiếp.
        if (order.debtAmount <= 0) {
            message.warning(
                'Phiếu này đã thanh toán đủ.',
            );
            return;
        }

        if (values.daThanhToan <= 0) {
            message.error(
                'Số tiền thanh toán phải lớn hơn 0.',
            );
            return;
        }

        if (values.daThanhToan > order.debtAmount) {
            message.error(
                'Số tiền thanh toán không được lớn hơn công nợ còn lại.',
            );
            return;
        }

        setSubmitting(true);

        try {
            await phieuNhapApi.pay(order.id, {
                daThanhToan: values.daThanhToan,
                hinhThucTt: values.hinhThucTt,
            });

            message.success(
                `Đã thanh toán ${values.daThanhToan.toLocaleString(
                    'vi-VN',
                )} ₫ cho phiếu ${order.code}.`,
            );

            dispatch(fetchPurchaseOrders());
            dispatch(fetchCashbook());

            form.resetFields();
            onClose();
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : 'Lỗi thanh toán phiếu nhập',
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
                    ? `Thanh toán phiếu ${order.code}`
                    : 'Thanh toán phiếu nhập'
            }
            okText="Xác nhận thanh toán"
            cancelText="Hủy"
            confirmLoading={submitting}
            onCancel={onClose}
            onOk={() =>
                void form.submit()
            }
        >
            {order && (
                <>
                    <Alert
                        type="info"
                        showIcon
                        message="Thanh toán công nợ NCC"
                        description="Một phiếu hoàn tất có thể được thanh toán nhiều lần. Mỗi lần thanh toán sẽ tạo một khoản chi riêng trong sổ quỹ."
                        style={{
                            marginBottom: 16,
                        }}
                    />

                    <div
                        style={{
                            marginBottom: 16,
                        }}
                    >
                        <Text>
                            Tổng tiền:{' '}
                        </Text>
                        <Text strong>
                            {order.grandTotal.toLocaleString(
                                'vi-VN',
                            )}{' '}
                            ₫
                        </Text>

                        <br />

                        <Text>
                            Công nợ còn lại:{' '}
                        </Text>
                        <Text
                            strong
                            type={
                                order.debtAmount > 0
                                    ? 'danger'
                                    : undefined
                            }
                        >
                            {order.debtAmount.toLocaleString(
                                'vi-VN',
                            )}{' '}
                            ₫
                        </Text>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={(values) =>
                            void handleSubmit(values)
                        }
                    >
                        <Form.Item
                            label="Số tiền thanh toán"
                            name="daThanhToan"
                            rules={[
                                {
                                    required: true,
                                    message:
                                        'Vui lòng nhập số tiền thanh toán.',
                                },
                                {
                                    type: 'number',
                                    min: 1,
                                    message:
                                        'Số tiền phải lớn hơn 0.',
                                },
                            ]}
                        >
                            <InputNumber
                                style={{
                                    width: '100%',
                                }}
                                min={1}
                                max={
                                    order.debtAmount > 0
                                        ? order.debtAmount
                                        : undefined
                                }
                                step={1000}
                                addonAfter="₫"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Hình thức thanh toán"
                            name="hinhThucTt"
                            rules={[
                                {
                                    required: true,
                                    message:
                                        'Vui lòng chọn hình thức thanh toán.',
                                },
                            ]}
                        >
                            <Select
                                options={Object.values(
                                    PAYMENT_METHOD,
                                ).map((value) => ({
                                    value,
                                    label:
                                        PAYMENT_METHOD_LABEL[
                                            value
                                            ],
                                }))}
                            />
                        </Form.Item>
                    </Form>
                </>
            )}
        </Modal>
    );
}