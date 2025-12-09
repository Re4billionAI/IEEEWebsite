import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ---------- Cookie helpers ----------
const getCookie = (name) => {
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return matches ? decodeURIComponent(matches[1]) : null;
};
const setCookie = (name, value, days = 30) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

// ---------- Initial device from cookies ----------
let parsedGeocode = [19.523652, 73.012513]; // default
try {
  const geoCookie = getCookie('locationGeocode');
  if (geoCookie) parsedGeocode = JSON.parse(geoCookie);
} catch (err) {
  console.error('Failed to parse locationGeocode cookie:', err);
}

const initialDevice = {
  name: getCookie('locationName') || 'GhayGotha-MH-48V',
  path: getCookie('locationPath') || 'GhayGotha-MH',
  board: getCookie('locationBoard') || 'rmsv31_002',
  type: getCookie('locationType') || '48v',
  geocode: parsedGeocode,
  timeInterval: getCookie('locationTimeInterval') || '5',
  capacity: getCookie('capacity') || 3.27,
  siteId: getCookie('siteId') || 'MH48V31002',
};

const initialSpecificPage = getCookie('specificPage') || 'mainPage';

// ---------- API thunk ----------
const DEFAULT_URL = `${process.env.REACT_APP_HOST}/admin/getAllSites`;

export const loadLocations = createAsyncThunk(
  'location/loadLocations',
  async (_, { rejectWithValue }) => {
    const base = process.env.REACT_APP_BACKEND_URL || DEFAULT_URL;
    try {
      const res = await fetch(base, { method: 'GET' });
      if (!res.ok) {
        return rejectWithValue(`HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json?.ok) {
        return rejectWithValue(json?.error || 'Unknown error from API');
      }

      // Normalize each site so the UI always gets expected fields
      const normalize = (s) => ({
        name: s.name ?? '',
        path: s.path ?? '',
        board: s.board ?? s.siteId ?? '',
        type: s.type ?? '',
        geocode: Array.isArray(s.geocode) ? s.geocode : [0, 0],
        timeInterval: s.timeInterval ?? 5,
        capacity: s.capacity ?? 1,
        siteId: s.siteId ?? s.name ?? '',
      });
      console.log({json})

      // Filter to only include sites where resident or residency is 'IEEE'
      return (json.sites || [])
        .filter((s) => s.resident === 'IEEE' || s.residency === 'IEEE')
        .map(normalize);
    } catch (e) {
      return rejectWithValue(e?.message || 'Network error');
    }
  }
);
//hi
// ---------- Slice ----------
export const locationSlice = createSlice({
  name: 'location',
  initialState: {
    device: initialDevice,
    locations: [],                 // now populated by API
    specificPage: initialSpecificPage,
    isSidebarOpen: false,
    loadStatus: 'idle',            // 'idle' | 'loading' | 'succeeded' | 'failed'
    loadError: null,
  },
  reducers: {
    updateLocation: (state, action) => {
      state.device = action.payload;

      // Persist key device fields into cookies for reloads
      const d = action.payload || {};
      if (d.name) setCookie('locationName', d.name);
      if (d.path) setCookie('locationPath', d.path);
      if (d.board) setCookie('locationBoard', d.board);
      if (d.type) setCookie('locationType', d.type);
      if (d.timeInterval != null) setCookie('locationTimeInterval', d.timeInterval);
      if (d.capacity != null) setCookie('capacity', d.capacity);
      if (d.siteId) setCookie('siteId', d.siteId);
      if (Array.isArray(d.geocode)) setCookie('locationGeocode', JSON.stringify(d.geocode));
    },
    addLocation: (state, action) => {
      state.locations.push(action.payload);
    },
    setLocations: (state, action) => {
      state.locations = action.payload || [];
    },
    toggleSpecificPage: (state, action) => {
      state.specificPage = action.payload;
      setCookie('specificPage', action.payload);
    },
    setSpecificPage: (state, action) => {
      state.specificPage = action.payload;
      setCookie('specificPage', action.payload);
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarState: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLocations.pending, (state) => {
        state.loadStatus = 'loading';
        state.loadError = null;
      })
      .addCase(loadLocations.fulfilled, (state, action) => {
        state.loadStatus = 'succeeded';
        state.locations = action.payload || [];

        // If current device's siteId is not found, try to default to first site
        const hasCurrent =
          state.device?.siteId &&
          state.locations.some((s) => s.siteId === state.device.siteId);

        if (!hasCurrent && state.locations.length > 0) {
          const d = state.locations[0];
          state.device = d;
          // sync cookies for the new default
          setCookie('locationName', d.name);
          setCookie('locationPath', d.path);
          setCookie('locationBoard', d.board);
          setCookie('locationType', d.type);
          setCookie('locationTimeInterval', d.timeInterval);
          setCookie('capacity', d.capacity);
          setCookie('siteId', d.siteId);
          setCookie('locationGeocode', JSON.stringify(d.geocode));
        }
      })
      .addCase(loadLocations.rejected, (state, action) => {
        state.loadStatus = 'failed';
        state.loadError = action.payload || 'Failed to load locations';
      });
  },
});

// ---------- Exports ----------
export const {
  updateLocation,
  addLocation,
  setLocations,
  toggleSpecificPage,
  setSpecificPage,
  toggleSidebar,
  setSidebarState,
} = locationSlice.actions;

export default locationSlice.reducer;
