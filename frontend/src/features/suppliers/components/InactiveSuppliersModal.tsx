import { useEffect, useState, type FC } from 'react';
import {
    Alert,
    Button,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    App as AntdApp,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AuditOutlined } from '@ant-design/icons';

import { nhaCungCapApi } from '@/api/nhaCungCap';
import {
    updateSupplierThunk,
} from '@/store/slices/supplierSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { InactiveSupplierRow } from '@/types';
import { formatDateShort } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';

const { Text } = Typography;

interface Props {
    open: boolean;
    onClose: () => void;
}

export const InactiveSuppliersModal: FC<Props> = ({
                                                      open,
                                                      onClose,
                                                  }) => {
    const dispatch = useAppDispatch();
    const { message } = AntdApp.useApp();

    const suppliers = useAppSelector((state) => state.supplier.suppliers);

    const [months, setMonths] = useState<number>(6);
    const [rows, setRows] = useState<InactiveSupplierRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        const loadReport = async (): Promise<void> => {
            try {
                setLoading(true);
                setError(null);

                const data = await nhaCungCapApi.getInactiveReport(months);

                if (!cancelled) {
                    setRows(data);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message || 'Không thể tải báo cáo NCC ít hoạt động.');
                    setRows([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadReport();

        return () => {
            cancelled = true;
        };
    }, [open, months]);

    const handleStopCooperation = async (
        row: InactiveSupplierRow,
    ): Promise<void> => {
        const supplier = suppliers.find((item) => item.id === row.id);

        if (!supplier) {
            message.error('Không tìm thấy nhà cung cấp trong danh sách hiện tại.');
            return;
        }

        try {
            await dispatch(
                updateSupplierThunk({
                    id: supplier.id,
                    values: {
                        name: supplier.name,
                        taxCode: supplier.taxCode,
                        phone: supplier.phone,
                        email: supplier.email,
                        address: supplier.address,
                        categories: supplier.categories,
                        categoryIds: supplier.categoryIds,
                        contactName: supplier.contactName,
                        contactTitle: supplier.contactTitle,
                        contactPhone: supplier.contactPhone,
                        creditDays: supplier.creditDays,
                        note: supplier.note,
                        paymentTerms: supplier.paymentTerms,
                        status: 'Inactive',
                    },
                }),
            ).unwrap();

            message.success(
                `Đã ngừng hợp tác với nhà cung cấp "${supplier.name}".`,
            );

            setRows((currentRows) =>
                currentRows.map((item) =>
                    item.id === row.id
                        ? { ...item, dangHoatDong: false }
                        : item,
                ),
            );
        } catch (err: any) {
            message.error(
                err?.message || 'Không thể cập nhật trạng thái nhà cung cấp.',
            );
        }
    };

    const columns: ColumnsType<InactiveSupplierRow> = [
        {
            title: 'Mã',
            dataIndex: 'maNcc',
            width: 110,
            render: (value: string) => (
                <span className="mono-code">{value}</span>
            ),
        },
        {
            title: 'Tên NCC',
            dataIndex: 'tenNcc',
            width: 240,
            render: (value: string) => (
                <Text strong>{value}</Text>
            ),
        },
        {
            title: 'Ngày phiếu gần nhất',
            dataIndex: 'ngayPhieuGanNhat',
            width: 170,
            render: (value: string | null) =>
                value === null ? (
                    <Tag color="orange">Chưa từng nhập</Tag>
                ) : (
                    formatDateShort(value)
                ),
        },
        {
            title: 'Số phiếu nhập',
            dataIndex: 'tongDonHang',
            align: 'center',
            width: 100,
        },
        {
            title: 'Công nợ',
            dataIndex: 'tongCongNo',
            align: 'right',
            width: 150,
            render: (value: number) => formatVND(value),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'dangHoatDong',
            align: 'center',
            width: 140,
            render: (active: boolean) => (
                <Tag
                    color={active ? 'green' : 'default'}
                    className="tag-no-margin"
                >
                    {active ? 'Đang hợp tác' : 'Ngừng hợp tác'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            align: 'center',
            width: 160,
            render: (_, row) =>
                row.dangHoatDong ? (
                    <Popconfirm
                        title="Ngừng hợp tác?"
                        description={`Ngừng hợp tác với "${row.tenNcc}"?`}
                        okText="Ngừng hợp tác"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleStopCooperation(row)}
                    >
                        <Button danger size="small">
                            Ngừng hợp tác
                        </Button>
                    </Popconfirm>
                ) : (
                    <Text type="secondary">Đã ngừng</Text>
                ),
        },
    ];

    return (
        <Modal
            title={
                <Space>
                    <AuditOutlined />
                    Rà soát NCC ít hoạt động
                </Space>
            }
            open={open}
            onCancel={onClose}
            width={1050}
            footer={
                <Space
                    style={{
                        width: '100%',
                        justifyContent: 'space-between',
                    }}
                >
                    <Text type="secondary">
                        Liệt kê NCC không có phiếu nhập hoàn tất trong {months} tháng gần nhất.
                    </Text>

                    <Button onClick={onClose}>Đóng</Button>
                </Space>
            }
        >
            <Space
                style={{
                    marginBottom: 16,
                    width: '100%',
                    justifyContent: 'space-between',
                }}
            >
                <Space>
                    <Text strong>Khoảng thời gian:</Text>

                    <Select
                        value={months}
                        style={{ width: 140 }}
                        onChange={setMonths}
                        options={[
                            { value: 3, label: '3 tháng' },
                            { value: 6, label: '6 tháng' },
                            { value: 12, label: '12 tháng' },
                        ]}
                    />
                </Space>

                <Text type="secondary">
                    {rows.length} nhà cung cấp
                </Text>
            </Space>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message={error}
                    style={{ marginBottom: 16 }}
                />
            )}

            <Table<InactiveSupplierRow>
                rowKey="id"
                columns={columns}
                dataSource={rows}
                loading={loading}
                size="middle"
                scroll={{ x: 950 }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    showTotal: (total) => `${total} nhà cung cấp`,
                }}
            />
        </Modal>
    );
};