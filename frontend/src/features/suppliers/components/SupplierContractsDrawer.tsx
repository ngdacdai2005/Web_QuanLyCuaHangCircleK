import { useEffect, useState, type FC } from 'react';
import {
    Alert,
    Button,
    Drawer,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { BRAND } from '@/config/brand';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { hopDongApi } from '@/api/hopDongApi';
import {
    HOP_DONG_LOAI_LABEL,
    HOP_DONG_STATUS,
    daysToExpiry,
    effectiveStatus,
    type HopDong,
    type Supplier,
} from '@/types';
import { formatDate } from '@/utils/dateUtils';
import {
    formatNumber,
    formatVND,
    formatVNDCompact,
} from '@/utils/formatters';
import { HopDongStatusTag } from '@/features/supplierContracts/components/HopDongStatusTag';
import { HopDongDetailDrawer } from '@/features/supplierContracts/components/HopDongDetailDrawer';
import { mapDtoToHopDong } from '@/store/slices/hopDongSlice';

interface Props {
    supplier: Supplier | null;
    onClose: () => void;
}

const { Text } = Typography;

const SupplierContractsDrawer: FC<Props> = ({
                                                supplier,
                                                onClose,
                                            }) => {
    const [rows, setRows] = useState<HopDong[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detail, setDetail] = useState<HopDong | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [loadedFor, setLoadedFor] = useState<string | null>(null);

    const navigate = useNavigate();

    const reload = () => {
        setReloadKey((value) => value + 1);
    };

    useEffect(() => {
        if (!supplier) {
            setRows([]);
            setError(null);
            setDetail(null);
            setLoading(false);
            setLoadedFor(null);
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await hopDongApi.list({
                    idNcc: supplier.id,
                });

                if (!cancelled) {
                    setRows(data.map(mapDtoToHopDong));
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    const message =
                        e instanceof Error
                            ? e.message
                            : 'Không thể tải hợp đồng của nhà cung cấp.';

                    setError(message);
                    setRows([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setLoadedFor(supplier.id);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [supplier?.id, reloadKey]);

    const active = rows.filter(
        (hd) => effectiveStatus(hd) === HOP_DONG_STATUS.ACTIVE,
    );

    const sapHetHan = active.filter((hd) => {
        const days = daysToExpiry(hd);
        return days <= 30;
    });

    const tongGiaTri = active.reduce(
        (sum, hd) => sum + Number(hd.giaTriHopDong ?? 0),
        0,
    );

    const statsItems: SummaryItem[] = [
        {
            key: 'total-contracts',
            title: 'Tổng HĐ',
            value:
                loadedFor === supplier?.id
                    ? formatNumber(rows.length)
                    : '–',
        },
        {
            key: 'active-contracts',
            title: 'Đang hiệu lực',
            value:
                loadedFor === supplier?.id
                    ? formatNumber(active.length)
                    : '–',
            color: BRAND.success,
        },
        {
            key: 'expiring-contracts',
            title: 'Sắp hết hạn',
            value:
                loadedFor === supplier?.id
                    ? formatNumber(sapHetHan.length)
                    : '–',
            color: BRAND.warning,
        },
        {
            key: 'active-contract-value',
            title: 'Giá trị HĐ hiệu lực',
            value:
                loadedFor === supplier?.id
                    ? formatVNDCompact(tongGiaTri)
                    : '–',
        },
    ];

    const contextItems: SummaryItem[] = [
        {
            key: 'supplier-debt',
            title: 'Công nợ hiện tại',
            value: formatVNDCompact(
                Number(supplier?.totalDebt ?? 0),
            ),
        },
        {
            key: 'supplier-orders',
            title: 'Số phiếu nhập',
            value: formatNumber(
                supplier?.totalOrders ?? 0,
            ),
        },
        {
            key: 'supplier-payment-terms',
            title: 'Điều khoản NCC',
            value:
                supplier?.paymentTerms ||
                'Thanh toán ngay',
        },
    ];

    const columns: ColumnsType<HopDong> = [
        {
            title: 'Mã / Tên HĐ',
            key: 'ten',
            width: 244,
            render: (_value, hd) => (
                <Space direction="vertical" size={2}>
                    <Text
                        className="mono-code"
                        type="secondary"
                        style={{ fontSize: 11 }}
                    >
                        {hd.maHopDong}
                    </Text>

                    <Space size={6} wrap>
                        <Text strong>
                            {hd.tenHopDong}
                        </Text>

                        <Tag
                            color="blue"
                            className="tag-no-margin"
                        >
                            {HOP_DONG_LOAI_LABEL[hd.loaiHopDong]}
                        </Tag>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Giá trị',
            dataIndex: 'giaTriHopDong',
            key: 'giaTriHopDong',
            width: 118,
            align: 'right',
            render: (
                value: number | null | undefined,
            ) =>
                value == null
                    ? '—'
                    : formatVND(Number(value)),
        },
        {
            title: 'Thời hạn',
            key: 'thoiHan',
            width: 168,
            render: (_value, hd) => {
                const days = daysToExpiry(hd);

                return (
                    <Space direction="vertical" size={0}>
                        <Text>
                            {hd.ngayHieuLuc
                                ? formatDate(hd.ngayHieuLuc)
                                : '—'}
                            {' → '}
                            {hd.ngayHetHan
                                ? formatDate(hd.ngayHetHan)
                                : 'Không hạn'}
                        </Text>

                        {days !== Infinity && (
                            <Text
                                type={
                                    days <= 30
                                        ? 'warning'
                                        : 'secondary'
                                }
                            >
                                {days < 0
                                    ? `đã quá hạn ${Math.abs(days)} ngày`
                                    : `còn ${days} ngày`}
                            </Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Trạng thái',
            key: 'trangThai',
            width: 150,
            render: (_value, hd) => (
                <HopDongStatusTag hopDong={hd} />
            ),
        },
        {
            title: '',
            key: 'action',
            width: 46,
            align: 'center',
            render: (_value, hd) => (
                <Button
                    type="text"
                    icon={<EyeOutlined />}
                    aria-label="Xem chi tiết hợp đồng"
                    onClick={(e) => {
                        e.stopPropagation();
                        setDetail(hd);
                    }}
                />
            ),
        },
    ];

    return (
        <>
            <Drawer
                title={
                    supplier ? (
                        <Space>
                            <Text className="mono-code">
                                {supplier.code}
                            </Text>

                            <Text strong>
                                {supplier.name}
                            </Text>

                            <Tag
                                color={
                                    supplier.status === 'Active'
                                        ? 'green'
                                        : 'default'
                                }
                            >
                                {supplier.status === 'Active'
                                    ? 'Đang hoạt động'
                                    : 'Ngừng hoạt động'}
                            </Tag>
                        </Space>
                    ) : null
                }
                width={780}
                open={supplier !== null}
                onClose={() => {
                    setDetail(null);
                    onClose();
                }}
                destroyOnHidden
                extra={
                    <Space>
                        <Button
                            icon={<LinkOutlined />}
                            onClick={() => {
                                if (!supplier) return;

                                navigate(
                                    `/hop-dong?idNcc=${supplier.id}`,
                                );
                            }}
                        >
                            Mở module hợp đồng
                        </Button>

                        <Button
                            type="primary"
                            onClick={() => {
                                setDetail(null);
                                onClose();
                            }}
                        >
                            Đóng
                        </Button>
                    </Space>
                }
            >
                {supplier && (
                    <>
                        {/* =========================
                            B. THỐNG KÊ HỢP ĐỒNG
                           ========================= */}
                        <Space
                            direction="vertical"
                            size={20}
                            style={{ width: '100%' }}
                        >
                            <SummaryStrip
                                columns={4}
                                items={statsItems}
                            />

                            <SummaryStrip
                                columns={3}
                                items={contextItems}
                            />

                            {error && (
                                <Alert
                                    type="error"
                                    showIcon
                                    message={error}
                                    action={
                                        <Button onClick={reload}>
                                            Thử lại
                                        </Button>
                                    }
                                />
                            )}

                            {!loading &&
                                !error &&
                                rows.length === 0 &&
                                loadedFor === supplier.id && (
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Nhà cung cấp chưa có hợp đồng nào. Mở module hợp đồng để tạo mới."
                                    />
                                )}

                            {!error && rows.length > 0 && (
                                <Table
                                    size="small"
                                    rowKey="id"
                                    loading={loading}
                                    columns={columns}
                                    dataSource={rows}
                                    pagination={{
                                        pageSize: 10,
                                        size: 'small',
                                    }}
                                    onRow={(hd) => ({
                                        onClick: () => setDetail(hd),
                                        style: {
                                            cursor: 'pointer',
                                        },
                                    })}
                                />
                            )}

                            {loading && rows.length === 0 && (
                                <Table
                                    size="small"
                                    rowKey="id"
                                    loading
                                    columns={columns}
                                    dataSource={[]}
                                    pagination={false}
                                />
                            )}
                        </Space>




                    </>
                )}
            </Drawer>

            {/* Detail Drawer nằm ngoài Drawer NCC để stack lên trên */}
            <HopDongDetailDrawer
                hopDong={detail}
                onClose={() => setDetail(null)}
            />
        </>
    );
};

export default SupplierContractsDrawer;