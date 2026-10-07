import {
    Alert,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Table,
    Typography,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAppSelector } from '@/store/hooks';
import { useEffect, useMemo, useState } from 'react';

import { chiTietPhieuNhapApi } from '@/api/chiTietPhieuNhap';
import {
    phieuNhapApi,
    type ReceivingLineDTO,
} from '@/api/phieuNhap';
import type { PurchaseOrder } from '@/types';
import { useAppDispatch } from '@/store/hooks';
import { fetchPurchaseOrders } from '@/store/slices/purchaseSlice';
import { fetchStock } from '@/store/slices/stockSlice';

const { Text } = Typography;

interface ReceivingRow {
    idChiTiet: string;
    productId: string;
    productName: string;
    soLuongDat: number;
    donGiaNhap: number;
    vatPercent: number;
    soLuongNhan: number;
    soLuongThua: number;
    xuLyThua: string;
    lyDoChenhLechDong: string;
}

interface ReceivingModalProps {
    open: boolean;
    order: PurchaseOrder | null;
    onClose: () => void;
    onSubmitted?: () => void;
}

const formatVND = (value: number): string =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(value);

export function ReceivingModal({
                                   open,
                                   order,
                                   onClose,
                                   onSubmitted,
                               }: ReceivingModalProps) {
    const dispatch = useAppDispatch();
    const products = useAppSelector((state) => state.product.products);


    const [rows, setRows] = useState<ReceivingRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [giamGia, setGiamGia] = useState(0);
    const [lyDoChenhLech, setLyDoChenhLech] = useState('');

    useEffect(() => {
        if (!open || !order) {
            setRows([]);
            setGiamGia(0);
            setLyDoChenhLech('');
            return;
        }

        let cancelled = false;

        const loadDetails = async () => {
            setLoading(true);

            try {
                const details =
                    await chiTietPhieuNhapApi.getByPhieuNhap(order.id);

                if (cancelled) return;

                setRows(
                    details.map((d) => ({
                        idChiTiet: d.id,
                        productId: d.idSanPham,
                        productName: d.idSanPham,
                        soLuongDat: d.soLuongDat,
                        donGiaNhap: d.donGiaNhap,
                        vatPercent: d.vatPhantram,
                        soLuongNhan: d.soLuongNhan ?? d.soLuongDat,
                        soLuongThua: d.soLuongThua ?? 0,
                        xuLyThua: d.xuLyThua ?? 'CHUA_XU_LY',
                        lyDoChenhLechDong: d.lyDoChenhLechDong ?? '',
                    })),
                );
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
    }, [open, order, products]);

    const updateRow = (
        idChiTiet: string,
        patch: Partial<ReceivingRow>,
    ) => {
        setRows((current) =>
            current.map((row) =>
                row.idChiTiet === idChiTiet
                    ? { ...row, ...patch }
                    : row,
            ),
        );
    };

    const handleReceivedQuantityChange = (
        row: ReceivingRow,
        value: number | null,
    ) => {
        const soLuongNhan = value ?? 0;

        updateRow(row.idChiTiet, {
            soLuongNhan,
        });
    };

    const handleSurplusChange = (
        row: ReceivingRow,
        value: number | null,
    ) => {
        const soLuongThua = value ?? 0;

        updateRow(row.idChiTiet, {
            soLuongThua,
            xuLyThua: 'CHUA_XU_LY',
        });
    };

    const handleSurplusHandlingChange = (
        row: ReceivingRow,
        value: string,
    ) => {
        updateRow(row.idChiTiet, {
            xuLyThua: value,
        });
    };

    const handleReasonChange = (
        row: ReceivingRow,
        value: string,
    ) => {
        updateRow(row.idChiTiet, {
            lyDoChenhLechDong: value,
        });
    };

    const hasDiscrepancy = (row: ReceivingRow): boolean =>
        row.soLuongNhan !== row.soLuongDat ||
        row.soLuongThua > 0;

    const estimatedTotal = useMemo(() => {
        const goodsTotal = rows.reduce(
            (sum, row) =>
                sum + row.soLuongNhan * row.donGiaNhap,
            0,
        );

        const vatTotal = rows.reduce(
            (sum, row) =>
                sum +
                row.soLuongNhan *
                row.donGiaNhap *
                (row.vatPercent / 100),
            0,
        );

        return goodsTotal + vatTotal - giamGia;
    }, [rows, giamGia]);

    const handleSubmit = async () => {
        if (!order) return;

        if (giamGia < 0) {
            message.error('Giảm giá không được âm.');
            return;
        }

        if (rows.length === 0) {
            message.error('Phiếu nhập chưa có dòng hàng.');
            return;
        }

        for (const row of rows) {
            if (row.soLuongNhan > row.soLuongDat) {
                message.error(`Số lượng nhận của "${row.productName}" không được lớn hơn số lượng đặt.`,);
                return;
            }

            if (hasDiscrepancy(row) && !row.lyDoChenhLechDong.trim() && !lyDoChenhLech.trim()) {
                message.error(`Dòng ${row.productName}: vui lòng nhập lý do chênh lệch ở dòng hoặc lý do chung của phiếu.`,);
                return;
            }

            if (row.soLuongThua > 0 && !['NHAP_KHO', 'TRA_LAI_NCC'].includes(row.xuLyThua,)) {
                message.error(`Vui lòng chọn cách xử lý hàng thừa cho "${row.productName}".`,);
                return;
            }
        }

        const lines: ReceivingLineDTO[] = rows.map((row) => ({
            idChiTiet: row.idChiTiet,
            soLuongNhan: row.soLuongNhan,
            soLuongThua: row.soLuongThua,
            xuLyThua:
                row.soLuongThua > 0
                    ? (row.xuLyThua as
                        | 'NHAP_KHO'
                        | 'TRA_LAI_NCC')
                    : 'CHUA_XU_LY',
            lyDoChenhLechDong:
                row.lyDoChenhLechDong.trim() || undefined,
        }));

        setSubmitting(true);

        try {
            await phieuNhapApi.receive(order.id, {
                giamGia,
                lyDoChenhLech:
                    lyDoChenhLech.trim() || undefined,
                lines,
            });

            message.success(`Đã kiểm nhận ${order.code}. Hệ thống đã cập nhật tồn Kho Tổng.`,);

            onSubmitted?.();

            dispatch(fetchPurchaseOrders());
            dispatch(fetchStock());

            onClose();
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : 'Lỗi kiểm nhận phiếu nhập',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const columns: ColumnsType<ReceivingRow> = [
        {
            title: 'Sản phẩm',
            dataIndex: 'productName',
            key: 'productName',
            width: 180,
        },
        {
            title: 'SL đặt',
            dataIndex: 'soLuongDat',
            key: 'soLuongDat',
            width: 80,
        },
        {
            title: 'Đơn giá',
            dataIndex: 'donGiaNhap',
            key: 'donGiaNhap',
            width: 120,
            render: (value: number) => formatVND(value),
        },
        {
            title: 'SL nhận',
            key: 'soLuongNhan',
            width: 130,
            render: (_, row) => (
                <InputNumber
                    min={0}
                    max={row.soLuongDat}
                    value={row.soLuongNhan}
                    onChange={(value) =>
                        handleReceivedQuantityChange(row, value)
                    }
                />
            ),
        },
        {
            title: 'SL thừa',
            key: 'soLuongThua',
            width: 120,
            render: (_, row) => (
                <InputNumber
                    min={0}
                    value={row.soLuongThua}
                    onChange={(value) =>
                        handleSurplusChange(row, value)
                    }
                />
            ),
        },
        {
            title: 'Cách xử lý',
            key: 'xuLyThua',
            width: 150,
            render: (_, row) => (
                <Select
                    value={row.xuLyThua}
                    style={{ width: '100%' }}
                    onChange={(value) =>
                        handleSurplusHandlingChange(row, value)
                    }
                    options={
                        row.soLuongThua > 0
                            ? [
                                {
                                    value: 'NHAP_KHO',
                                    label: 'Nhập thêm',
                                },
                                {
                                    value: 'TRA_LAI_NCC',
                                    label: 'Trả NCC',
                                },
                            ]
                            : [
                                {
                                    value: 'CHUA_XU_LY',
                                    label: '—',
                                },
                            ]
                    }
                />
            ),
        },
        {
            title: 'Lý do chênh lệch',
            key: 'lyDoChenhLechDong',
            width: 220,
            render: (_, row) => (
                <Input.TextArea
                    rows={1}
                    maxLength={500}
                    value={row.lyDoChenhLechDong}
                    placeholder={
                        hasDiscrepancy(row)
                            ? 'Bắt buộc'
                            : 'Không bắt buộc'
                    }
                    onChange={(event) =>
                        handleReasonChange(
                            row,
                            event.target.value,
                        )
                    }
                />
            ),
        },
    ];

    return (
        <Modal
            open={open}
            title={
                order
                    ? `Kiểm nhận phiếu ${order.code}`
                    : 'Kiểm nhận phiếu nhập'
            }
            width={1200}
            okText="Xác nhận kiểm nhận"
            cancelText="Hủy"
            confirmLoading={submitting}
            onOk={() => void handleSubmit()}
            onCancel={onClose}
            destroyOnHidden
        >
            <Space
                direction="vertical"
                size="middle"
                style={{ width: '100%' }}
            >
                <Alert
                    type="info"
                    showIcon
                    message="Kiểm nhận hàng"
                    description="SL nhận là số lượng thực tế đạt yêu cầu. Hàng thừa phải chọn Nhập thêm hoặc Trả NCC. Khi xác nhận, hệ thống cập nhật tồn Kho Tổng và ghi nhận biến động kho."
                />

                <Space>
                    <Text strong>Giảm giá:</Text>

                    <InputNumber
                        min={0}
                        step={1000}
                        value={giamGia}
                        onChange={(value) =>
                            setGiamGia(value ?? 0)
                        }
                        formatter={(value) =>
                            `${value ?? ''}`.replace(
                                /\B(?=(\d{3})+(?!\d))/g,
                                ',',
                            )
                        }
                        parser={(value) =>
                            Number(
                                (value ?? '').replace(/[^\d]/g, ''),
                            )
                        }
                    />
                </Space>

                <Table
                    rowKey="idChiTiet"
                    loading={loading}
                    dataSource={rows}
                    columns={columns}
                    pagination={false}
                    scroll={{ x: 1100 }}
                />

                <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                >
                    <Text strong>
                        Lý do chênh lệch tổng thể:
                    </Text>

                    <Input.TextArea
                        rows={3}
                        maxLength={500}
                        value={lyDoChenhLech}
                        placeholder="Có thể nhập thêm lý do chênh lệch tổng thể"
                        onChange={(event) =>
                            setLyDoChenhLech(event.target.value)
                        }
                    />

                    <div style={{ textAlign: 'right' }}>
                        <Text strong>
                            Giá trị dự kiến sau kiểm nhận:{' '}
                            {formatVND(estimatedTotal)}
                        </Text>
                    </div>
                </Space>
            </Space>
        </Modal>
    );
}