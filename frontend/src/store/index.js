import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import transformReducer from './slices/transformSlice';
import { projectsApi } from './slices/projectsApiSlice';

// Persist config
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'transform'], // Only persist auth and transform state
  blacklist: [projectsApi.reducerPath], // Don't persist API cache in localStorage
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  transform: transformReducer,
  [projectsApi.reducerPath]: projectsApi.reducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(projectsApi.middleware),
});

export const persistor = persistStore(store);

export default store;
