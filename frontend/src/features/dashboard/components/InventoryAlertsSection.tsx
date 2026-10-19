import type { CSSProperties, FC } from 'react';
import { Card, Progress, Space, Tag, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { EmptyState } from '@/components/EmptyState';
import { BRAND } from '@/config/brand';
import type { InventoryAlertItem } from '@/types';

const { Text } = Typography;

interface InventoryAlertsSectionProps {
  alerts: InventoryAlertItem[];
  lowStockCount: number;
}

const urgencyColor = (urgency: InventoryAlertItem['urgency']): string =>
  urgency === 'high' ? BRAND.error : BRAND.warning;

export const InventoryAlertsSection: FC<InventoryAlertsSectionProps> = ({ alerts, lowStockCount }) => {
  return (
    <Card
      title={
        <Space size={8}>
          <WarningOutlined className="alert-title-icon" />
          <span>Cảnh báo tồn kho</span>
        </Space>
      }
      extra={
        <Tag color="red" className="tag-no-margin">
          {lowStockCount} SKU
        </Tag>
      }
      styles={{ body: { padding: '12px 18px 18px' } }}
    >
      {alerts.length === 0 ? (
        <EmptyState
          title="Tồn kho đang ở mức an toàn"
          description="Không có mặt hàng nào dưới ngưỡng tối thiểu."
        />
      ) : (
        <Space direction="vertical" size={12} className="dash-list-full">
          {alerts.map((alert) => (
            <div key={alert.id}>
              <div className="dash-progress-row with-gap">
                <Text strong className="dash-text-12-5" ellipsis>
                  {alert.productName}
                </Text>
                <Text
                  strong
                  className="alert-stock-value"
                  style={{ '--alert-color': urgencyColor(alert.urgency) } as CSSProperties}
                >
                  {alert.currentStock}/{alert.minStock}
                </Text>
              </div>
              <Progress
                percent={Math.round((alert.currentStock / Math.max(1, alert.minStock)) * 100)}
                size="small"
                showInfo={false}
                strokeColor={urgencyColor(alert.urgency)}
              />
              <Text type="secondary" className="alert-note">
                {alert.sku} · Đề xuất nhập thêm {alert.suggestedReorder}
              </Text>
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
};
