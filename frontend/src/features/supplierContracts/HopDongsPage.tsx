import { useEffect, useMemo, useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    App as AntdApp,
    Button,
    Card,
    Input,
    Modal,
    Popconfirm,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    CheckOutlined,
    CloseOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    SendOutlined,
    StopOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { isInitialLoading } from '@/utils/tableLoading';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    approveHopDong,
    cancelHopDong,
    deleteHopDong,
    fetchHopDongs,
    rejectHopDong,
    setHopDongFilter,
    submitHopDong,
} from '@/store/slices/hopDongSlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import { hopDongApi } from '@/api/hopDongApi';
import {
    HOP_DONG_LOAI_LABEL,
    HOP_DONG_STATUS,
    HOP_DONG_STATUS_LABEL,
    USER_ROLE,
    effectiveStatus,
    type HopDong,
    type HopDongStatus,
} from '@/types';
import { formatDate, formatDateShort } from '@/utils/dateUtils';
import { formatVND, matchKeyword } from '@/utils/formatters';
import { HopDongDetailDrawer } from './components/HopDongDetailDrawer';
import { HopDongFormModal } from './components/HopDongFormModal';
import { HopDongStatusTag } from './components/HopDongStatusTag';

const { Text } = Typography;

export const CONTRACT_EDITORS: ReadonlySet<string> = new Set([
    USER_ROLE.Admin,
    USER_ROLE.Accountant,
]);

export const HopDongsPage: FC = () => {
    const dispatch = useAppDispatch();
    const { message } = AntdApp.useApp();
    const user = useAppSelector((s) => s.auth.user);
    const isAdmin = user?.role === USER_ROLE.Admin;
    const canEdit = user !== null && CONTRACT_EDITORS.has(user.role);
    const { items, isLoading, filter } = useAppSelector((s) => s.hopDong);
    const suppliers = useAppSelector((s) => s.supplier.suppliers);
    const [searchParams, setSearchParams] = useSearchParams();

    const [keyword, setKeyword] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<HopDong | null>(null);
    const [detail, setDetail] = useState<HopDong | null>(null);
    const [rejecting, setRejecting] = useState<HopDong | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Khởi tạo filter từ ?idNcc= (khi bấm "Hợp đồng" ở SuppliersPage)
    useEffect(() => {
        dispatch(fetchSuppliers());
        dispatch(setHopDongFilter({ idNcc: searchParams.get('idNcc') ?? undefined }));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // idNcc lọc server; trangThai lọc client theo effectiveStatus (EXPIRED là derived, không có trong DB).
    useEffect(() => {
        dispatch(fetchHopDongs({ idNcc: filter.idNcc }));
    }, [filter.idNcc, dispatch]);

    // Đồng bộ idNcc lên URL (giữ link chia sẻ được)
    useEffect(() => {
        const params = new URLSearchParams();
        if (filter.idNcc) params.set('idNcc', filter.idNcc);
        setSearchParams(params, { replace: true });
    }, [filter.idNcc]); // eslint-disable-line react-hooks/exhaustive-deps

    const rows = useMemo(() => {
        return items
            .filter((hd) => {
                if (filter.trangThai && effectiveStatus(hd) !== filter.trangThai) return false;
                return matchKeyword(keyword, [hd.maHopDong, hd.tenHopDong, hd.tenNcc, hd.maNcc]);
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [items, filter.trangThai, keyword]);

    const filters: ToolbarFilter[] = [
        {
            key: 'nhaCungCap',
            placeholder: 'Nhà cung cấp',
            value: filter.idNcc ?? null,
            span: 6,
            options: suppliers.map((s) => ({
                value: s.id,
                label: `${s.code} — ${s.name}${s.status === 'Inactive' ? ' (Ngừng hợp tác)' : ''}`,
            })),
            onChange: (value) =>
                dispatch(setHopDongFilter({ ...filter, idNcc: value ?? undefined })),
        },
        {
            key: 'trangThai',
            placeholder: 'Trạng thái',
            value: filter.trangThai ?? null,
            options: (Object.keys(HOP_DONG_STATUS) as HopDongStatus[]).map((v) => ({
                value: v,
                label: HOP_DONG_STATUS_LABEL[v],
            })),
            onChange: (value) =>
                dispatch(
                    setHopDongFilter({ ...filter, trangThai: (value as HopDongStatus) ?? null }),
                ),
        },
    ];

    const runAction = async (p: Promise<unknown>, okMsg: string): Promise<void> => {
        try {
            await p;
            message.success(okMsg);
        } catch (e: any) {
            message.error(e?.message || 'Thao tác thất bại.');
        }
    };

    const closeReject = (): void => {
        setRejecting(null);
        setRejectReason('');
    };

    const handleReject = async (): Promise<void> => {
        if (rejecting === null) return;
        const lyDo = rejectReason.trim();
        if (!lyDo) {
            message.error('Vui lòng nhập lý do từ chối.');
            return;
        }
        try {
            await dispatch(rejectHopDong({ id: rejecting.id, lyDo })).unwrap();
            message.success('Đã từ chối hợp đồng.');
        } catch (e: any) {
            message.error(e?.message || 'Từ chối thất bại.');
            return;
        }
        closeReject();
    };

    const columns: ColumnsType<HopDong> = [
        {
            title: 'Mã',
            key: 'maHopDong',
            width: 130,
            fixed: 'left',
            sorter: (a, b) => a.maHopDong.localeCompare(b.maHopDong),
            render: (_, hd) => <span className="mono-code">{hd.maHopDong}</span>,
        },
        {
            title: 'Tên hợp đồng / NCC',
            key: 'ten',
            width: 300,
            render: (_, hd) => (
                <div>
                    <Text strong>{hd.tenHopDong}</Text>
                    <div>
                        <Text type="secondary">
                            {hd.maNcc} {hd.tenNcc ? `— ${hd.tenNcc}` : ''}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Loại',
            key: 'loaiHopDong',
            width: 140,
            render: (_, hd) => (
                <Tag color="blue" className="tag-no-margin">
                    {HOP_DONG_LOAI_LABEL[hd.loaiHopDong]}
                </Tag>
            ),
        },
        {
            title: 'Giá trị',
            key: 'giaTriHopDong',
            width: 160,
            align: 'right',
            sorter: (a, b) => Number(a.giaTriHopDong ?? 0) - Number(b.giaTriHopDong ?? 0),
            render: (_, hd) =>
                hd.giaTriHopDong != null ? (
                    formatVND(Number(hd.giaTriHopDong))
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: 'Ngày hiệu lực',
            key: 'ngayHieuLuc',
            width: 130,
            sorter: (a, b) => (a.ngayHieuLuc ?? '').localeCompare(b.ngayHieuLuc ?? ''),
            render: (_, hd) => formatDate(hd.ngayHieuLuc),
        },
        {
            title: 'Ngày hết hạn',
            key: 'ngayHetHan',
            width: 130,
            sorter: (a, b) => (a.ngayHetHan ?? '').localeCompare(b.ngayHetHan ?? ''),
            render: (_, hd) => formatDate(hd.ngayHetHan ?? null),
        },
        {
            title: 'Trạng thái',
            key: 'trangThai',
            width: 170,
            align: 'center',
            render: (_, hd) => <HopDongStatusTag hopDong={hd} />,
        },
        {
            title: 'Cập nhật',
            key: 'updatedAt',
            width: 130,
            render: (_, hd) => formatDateShort(hd.updatedAt || hd.createdAt),
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 340,
            fixed: 'right',
            render: (_, hd) => {
                const st = hd.trangThai;
                const isDraftOrRejected = st === 'DRAFT' || st === 'REJECTED';
                const isPending = st === 'PENDING_APPROVAL';

                return (
                    <Space size={0}>
                        <Tooltip title="Chi tiết">
                            <Button type="text" icon={<EyeOutlined />} onClick={() => setDetail(hd)} />
                        </Tooltip>

                        <Tooltip title={hd.fileCo ? 'Tải file' : 'Chưa có file'}>
                            <Button
                                type="text"
                                icon={<DownloadOutlined />}
                                href={hd.fileCo ? hopDongApi.downloadUrl(hd.id) : undefined}
                                target="_blank"
                                disabled={!hd.fileCo}
                            />
                        </Tooltip>

                        {canEdit && isDraftOrRejected && (
                            <Tooltip title="Sửa">
                                <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setEditing(hd);
                                        setFormOpen(true);
                                    }}
                                />
                            </Tooltip>
                        )}

                        {canEdit && isDraftOrRejected && (
                            <Popconfirm
                                title="Trình duyệt hợp đồng này?"
                                okText="Trình"
                                cancelText="Huỷ"
                                disabled={!hd.fileCo}
                                onConfirm={() =>
                                    runAction(
                                        dispatch(submitHopDong(hd.id)).unwrap(),
                                        'Đã trình duyệt hợp đồng.',
                                    )
                                }
                            >
                                <Tooltip title={hd.fileCo ? 'Trình duyệt' : 'Cần đính kèm file scan'}>
                                    <Button type="text" icon={<SendOutlined />} disabled={!hd.fileCo} />
                                </Tooltip>
                            </Popconfirm>
                        )}

                        {isAdmin && isPending && (
                            <Popconfirm
                                title="Duyệt hợp đồng này?"
                                okText="Duyệt"
                                cancelText="Huỷ"
                                onConfirm={() =>
                                    runAction(
                                        dispatch(approveHopDong(hd.id)).unwrap(),
                                        'Đã duyệt hợp đồng.',
                                    )
                                }
                            >
                                <Tooltip title="Duyệt">
                                    <Button
                                        type="text"
                                        icon={<CheckOutlined />}
                                        style={{ color: 'var(--ant-color-success, #52c41a)' }}
                                    />
                                </Tooltip>
                            </Popconfirm>
                        )}

                        {isAdmin && isPending && (
                            <Tooltip title="Từ chối">
                                <Button
                                    type="text"
                                    danger
                                    icon={<StopOutlined />}
                                    onClick={() => {
                                        setRejecting(hd);
                                        setRejectReason('');
                                    }}
                                />
                            </Tooltip>
                        )}

                        {canEdit && (isDraftOrRejected || isPending) && (
                            <Popconfirm
                                title="Hủy hợp đồng này?"
                                okText="Hủy hợp đồng"
                                cancelText="Không"
                                onConfirm={() =>
                                    runAction(
                                        dispatch(cancelHopDong(hd.id)).unwrap(),
                                        'Đã hủy hợp đồng.',
                                    )
                                }
                            >
                                <Tooltip title="Hủy">
                                    <Button type="text" icon={<CloseOutlined />} />
                                </Tooltip>
                            </Popconfirm>
                        )}

                        {isAdmin && (isDraftOrRejected || st === 'CANCELLED') && (
                            <Popconfirm
                                title="Xóa hợp đồng này?"
                                okText="Xóa"
                                cancelText="Huỷ"
                                okButtonProps={{ danger: true }}
                                onConfirm={() =>
                                    runAction(
                                        dispatch(deleteHopDong(hd.id)).unwrap(),
                                        'Đã xóa hợp đồng.',
                                    )
                                }
                            >
                                <Tooltip title="Xóa">
                                    <Button type="text" danger icon={<DeleteOutlined />} />
                                </Tooltip>
                            </Popconfirm>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <>
            <PageHeader
                eyebrow="DANH MỤC & NHÂN SỰ / HỢP ĐỒNG NCC"
                title="Quản lý hợp đồng nhà cung cấp"
                description="Lập nháp, trình duyệt và theo dõi hết hạn hợp đồng với nhà cung cấp."
                extra={
                    canEdit && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditing(null);
                                setFormOpen(true);
                            }}
                        >
                            Tạo hợp đồng
                        </Button>
                    )
                }
            />

            <Card styles={{ body: { padding: '18px 18px 8px' } }}>
                <TableToolbar
                    searchValue={keyword}
                    searchPlaceholder="Tìm mã, tên hợp đồng, nhà cung cấp..."
                    onSearchChange={setKeyword}
                    filters={filters}
                    onReset={() => {
                        setKeyword('');
                        dispatch(setHopDongFilter({ ...filter, idNcc: filter.idNcc, trangThai: null }));
                    }}
                />
                <Table<HopDong>
                    columns={columns}
                    dataSource={rows}
                    rowKey="id"
                    size="middle"
                    loading={isInitialLoading(isLoading, items)}
                    scroll={{ x: 1500 }}
                    pagination={{
                        defaultPageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showTotal: (t) => `${t} hợp đồng`,
                    }}
                />
            </Card>

            <HopDongFormModal
                open={formOpen}
                editing={editing}
                onClose={() => setFormOpen(false)}
            />
            <HopDongDetailDrawer hopDong={detail} onClose={() => setDetail(null)} />

            <Modal
                open={rejecting !== null}
                title="Từ chối hợp đồng"
                okText="Từ chối"
                cancelText="Huỷ"
                okButtonProps={{ danger: true, disabled: rejectReason.trim() === '' }}
                onOk={handleReject}
                onCancel={closeReject}
                destroyOnClose
            >
                <Text type="secondary">
                    Lý do sẽ được lưu kèm hợp đồng và không thể bỏ trống.
                </Text>
                <Input.TextArea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="VD: Thiếu chữ ký, sai giá, sai điều khoản..."
                    style={{ marginTop: 8 }}
                />
            </Modal>
        </>
    );
};

export default HopDongsPage;