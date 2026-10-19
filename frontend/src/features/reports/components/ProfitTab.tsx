import type { FC } from 'react';
import { Card, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EmptyState } from '@/components/EmptyState';
import { formatRatio, formatVND } from '@/utils/formatters';
import type { ProfitReportRow } from '@/types';

const { Text } = Typography;

interface ProfitTabProps {
  branchProfit: ProfitReportRow[];
  categoryProfit: ProfitReportRow[];
  onExport: (data: ProfitReportRow[], filename: string) => void;
}

export const ProfitTab: FC<ProfitTabProps> = ({ branchProfit, categoryProfit, onExport }) => {
  const profitColumns: ColumnsType<ProfitReportRow> = [
    {
      title: 'Đối tượng',
      dataIndex: 'dimensionName',
      width: 240,
      render: (value: string) => (
        <Text strong className="report-dimension">
          {value}
        </Text>
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
      title: 'Giá vốn (COGS)',
      dataIndex: 'cogs',
      align: 'right',
      width: 150,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Lợi nhuận gộp',
      dataIndex: 'grossProfit',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.grossProfit - b.grossProfit,
      render: (value: number) => (
        <Text strong className="numeric-cell report-profit">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Chi phí vận hành',
      dataIndex: 'operatingCost',
      align: 'right',
      width: 150,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell report-opcost">
            {formatVND(value)}
          </span>
        ),
    },
    {
      title: 'Lợi nhuận thuần',
      dataIndex: 'netProfit',
      align: 'right',
      width: 160,
      sorter: (a, b) => a.netProfit - b.netProfit,
      render: (value: number) => (
        <Text
          strong
          className={`numeric-cell ${value >= 0 ? 'report-net-positive' : 'report-net-negative'}`}
        >
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Tỷ suất thuần',
      dataIndex: 'netMarginPercent',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <Text
          className={value >= 0 ? 'report-margin-positive' : 'report-margin-negative'}
        >
          {formatRatio(value, 1)}
        </Text>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} className="report-stack-full">
      <Card
        size="small"
        title="Lợi nhuận theo chi nhánh"
        extra={
          <Text
            className="export-link"
            onClick={() => onExport(branchProfit, 'Bao cao loi nhuan theo chi nhanh')}
          >
            Xuất Excel
          </Text>
        }
      >
        <Table<ProfitReportRow>
          columns={profitColumns}
          dataSource={branchProfit}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Card
        size="small"
        title="Lợi nhuận theo danh mục hàng hoá"
        extra={
          <Text
            className="export-link"
            onClick={() => onExport(categoryProfit, 'Bao cao loi nhuan theo danh muc')}
          >
            Xuất Excel
          </Text>
        }
      >
        {categoryProfit.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu trong kỳ" />
        ) : (
          <Table<ProfitReportRow>
            columns={profitColumns}
            dataSource={categoryProfit}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>
    </Space>
  );
};
