import type { FC } from 'react';
import { Button, DatePicker, Popconfirm, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalculatorOutlined, DollarOutlined } from '@ant-design/icons';
import { dayjs } from '@/utils/dateUtils';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { formatVND } from '@/utils/formatters';
import { isInitialLoading } from '@/utils/tableLoading';
import type { PayrollRow } from '@/types';

const { Text } = Typography;

interface PayrollTabProps {
  search: string;
  onSearchChange: (val: string) => void;
  filters: ToolbarFilter[];
  payrollPeriod: string;
  onPeriodChange: (period: string) => void;
  isSelfServiceRole: boolean;
  approvableSelected: PayrollRow[];
  onGeneratePayroll: () => void;
  onApproveBatch: () => void;
  onExport: () => void;
  onReset: () => void;
  columns: ColumnsType<PayrollRow>;
  dataSource: PayrollRow[];
  loading: boolean;
  selectedIds: string[];
  onSelectChange: (keys: string[]) => void;
  canApprovePaymentRow: (row: PayrollRow) => boolean;
}

export const PayrollTab: FC<PayrollTabProps> = ({
  search,
  onSearchChange,
  filters,
  payrollPeriod,
  onPeriodChange,
  isSelfServiceRole,
  approvableSelected,
  onGeneratePayroll,
  onApproveBatch,
  onExport,
  onReset,
  columns,
  dataSource,
  loading,
  selectedIds,
  onSelectChange,
  canApprovePaymentRow,
}) => {
  return (
    <>
      <TableToolbar
        searchValue={search}
        searchPlaceholder="Tìm theo tên hoặc mã nhân viên..."
        onSearchChange={onSearchChange}
        filters={isSelfServiceRole ? [] : filters}
        onExport={onExport}
        onReset={onReset}
        actions={
          <>
            <DatePicker
              picker="month"
              value={dayjs(`${payrollPeriod.slice(3)}-${payrollPeriod.slice(0, 2)}-01`)}
              format="MM/YYYY"
              allowClear={false}
              onChange={(value) => {
                if (value) onPeriodChange(value.format('MM-YYYY'));
              }}
            />
            {!isSelfServiceRole && (
              <Button
                type="default"
                icon={<CalculatorOutlined />}
                onClick={onGeneratePayroll}
              >
                Tạo bảng lương
              </Button>
            )}
            {!isSelfServiceRole && approvableSelected.length > 0 && (
              <Popconfirm
                title={`Duyệt chi ${approvableSelected.length} bảng lương?`}
                description={`Tổng chi ${formatVND(
                  approvableSelected.reduce((sum, row) => sum + row.netPay, 0),
                )}. Hành động này không hoàn tác được.`}
                okText="Duyệt chi"
                cancelText="Huỷ"
                onConfirm={onApproveBatch}
              >
                <Button type="primary" icon={<DollarOutlined />}>
                  Duyệt chi {approvableSelected.length} bảng
                </Button>
              </Popconfirm>
            )}
          </>
        }
      />

      <Table<PayrollRow>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={isInitialLoading(loading, dataSource)}
        size="small"
        scroll={{ x: 2100 }}
        className="dense-table"
        rowSelection={
          isSelfServiceRole
            ? undefined
            : {
                selectedRowKeys: selectedIds,
                onChange: (keys) => onSelectChange(keys as string[]),
                getCheckboxProps: (row) => ({
                  disabled: !canApprovePaymentRow(row),
                }),
              }
        }
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `${total} nhân sự`,
        }}
        summary={(rows) => {
          const totalNet = rows.reduce((sum, row) => sum + row.netPay, 0);
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={12}>
                <Text strong>Tổng chi lương (trang hiện tại)</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={12} align="right">
                <Text strong className="pay-net">
                  {formatVND(totalNet)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={13} colSpan={2} />
            </Table.Summary.Row>
          );
        }}
      />
    </>
  );
};
