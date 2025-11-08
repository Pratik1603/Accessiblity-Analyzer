import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: localStorage.getItem("auth_token") || null,
  user: null,
  isAuthenticated: !!localStorage.getItem("auth_token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthToken: (state, action) => {
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.user = { email: action.payload.email }; // store email inside user object
      localStorage.setItem("auth_token", action.payload.token);
    },
    clearAuthToken: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("auth_token");
    },
   
  },
});

export const { setAuthToken, clearAuthToken, setUser } = authSlice.actions;
export default authSlice.reducer;
