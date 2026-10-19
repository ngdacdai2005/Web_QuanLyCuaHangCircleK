import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config/api';
import { apiFetch } from '@/api/http';
import { BRAND } from '@/config/brand';
import { hoaDonApi, type HoaDonDTO, type ChiTietHoaDonDTO } from '@/api/hoaDon';
import { useAppSelector } from '@/store/hooks';
import {
  TIME_RANGE_LABEL,
  type InventoryAlertItem,
  type KpiCard,
  type SalesOrder,
  type TopSellingRow,
} from '@/types';
import { formatNumber, formatVND } from '@/utils/formatters';
import { dayjs } from '@/utils/dateUtils';
import { rangeToDateRange } from '@/features/reports/hooks/useReportsData';

const percentChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

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

export interface RevenueTrendData {
  label: string;
  revenue: number;
  previousRevenue: number;
  orderCount: number;
}

export interface BranchRevenueData {
  branchId: string;
  branchName: string;
  shortName: string;
  revenue: number;
  profit: number;
  orderCount: number;
  targetAchievedPercent: number;
}

export interface CategoryRevenueData {
  categoryId: string;
  categoryName: string;
  revenue: number;
  percentage: number;
  color: string;
}

export const useDashboardData = () => {
  const { activeBranchId } = useAppSelector((state) => state.auth);
  const { timeRange } = useAppSelector((state) => state.ui);
  const balances = useAppSelector((state) => state.stock.balances);
  const branches = useAppSelector((state) => state.branch.branches);
  const products = useAppSelector((state) => state.product.products);
  const categories = useAppSelector((state) => state.category.categories);
  const sessionOrders = useAppSelector((state) => state.salesOrder.orders);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [invoices, setInvoices] = useState<HoaDonDTO[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<Record<string, ChiTietHoaDonDTO[]>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const hdList = await hoaDonApi.getAll();
        if (cancelled) return;
        setInvoices(hdList);
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
                if (res.ok) lineMap[hd.id] = await res.json();
              } catch {
                lineMap[hd.id] = [];
              }
            }),
          );
        }
        if (!cancelled) setInvoiceLines(lineMap);
      } catch {
        // fallback an toàn
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const branchNameById = useCallback((id: string | null): string => {
    if (id === null) return 'Toàn chuỗi';
    const branch = branches.find((b) => b.id === id);
    return branch?.name ?? 'Chi nhánh';
  }, [branches]);

  const productById = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  const periodInvoices = useMemo(() => {
    const [from, to] = rangeToDateRange(timeRange);
    return invoices.filter((hd) => {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (hd.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (activeBranchId === null || hd.idChiNhanh === activeBranchId)
      );
    });
  }, [invoices, timeRange, activeBranchId]);

  const previousPeriodInvoices = useMemo(() => {
    const days =
      timeRange === 'today' ? 1
      : timeRange === '7days' ? 7
      : timeRange === '30days' ? 30
      : dayjs().date();
    const now = dayjs();
    const from = now.subtract(days, 'day').format('YYYY-MM-DD');
    const to = now.subtract(1, 'day').format('YYYY-MM-DD');
    return invoices.filter((hd) => {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (hd.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (activeBranchId === null || hd.idChiNhanh === activeBranchId)
      );
    });
  }, [invoices, timeRange, activeBranchId]);

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
        prev.cogs += line.soLuong * (costByProduct.get(line.idSanPham) ?? 0);
        map.set(line.idSanPham, prev);
      }
    }
    return map;
  }, [periodInvoices, invoiceLines, costByProduct]);

  const metrics = useMemo<DashboardMetricsData>(() => {
    const revenue = periodInvoices.reduce((s, hd) => s + hd.grandTotal, 0);
    const previousRevenue = previousPeriodInvoices.reduce((s, hd) => s + hd.grandTotal, 0);
    const cogs = [...productStats.values()].reduce((s, v) => s + v.cogs, 0);
    const previousCogs = previousPeriodInvoices.reduce(
      (sum, hd) =>
        sum +
        (invoiceLines[hd.id] ?? []).reduce(
          (lineSum, line) => lineSum + line.soLuong * (costByProduct.get(line.idSanPham) ?? 0),
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

  const compareLabel =
    timeRange === 'today' ? 'so với hôm qua'
    : timeRange === '7days' ? 'so với 7 ngày trước'
    : timeRange === '30days' ? 'so với 30 ngày trước'
    : 'so với tháng trước';

  const kpiCards = useMemo<KpiCard[]>(
    () => [
      {
        id: 'revenue',
        title: 'Doanh thu',
        value: metrics.revenue,
        displayValue: formatVND(metrics.revenue),
        changePercent: percentChange(metrics.revenue, metrics.previousRevenue),
        isFavorable: metrics.revenue >= metrics.previousRevenue,
        comparedTo: compareLabel,
        icon: 'revenue',
        accentColor: BRAND.primaryRed,
      },
      {
        id: 'orders',
        title: 'Số đơn hàng',
        value: metrics.orderCount,
        displayValue: `${formatNumber(metrics.orderCount)} đơn`,
        changePercent: percentChange(metrics.orderCount, metrics.previousOrderCount),
        isFavorable: metrics.orderCount >= metrics.previousOrderCount,
        comparedTo: compareLabel,
        icon: 'orders',
        accentColor: BRAND.info,
      },
      {
        id: 'aov',
        title: 'Giá trị trung bình / đơn',
        value: metrics.averageOrderValue,
        displayValue: formatVND(Math.round(metrics.averageOrderValue)),
        changePercent: percentChange(
          metrics.averageOrderValue,
          metrics.previousAverageOrderValue,
        ),
        isFavorable: metrics.averageOrderValue >= metrics.previousAverageOrderValue,
        comparedTo: compareLabel,
        icon: 'avgOrder',
        accentColor: BRAND.accentYellow,
      },
      {
        id: 'lowstock',
        title: 'Mặt hàng cần nhập thêm',
        value: metrics.lowStockCount,
        displayValue: `${formatNumber(metrics.lowStockCount)} SKU`,
        changePercent: metrics.lowStockCount === 0 ? 0 : metrics.lowStockCount,
        isFavorable: metrics.lowStockCount === 0,
        comparedTo: 'dưới ngưỡng tồn tối thiểu',
        icon: 'lowStock',
        accentColor: BRAND.warning,
      },
    ],
    [metrics, compareLabel],
  );

  const secondaryCards = useMemo<KpiCard[]>(
    () => [
      {
        id: 'profit',
        title: 'Lợi nhuận gộp',
        value: metrics.grossProfit,
        displayValue: formatVND(metrics.grossProfit),
        changePercent: percentChange(metrics.grossProfit, metrics.previousGrossProfit),
        isFavorable: metrics.grossProfit >= metrics.previousGrossProfit,
        comparedTo: compareLabel,
        icon: 'profit',
        accentColor: BRAND.success,
      },
      {
        id: 'items',
        title: 'Số lượng sản phẩm đã bán',
        value: metrics.itemsSold,
        displayValue: `${formatNumber(metrics.itemsSold)} đơn vị`,
        changePercent: 0,
        isFavorable: true,
        comparedTo: TIME_RANGE_LABEL[timeRange],
        icon: 'orders',
        accentColor: '#6366F1',
      },
      {
        id: 'stockvalue',
        title: 'Giá trị hàng tồn kho',
        value: metrics.stockValue,
        displayValue: formatVND(metrics.stockValue),
        changePercent: 0,
        isFavorable: true,
        comparedTo: branchNameById(activeBranchId),
        icon: 'cash',
        accentColor: BRAND.neutralDark,
      },
    ],
    [metrics, compareLabel, timeRange, activeBranchId, branchNameById],
  );

  const trendData = useMemo<RevenueTrendData[]>(() => {
    const [from, to] = rangeToDateRange(timeRange);
    const days = dayjs(to).diff(dayjs(from), 'day') + 1;
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const hd of periodInvoices) {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      const prev = byDay.get(d) ?? { revenue: 0, orders: 0 };
      prev.revenue += hd.grandTotal;
      prev.orders += 1;
      byDay.set(d, prev);
    }
    const points: RevenueTrendData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = dayjs(from).add(days - 1 - i, 'day').format('YYYY-MM-DD');
      const data = byDay.get(date) ?? { revenue: 0, orders: 0 };
      points.push({
        label: dayjs(date).format('DD/MM'),
        revenue: data.revenue,
        previousRevenue: 0,
        orderCount: data.orders,
      });
    }
    return points;
  }, [periodInvoices, timeRange]);

  const branchData = useMemo<BranchRevenueData[]>(() => {
    const revMap = new Map<string, { revenue: number; orders: number }>();
    for (const hd of periodInvoices) {
      const prev = revMap.get(hd.idChiNhanh) ?? { revenue: 0, orders: 0 };
      prev.revenue += hd.grandTotal;
      prev.orders += 1;
      revMap.set(hd.idChiNhanh, prev);
    }
    const cogsMap = new Map<string, number>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        cogsMap.set(
          hd.idChiNhanh,
          (cogsMap.get(hd.idChiNhanh) ?? 0) +
            line.soLuong * (costByProduct.get(line.idSanPham) ?? 0),
        );
      }
    }
    return [...revMap.entries()]
      .map(([id, v]) => {
        const branch = branches.find((b) => b.id === id);
        const cogs = cogsMap.get(id) ?? 0;
        return {
          branchId: id,
          branchName: branch?.name ?? 'Chi nhánh',
          shortName: (branch?.name ?? 'CN').replace('Circle K ', ''),
          revenue: v.revenue,
          profit: v.revenue - cogs,
          orderCount: v.orders,
          targetAchievedPercent: 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodInvoices, invoiceLines, costByProduct, branches]);

  const categoryData = useMemo<CategoryRevenueData[]>(() => {
    const map = new Map<string, number>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const product = productById(line.idSanPham);
        const catId = product?.categoryId || 'unknown';
        map.set(catId, (map.get(catId) ?? 0) + line.thanhTien);
      }
    }
    const total = [...map.values()].reduce((s, v) => s + v, 0);
    const defaultColors = ['#E11D48', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    return [...map.entries()]
      .map(([catId, revenue], index) => {
        const product = products.find((p) => p.categoryId === catId);
        const cat = categoryMap.get(catId);
        const name = cat?.name || product?.categoryName || (catId === 'unknown' ? 'Khác' : 'Khác');
        const color = cat?.color && cat.color !== '#000000'
          ? cat.color
          : defaultColors[index % defaultColors.length];
        return {
          categoryId: catId,
          categoryName: name,
          revenue,
          percentage: total === 0 ? 0 : (revenue / total) * 100,
          color,
        };
      })
      .filter((item) => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodInvoices, invoiceLines, products, categoryMap, productById]);

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
          marginPercent: v.revenue === 0 ? 0 : ((v.revenue - v.cogs) / v.revenue) * 100,
          remainingStock: stockByProduct.get(productId) ?? 0,
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [productStats, balances, categoryMap, productById]);

  const alerts = useMemo<InventoryAlertItem[]>(() => {
    const productAlerts = new Map<string, { current: number; min: number }>();
    for (const b of balances) {
      if (activeBranchId !== null && b.branchId !== activeBranchId) continue;
      const prev = productAlerts.get(b.productId) ?? { current: 0, min: b.minStock ?? 0 };
      prev.current += Number(b.quantity ?? 0);
      productAlerts.set(b.productId, prev);
    }
    return [...productAlerts.entries()]
      .filter(([, v]) => v.current <= v.min)
      .map(([productId, v]) => {
        const product = productById(productId);
        const ratio = v.min === 0 ? 1 : v.current / v.min;
        const suggested = Math.max(0, (product?.maxStock ?? 0) - v.current);
        return {
          id: productId,
          productId,
          sku: product?.sku ?? '',
          productName: product?.name ?? '',
          categoryName: product?.categoryName || categoryMap.get(product?.categoryId ?? '')?.name || '',
          branchName: branchNameById(activeBranchId),
          currentStock: v.current,
          minStock: v.min,
          suggestedReorder: suggested,
          urgency: (ratio <= 0.5 ? 'high' : 'medium') as 'high' | 'medium',
        };
      })
      .sort((a, b) => a.currentStock / Math.max(1, a.minStock) - b.currentStock / Math.max(1, b.minStock))
      .slice(0, 6);
  }, [balances, activeBranchId, categoryMap, productById, branchNameById]);

  const latestOrders = useMemo<SalesOrder[]>(() => {
    const fromApi: SalesOrder[] = invoices.map((hd) => ({
      id: hd.id,
      code: hd.maHoaDon ?? '',
      branchId: hd.idChiNhanh,
      branchName: hd.tenChiNhanh ?? '',
      cashierId: hd.idThuNgan,
      cashierName: hd.tenThuNgan ?? 'Thu ngân',
      shiftCode: hd.caLamViec ?? 'MORNING',
      soldAt: hd.ngayBan ?? '',
      lines: (invoiceLines[hd.id] ?? []).map((line, index) => {
        const product = productById(line.idSanPham);
        return {
          id: line.id ?? `db-line-${index}`,
          productId: line.idSanPham,
          sku: product?.sku ?? '',
          productName: product?.name ?? line.tenSanPham ?? '',
          unit: product?.unit ?? '',
          unitPrice: line.donGia,
          quantity: line.soLuong,
          lineDiscount: line.giamGia ?? 0,
          vatPercent: product?.vatPercent ?? 8,
          lineTotal: line.thanhTien,
          unitCost: product?.costPrice ?? 0,
        };
      }),
      subTotal: hd.subTotal ?? 0,
      discountTotal: hd.giamGia ?? 0,
      vatTotal: hd.vatTotal ?? 0,
      grandTotal: hd.grandTotal,
      paymentMethod: (hd.hinhThucTt ?? 'CASH') as SalesOrder['paymentMethod'],
      tenderedAmount: hd.tienKhachDua ?? 0,
      changeAmount: hd.tienThoi ?? 0,
      status: (hd.trangThai ?? 'COMPLETED') as SalesOrder['status'],
      memberPhone: hd.sdtThanhVien ?? null,
      note: hd.ghiChu ?? '',
    }));
    const seen = new Set(fromApi.map((o) => o.code));
    return [...sessionOrders.filter((o) => !seen.has(o.code)), ...fromApi]
      .filter((order) =>
        activeBranchId === null ? true : order.branchId === activeBranchId,
      )
      .sort((a, b) => b.soldAt.localeCompare(a.soldAt))
      .slice(0, 8);
  }, [invoices, invoiceLines, sessionOrders, activeBranchId, productById]);

  return {
    kpiCards,
    secondaryCards,
    trendData,
    branchData,
    categoryData,
    topSelling,
    alerts,
    latestOrders,
    metrics,
    productById,
    branchNameById,
    compareLabel,
  };
};
