import type { ShrinkageReason } from '@/types';

export interface CategoryRevenueData {
  categoryId: string;
  categoryName: string;
  revenue: number;
  percentage: number;
  color: string;
}

export interface DashboardMetricsData {
  revenue: number;
  previousRevenue: number;
  orderCount: number;
  previousOrderCount: number;
  averageOrderValue: number;
  previousAverageOrderValue: number;
  grossProfit: number;
  previousGrossProfit: number;
  itemsSold: number;
  stockValue: number;
  lowStockCount: number;
}

export interface ShrinkageReasonStat {
  reason: ShrinkageReason;
  name: string;
  value: number;
  color: string;
}
