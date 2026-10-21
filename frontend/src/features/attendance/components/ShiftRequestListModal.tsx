import { useState, type FC } from 'react';
import {
  Modal,
  Table,
  Tag,
  Button,
  Radio,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { formatDate } from '@/utils/dateUtils';
import dayjs from 'dayjs';

interface ShiftRequestItem {
  id: string;
  type: 'SWAP' | 'OT';
  date: string;
  fromShift?: string;
  toShift?: string;
  hours?: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver?: string;
  approvedAt?: string;
  rejectReason?: string;
}

interface ShiftRequestListModalProps {
  open: boolean;
  type: 'SWAP' | 'OT';
  onClose: () => void;
  onOpenCreateModal?: () => void;
  isManager?: boolean;
}

const MOCK_SWAP_REQUESTS: ShiftRequestItem[] = [
  {
    id: 'req-swap-1',
    type: 'SWAP',
    date: dayjs().add(2, 'day').format('YYYY-MM-DD'),
    fromShift: 'Ca sáng (06:00 - 14:00)',
    toShift: 'Ca chiều (14:00 - 22:00)',
    reason: 'Đổi ca với bạn Nguyễn Văn Hùng vì có lịch học buổi sáng',
    status: 'APPROVED',
    approver: 'Trần Văn Anh (Quản lý)',
    approvedAt: dayjs().format('YYYY-MM-DD'),
  },
];

const MOCK_OT_REQUESTS: ShiftRequestItem[] = [
  {
    id: 'req-ot-1',
    type: 'OT',
    date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    hours: 3,
    reason: 'Tăng cường quầy ca đêm đón khách đợt khuyến mãi',
    status: 'PENDING',
  },
];

export const ShiftRequestListModal: FC<ShiftRequestListModalProps> = ({
  open,
  type,
  onClose,
  onOpenCreateModal,
  isManager: _isManager = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const dataList = type === 'SWAP' ? MOCK_SWAP_REQUESTS : MOCK_OT_REQUESTS;

  const filteredData = dataList.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  const columns: ColumnsType<ShiftRequestItem> = [
    {
      title: 'Ngày làm việc',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (text) => (
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          <CalendarOutlined style={{ marginRight: 6, color: '#0284c7' }} />
          {formatDate(text)}
        </span>
      ),
    },
    ...(type === 'SWAP'
      ? [
          {
            title: 'Chi tiết đổi ca',
            key: 'shiftDetail',
            width: 220,
            render: (_: any, record: ShiftRequestItem) => (
              <div>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  Từ: <strong>{record.fromShift}</strong>
                </div>
                <div style={{ fontSize: 13, color: '#0284c7', fontWeight: 600 }}>
                  Sang: <strong>{record.toShift}</strong>
                </div>
              </div>
            ),
          },
        ]
      : [
          {
            title: 'Số giờ tăng ca',
            dataIndex: 'hours',
            key: 'hours',
            width: 150,
            render: (val: number | undefined) => (
              <Tag color="orange" style={{ fontWeight: 600, borderRadius: 10 }}>
                +{val} giờ OT
              </Tag>
            ),
          },
        ]),
    {
      title: 'Lý do đăng ký',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (text) => <span style={{ color: '#334155' }}>{text}</span>,
    },
    {
      title: 'Trạng thái & Phản hồi',
      key: 'status',
      width: 220,
      render: (_, record) => (
        <div>
          {record.status === 'APPROVED' && (
            <div>
              <Tag color="green" style={{ borderRadius: 10, fontWeight: 600 }}>Đã duyệt</Tag>
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircleOutlined />
                <span>Duyệt bởi: {record.approver}</span>
              </div>
            </div>
          )}
          {record.status === 'PENDING' && (
            <div>
              <Tag color="gold" style={{ borderRadius: 10, fontWeight: 600 }}>Chờ duyệt</Tag>
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClockCircleOutlined />
                <span>Đang chờ Quản lý duyệt</span>
              </div>
            </div>
          )}
          {record.status === 'REJECTED' && (
            <div>
              <Tag color="red" style={{ borderRadius: 10, fontWeight: 600 }}>Đã từ chối</Tag>
              <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
                Lý do: {record.rejectReason || 'Không có'}
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  const title = type === 'SWAP' ? 'Danh sách & Lịch sử yêu cầu Đổi ca' : 'Danh sách & Lịch sử đăng ký Làm thêm (OT)';
  const createBtnText = type === 'SWAP' ? '+ Gửi yêu cầu đổi ca' : '+ Đăng ký làm thêm OT';

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{title}</span>
          {onOpenCreateModal && (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                onClose();
                onOpenCreateModal();
              }}
              style={{
                fontWeight: 600,
                background: type === 'SWAP' ? '#8b5cf6' : '#f59e0b',
                borderColor: type === 'SWAP' ? '#8b5cf6' : '#f59e0b',
              }}
            >
              {createBtnText}
            </Button>
          )}
        </div>
      }
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      onCancel={onClose}
      destroyOnHidden
      centered
      width={850}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Radio.Group
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="ALL">Tất cả ({dataList.length})</Radio.Button>
          <Radio.Button value="PENDING">Chờ duyệt</Radio.Button>
          <Radio.Button value="APPROVED">Đã duyệt</Radio.Button>
          <Radio.Button value="REJECTED">Đã từ chối</Radio.Button>
        </Radio.Group>

        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          💡 Theo dõi tiến độ duyệt lịch đổi ca hoặc làm thêm OT của bạn.
        </Typography.Text>
      </div>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="middle"
        bordered
      />
    </Modal>
  );
};
