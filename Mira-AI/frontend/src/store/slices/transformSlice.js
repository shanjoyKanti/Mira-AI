import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../utils/api';

// Async thunks for Transform workflow
export const listTransforms = createAsyncThunk(
  'transform/list',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.listTransforms();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch transforms'
      );
    }
  }
);

export const runStep1 = createAsyncThunk(
  'transform/step1',
  async ({ project_name, to_version }, { rejectWithValue }) => {
    try {
      const payload = { project_name };
      if (to_version) payload.to_version = to_version;
      const response = await apiService.runStep1(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to start Step 1'
      );
    }
  }
);

export const checkStep1Status = createAsyncThunk(
  'transform/step1Status',
  async ({ job_id }, { rejectWithValue }) => {
    try {
      const response = await apiService.runStep1Status(job_id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to check Step 1 status'
      );
    }
  }
);

export const runStep2 = createAsyncThunk(
  'transform/step2',
  async ({ transform_id, project_name }, { rejectWithValue }) => {
    try {
      const response = await apiService.runStep2({
        transform_id,
        project_name,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to start Step 2'
      );
    }
  }
);

export const checkStep2Status = createAsyncThunk(
  'transform/step2Status',
  async ({ job_id }, { rejectWithValue }) => {
    try {
      const response = await apiService.runStep2Status(job_id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to check Step 2 status'
      );
    }
  }
);

export const runStep3 = createAsyncThunk(
  'transform/step3',
  async ({ transform_id, project_name, user_input }, { rejectWithValue }) => {
    try {
      const response = await apiService.runStep3({
        transform_id,
        project_name,
        user_input,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to start Step 3'
      );
    }
  }
);

export const checkStep3Status = createAsyncThunk(
  'transform/step3Status',
  async ({ job_id }, { rejectWithValue }) => {
    try {
      const response = await apiService.runStep3Status(job_id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to check Step 3 status'
      );
    }
  }
);

export const runStep4 = createAsyncThunk(
  'transform/step4',
  async ({ transform_id, project_name }, { rejectWithValue }) => {
    try {
      const response = await apiService.runStep4({
        transform_id,
        project_name,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to start Step 4'
      );
    }
  }
);

export const checkStep4Status = createAsyncThunk(
  'transform/step4Status',
  async ({ job_id }, { rejectWithValue }) => {
    try {
      const response = await apiService.runStep4Status(job_id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to check Step 4 status'
      );
    }
  }
);

const initialState = {
  transforms: [],
  currentTransform: null,
  currentStep: 0, // 0-4
  currentJobId: null,
  jobStatus: null, // { status, result, error, task_durations_sec }
  loading: false,
  error: null,
};

const transformSlice = createSlice({
  name: 'transform',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTransform: (state, action) => {
      state.currentTransform = action.payload;
    },
    resetTransform: (state) => {
      state.currentTransform = null;
      state.currentStep = 0;
      state.currentJobId = null;
      state.jobStatus = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // List transforms
      .addCase(listTransforms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listTransforms.fulfilled, (state, action) => {
        state.loading = false;
        state.transforms = action.payload;
      })
      .addCase(listTransforms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Step 1
      .addCase(runStep1.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runStep1.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStep = 1;
        state.currentTransform = { transform_id: action.payload.transform_id, project_name: action.payload.project_name };
        state.currentJobId = action.payload.job_id;
        state.jobStatus = { status: 'running' };
      })
      .addCase(runStep1.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkStep1Status.fulfilled, (state, action) => {
        state.jobStatus = action.payload;
        if (action.payload.status === 'completed') {
          state.currentStep = 1;
        }
      })
      .addCase(checkStep1Status.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Step 2
      .addCase(runStep2.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runStep2.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStep = 2;
        state.currentJobId = action.payload.job_id;
        state.jobStatus = { status: 'running' };
      })
      .addCase(runStep2.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkStep2Status.fulfilled, (state, action) => {
        state.jobStatus = action.payload;
        if (action.payload.status === 'completed') {
          state.currentStep = 2;
        }
      })
      .addCase(checkStep2Status.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Step 3
      .addCase(runStep3.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runStep3.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStep = 3;
        state.currentJobId = action.payload.job_id;
        state.jobStatus = { status: 'running' };
      })
      .addCase(runStep3.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkStep3Status.fulfilled, (state, action) => {
        state.jobStatus = action.payload;
        if (action.payload.status === 'completed') {
          state.currentStep = 3;
        }
      })
      .addCase(checkStep3Status.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Step 4
      .addCase(runStep4.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runStep4.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStep = 4;
        state.currentJobId = action.payload.job_id;
        state.jobStatus = { status: 'running' };
      })
      .addCase(runStep4.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkStep4Status.fulfilled, (state, action) => {
        state.jobStatus = action.payload;
        if (action.payload.status === 'completed') {
          state.currentStep = 4;
        }
      })
      .addCase(checkStep4Status.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentTransform, resetTransform } = transformSlice.actions;
export default transformSlice.reducer;

// Updated by Moshiur Rahman on 2026-02-17
// Added: New feature implementation

// Dev: Arafat Uddin - 2026-03-13

// Dev: Shanjoy Kanti - 2026-04-10
