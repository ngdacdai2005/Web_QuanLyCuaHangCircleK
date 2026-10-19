import type { FC } from 'react';
import { Card, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatNumber, formatRatio, formatVND } from '@/utils/formatters';
import type { TopSellingRow } from '@/types';

const { Text } = Typography;

interface TopSellingSectionProps {
  topSelling: TopSellingRow[];
}

export const TopSellingSection: FC<TopSellingSectionProps> = ({ topSelling }) => {
  const topSellingColumns: ColumnsType<TopSellingRow> = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 44,
      align: 'center',
      render: (rank: number) => (
        <Text strong className={rank <= 3 ? 'rank-top' : undefined}>
          {rank}
        </Text>
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      render: (name: string, row) => (
        <span className="dash-product-name-stack">
          <Text strong className="dash-text-12-5" ellipsis>
            {name}
          </Text>
          <Text type="secondary" className="dash-product-sub">
            <span className="mono-code">{row.sku}</span> · {row.categoryName}
          </Text>
        </span>
      ),
    },
    {
      title: 'SL bán',
      dataIndex: 'quantitySold',
      align: 'right',
      width: 90,
      render: (val: number) => <span className="numeric-cell">{formatNumber(val)}</span>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      align: 'right',
      width: 125,
      render: (val: number) => <span className="numeric-cell">{formatVND(val)}</span>,
    },
    {
      title: 'Biên lãi',
      dataIndex: 'marginPercent',
      align: 'right',
      width: 85,
      render: (val: number) => <Text className="report-margin-positive">{formatRatio(val, 1)}</Text>,
    },
  ];

  return (
    <Card title="Hàng bán chạy nhất" styles={{ body: { padding: '0 4px 8px' } }}>
      <Table<TopSellingRow>
        columns={topSellingColumns}
        dataSource={topSelling}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 720 }}
      />
    </Card>
  );
};
