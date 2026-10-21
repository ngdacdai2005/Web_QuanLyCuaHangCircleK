import { useEffect, useState, type FC } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Checkbox,
  Typography,
} from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { APP_FULL_NAME } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, loginAsync } from '@/store/slices/authSlice';
import type { LoginFormValues } from '@/types';
import './LoginPage.css';

const { Title, Paragraph } = Typography;

export const LoginPage: FC = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const dispatch = useAppDispatch();

  const error = useAppSelector((state) => state.auth.error);
  const isSubmitting = useAppSelector((state) => state.auth.isSubmitting);
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);

  useEffect(() => {
    dispatch(clearAuthError());

    // Bắt sự kiện phiên làm việc hết hạn từ http interceptor
    const handleExpired = () => {
      setExpiredNotice('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [dispatch]);

  const handleSubmit = (values: LoginFormValues): void => {
    setExpiredNotice(null);
    dispatch(loginAsync({
      ...values,
      username: values.username?.trim(),
      remember: values.remember !== false,
    }));
  };

  return (
    <div className="login-page">
      <Title level={3} className="login-title">
        Đăng nhập hệ thống
      </Title>
      <Paragraph type="secondary" className="login-subtitle">
        {APP_FULL_NAME}
      </Paragraph>

      {expiredNotice && (
        <Alert
          type="warning"
          showIcon
          message={expiredNotice}
          className="login-alert"
          closable
          onClose={() => setExpiredNotice(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {error !== null && (
        <Alert
          type="error"
          showIcon
          message={error}
          className="login-alert"
          closable
          onClose={() => dispatch(clearAuthError())}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        size="large"
        initialValues={{ remember: true }}
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <Form.Item
          name="username"
          label="Tên đăng nhập"
          rules={[
            { required: true, message: 'Vui lòng nhập tên đăng nhập.' },
            {
              validator: (_, value) => {
                if (value && value.trim().length === 0) {
                  return Promise.reject(new Error('Tên đăng nhập không được chỉ chứa khoảng trắng.'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            autoFocus
            prefix={<UserOutlined className="login-input-icon" />}
            placeholder="Nhập tên đăng nhập (ví dụ: admin)"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Mật khẩu"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="login-input-icon" />}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked">
          <Checkbox>Ghi nhớ phiên đăng nhập trên máy này</Checkbox>
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={isSubmitting}
          className="login-submit-btn"
          style={{ height: 46, fontSize: 16, fontWeight: 600 }}
        >
          {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
        </Button>
      </Form>
    </div>
  );
};
