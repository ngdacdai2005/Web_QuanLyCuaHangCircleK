import type { FC } from 'react';
import { Space, Tag } from 'antd';
import {
    HOP_DONG_STATUS_COLOR,
    HOP_DONG_STATUS_LABEL,
    daysToExpiry,
    effectiveStatus,
    type HopDong,
} from '@/types';

/**
 * Tag trạng thái hợp đồng — dùng chung cho bảng, drawer, ở mọi nơi.
 * - EXPIRED là trạng thái "suy ra" (derived) khi đọc, không nằm trong DB.
 * - Khi hợp đồng còn hiệu lực và sắp hết hạn (<= 30 ngày) sẽ hiện thêm
 *   một tag phụ màu orange "Sắp hết hạn" để cảnh báo.
 */
export const HopDongStatusTag: FC<{ hopDong: HopDong }> = ({ hopDong }) => {
    const status = effectiveStatus(hopDong);
    const days = daysToExpiry(hopDong);
    const expiringSoon =
        status === 'ACTIVE' && days !== Number.POSITIVE_INFINITY && days <= 30;

    return (
        <Space size={4} wrap>
            <Tag color={HOP_DONG_STATUS_COLOR[status]} className="tag-no-margin">
                {HOP_DONG_STATUS_LABEL[status]}
            </Tag>
            {expiringSoon && (
                <Tag color="orange" className="tag-no-margin">
                    Sắp hết hạn
                </Tag>
            )}
        </Space>
    );
};