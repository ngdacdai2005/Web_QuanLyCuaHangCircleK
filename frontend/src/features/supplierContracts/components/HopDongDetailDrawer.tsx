import type { FC } from 'react';
import { Alert, Button, Descriptions, Drawer, Space, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { hopDongApi } from '@/api/hopDongApi';
import { HOP_DONG_LOAI_LABEL, type HopDong } from '@/types';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';
import { HopDongStatusTag } from './HopDongStatusTag';

const { Text } = Typography;

interface HopDongDetailDrawerProps {
    hopDong: HopDong | null;
    onClose: () => void;
}

/**
 * Drawer chi tiết hợp đồng NCC — thuần xem (read-only), mọi thao tác
 * sửa/trình/duyệt nằm ở cột actions của bảng.
 */
export const HopDongDetailDrawer: FC<HopDongDetailDrawerProps> = ({
                                                                      hopDong,
                                                                      onClose,
                                                                  }) => {
    const open = hopDong !== null;
    const hd = hopDong;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={640}
            destroyOnHidden
            title={
                hd !== null ? (
                    <Space size={10} wrap>
                        <Text strong className="mono-code">{hd.maHopDong}</Text>
                        <HopDongStatusTag hopDong={hd} />
                    </Space>
                ) : (
                    'Chi tiết hợp đồng'
                )
            }
            extra={
                hd !== null ? (
                    <Space>
                        {hd.fileCo && (
                            <Button
                                icon={<DownloadOutlined />}
                                href={hopDongApi.downloadUrl(hd.id)}
                                target="_blank"
                            >
                                Tải file scan
                            </Button>
                        )}
                        <Button type="primary" onClick={onClose}>
                            Đóng
                        </Button>
                    </Space>
                ) : null
            }
        >
            {hd === null ? null : (
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                    <Descriptions bordered size="small" column={2}>
                        <Descriptions.Item label="Mã hợp đồng" span={2}>
                            <Text className="mono-code">{hd.maHopDong}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Tên hợp đồng" span={2}>
                            {hd.tenHopDong}
                        </Descriptions.Item>
                        <Descriptions.Item label="Nhà cung cấp" span={2}>
                            <Text strong>{hd.tenNcc}</Text>
                            <Text type="secondary"> ({hd.maNcc})</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Loại hợp đồng">
                            {HOP_DONG_LOAI_LABEL[hd.loaiHopDong]}
                        </Descriptions.Item>
                        <Descriptions.Item label="Số ngày được nợ">
                            {hd.soNgayDuocNo ?? 0} ngày
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày ký">
                            {formatDate(hd.ngayKy)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày hiệu lực">
                            {formatDate(hd.ngayHieuLuc)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày hết hạn">
                            {formatDate(hd.ngayHetHan ?? null)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Giá trị hợp đồng">
                            {hd.giaTriHopDong != null
                                ? formatVND(Number(hd.giaTriHopDong))
                                : <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Điều khoản thanh toán" span={2}>
                            {hd.dieuKhoanThanhToan || <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="File đính kèm" span={2}>
                            {hd.fileCo ? (
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    href={hopDongApi.downloadUrl(hd.id)}
                                    target="_blank"
                                    className="tag-no-margin"
                                >
                                    {hd.fileTenGoc || 'Tải file scan'}
                                </Button>
                            ) : (
                                <Text type="secondary">Chưa đính kèm file</Text>
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Nội dung" span={2}>
                            {hd.noiDung
                                ? <Text style={{ whiteSpace: 'pre-wrap' }}>{hd.noiDung}</Text>
                                : <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                    </Descriptions>

                    {(hd.lyDoTuChoi || hd.ngayDuyet || (hd.soLanTrinh ?? 0) > 0) && (
                        <Descriptions bordered size="small" column={2}>
                            <Descriptions.Item label="Số lần trình" span={2}>
                                {hd.soLanTrinh ?? 0}
                            </Descriptions.Item>
                            {hd.ngayDuyet && (
                                <Descriptions.Item label="Duyệt lúc" span={2}>
                                    {formatDateTime(hd.ngayDuyet)}
                                </Descriptions.Item>
                            )}
                            {hd.lyDoTuChoi && (
                                <Descriptions.Item label="Lý do từ chối" span={2}>
                                    <Alert type="error" showIcon message={hd.lyDoTuChoi} />
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                    )}
                </Space>
            )}
        </Drawer>
    );
};