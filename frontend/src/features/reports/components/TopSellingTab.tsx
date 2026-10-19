import type { FC } from 'react';
import { Card, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EmptyState } from '@/components/EmptyState';
import { ProductThumb } from '@/components/ProductThumb';
import { formatNumber, formatRatio, formatVND } from '@/utils/formatters';
import type { TopSellingRow } from '@/types';

const { Text } = Typography;

interface TopSellingTabProps {
  topSelling: TopSellingRow[];
  productById: (id: string) => any;
  onExport: () => void;
}

export const TopSellingTab: FC<TopSellingTabProps> = ({ topSelling, productById, onExport }) => {
  const topSellingColumns: ColumnsType<TopSellingRow> = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 50,
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
      width: 320,
      render: (name: string, row) => {
        const product = productById(row.id);
        return (
          <Space size={10}>
            <ProductThumb
              categoryId={product?.categoryId ?? ''}
              size={36}
              productName={name}
            />
            <span className="report-product-info">
              <Text strong className="report-product-name">
                {name}
              </Text>
              <Text type="secondary" className="report-product-sub">
                <span className="mono-code">{row.sku}</span> · {row.categoryName}
              </Text>
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Số lượng bán',
      dataIndex: 'quantitySold',
      align: 'right',
      width: 130,
      sorter: (a, b) => a.quantitySold - b.quantitySold,
      render: (value: number) => (
        <span className="numeric-cell">{formatNumber(value)}</span>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.revenue - b.revenue,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Lãi gộp',
      dataIndex: 'grossProfit',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.grossProfit - b.grossProfit,
      render: (value: number) => (
        <Text strong className="numeric-cell report-profit">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Biên lãi',
      dataIndex: 'marginPercent',
      align: 'right',
      width: 110,
      render: (value: number) => (
        <Text className="report-margin-positive">
          {formatRatio(value, 1)}
        </Text>
      ),
    },
    {
      title: 'Tồn hiện tại',
      dataIndex: 'remainingStock',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <span className="numeric-cell">{formatNumber(value)}</span>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title={`Top ${topSelling.length} sản phẩm bán chạy nhất`}
      extra={
        <Text className="export-link" onClick={onExport}>
          Xuất Excel
        </Text>
      }
    >
      {topSelling.length === 0 ? (
        <EmptyState title="Chưa có giao dịch trong kỳ" />
      ) : (
        <Table<TopSellingRow>
          columns={topSellingColumns}
          dataSource={topSelling}
          rowKey="id"
          size="small"
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      )}
    </Card>
  );
};
