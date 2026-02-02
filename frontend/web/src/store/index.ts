/**
 * GONZALES TAX PLATFORM - Redux Store
 * Agent Xiomara - Frontend/UX Master
 */
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Auth Slice
interface AuthState {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: AuthState['user']; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

// Tax Return Slice
interface TaxReturnState {
  currentReturn: {
    id: string;
    taxYear: number;
    status: string;
  } | null;
  isDirty: boolean;
}

const initialTaxReturnState: TaxReturnState = {
  currentReturn: null,
  isDirty: false,
};

const taxReturnSlice = createSlice({
  name: 'taxReturn',
  initialState: initialTaxReturnState,
  reducers: {
    setCurrentReturn: (state, action: PayloadAction<TaxReturnState['currentReturn']>) => {
      state.currentReturn = action.payload;
      state.isDirty = false;
    },
    markDirty: (state) => {
      state.isDirty = true;
    },
    clearReturn: (state) => {
      state.currentReturn = null;
      state.isDirty = false;
    },
  },
});

// Configure Store
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    taxReturn: taxReturnSlice.reducer,
  },
});

export const { setCredentials, logout } = authSlice.actions;
export const { setCurrentReturn, markDirty, clearReturn } = taxReturnSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
