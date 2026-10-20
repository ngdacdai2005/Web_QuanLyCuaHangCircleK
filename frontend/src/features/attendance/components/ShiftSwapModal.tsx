import { useEffect, type FC } from 'react';
import { Modal, Form, Select, DatePicker, Input, InputNumber, message } from 'antd';
import { ClockCircleOutlined, SwapOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { SHIFT_CODE, SHIFT_LABEL, type ShiftCode } from '@/types';

interface ShiftSwapModalProps {
  open: boolean;
  type: 'SWAP' | 'OT';
  onClose: () => void;
  onSubmitSuccess?: () => void;
  defaultDate?: Dayjs | null;
  defaultShift?: ShiftCode;
}

export const ShiftSwapModal: FC<ShiftSwapModalProps> = ({
  open,
  type,
  onClose,
  onSubmitSuccess,
  defaultDate,
  defaultShift,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        date: defaultDate || dayjs().add(1, 'day'),
        shift: defaultShift || SHIFT_CODE.Morning,
        targetShift: defaultShift === SHIFT_CODE.Morning ? SHIFT_CODE.Afternoon : SHIFT_CODE.Morning,
        hours: 2,
      });
    }
  }, [open, defaultDate, defaultShift, form]);

  const handleFinish = (values: any) => {
    if (type === 'OT') {
      message.success(`Đã đăng ký làm thêm ${values.hours} giờ OT ngày ${dayjs(values.date).format('DD/MM/YYYY')} thành công!`);
    } else {
      message.success(`Đã gửi yêu cầu đổi ca ngày ${dayjs(values.date).format('DD/MM/YYYY')} thành công!`);
    }
    form.resetFields();
    onClose();
    onSubmitSuccess?.();
  };

  return (
    <Modal
      open={open}
      title={type === 'OT' ? 'Đăng ký làm thêm giờ (OT)' : 'Yêu cầu đổi ca làm việc'}
      okText="Gửi yêu cầu"
      cancelText="Hủy"
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
      centered
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          date: dayjs().add(1, 'day'),
          shift: SHIFT_CODE.Morning,
          targetShift: SHIFT_CODE.Afternoon,
          hours: 2,
        }}
      >
        <Form.Item
          name="date"
          label="Ngày làm việc"
          rules={[{ required: true, message: 'Vui lòng chọn ngày làm việc' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        {type === 'SWAP' ? (
          <>
            <Form.Item
              name="shift"
              label="Ca hiện tại của bạn"
              rules={[{ required: true, message: 'Chọn ca hiện tại' }]}
            >
              <Select
                options={[
                  { value: SHIFT_CODE.Morning, label: SHIFT_LABEL.MORNING },
                  { value: SHIFT_CODE.Afternoon, label: SHIFT_LABEL.AFTERNOON },
                  { value: SHIFT_CODE.Night, label: SHIFT_LABEL.NIGHT },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="targetShift"
              label="Ca muốn đổi sang"
              rules={[{ required: true, message: 'Chọn ca muốn đổi' }]}
            >
              <Select
                options={[
                  { value: SHIFT_CODE.Morning, label: SHIFT_LABEL.MORNING },
                  { value: SHIFT_CODE.Afternoon, label: SHIFT_LABEL.AFTERNOON },
                  { value: SHIFT_CODE.Night, label: SHIFT_LABEL.NIGHT },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="coworker"
              label="Đồng nghiệp đổi ca cùng (nếu có)"
            >
              <Input placeholder="VD: NV-0002 Nguyễn Văn B" prefix={<SwapOutlined style={{ color: '#94a3b8' }} />} />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item
              name="shift"
              label="Ca làm việc tăng cường"
              rules={[{ required: true, message: 'Chọn ca làm việc' }]}
            >
              <Select
                options={[
                  { value: SHIFT_CODE.Morning, label: SHIFT_LABEL.MORNING },
                  { value: SHIFT_CODE.Afternoon, label: SHIFT_LABEL.AFTERNOON },
                  { value: SHIFT_CODE.Night, label: SHIFT_LABEL.NIGHT },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="hours"
              label="Số giờ tăng ca dự kiến (h)"
              rules={[{ required: true, message: 'Nhập số giờ OT' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.5}
                max={8}
                step={0.5}
                prefix={<ClockCircleOutlined style={{ color: '#94a3b8' }} />}
              />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="reason"
          label="Lý do chi tiết"
          rules={[{ required: true, message: 'Vui lòng nêu lý do' }]}
        >
          <Input.TextArea rows={3} placeholder="Mô tả lý do..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
