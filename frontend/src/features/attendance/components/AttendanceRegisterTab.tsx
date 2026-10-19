import type { FC } from 'react';
import { DatePicker, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { isInitialLoading } from '@/utils/tableLoading';
import type { AttendanceRecord } from '@/types';

interface AttendanceRegisterTabProps {
  search: string;
  onSearchChange: (val: string) => void;
  filters: ToolbarFilter[];
  attendanceRange: [Dayjs, Dayjs];
  onRangeChange: (range: [Dayjs, Dayjs]) => void;
  onReset: () => void;
  onExport: () => void;
  columns: ColumnsType<AttendanceRecord>;
  dataSource: AttendanceRecord[];
  loading: boolean;
  scrollX?: number;
  emptyText?: string;
}

export const AttendanceRegisterTab: FC<AttendanceRegisterTabProps> = ({
  search,
  onSearchChange,
  filters,
  attendanceRange,
  onRangeChange,
  onReset,
  onExport,
  columns,
  dataSource,
  loading,
  scrollX = 1420,
  emptyText,
}) => {
  return (
    <>
      <TableToolbar
        searchValue={search}
        searchPlaceholder="Tìm theo tên hoặc mã nhân viên..."
        onSearchChange={onSearchChange}
        filters={filters}
        actions={
          <DatePicker.RangePicker
            value={attendanceRange}
            format="DD/MM/YYYY"
            allowClear={false}
            onChange={(values) => {
              if (values?.[0] && values[1]) onRangeChange([values[0], values[1]]);
            }}
          />
        }
        onExport={onExport}
        onReset={onReset}
      />

      <Table<AttendanceRecord>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={isInitialLoading(loading, dataSource)}
        size="small"
        scroll={{ x: scrollX }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `${total} bản ghi`,
        }}
        locale={emptyText ? { emptyText } : undefined}
      />
    </>
  );
};
