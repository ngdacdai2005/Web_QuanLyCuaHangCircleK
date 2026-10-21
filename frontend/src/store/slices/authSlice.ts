import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { taiKhoanApi } from '@/api/taiKhoan';
import {
  AUTH_STORAGE_KEY,
} from '@/config/brand';
import {
  SYSTEM_WIDE_ROLES,
  normalizeRecordStatus,
  type AuthUser,
  type ChangePasswordFormValues,
  type LoginFormValues,
  type ProfileFormValues,
} from '@/types';
import { authApi } from '@/api/auth';
import { initialsOf } from '@/utils/formatters';

export const loginAsync = createAsyncThunk(
  'auth/loginAsync',
  async (values: LoginFormValues, { rejectWithValue }) => {
    try {
      const result = await authApi.login(values);
      return { ...result, remember: values.remember !== false };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchCurrentUserAsync = createAsyncThunk(
  'auth/fetchCurrentUserAsync',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authApi.getMe();
      return user;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

interface PersistedSession {
  user: AuthUser;
  activeBranchId: string | null;
  token: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  activeBranchId: string | null;
  isSubmitting: boolean;
  error: string | null;
  token: string | null;
}

const readPersistedSession = (): PersistedSession | null => {
  try {
    // Ưu tiên session độc lập của tab hiện tại trong sessionStorage
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY) || window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'user' in parsed && 'activeBranchId' in parsed) {
      const session = parsed as PersistedSession;
      // Khởi tạo ngay vào sessionStorage của tab này nếu đang lấy từ localStorage
      if (!window.sessionStorage.getItem(AUTH_STORAGE_KEY)) {
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, raw);
        if (session.token) {
          window.sessionStorage.setItem('auth_token', session.token);
        }
      }
      return {
        ...session,
        user: {
          ...session.user,
          status: normalizeRecordStatus(session.user.status),
        },
      };
    }
    return null;
  } catch {
    return null;
  }
};

const isSessionRemembered = (): boolean => {
  return window.localStorage.getItem(AUTH_STORAGE_KEY) !== null;
};

const writePersistedSession = (session: PersistedSession | null, remember: boolean = true): void => {
  try {
    if (session === null) {
      // Khi logout ở tab này: chỉ xóa session của riêng tab này
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      window.sessionStorage.removeItem('auth_token');
      return;
    }
    // 1. Luôn lưu vào sessionStorage của tab này để đảm bảo tab này hoạt động độc lập, không bị đổi theo tab khác
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    window.sessionStorage.setItem('auth_token', session.token);

    // 2. Nếu chọn "Ghi nhớ phiên đăng nhập", lưu thêm vào localStorage để khôi phục khi mở lại trình duyệt
    if (remember) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      window.localStorage.setItem('auth_token', session.token);
    }
  } catch {
  }
};

const defaultBranchFor = (user: AuthUser): string | null =>
  SYSTEM_WIDE_ROLES.includes(user.role) ? null : user.branchId;

const restored = readPersistedSession();

const initialState: AuthState = {
  user: restored?.user ?? null,
  isAuthenticated: restored !== null,
  activeBranchId: restored?.activeBranchId ?? null,
  isSubmitting: false,
  error: null,
  token: restored?.token ?? null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStarted: (state) => {
      state.isSubmitting = true;
      state.error = null;
    },
    loginSucceeded: (state) => {
      state.isSubmitting = false;
      state.error = null;
    },
    setActiveBranch: (state, action: PayloadAction<string | null>) => {
      state.activeBranchId = action.payload;
      if (state.user) {
        writePersistedSession(
          { user: state.user, activeBranchId: action.payload, token: state.token || '' },
          isSessionRemembered()
        );
      }
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    updateProfile: (state, action: PayloadAction<ProfileFormValues>) => {
      if (state.user === null) return;
      state.user = {
        ...state.user,
        fullName: action.payload.fullName.trim(),
        email: action.payload.email.trim(),
        phone: action.payload.phone.trim(),
        avatarText: initialsOf(action.payload.fullName),
      };
      state.error = null;
      if (readPersistedSession() !== null) {
        writePersistedSession(
          { user: state.user, activeBranchId: state.activeBranchId, token: state.token || '' },
          isSessionRemembered()
        );
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.activeBranchId = null;
      state.isSubmitting = false;
      state.error = null;
      state.token = null;
      writePersistedSession(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.activeBranchId = defaultBranchFor(action.payload.user);
        state.token = action.payload.token;
        state.error = null;
        writePersistedSession(
          {
            user: action.payload.user,
            activeBranchId: defaultBranchFor(action.payload.user),
            token: action.payload.token,
          },
          action.payload.remember
        );
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload as string;
      })
      .addCase(fetchCurrentUserAsync.fulfilled, (state, action) => {
        if (state.user) {
          state.user = {
            ...state.user,
            ...action.payload,
          };
          writePersistedSession(
            { user: state.user, activeBranchId: state.activeBranchId, token: state.token || '' },
            isSessionRemembered()
          );
        }
      });
  },
});

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    values: ChangePasswordFormValues,
    { rejectWithValue, getState }
  ) => {
    const id = (getState() as { auth: AuthState }).auth.user?.id;

    if (!id) {
      return rejectWithValue('Chưa đăng nhập');
    }

    try {
      await taiKhoanApi.changePassword(id, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      return true;
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Đổi mật khẩu thất bại'
      );
    }
  }
);

export const {
  loginStarted,
  loginSucceeded,
  setActiveBranch,
  clearAuthError,
  updateProfile,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
