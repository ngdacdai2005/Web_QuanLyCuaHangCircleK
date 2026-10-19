import type { FC } from 'react';
import { Card, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { OrderStatusTag } from '@/components/StatusTag';
import { PAYMENT_METHOD_LABEL, type SalesOrder } from '@/types';
import { formatVND } from '@/utils/formatters';
import { formatTime } from '@/utils/dateUtils';

const { Text } = Typography;

interface RecentOrdersSectionProps {
  orders: SalesOrder[];
  isSystemWide: boolean;
  activeBranchId: string | null;
  onSelectOrder: (orderId: string) => void;
}

export const RecentOrdersSection: FC<RecentOrdersSectionProps> = ({
  orders,
  isSystemWide,
  activeBranchId,
  onSelectOrder,
}) => {
  const orderColumns: ColumnsType<SalesOrder> = [
    {
      title: 'Mã hoá đơn',
      dataIndex: 'orderNumber',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      width: 90,
      render: (value: string) => formatTime(value),
    },
    ...(isSystemWide && activeBranchId === null
      ? [
          {
            title: 'Chi nhánh',
            dataIndex: 'branchName',
            render: (value: string) => (
              <Text className="dash-text-12-5">{value.replace('Circle K ', '')}</Text>
            ),
          },
        ]
      : []),
    {
      title: 'Thanh toán',
      dataIndex: 'paymentMethod',
      width: 130,
      render: (method: SalesOrder['paymentMethod']) => (
        <Tag color="blue" className="tag-no-margin">
          {PAYMENT_METHOD_LABEL[method] || method}
        </Tag>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <Text strong className="numeric-cell total-red">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 110,
      render: (status: SalesOrder['status']) => <OrderStatusTag status={status} />,
    },
  ];

  return (
    <Card title="Giao dịch POS gần nhất" styles={{ body: { padding: '0 4px 8px' } }}>
      <Table<SalesOrder>
        columns={orderColumns}
        dataSource={orders}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 860 }}
        className="dense-table"
        onRow={(record) => ({
          onClick: () => onSelectOrder(record.id),
          style: { cursor: 'pointer' },
        })}
      />
    </Card>
  );
};
