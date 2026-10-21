import { useState, useEffect, type FC } from 'react';
import {
  Modal,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  message,
  Popconfirm,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ClockCircleOutlined } from '@ant-design/icons';
import { formatVND } from '@/utils/formatters';
import { phienThuNganApi, type PhienThuNganRecord } from '@/api/phienThuNgan';
import dayjs from 'dayjs';

interface ShiftHistoryModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: string;
  currentUserId?: string;
  currentEmployeeId?: string;
  isManager?: boolean;
  onTakeover?: (shift: PhienThuNganRecord) => void;
  onOpenDetail?: (shift: PhienThuNganRecord) => void;
}

export const ShiftHistoryModal: FC<ShiftHistoryModalProps> = ({
  open,
  onClose,
  branchId,
  currentUserId: _currentUserId,
  currentEmployeeId,
  isManager = false,
  onTakeover,
  onOpenDetail: _onOpenDetail,
}) => {
  const [data, setData] = useState<PhienThuNganRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, branchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await phienThuNganApi.getDanhSachPhien(branchId);
      setData(res);
    } catch (err: any) {
      message.error(err.message || 'Không thể tải lịch sử ca thu ngân');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmHandover = async (shiftId: string) => {
    try {
      await phienThuNganApi.xacNhanNhanBanGiao(shiftId);
      message.success('Đã xác nhận nhận bàn giao ca thành công!');
      loadData();
    } catch (err: any) {
      message.error(err.message || 'Xác nhận thất bại');
    }
  };

  const columns: ColumnsType<PhienThuNganRecord> = [
    {
      title: 'Mã phiên & Quầy',
      key: 'maPhien',
      width: 170,
      render: (_, r) => (
        <div>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{r.maPhien}</span>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.quaySo}</div>
        </div>
      ),
    },
    {
      title: 'Thu ngân',
      dataIndex: 'tenThuNgan',
      key: 'tenThuNgan',
      width: 150,
      render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>,
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 160,
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <div>Mở: {dayjs(r.gioMoCa).format('DD/MM HH:mm')}</div>
          {r.gioDongCa && <div>Đóng: {dayjs(r.gioDongCa).format('DD/MM HH:mm')}</div>}
        </div>
      ),
    },
    {
      title: 'Quỹ đầu ca',
      dataIndex: 'quyDauCaThucTe',
      key: 'quyDauCaThucTe',
      align: 'right',
      width: 120,
      render: (val) => formatVND(val || 0),
    },
    {
      title: 'Tiền thực đếm',
      dataIndex: 'tienThucDemCuoiCa',
      key: 'tienThucDemCuoiCa',
      align: 'right',
      width: 130,
      render: (val) => (val != null ? formatVND(val) : '—'),
    },
    {
      title: 'Chênh lệch',
      key: 'diff',
      align: 'right',
      width: 130,
      render: (_, r) => {
        if (r.lechCuoiCa == null) return <span style={{ color: '#94a3b8' }}>Đang mở</span>;
        if (r.lechCuoiCa === 0) {
          return <Tag color="green">Khớp 0đ</Tag>;
        }
        if (r.lechCuoiCa < 0) {
          return <Tag color="red">Thiếu {formatVND(Math.abs(r.lechCuoiCa))}</Tag>;
        }
        return <Tag color="gold">Thừa +{formatVND(r.lechCuoiCa)}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, r) => {
        if (r.trangThai === 'DANG_MO') {
          return <Badge status="processing" text="Đang mở quầy" />;
        }
        if (r.trangThai === 'CHO_BAN_GIAO') {
          return <Badge status="warning" text="Chờ bàn giao" />;
        }
        if (r.trangThai === 'DA_BAN_GIAO') {
          return <Badge status="default" text="Đã bàn giao" />;
        }
        return <Badge status="success" text="Đã chốt & bàn giao" />;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, r) => {
        // Có thể tiếp quản/nhận ca nếu ca đang ở CHO_BAN_GIAO hoặc DA_BAN_GIAO và chưa hoàn tất đóng (xacNhanBanGiao chưa true)
        const isPending =
          (r.trangThai === 'DA_BAN_GIAO' || r.trangThai === 'CHO_BAN_GIAO') &&
          !r.xacNhanBanGiao;

        if (!isPending) return null;

        // 1. Tuyệt đối không cho người giao tự tiếp quản ca của chính mình
        if (currentEmployeeId && r.idThuNgan === currentEmployeeId) {
          return (
            <Tag color="orange" style={{ fontStyle: 'italic', fontSize: 11 }}>
              Ca của bạn ({r.trangThai === 'CHO_BAN_GIAO' ? 'Chờ bàn giao' : 'Đang chờ ca sau'})
            </Tag>
          );
        }

        // 2. Nếu ca được bàn giao đích danh cho người khác và người đang xem không phải Quản lý
        const isDesignatedToOther =
          Boolean(r.idNguoiNhanBanGiao &&
          currentEmployeeId &&
          r.idNguoiNhanBanGiao !== currentEmployeeId &&
          !isManager);

        if (isDesignatedToOther) {
          return (
            <Tag color="default" style={{ fontStyle: 'italic', fontSize: 11 }}>
              Bàn giao cho {r.tenNguoiNhanBanGiao || 'nhân viên khác'}
            </Tag>
          );
        }

        return (
          <Space>
            {onTakeover ? (
              <Button
                size="small"
                type="primary"
                style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}
                onClick={() => {
                  onClose();
                  onTakeover(r);
                }}
              >
                Tiếp quản ca
              </Button>
            ) : (
              <Popconfirm
                title="Xác nhận nhận bàn giao ca này?"
                description={`Bạn xác nhận đã nhận bàn giao quỹ ${formatVND(
                  r.tienThucDemCuoiCa || 0
                )}?`}
                onConfirm={() => handleConfirmHandover(r.id)}
              >
                <Button size="small" type="primary" style={{ background: '#059669', fontWeight: 600 }}>
                  Nhận ca
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClockCircleOutlined style={{ color: '#0284c7' }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Lịch sử các phiên ca thu ngân & Đối soát quỹ tiền mặt
          </span>
        </div>
      }
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={1000}
      centered
      destroyOnHidden
    >
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          💡 Theo dõi toàn bộ lịch sử ca làm, đối soát tiền mặt ngăn kéo và tình trạng bàn giao ca.
        </Typography.Text>
        <Button size="small" onClick={loadData}>
          Làm mới
        </Button>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
        size="middle"
        bordered
      />
    </Modal>
  );
};
