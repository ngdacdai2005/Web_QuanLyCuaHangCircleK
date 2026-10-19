import { useState, type FC } from 'react';
import { Card, Segmented, Select, Space, Tabs } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip } from '@/components/SummaryStrip';
import { useAppSelector } from '@/store/hooks';
import {
  SHRINKAGE_REASON_LABEL,
  TIME_RANGE_LABEL,
  type ProfitReportRow,
  type TimeRange,
} from '@/types';
import { exportToExcel } from '@/utils/exportUtils';
import { useReportsData } from './hooks/useReportsData';
import { RevenueTab } from './components/RevenueTab';
import { ProfitTab } from './components/ProfitTab';
import { TopSellingTab } from './components/TopSellingTab';
import { ShrinkageTab } from './components/ShrinkageTab';
import './ReportsPage.css';

/**
 * Module 13 — Báo cáo quản trị (Refactored).
 *
 * Chia nhỏ thành 4 sub-tabs riêng biệt và quản lý state/tính toán qua useReportsData.
 */
export const ReportsPage: FC = () => {
  const activeBranchId = useAppSelector((state) => state.auth.activeBranchId);
  const branches = useAppSelector((state) => state.branch.branches);

  const [branchId, setBranchId] = useState<string | null>(activeBranchId);
  const [range, setRange] = useState<TimeRange>('30days');

  const {
    summary,
    branchProfit,
    categoryRevenue,
    categoryProfit,
    topSelling,
    shrinkage,
    shrinkageByReason,
    productById,
  } = useReportsData(branchId, range);

  const branchNameById = (id: string | null): string => {
    if (id === null) return 'Toàn chuỗi';
    const branch = branches.find((b) => b.id === id);
    return branch?.name ?? 'Chi nhánh';
  };

  const handleExportProfit = (rows: readonly ProfitReportRow[], name: string): void => {
    exportToExcel(
      rows,
      [
        { header: 'Đối tượng', accessor: (row) => row.dimensionName },
        { header: 'Doanh thu', accessor: (row) => row.revenue },
        { header: 'Giá vốn', accessor: (row) => row.cogs },
        { header: 'Lợi nhuận gộp', accessor: (row) => row.grossProfit },
        { header: 'Chi phí vận hành', accessor: (row) => row.operatingCost },
        { header: 'Lợi nhuận thuần', accessor: (row) => row.netProfit },
        {
          header: 'Tỷ suất thuần (%)',
          accessor: (row) => row.netMarginPercent.toFixed(2),
        },
      ],
      name,
    );
  };

  const handleExportTopSelling = (): void => {
    exportToExcel(
      topSelling,
      [
        { header: 'Xếp hạng', accessor: (row) => row.rank },
        { header: 'SKU', accessor: (row) => row.sku },
        { header: 'Sản phẩm', accessor: (row) => row.productName },
        { header: 'Danh mục', accessor: (row) => row.categoryName },
        { header: 'Số lượng bán', accessor: (row) => row.quantitySold },
        { header: 'Doanh thu', accessor: (row) => row.revenue },
        { header: 'Lãi gộp', accessor: (row) => row.grossProfit },
        { header: 'Tỷ suất lãi (%)', accessor: (row) => row.marginPercent.toFixed(2) },
        { header: 'Tồn còn lại', accessor: (row) => row.remainingStock },
      ],
      'Bao cao hang ban chay Circle K',
    );
  };

  const handleExportShrinkage = (): void => {
    exportToExcel(
      shrinkage,
      [
        { header: 'Ngày', accessor: (row) => row.occurredAt },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        { header: 'SKU', accessor: (row) => row.sku },
        { header: 'Sản phẩm', accessor: (row) => row.productName },
        { header: 'Danh mục', accessor: (row) => row.categoryName },
        { header: 'Nguyên nhân', accessor: (row) => SHRINKAGE_REASON_LABEL[row.reason] },
        { header: 'Số lượng', accessor: (row) => row.quantity },
        { header: 'Giá vốn', accessor: (row) => row.unitCost },
        { header: 'Giá trị tổn thất', accessor: (row) => row.lossValue },
        {
          header: 'Tỷ lệ hao hụt (%)',
          accessor: (row) => row.shrinkageRatePercent.toFixed(2),
        },
      ],
      'Bao cao hao hut huy hang Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="TÀI CHÍNH & BÁO CÁO / MODULE 13"
        title="Báo cáo quản trị"
        description={`${branchNameById(branchId)} · ${TIME_RANGE_LABEL[range]}`}
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="Toàn chuỗi"
              value={branchId}
              className="report-branch-select"
              options={branches.map((branch) => ({
                value: branch.id,
                label: branch.name,
              }))}
              onChange={(value: string | undefined) => setBranchId(value ?? null)}
            />
            <Segmented<TimeRange>
              value={range}
              onChange={setRange}
              options={[
                { label: 'Hôm nay', value: 'today' },
                { label: '7 ngày', value: '7days' },
                { label: '30 ngày', value: '30days' },
                { label: 'Tháng này', value: 'thisMonth' },
              ]}
            />
          </Space>
        }
      />

      <SummaryStrip items={summary} />

      <Card size="small" className="report-tab-card">
        <Tabs
          defaultActiveKey="revenue"
          items={[
            {
              key: 'revenue',
              label: 'Báo cáo doanh thu',
              children: (
                <RevenueTab
                  branchProfit={branchProfit}
                  categoryRevenue={categoryRevenue}
                />
              ),
            },
            {
              key: 'profit',
              label: 'Báo cáo lợi nhuận',
              children: (
                <ProfitTab
                  branchProfit={branchProfit}
                  categoryProfit={categoryProfit}
                  onExport={handleExportProfit}
                />
              ),
            },
            {
              key: 'topselling',
              label: 'Hàng bán chạy',
              children: (
                <TopSellingTab
                  topSelling={topSelling}
                  productById={productById}
                  onExport={handleExportTopSelling}
                />
              ),
            },
            {
              key: 'shrinkage',
              label: 'Hao hụt & huỷ hàng',
              children: (
                <ShrinkageTab
                  shrinkage={shrinkage}
                  shrinkageByReason={shrinkageByReason}
                  onExport={handleExportShrinkage}
                />
              ),
            },
          ]}
        />
      </Card>
    </>
  );
};
