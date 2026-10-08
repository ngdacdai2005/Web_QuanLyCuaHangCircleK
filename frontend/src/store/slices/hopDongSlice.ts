import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { HOP_DONG_STATUS, type HopDong, type HopDongFilter, type HopDongFormValues } from '@/types';
import { hopDongApi, type HopDongDTO } from '@/api/hopDongApi';
import { today } from '@/utils/dateUtils';

export const mapDtoToHopDong = (dto: HopDongDTO): HopDong => ({
    id: dto.id,
    maHopDong: dto.maHopDong,
    tenHopDong: dto.tenHopDong,
    loaiHopDong: dto.loaiHopDong as HopDong['loaiHopDong'],
    idNcc: dto.idNcc,
    maNcc: dto.maNcc || '',
    tenNcc: dto.tenNcc || '',
    ngayKy: dto.ngayKy || today(),
    ngayHieuLuc: dto.ngayHieuLuc || today(),
    ngayHetHan: dto.ngayHetHan ?? undefined,
    giaTriHopDong: dto.giaTriHopDong ?? undefined,
    dieuKhoanThanhToan: dto.dieuKhoanThanhToan,
    soNgayDuocNo: dto.soNgayDuocNo || 0,
    noiDung: dto.noiDung,
    fileTenGoc: dto.fileTenGoc,
    fileCo: dto.fileCo || false,
    trangThai: dto.trangThai as HopDong['trangThai'],
    lyDoTuChoi: dto.lyDoTuChoi,
    idNguoiDuyet: dto.idNguoiDuyet,
    ngayDuyet: dto.ngayDuyet,
    soLanTrinh: dto.soLanTrinh || 0,
    createdAt: dto.ngayTao || today(),
    updatedAt: dto.ngayCapNhat || dto.ngayTao || undefined,
});

interface HopDongState {
    items: HopDong[];
    counts: Record<string, { tong: number; dangHieuLuc: number; sapHetHan: number }>;
    sapHetHanItems: HopDong[];
    filter: HopDongFilter;
    isLoading: boolean;
    error: string | null;
}

const initialState: HopDongState = {
    items: [], counts: {}, sapHetHanItems: [], filter: {}, isLoading: false, error: null,
};

export const fetchSapHetHan = createAsyncThunk(
    'hopDong/fetchSapHetHan',
    async (days: number = 30) => (await hopDongApi.sapHetHan(days)).map(mapDtoToHopDong),
);

export const fetchHopDongs = createAsyncThunk(
    'hopDong/fetchAll',
    async (filter: HopDongFilter = {}) => {
        const data = await hopDongApi.list(filter);
        return data.map(mapDtoToHopDong);
    },
);

export const fetchHopDongCounts = createAsyncThunk('hopDong/fetchCounts', async () => {
    const data = await hopDongApi.counts();
    return Object.fromEntries(
        data.map((c) => [c.idNcc, { tong: c.tong, dangHieuLuc: c.dangHieuLuc, sapHetHan: c.sapHetHan }]),
    );
});

export const createHopDong = createAsyncThunk(
    'hopDong/create',
    async ({ values, file }: { values: HopDongFormValues; file?: File }, thunkAPI) => {
        const result = await hopDongApi.create(values as never, file);
        thunkAPI.dispatch(fetchHopDongCounts());
        return mapDtoToHopDong(result);
    },
);

export const updateHopDong = createAsyncThunk(
    'hopDong/update',
    async ({ id, values, file }: { id: string; values: HopDongFormValues; file?: File }) => {
        const data = await hopDongApi.update(id, values, file);
        return mapDtoToHopDong(data);
    },
);

export const submitHopDong = createAsyncThunk('hopDong/submit', async (id: string) => { await hopDongApi.submit(id); return id; });
export const approveHopDong = createAsyncThunk(
    'hopDong/approve',
    async (id: string, thunkAPI) => {
        await hopDongApi.approve(id);

        thunkAPI.dispatch(fetchHopDongCounts());
        thunkAPI.dispatch(fetchSapHetHan(30));

        return id;
    }
);
export const rejectHopDong = createAsyncThunk(
    'hopDong/reject',
    async ({ id, lyDo }: { id: string; lyDo: string }) => {
        await hopDongApi.reject(id, lyDo);
        return { id, lyDo };
    },
);
export const cancelHopDong = createAsyncThunk(
    'hopDong/cancel',
    async (id: string, thunkAPI) => {
        await hopDongApi.cancel(id);

        thunkAPI.dispatch(fetchHopDongCounts());
        thunkAPI.dispatch(fetchSapHetHan(30));

        return id;
    }
);

export const deleteHopDong = createAsyncThunk(
    'hopDong/delete',
    async (id: string, thunkAPI) => {
        await hopDongApi.remove(id);

        thunkAPI.dispatch(fetchHopDongCounts());

        return id;
    }
);

export const hopDongSlice = createSlice({
    name: 'hopDong',
    initialState,
    reducers: {
        setHopDongFilter: (state, action: PayloadAction<HopDongFilter>) => { state.filter = action.payload; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchHopDongs.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchHopDongs.fulfilled, (state, action) => { state.isLoading = false; state.items = action.payload; })
            .addCase(fetchHopDongs.rejected, (state, action) => { state.isLoading = false; state.error = action.error.message || 'Lỗi tải danh sách'; })
            .addCase(fetchHopDongCounts.fulfilled, (state, action) => { state.counts = action.payload; })
            .addCase(createHopDong.fulfilled, (state, action) => {
                state.items.unshift(action.payload);
            })
            .addCase(updateHopDong.fulfilled, (state, action) => {
                const i = state.items.findIndex((h) => h.id === action.payload.id);
                if (i !== -1) state.items[i] = action.payload;
            })
            .addCase(fetchSapHetHan.fulfilled, (state, action) => { state.sapHetHanItems = action.payload; })
            .addCase(fetchSapHetHan.rejected, (state) => { state.sapHetHanItems = []; })
            .addCase(submitHopDong.fulfilled, (state, action) => {
                const hd = state.items.find((h) => h.id === action.payload);
                if (hd) hd.trangThai = HOP_DONG_STATUS.PENDING_APPROVAL;
            })
            .addCase(approveHopDong.fulfilled, (state, action) => {
                const hd = state.items.find((h) => h.id === action.payload);
                if (hd) hd.trangThai = HOP_DONG_STATUS.ACTIVE;
            })
            .addCase(rejectHopDong.fulfilled, (state, action) => {
                const hd = state.items.find((h) => h.id === action.payload.id);
                if (hd) {
                    hd.trangThai = HOP_DONG_STATUS.REJECTED;
                    hd.lyDoTuChoi = action.payload.lyDo;
                }
            })
            .addCase(cancelHopDong.fulfilled, (state, action) => {
                const hd = state.items.find((h) => h.id === action.payload);
                if (hd) hd.trangThai = HOP_DONG_STATUS.CANCELLED;
            })
            .addCase(deleteHopDong.fulfilled, (state, action) => { state.items = state.items.filter((h) => h.id !== action.payload); });
    },
});

export const { setHopDongFilter } = hopDongSlice.actions;
export default hopDongSlice.reducer;
