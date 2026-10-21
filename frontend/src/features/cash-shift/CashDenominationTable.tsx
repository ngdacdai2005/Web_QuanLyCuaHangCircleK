import { useState, useEffect, type FC } from 'react';
import { Table, InputNumber, Typography, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatVND } from '@/utils/formatters';

const DENOMINATIONS = [
  500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000,
];

interface DenominationRow {
  key: number;
  denomination: number;
  count: number;
  total: number;
}

interface CashDenominationTableProps {
  value?: Record<string, number>;
  onChange?: (totalAmount: number, counts: Record<string, number>) => void;
  disabled?: boolean;
}

export const CashDenominationTable: FC<CashDenominationTableProps> = ({
  value = {},
  onChange,
  disabled = false,
}) => {
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    DENOMINATIONS.forEach((d) => {
      init[d] = value[String(d)] || 0;
    });
    return init;
  });

  const handleCountChange = (denom: number, count: number | null) => {
    const newCounts = { ...counts, [denom]: count || 0 };
    setCounts(newCounts);

    let total = 0;
    const exportMap: Record<string, number> = {};
    DENOMINATIONS.forEach((d) => {
      const c = newCounts[d] || 0;
      total += d * c;
      if (c > 0) exportMap[String(d)] = c;
    });

    onChange?.(total, exportMap);
  };

  useEffect(() => {
    if (value) {
      const init: Record<number, number> = {};
      DENOMINATIONS.forEach((d) => {
        init[d] = value[String(d)] || 0;
      });
      setCounts(init);
    }
  }, [value]);

  const totalAmount = DENOMINATIONS.reduce((sum, d) => sum + d * (counts[d] || 0), 0);
  const totalSheets = DENOMINATIONS.reduce((sum, d) => sum + (counts[d] || 0), 0);

  const dataSource: DenominationRow[] = DENOMINATIONS.map((d) => ({
    key: d,
    denomination: d,
    count: counts[d] || 0,
    total: d * (counts[d] || 0),
  }));

  const columns: ColumnsType<DenominationRow> = [
    {
      title: 'Mệnh giá',
      dataIndex: 'denomination',
      key: 'denomination',
      width: 140,
      render: (val: number) => (
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatVND(val)}</span>
      ),
    },
    {
      title: 'Số tờ',
      dataIndex: 'count',
      key: 'count',
      width: 130,
      render: (val: number, record) => (
        <InputNumber
          min={0}
          max={9999}
          value={val === 0 ? undefined : val}
          placeholder="0"
          disabled={disabled}
          onChange={(newVal) => handleCountChange(record.denomination, newVal)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: val > 0 ? '#059669' : '#94a3b8' }}>
          {formatVND(val)}
        </span>
      ),
    },
  ];

  return (
    <Card
      size="small"
      style={{
        background: '#f8fafc',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Text strong style={{ fontSize: 13, color: '#475569' }}>
          💵 BẢNG KÊ ĐẾM TIỀN MẶT THEO MỆNH GIÁ
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Tổng số tờ: <strong>{totalSheets} tờ</strong>
        </Typography.Text>
      </div>

      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        bordered
      />

      <div
        style={{
          marginTop: 10,
          padding: '8px 12px',
          background: '#ecfdf5',
          borderRadius: 6,
          border: '1px solid #a7f3d0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>
          TỔNG TIỀN KIỂM ĐẾM:
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#047857' }}>
          {formatVND(totalAmount)}
        </span>
      </div>
    </Card>
  );
};
