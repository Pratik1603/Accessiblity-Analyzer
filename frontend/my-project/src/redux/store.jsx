import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage
import { combineReducers } from "redux";
import reportReducer from "./slices/reportSlice";
import authReducer from "./slices/authSlice";


// persist configuration
const persistConfig = {
  key: "root",
  storage,
};

// combine reducers
const rootReducer = combineReducers({
  report: reportReducer,
   auth: authReducer
});

// wrap reducer with persist capabilities
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);
