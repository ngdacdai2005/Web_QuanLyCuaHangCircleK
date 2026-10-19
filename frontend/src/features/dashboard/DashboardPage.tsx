import type { FC } from 'react';
import { Card, Col, Progress, Row, Segmented, Space, Typography } from 'antd';
import { ChartCard } from '@/components/ChartCard';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { OrderDetailDrawer } from '@/features/salesOrders/components/OrderDetailDrawer';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTimeRange } from '@/store/slices/uiSlice';
import { setSelectedOrder } from '@/store/slices/salesOrderSlice';
import { SYSTEM_WIDE_ROLES, type TimeRange } from '@/types';
import { formatVNDCompact } from '@/utils/formatters';
import {
  BranchRevenueChart,
  CategoryRevenueChart,
  RevenueTrendChart,
} from './components/DashboardCharts';
import { useDashboardData } from './hooks/useDashboardData';
import { TopSellingSection } from './components/TopSellingSection';
import { InventoryAlertsSection } from './components/InventoryAlertsSection';
import { RecentOrdersSection } from './components/RecentOrdersSection';
import './DashboardPage.css';

const { Text } = Typography;

/**
 * Module 1 — Tổng quan (Dashboard) (Refactored).
 *
 * Toàn bộ logic tính toán và nạp dữ liệu được quản lý tập trung qua useDashboardData.
 */
export const DashboardPage: FC = () => {
  const dispatch = useAppDispatch();
  const { activeBranchId, user } = useAppSelector((state) => state.auth);
  const { timeRange } = useAppSelector((state) => state.ui);
  const selectedOrderId = useAppSelector(
    (state) => state.salesOrder.selectedOrderId,
  );

  const isSystemWide = user !== null && SYSTEM_WIDE_ROLES.includes(user.role);

  const {
    kpiCards,
    secondaryCards,
    trendData,
    branchData,
    categoryData,
    topSelling,
    alerts,
    latestOrders,
    metrics,
    branchNameById,
    compareLabel,
  } = useDashboardData();

  return (
    <>
      <PageHeader
        eyebrow="TỔNG QUAN HỆ THỐNG / MODULE 1"
        title="Bảng điều khiển kinh doanh"
        description={`${branchNameById(activeBranchId)} · ${compareLabel}`}
        extra={
          <Segmented<TimeRange>
            value={timeRange}
            onChange={(val) => dispatch(setTimeRange(val))}
            options={[
              { label: 'Hôm nay', value: 'today' },
              { label: '7 ngày', value: '7days' },
              { label: '30 ngày', value: '30days' },
              { label: 'Tháng này', value: 'thisMonth' },
            ]}
          />
        }
      />

      {/* 4 Thẻ KPI chính */}
      <Row gutter={[16, 16]}>
        {kpiCards.map((card) => (
          <Col xs={24} sm={12} xl={6} key={card.id}>
            <StatCard data={card} />
          </Col>
        ))}
      </Row>

      {/* 3 Thẻ KPI phụ */}
      <Row gutter={[16, 16]}>
        {secondaryCards.map((card) => (
          <Col xs={24} sm={12} xl={8} key={card.id}>
            <StatCard data={card} />
          </Col>
        ))}
      </Row>

      {/* Biểu đồ xu hướng và Cơ cấu danh mục */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <ChartCard
            title="Xu hướng doanh thu & đơn hàng"
            description="Doanh thu thực tế theo từng ngày trong kỳ"
            height={318}
          >
            <RevenueTrendChart data={trendData} compareLabel="Kỳ trước" />
          </ChartCard>
        </Col>
        <Col xs={24} xl={8}>
          <ChartCard
            title="Tỷ trọng theo danh mục"
            description="Cơ cấu doanh thu các nhóm hàng"
            height={318}
          >
            {categoryData.length > 0 ? (
              <CategoryRevenueChart data={categoryData} />
            ) : (
              <EmptyState title="Chưa có doanh thu trong kỳ" />
            )}
          </ChartCard>
        </Col>
      </Row>

      {/* Bảng xếp hạng chi nhánh chỉ mở cho Admin chuỗi */}
      {isSystemWide && (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <ChartCard
              title="Doanh thu & lợi nhuận theo chi nhánh"
              description="So sánh hiệu quả các cửa hàng trong chuỗi"
              height={330}
            >
              <BranchRevenueChart data={branchData} />
            </ChartCard>
          </Col>
          <Col xs={24} xl={10}>
            <Card
              title="Mức hoàn thành mục tiêu"
              styles={{ body: { padding: '12px 18px 18px' } }}
            >
              <Space direction="vertical" size={14} className="dash-list-full">
                {branchData.map((branch) => (
                  <div key={branch.branchId}>
                    <div className="dash-progress-row">
                      <Text className="dash-branch-name">{branch.shortName}</Text>
                      <Text type="secondary" className="dash-branch-revenue">
                        {formatVNDCompact(branch.revenue)}
                      </Text>
                    </div>
                    <Progress
                      percent={Math.min(100, Math.round(branch.targetAchievedPercent))}
                      size="small"
                      strokeColor={
                        branch.targetAchievedPercent >= 100
                          ? BRAND.success
                          : branch.targetAchievedPercent >= 70
                            ? BRAND.accentYellow
                            : BRAND.primaryRed
                      }
                    />
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* Top bán chạy và Cảnh báo tồn kho */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <TopSellingSection topSelling={topSelling} />
        </Col>
        <Col xs={24} xl={9}>
          <InventoryAlertsSection alerts={alerts} lowStockCount={metrics.lowStockCount} />
        </Col>
      </Row>

      {/* Giao dịch POS gần nhất */}
      <RecentOrdersSection
        orders={latestOrders}
        isSystemWide={isSystemWide}
        activeBranchId={activeBranchId}
        onSelectOrder={(id) => dispatch(setSelectedOrder(id))}
      />

      <OrderDetailDrawer
        order={latestOrders.find((order) => order.id === selectedOrderId) ?? null}
      />
    </>
  );
};
