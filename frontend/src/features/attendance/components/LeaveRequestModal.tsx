import { useEffect, type FC } from 'react';
import { Modal, Form, Select, DatePicker, Input, message } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

interface LeaveRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
  defaultDate?: Dayjs | null;
}

export const LeaveRequestModal: FC<LeaveRequestModalProps> = ({
  open,
  onClose,
  onSubmitSuccess,
  defaultDate,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      const targetDate = defaultDate || dayjs().add(1, 'day');
      form.setFieldsValue({
        leaveType: 'ANNUAL',
        dateRange: [targetDate, targetDate],
      });
    }
  }, [open, defaultDate, form]);

  const handleFinish = (values: any) => {
    message.success(`Đã nộp đơn nghỉ phép (${values.leaveType}) thành công! Đang chờ Quản lý duyệt.`);
    form.resetFields();
    onClose();
    onSubmitSuccess?.();
  };

  return (
    <Modal
      open={open}
      title="Đăng ký nghỉ phép"
      okText="Gửi đơn phê duyệt"
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
          leaveType: 'ANNUAL',
          dateRange: [dayjs().add(1, 'day'), dayjs().add(1, 'day')],
        }}
      >
        <Form.Item
          name="leaveType"
          label="Loại nghỉ phép"
          rules={[{ required: true, message: 'Vui lòng chọn loại nghỉ phép' }]}
        >
          <Select
            options={[
              { value: 'ANNUAL', label: 'Nghỉ phép năm (Hưởng nguyên lương)' },
              { value: 'UNPAID', label: 'Nghỉ không hưởng lương' },
              { value: 'SICK', label: 'Nghỉ ốm đau / Bảo hiểm y tế' },
              { value: 'PERSONAL', label: 'Nghỉ việc riêng (Hiếu, hỉ)' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Thời gian nghỉ (Từ ngày - Đến ngày)"
          rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian nghỉ' }]}
        >
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            prefix={<CalendarOutlined style={{ color: '#94a3b8' }} />}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Lý do xin nghỉ"
          rules={[{ required: true, message: 'Vui lòng nhập lý do xin nghỉ' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Mô tả cụ thể lý do xin nghỉ và bàn giao công việc..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
