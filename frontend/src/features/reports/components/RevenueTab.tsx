import type { FC } from 'react';
import { Col, Row } from 'antd';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  type PieLabelRenderProps,
} from 'recharts';
import { ChartCard } from '@/components/ChartCard';
import { EmptyState } from '@/components/EmptyState';
import { BRAND } from '@/config/brand';
import { formatVND, formatVNDCompact } from '@/utils/formatters';
import type { ProfitReportRow } from '@/types';
import type { CategoryRevenueData } from '../types';

const AXIS_STYLE = { fontSize: 11, fill: BRAND.textSecondary } as const;
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (typeof percent !== 'number' || percent < 0.05) return null;
  const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
  const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
  const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface RevenueTabProps {
  branchProfit: ProfitReportRow[];
  categoryRevenue: CategoryRevenueData[];
}

export const RevenueTab: FC<RevenueTabProps> = ({ branchProfit, categoryRevenue }) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={14}>
        <ChartCard
          title="Doanh thu theo chi nhánh"
          description="So sánh doanh thu bán lẻ thực tế phát sinh trong kỳ"
          height={340}
        >
          {branchProfit.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu hoá đơn trong kỳ" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={branchProfit}
                margin={{ top: 12, right: 16, left: 16, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="dimensionName"
                  tick={AXIS_STYLE}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  tick={AXIS_STYLE}
                  tickFormatter={(val: number) => formatVNDCompact(val)}
                  width={65}
                />
                <ChartTooltip
                  formatter={(val: any) => [formatVND(Number(val)), 'Doanh thu']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar
                  dataKey="revenue"
                  name="Doanh thu"
                  fill={BRAND.primaryRed}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Col>

      <Col xs={24} xl={10}>
        <ChartCard
          title="Cơ cấu doanh thu theo nhóm hàng"
          description="Tỷ trọng doanh thu theo danh mục sản phẩm"
          height={340}
        >
          {categoryRevenue.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu ngành hàng" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryRevenue as any[]}
                  dataKey="revenue"
                  nameKey="categoryName"
                  innerRadius="48%"
                  outerRadius="78%"
                  paddingAngle={2}
                  label={renderCustomizedLabel}
                  labelLine={false}
                >
                  {categoryRevenue.map((slice) => (
                    <Cell key={slice.categoryId} fill={slice.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  formatter={(value: any, name: any, item: any) => [
                    `${formatVND(Number(value))} (${(item?.payload?.percentage ?? (Number(item?.payload?.percent ?? 0) * 100)).toFixed(1)}%)`,
                    name,
                  ]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11.5, lineHeight: '20px', paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Col>
    </Row>
  );
};
