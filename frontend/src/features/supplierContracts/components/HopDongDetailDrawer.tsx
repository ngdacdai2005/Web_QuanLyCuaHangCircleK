import { useState, type FC } from 'react';
import {
    Alert,
    App as AntdApp,
    Button,
    Descriptions,
    Drawer,
    Space,
    Tag,
    Typography,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { hopDongApi } from '@/api/hopDongApi';
import { HOP_DONG_LOAI_LABEL, type HopDong } from '@/types';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';
import { downloadBlob } from '@/utils/exportUtils';
import { HopDongStatusTag } from './HopDongStatusTag';

const { Text } = Typography;

interface HopDongDetailDrawerProps {
    hopDong: HopDong | null;
    onClose: () => void;
}

/**
 * Drawer chi tiết hợp đồng NCC — hiển thị đầy đủ thông tin pháp lý, giao nhận và cam kết.
 */
export const HopDongDetailDrawer: FC<HopDongDetailDrawerProps> = ({ hopDong, onClose }) => {
    const { message } = AntdApp.useApp();
    const [downloading, setDownloading] = useState(false);

    const open = hopDong !== null;
    const hd = hopDong;

    const handleDownload = async (): Promise<void> => {
        if (hd === null || !hd.fileCo) return;

        setDownloading(true);

        try {
            const blob = await hopDongApi.download(hd.id);
            downloadBlob(blob, hd.fileTenGoc || `hop-dong-${hd.maHopDong}`);
        } catch (e: any) {
            message.error(e?.message || 'Không thể tải file scan.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={720}
            destroyOnHidden
            title={
                hd !== null ? (
                    <Space size={10} wrap>
                        <Text strong className="mono-code">{hd.maHopDong}</Text>
                        <HopDongStatusTag hopDong={hd} />
                        {hd.tuDongGiaHan && <Tag color="blue">Tự động gia hạn</Tag>}
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
                                loading={downloading}
                                onClick={handleDownload}
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
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    {/* Phần 1: Thông tin chung & Thời hạn */}
                    <Descriptions title="1. Thông tin hợp đồng & Giá trị" bordered size="small" column={2}>
                        <Descriptions.Item label="Mã hợp đồng">
                            <Text className="mono-code">{hd.maHopDong}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Số HĐ đối tác">
                            {hd.soHopDongDoiTac ? <Text strong>{hd.soHopDongDoiTac}</Text> : <Text type="secondary">—</Text>}
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
                        <Descriptions.Item label="Thời hạn hiệu lực">
                            {formatDate(hd.ngayHieuLuc)} — {formatDate(hd.ngayHetHan ?? null)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Giá trị hợp đồng">
                            {hd.giaTriHopDong != null
                                ? formatVND(Number(hd.giaTriHopDong))
                                : <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Hạn mức tối đa">
                            {hd.hanMucHopDong != null
                                ? formatVND(Number(hd.hanMucHopDong))
                                : <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Giá trị đã thực hiện" span={2}>
                            <Text strong type={hd.giaTriDaSuDung ? "success" : "secondary"}>
                                {formatVND(Number(hd.giaTriDaSuDung ?? 0))}
                            </Text>
                            {hd.hanMucHopDong && Number(hd.hanMucHopDong) > 0 && (
                                <Text type="secondary" style={{ marginLeft: 8 }}>
                                    (Đạt {((Number(hd.giaTriDaSuDung ?? 0) / Number(hd.hanMucHopDong)) * 100).toFixed(1)}% hạn mức)
                                </Text>
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Điều khoản thanh toán" span={2}>
                            {hd.dieuKhoanThanhToan || <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                    </Descriptions>

                    {/* Phần 2: Đại diện pháp lý & Giao nhận logistics */}
                    <Descriptions title="2. Đại diện pháp lý & Giao nhận" bordered size="small" column={2}>
                        <Descriptions.Item label="Đại diện NCC">
                            {hd.nguoiDaiDienNcc ? (
                                <span>
                                    <strong>{hd.nguoiDaiDienNcc}</strong>
                                    {hd.chucVuNcc && <Text type="secondary"> ({hd.chucVuNcc})</Text>}
                                </span>
                            ) : (
                                <Text type="secondary">—</Text>
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Đại diện Circle K">
                            {hd.nguoiDaiDienBenMua ? <strong>{hd.nguoiDaiDienBenMua}</strong> : <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Địa điểm giao hàng" span={2}>
                            {hd.diaDiemGiaoHang || <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Thời gian giao cam kết" span={2}>
                            {hd.thoiGianGiaoHang || <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Chiết khấu thương mại">
                            {hd.chietKhauPhantram ? <Tag color="green">{hd.chietKhauPhantram}%</Tag> : <Text type="secondary">0%</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tự động gia hạn">
                            {hd.tuDongGiaHan ? <Tag color="blue">Có</Tag> : <Tag>Không</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Chính sách đổi trả" span={2}>
                            {hd.chinhSachDoiTra || <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Nội dung / Điều khoản khác" span={2}>
                            {hd.noiDung
                                ? <Text style={{ whiteSpace: 'pre-wrap' }}>{hd.noiDung}</Text>
                                : <Text type="secondary">—</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="File đính kèm scan" span={2}>
                            {hd.fileCo ? (
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    loading={downloading}
                                    onClick={handleDownload}
                                    className="tag-no-margin"
                                >
                                    {hd.fileTenGoc || 'Tải file scan'}
                                </Button>
                            ) : (
                                <Text type="secondary">Chưa đính kèm file</Text>
                            )}
                        </Descriptions.Item>
                    </Descriptions>

                    {/* Phần 3: Danh mục mặt hàng cam kết */}
                    {hd.lines && hd.lines.length > 0 && (
                        <div>
                            <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
                                3. Danh mục mặt hàng cam kết ({hd.lines.length} sản phẩm)
                            </Text>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                                        <th style={{ padding: '8px' }}>Sản phẩm</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>Đơn giá cam kết</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>SL cam kết</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>MOQ</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>Đã nhập</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>VAT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hd.lines.map((line, idx) => (
                                        <tr key={line.id || idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '8px' }}>
                                                <div><strong>{line.tenSanPham || line.idSanPham}</strong></div>
                                                {line.sku && <Text type="secondary" style={{ fontSize: 12 }}>SKU: {line.sku}</Text>}
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                                                {formatVND(Number(line.donGiaCamKet))}
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>
                                                {line.soLuongCamKet || '—'}
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>
                                                {line.moq ?? 1}
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>
                                                <Text type={line.soLuongDaNhap ? "success" : "secondary"}>
                                                    {line.soLuongDaNhap ?? 0}
                                                </Text>
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                {line.vatPhantram ?? 8}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

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