import type { FC } from 'react';
import { Col, Row } from 'antd';
import { StatCard } from '@/components/StatCard';
import type { KpiCard } from '@/types';

interface KpiGridProps {
  kpis: KpiCard[];
}

export const KpiGrid: FC<KpiGridProps> = ({ kpis }) => {
  return (
    <Row gutter={[16, 16]}>
      {kpis.map((kpi) => (
        <Col xs={24} sm={12} lg={8} xl={4} key={kpi.id}>
          <StatCard data={kpi} />
        </Col>
      ))}
    </Row>
  );
};
