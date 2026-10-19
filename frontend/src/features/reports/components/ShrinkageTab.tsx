import type { FC } from 'react';
import { Card, Col, Row, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from 'recharts';
import { ChartCard } from '@/components/ChartCard';
import { EmptyState } from '@/components/EmptyState';
import { formatNumber, formatVND } from '@/utils/formatters';
import {
  SHRINKAGE_REASON_LABEL,
  type ShrinkageReason,
  type ShrinkageReportRow,
} from '@/types';
import type { ShrinkageReasonStat } from '../types';

const SHRINKAGE_REASON_COLOR: Record<string, string> = {
  EXPIRED: 'orange',
  DAMAGED: 'volcano',
  LOST: 'red',
  OTHER: 'default',
};

const { Text } = Typography;

interface ShrinkageTabProps {
  shrinkage: ShrinkageReportRow[];
  shrinkageByReason: ShrinkageReasonStat[];
  onExport: () => void;
}

export const ShrinkageTab: FC<ShrinkageTabProps> = ({
  shrinkage,
  shrinkageByReason,
  onExport,
}) => {
  const totalLoss = shrinkage.reduce((s, r) => s + r.lossValue, 0);

  const shrinkageColumns: ColumnsType<ShrinkageReportRow> = [
    {
      title: 'Thời gian',
      dataIndex: 'occurredAt',
      width: 110,
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 170,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      width: 260,
      render: (name: string, row) => (
        <span className="report-product-info">
          <Text strong>{name}</Text>
          <Text type="secondary" className="report-product-sub">
            <span className="mono-code">{row.sku}</span> · {row.categoryName}
          </Text>
        </span>
      ),
    },
    {
      title: 'Nguyên nhân',
      dataIndex: 'reason',
      width: 130,
      render: (reason: ShrinkageReason) => (
        <Tag color={SHRINKAGE_REASON_COLOR[reason]}>
          {SHRINKAGE_REASON_LABEL[reason]}
        </Tag>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      align: 'right',
      width: 100,
      render: (val: number) => (
        <span className="numeric-cell">{formatNumber(val)}</span>
      ),
    },
    {
      title: 'Đơn giá vốn',
      dataIndex: 'unitCost',
      align: 'right',
      width: 120,
      render: (val: number) => (
        <span className="numeric-cell">{formatVND(val)}</span>
      ),
    },
    {
      title: 'Giá trị tổn thất',
      dataIndex: 'lossValue',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.lossValue - b.lossValue,
      render: (val: number) => (
        <Text strong className="numeric-cell report-loss">
          {formatVND(val)}
        </Text>
      ),
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={9}>
        <ChartCard
          title="Tổn thất theo nguyên nhân"
          description={`Tổng tổn thất: ${formatVND(totalLoss)}`}
          height={320}
        >
          {shrinkageByReason.length === 0 ? (
            <EmptyState title="Không có hao hụt được ghi nhận" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={shrinkageByReason as any[]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="48%"
                  outerRadius="75%"
                  paddingAngle={2}
                >
                  {shrinkageByReason.map((slice) => (
                    <Cell key={slice.reason} fill={slice.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  formatter={(value: number | string) => formatVND(Number(value))}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11.5, lineHeight: '18px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Col>

      <Col xs={24} xl={15}>
        <Card
          size="small"
          title={`Chi tiết hao hụt (${shrinkage.length} dòng)`}
          extra={
            <Text className="export-link" onClick={onExport}>
              Xuất Excel
            </Text>
          }
        >
          {shrinkage.length === 0 ? (
            <EmptyState title="Không có hao hụt được ghi nhận" />
          ) : (
            <Table<ShrinkageReportRow>
              columns={shrinkageColumns}
              dataSource={shrinkage}
              rowKey="id"
              size="small"
              scroll={{ x: 1300 }}
              className="dense-table"
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
};
