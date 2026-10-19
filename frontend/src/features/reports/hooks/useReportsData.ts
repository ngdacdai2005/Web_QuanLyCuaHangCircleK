import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { API_BASE_URL } from '@/config/api';
import { apiFetch } from '@/api/http';
import { hoaDonApi, type HoaDonDTO, type ChiTietHoaDonDTO } from '@/api/hoaDon';
import { theKhoApi, type TheKhoDTO } from '@/api/theKho';
import { BRAND, CHART_COLORS } from '@/config/brand';
import { useAppSelector } from '@/store/hooks';
import {
  SHRINKAGE_REASON_LABEL,
  type ProfitReportRow,
  type ShrinkageReason,
  type ShrinkageReportRow,
  type TimeRange,
  type TopSellingRow,
} from '@/types';
import { dayjs } from '@/utils/dateUtils';
import type { SummaryItem } from '@/components/SummaryStrip';
import { formatNumber, formatRatio, formatVND } from '@/utils/formatters';
import type { CategoryRevenueData, DashboardMetricsData, ShrinkageReasonStat } from '../types';

export const rangeToDateRange = (range: TimeRange): [string, string] => {
  const now = dayjs();
  switch (range) {
    case 'today':
      return [now.format('YYYY-MM-DD'), now.format('YYYY-MM-DD')];
    case '7days':
      return [now.subtract(6, 'day').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')];
    case '30days':
      return [now.subtract(29, 'day').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')];
    case 'thisMonth':
      return [now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')];
  }
};

const rangeLengthDays = (range: TimeRange): number => {
  switch (range) {
    case 'today': return 1;
    case '7days': return 7;
    case '30days': return 30;
    case 'thisMonth': return dayjs().date();
  }
};

const lineCost = (line: ChiTietHoaDonDTO, costByProduct: Map<string, number>): number =>
  line.donGiaVon ?? costByProduct.get(line.idSanPham) ?? 0;

export const useReportsData = (branchId: string | null, range: TimeRange) => {
  const branches = useAppSelector((state) => state.branch.branches);
  const products = useAppSelector((state) => state.product.products);
  const balances = useAppSelector((state) => state.stock.balances);
  const categories = useAppSelector((state) => state.category.categories);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [invoices, setInvoices] = useState<HoaDonDTO[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<Record<string, ChiTietHoaDonDTO[]>>({});
  const [ledger, setLedger] = useState<TheKhoDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const [hdList, ledgerList] = await Promise.all([
          hoaDonApi.getAll(),
          theKhoApi.getAll(),
        ]);
        if (cancelled) return;
        setInvoices(hdList);
        setLedger(ledgerList);

        const sorted = [...hdList]
          .sort((a, b) => (b.ngayBan ?? '').localeCompare(a.ngayBan ?? ''))
          .slice(0, 100);

        const lineMap: Record<string, ChiTietHoaDonDTO[]> = {};
        const batchSize = 10;
        for (let i = 0; i < sorted.length; i += batchSize) {
          if (cancelled) return;
          const chunk = sorted.slice(i, i + batchSize);
          await Promise.all(
            chunk.map(async (hd) => {
              try {
                const res = await apiFetch(`${API_BASE_URL}/api/chi-tiet-hoa-don/by-hoa-don/${hd.id}`);
                if (res.ok) {
                  lineMap[hd.id] = await res.json();
                }
              } catch {
                lineMap[hd.id] = [];
              }
            }),
          );
        }
        if (!cancelled) setInvoiceLines(lineMap);
      } catch {
        if (!cancelled) message.error('Lỗi tải dữ liệu báo cáo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const periodInvoices = useMemo(() => {
    const [from, to] = rangeToDateRange(range);
    return invoices.filter((hd) => {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (hd.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (branchId === null || hd.idChiNhanh === branchId)
      );
    });
  }, [invoices, range, branchId]);

  const previousPeriodInvoices = useMemo(() => {
    const days = rangeLengthDays(range);
    const now = dayjs();
    const from = now.subtract(days, 'day').format('YYYY-MM-DD');
    const to = now.subtract(1, 'day').format('YYYY-MM-DD');
    return invoices.filter((hd) => {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (hd.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (branchId === null || hd.idChiNhanh === branchId)
      );
    });
  }, [invoices, range, branchId]);

  const costByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of balances) {
      const cost = Number(b.averageCost ?? 0);
      if (cost > 0 && (!map.has(b.productId) || cost < (map.get(b.productId) ?? Infinity))) {
        map.set(b.productId, cost);
      }
    }
    return map;
  }, [balances]);

  const productStats = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number; cogs: number }>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const prev = map.get(line.idSanPham) ?? { qty: 0, revenue: 0, cogs: 0 };
        prev.qty += line.soLuong;
        prev.revenue += line.thanhTien;
        prev.cogs += line.soLuong * lineCost(line, costByProduct);
        map.set(line.idSanPham, prev);
      }
    }
    return map;
  }, [periodInvoices, invoiceLines, costByProduct]);

  const branchNameById = useCallback((id: string | null): string => {
    if (id === null) return 'Toàn chuỗi';
    const branch = branches.find((b) => b.id === id);
    return branch?.name ?? 'Chi nhánh';
  }, [branches]);

  const productById = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  const metrics = useMemo<DashboardMetricsData>(() => {
    const revenue = periodInvoices.reduce((s, hd) => s + hd.grandTotal, 0);
    const previousRevenue = previousPeriodInvoices.reduce((s, hd) => s + hd.grandTotal, 0);
    const cogs = [...productStats.values()].reduce((s, v) => s + v.cogs, 0);
    const previousCogs = previousPeriodInvoices.reduce(
      (sum, hd) => sum + (invoiceLines[hd.id] ?? []).reduce(
        (lineSum, line) => lineSum + line.soLuong * lineCost(line, costByProduct),
        0,
      ),
      0,
    );
    const itemsSold = [...productStats.values()].reduce((s, v) => s + v.qty, 0);
    const stockValue = balances.reduce(
      (sum, b) => sum + Number(b.stockValue ?? 0),
      0,
    );
    const lowStockCount = balances.filter(
      (b) => Number(b.quantity ?? 0) <= Number(b.minStock ?? 0),
    ).length;
    return {
      revenue,
      previousRevenue,
      orderCount: periodInvoices.length,
      previousOrderCount: previousPeriodInvoices.length,
      averageOrderValue: periodInvoices.length === 0 ? 0 : Math.round(revenue / periodInvoices.length),
      previousAverageOrderValue:
        previousPeriodInvoices.length === 0
          ? 0
          : Math.round(previousRevenue / previousPeriodInvoices.length),
      grossProfit: revenue - cogs,
      previousGrossProfit: previousRevenue - previousCogs,
      itemsSold,
      stockValue,
      lowStockCount,
    };
  }, [periodInvoices, previousPeriodInvoices, productStats, invoiceLines, costByProduct, balances]);

  const summary = useMemo<SummaryItem[]>(() => {
    const grossMargin =
      metrics.revenue === 0 ? 0 : (metrics.grossProfit / metrics.revenue) * 100;

    return [
      {
        key: 'revenue',
        title: 'Doanh thu kỳ báo cáo',
        value: formatVND(metrics.revenue),
        color: BRAND.primaryRed,
      },
      {
        key: 'profit',
        title: 'Lợi nhuận gộp',
        value: formatVND(metrics.grossProfit),
        color: BRAND.success,
      },
      {
        key: 'margin',
        title: 'Tỷ suất lãi gộp',
        value: formatRatio(grossMargin, 1),
      },
      {
        key: 'orders',
        title: 'Số hoá đơn',
        value: formatNumber(metrics.orderCount),
        suffix: 'đơn',
      },
    ];
  }, [metrics]);

  const branchProfit = useMemo<ProfitReportRow[]>(() => {
    const map = new Map<string, { revenue: number; cogs: number; orders: number }>();
    for (const hd of invoices.filter(
      (h) =>
        (h.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (branchId === null || h.idChiNhanh === branchId),
    )) {
      const key = hd.idChiNhanh;
      const prev = map.get(key) ?? { revenue: 0, cogs: 0, orders: 0 };
      prev.revenue += hd.grandTotal;
      prev.orders += 1;
      map.set(key, prev);
    }
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const prev = map.get(hd.idChiNhanh);
        if (prev) {
          prev.cogs += line.soLuong * (costByProduct.get(line.idSanPham) ?? 0);
        }
      }
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        dimensionName: branchNameById(id),
        revenue: v.revenue,
        cogs: v.cogs,
        grossProfit: v.revenue - v.cogs,
        operatingCost: 0,
        netProfit: v.revenue - v.cogs,
        netMarginPercent: v.revenue === 0 ? 0 : ((v.revenue - v.cogs) / v.revenue) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [invoices, periodInvoices, invoiceLines, costByProduct, branchId, branchNameById]);

  const categoryRevenue = useMemo<CategoryRevenueData[]>(() => {
    const map = new Map<string, { name: string; revenue: number; color?: string }>();
    let total = 0;
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const product = productById(line.idSanPham);
        const catId = product?.categoryId || 'unknown';
        const cat = categoryMap.get(catId);
        const catName = cat?.name || product?.categoryName || (catId === 'unknown' ? 'Khác' : 'Khác');
        const prev = map.get(catId) ?? { name: catName, revenue: 0, color: cat?.color };
        prev.revenue += line.thanhTien;
        total += line.thanhTien;
        map.set(catId, prev);
      }
    }
    return [...map.entries()]
      .map(([categoryId, v], index) => ({
        categoryId,
        categoryName: v.name,
        revenue: v.revenue,
        percentage: total === 0 ? 0 : (v.revenue / total) * 100,
        color: (v.color && v.color !== '#000000') ? v.color : (CHART_COLORS[index % CHART_COLORS.length] ?? BRAND.primaryRed),
      }))
      .filter((item) => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodInvoices, invoiceLines, categoryMap, productById]);

  const categoryProfit = useMemo<ProfitReportRow[]>(() => {
    const map = new Map<string, { name: string; revenue: number; cogs: number }>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const product = productById(line.idSanPham);
        const catId = product?.categoryId || 'unknown';
        const cat = categoryMap.get(catId);
        const catName = cat?.name || product?.categoryName || (catId === 'unknown' ? 'Khác' : 'Khác');
        const prev = map.get(catId) ?? { name: catName, revenue: 0, cogs: 0 };
        prev.revenue += line.thanhTien;
        prev.cogs += line.soLuong * (costByProduct.get(line.idSanPham) ?? 0);
        map.set(catId, prev);
      }
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        dimensionName: v.name,
        revenue: v.revenue,
        cogs: v.cogs,
        grossProfit: v.revenue - v.cogs,
        operatingCost: 0,
        netProfit: v.revenue - v.cogs,
        netMarginPercent: v.revenue === 0 ? 0 : ((v.revenue - v.cogs) / v.revenue) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodInvoices, invoiceLines, costByProduct, categoryMap, productById]);

  const topSelling = useMemo<TopSellingRow[]>(() => {
    const stockByProduct = new Map<string, number>();
    for (const b of balances) {
      stockByProduct.set(
        b.productId,
        (stockByProduct.get(b.productId) ?? 0) + Number(b.quantity ?? 0),
      );
    }
    return [...productStats.entries()]
      .map(([productId, v]) => {
        const product = productById(productId);
        const margin = v.revenue === 0 ? 0 : ((v.revenue - v.cogs) / v.revenue) * 100;
        return {
          id: productId,
          rank: 0,
          sku: product?.sku ?? '',
          productName: product?.name ?? '',
          categoryName: product?.categoryName || categoryMap.get(product?.categoryId ?? '')?.name || '',
          imageUrl: product?.imageUrl ?? '',
          quantitySold: v.qty,
          revenue: v.revenue,
          grossProfit: v.revenue - v.cogs,
          marginPercent: margin,
          remainingStock: stockByProduct.get(productId) ?? 0,
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 20)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [productStats, balances, categoryMap, productById]);

  const shrinkage = useMemo<ShrinkageReportRow[]>(() => {
    const [from, to] = rangeToDateRange(range);
    return ledger
      .filter((tk) => {
        const d = (tk.ngayPhatSinh ?? '').slice(0, 10);
        const type = tk.loaiGiaoDich ?? '';
        return (
          d >= from &&
          d <= to &&
          (type.includes('ADJUST') || type.includes('SHRINKAGE') || type.includes('LOSS')) &&
          (branchId === null || tk.idChiNhanh === branchId)
        );
      })
      .map((tk) => {
        const product = productById(tk.idSanPham);
        const unitCost = Number(tk.donGia ?? 0);
        const qty = Math.abs(tk.soLuong);
        const branch = branches.find((b) => b.id === tk.idChiNhanh);
        const lossValue = qty * unitCost;
        return {
          id: tk.id,
          branchId: tk.idChiNhanh,
          branchName: branch?.name ?? '',
          sku: product?.sku ?? '',
          productName: product?.name ?? '',
          categoryName: product?.categoryName || categoryMap.get(product?.categoryId ?? '')?.name || '',
          reason: 'LOST' as ShrinkageReason,
          quantity: qty,
          unitCost,
          lossValue,
          occurredAt: (tk.ngayPhatSinh ?? '').slice(0, 10),
          shrinkageRatePercent: 0,
        };
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [ledger, range, branchId, branches, categoryMap, productById]);

  const shrinkageByReason = useMemo<ShrinkageReasonStat[]>(() => {
    const map = new Map<ShrinkageReason, number>();
    for (const row of shrinkage) {
      map.set(row.reason, (map.get(row.reason) ?? 0) + row.lossValue);
    }
    return [...map.entries()].map(([reason, value], index) => ({
      reason,
      name: SHRINKAGE_REASON_LABEL[reason],
      value,
      color: CHART_COLORS[index % CHART_COLORS.length] ?? BRAND.primaryRed,
    }));
  }, [shrinkage]);

  return {
    loading,
    metrics,
    summary,
    branchProfit,
    categoryRevenue,
    categoryProfit,
    topSelling,
    shrinkage,
    shrinkageByReason,
    productById,
  };
};
