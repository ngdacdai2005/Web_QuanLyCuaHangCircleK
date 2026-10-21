import { useState, useEffect, type FC } from 'react';
import {
  Modal,
  Table,
  Tag,
  Button,
  Space,
  Radio,
  Input,
  message,
  Popconfirm,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  PlusOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { donNghiPhepApi } from '@/api/donNghiPhep';
import {
  LEAVE_TYPE_LABEL,
  LEAVE_STATUS_LABEL,
  type LeaveRequestRecord,
} from '@/types/employeeTypes';
import { formatDate } from '@/utils/dateUtils';

interface LeaveApprovalModalProps {
  open: boolean;
  onClose: () => void;
  isManager?: boolean;
  onUpdated?: () => void;
  branchId?: string | null;
  onOpenCreateModal?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  ANNUAL: 'blue',
  UNPAID: 'default',
  SICK: 'orange',
  PERSONAL: 'purple',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
};

export const LeaveApprovalModal: FC<LeaveApprovalModalProps> = ({
  open,
  onClose,
  isManager = false,
  onUpdated,
  branchId,
  onOpenCreateModal,
}) => {
  const [data, setData] = useState<LeaveRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      let list: LeaveRequestRecord[] = [];
      if (isManager) {
        list = await donNghiPhepApi.getAll({
          idChiNhanh: branchId || undefined,
        });
      } else {
        list = await donNghiPhepApi.getMyRequests();
      }
      setData(list);
    } catch (err: any) {
      message.error(err.message || 'Không thể tải danh sách đơn nghỉ phép');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, isManager, branchId]);

  const handleApprove = async (record: LeaveRequestRecord) => {
    try {
      setActionLoadingId(record.id);
      await donNghiPhepApi.approve(record.id);
      message.success(`Đã phê duyệt đơn nghỉ phép của ${record.tenNhanVien || 'nhân viên'}. Lịch làm việc đã được cập nhật thành NGHỈ CÓ PHÉP.`);
      await loadData();
      onUpdated?.();
    } catch (err: any) {
      message.error(err.message || 'Không thể phê duyệt đơn');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (record: LeaveRequestRecord) => {
    try {
      setActionLoadingId(record.id);
      await donNghiPhepApi.reject(record.id, rejectReason);
      message.info(`Đã từ chối đơn nghỉ phép của ${record.tenNhanVien || 'nhân viên'}.`);
      setRejectReason('');
      await loadData();
      onUpdated?.();
    } catch (err: any) {
      message.error(err.message || 'Không thể từ chối đơn');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredData = data.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.trangThai === statusFilter;
  });

  const columns: ColumnsType<LeaveRequestRecord> = [
    ...(isManager
      ? [
          {
            title: 'Nhân viên',
            dataIndex: 'tenNhanVien',
            key: 'tenNhanVien',
            width: 170,
            render: (text: string, record: LeaveRequestRecord) => (
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  <UserOutlined style={{ marginRight: 6, color: '#64748b' }} />
                  {text || 'Nhân viên'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {record.maNhanVien || '---'} {record.tenChiNhanh ? `• ${record.tenChiNhanh}` : ''}
                </div>
              </div>
            ),
          },
        ]
      : []),
    {
      title: 'Loại nghỉ',
      dataIndex: 'loaiNghi',
      key: 'loaiNghi',
      width: 140,
      render: (type) => (
        <Tag color={TYPE_COLORS[type] || 'default'} style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}>
          {LEAVE_TYPE_LABEL[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Thời gian nghỉ',
      key: 'thoiGian',
      width: 190,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            <CalendarOutlined style={{ marginRight: 6, color: '#0284c7' }} />
            {formatDate(record.tuNgay)} → {formatDate(record.denNgay)}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Tổng số: <strong style={{ color: '#0284c7' }}>{record.soNgayNghi}</strong> ngày
          </div>
        </div>
      ),
    },
    {
      title: 'Lý do xin nghỉ',
      dataIndex: 'lyDo',
      key: 'lyDo',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ color: '#334155' }}>{text || '(Không ghi lý do)'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái & Phản hồi',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 220,
      render: (status, record) => (
        <div>
          <Tag color={STATUS_COLORS[status] || 'default'} style={{ borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>
            {LEAVE_STATUS_LABEL[status] || status}
          </Tag>

          {status === 'APPROVED' && (
            <div style={{ fontSize: 12, color: '#15803d', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircleOutlined />
              <span>
                Đã duyệt{record.tenNguoiDuyet ? ` bởi ${record.tenNguoiDuyet}` : ''}
                {record.ngayDuyet ? ` (${formatDate(record.ngayDuyet)})` : ''}
              </span>
            </div>
          )}

          {status === 'REJECTED' && (
            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4, background: '#fef2f2', padding: '4px 8px', borderRadius: 6, border: '1px solid #fee2e2' }}>
              <strong>Lý do từ chối:</strong> {record.lyDoTuChoi || 'Không có lý do cụ thể'}
            </div>
          )}

          {status === 'PENDING' && (
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ClockCircleOutlined />
              <span>Đang chờ Quản lý phê duyệt</span>
            </div>
          )}
        </div>
      ),
    },
    ...(isManager
      ? [
          {
            title: 'Hành động',
            key: 'action',
            width: 160,
            render: (_: any, record: LeaveRequestRecord) => {
              if (record.trangThai !== 'PENDING') {
                return (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {record.trangThai === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                  </span>
                );
              }
              const isActionLoading = actionLoadingId === record.id;
              return (
                <Space size={6}>
                  <Popconfirm
                    title="Xác nhận duyệt đơn"
                    description={`Duyệt đơn nghỉ cho ${record.tenNhanVien || 'nhân viên'}? Lịch ca các ngày này sẽ tự động chuyển sang NGHỈ CÓ PHÉP.`}
                    onConfirm={() => handleApprove(record)}
                    okText="Duyệt"
                    cancelText="Đóng"
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      loading={isActionLoading}
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                    >
                      Duyệt
                    </Button>
                  </Popconfirm>

                  <Popconfirm
                    title="Từ chối đơn xin nghỉ"
                    description={
                      <div style={{ width: 220, marginTop: 8 }}>
                        <div style={{ fontSize: 12, marginBottom: 4, color: '#64748b' }}>Nhập lý do từ chối:</div>
                        <Input.TextArea
                          rows={2}
                          placeholder="Ví dụ: Thiếu nhân sự trực ca..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                      </div>
                    }
                    onConfirm={() => handleReject(record)}
                    okText="Từ chối"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<CloseCircleOutlined />}
                      loading={isActionLoading}
                    >
                      Từ chối
                    </Button>
                  </Popconfirm>
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  const pendingCount = data.filter((d) => d.trangThai === 'PENDING').length;
  const approvedCount = data.filter((d) => d.trangThai === 'APPROVED').length;
  const rejectedCount = data.filter((d) => d.trangThai === 'REJECTED').length;

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            {isManager ? 'Quản lý duyệt đơn nghỉ phép' : 'Lịch sử & Danh sách đơn xin nghỉ phép của bạn'}
          </span>
          <Space>
            {onOpenCreateModal && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  onClose();
                  onOpenCreateModal();
                }}
                style={{ fontWeight: 600, background: '#e11d48', borderColor: '#e11d48' }}
              >
                + Nộp đơn nghỉ phép
              </Button>
            )}
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              Làm mới
            </Button>
          </Space>
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
      width={920}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Radio.Group
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="ALL">Tất cả ({data.length})</Radio.Button>
          <Radio.Button value="PENDING">
            Chờ duyệt {pendingCount > 0 && <Tag color="warning" style={{ marginLeft: 4, borderRadius: 10 }}>{pendingCount}</Tag>}
          </Radio.Button>
          <Radio.Button value="APPROVED">
            Đã duyệt {approvedCount > 0 && <Tag color="success" style={{ marginLeft: 4, borderRadius: 10 }}>{approvedCount}</Tag>}
          </Radio.Button>
          <Radio.Button value="REJECTED">
            Bị từ chối {rejectedCount > 0 && <Tag color="error" style={{ marginLeft: 4, borderRadius: 10 }}>{rejectedCount}</Tag>}
          </Radio.Button>
        </Radio.Group>

        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {isManager
            ? '💡 Duyệt đơn sẽ tự động cập nhật trạng thái lịch làm việc sang "Nghỉ có phép".'
            : '💡 Xem chi tiết tiến độ phê duyệt hoặc lý do từ chối (nếu có).'}
        </Typography.Text>
      </div>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 6, showTotal: (total) => `Tổng cộng ${total} đơn` }}
        size="middle"
        bordered
      />
    </Modal>
  );
};
