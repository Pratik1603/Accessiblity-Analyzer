import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  score: 0,
  summary: {},
  customChecks: {},
  scShot: [],
  reports: [],
};

const reportSlice = createSlice({
  name: "report",
  initialState,
  reducers: {
    setReport: (state, action) => {
      const { score, summary, customChecks, scShot } = action.payload;
      state.score = score;
      state.summary = summary;
      state.customChecks = customChecks;
      state.scShot = scShot;
    },
    clearReport: (state) => {
      state.score = 0;
      state.summary = {};
      state.customChecks = {};
      state.scShot = [];
    },
    setUserReports: (state, action) => {
      state.reports = action.payload; 
    },
    clearUserReports: (state) => {
      state.reports = [];
    },
  },
});

export const { setReport, clearReport,setUserReports,clearUserReports} = reportSlice.actions;
export default reportSlice.reducer;
