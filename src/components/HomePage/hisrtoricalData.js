/* eslint-disable no-irregular-whitespace */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import axios from "axios";
import { useSelector } from "react-redux";
import { CalendarDays, Loader2, PlugZap, Sun, Zap, RefreshCw, AlertTriangle } from "lucide-react";

// ---------------------------------------------
// Constants
// ---------------------------------------------
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#84cc16","#f97316"];

// Series metadata (fixed colors)
const SERIES = {
  solar: { key: "solar", label: "Solar", color: "#10b981" }, // emerald
  grid:  { key: "grid",  label: "Grid",  color: "#3b82f6" }, // blue
  load:  { key: "load",  label: "Load",  color: "#f59e0b" }, // amber
};

// Formatters
const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// ---------------------------------------------
// Utils + Normalizers
// ---------------------------------------------
const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const monthLabel = (m) => MONTH_NAMES[Math.max(0, parseInt(m, 10) - 1)] || m;
const latestYearId = (yearly = []) => {
  if (!yearly.length) return new Date().getFullYear().toString();
  return yearly.map(y => y.id).sort((a, b) => parseInt(b, 10) - parseInt(a, 10))[0];
};
const latestMonthIdForYear = (yearly, yearId) => {
  const year = yearly?.find((y) => y.id === yearId);
  if (!year?.months) return "01";
  return Object.keys(year.months).sort((a, b) => parseInt(b, 10) - parseInt(a, 10))[0];
};

// IST helpers
const IST_TZ = "Asia/Kolkata";
const toIST = (dLike) => {
  const d = dLike instanceof Date ? dLike : new Date(dLike);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).formatToParts(d).reduce((acc,p)=> (acc[p.type]=p.value, acc), {});
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`);
};
const istYMD = (dLike) => {
  const d = toIST(dLike);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return { y, m, day };
};

// Normalizers
const pad2 = (v) => String(v).padStart(2, "0");

const normalizeDays = (daysIn) => {
  const out = {};
  if (!daysIn || typeof daysIn !== "object") return out;
  for (const [k, raw] of Object.entries(daysIn)) {
    const dd = pad2(k);
    const s = Number(raw?.solar ?? (typeof raw === "number" ? raw : 0)) || 0;
    const g = Number(raw?.grid ?? 0) || 0;
    const l = Number(raw?.load ?? 0) || 0;
    out[dd] = { solar: s, grid: g, load: l };
  }
  return out;
};

const normalizeMonthly = (monthlyIn = []) =>
  monthlyIn.map((m) => {
    const id = String(m?.id ?? "");
    const [y, mmRaw] = id.split("-");
    const mm = pad2(mmRaw ?? "");
    const idNorm = y && mm ? `${y}-${mm}` : id;
    return {
      ...m,
      id: idNorm,
      days: normalizeDays(m?.days),
      solar_energy_kwh: Number(m?.solar_energy_kwh ?? m?.energy_kwh ?? 0) || 0,
      grid_energy_kwh:  Number(m?.grid_energy_kwh  ?? 0) || 0,
      load_energy_kwh:  Number(m?.load_energy_kwh  ?? 0) || 0,
    };
  });

const normalizeYearly = (yearlyIn = []) =>
  yearlyIn.map((y) => {
    const months = {};
    for (const [mKey, raw] of Object.entries(y?.months || {})) {
      const mm = pad2(mKey);
      months[mm] = {
        solar: Number(raw?.solar ?? (typeof raw === "number" ? raw : 0)) || 0,
        grid:  Number(raw?.grid  ?? 0) || 0,
        load:  Number(raw?.load  ?? 0) || 0,
      };
    }
    const solarSum = Object.values(months).reduce((a, v) => a + v.solar, 0);
    const gridSum  = Object.values(months).reduce((a, v) => a + v.grid, 0);
    const loadSum  = Object.values(months).reduce((a, v) => a + v.load, 0);
    return {
      ...y,
      months,
      solarYearTotal: Number(y?.solarYearTotal ?? solarSum) || 0,
      gridYearTotal:  Number(y?.gridYearTotal  ?? gridSum)  || 0,
      loadYearTotal:  Number(y?.loadYearTotal  ?? loadSum)  || 0,
    };
  });

const normalizeHistorical = (json) => {
  const monthly = normalizeMonthly(json?.monthly || []);
  const yearly  = normalizeYearly(json?.yearly  || []);
  return { ...json, monthly, yearly };
};

// ---------------------------------------------
// API Helpers
// ---------------------------------------------
const useApiData = () => {
  const [apiData, setApiData] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [empty, setEmpty] = useState(false);

  const device = useSelector((state) => state.location.device);
  const API_URL =`${process.env.REACT_APP_HOST}/admin/getHistoricalData` // <- change if needed
  
  const SITE_ID = device?.path;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      setEmpty(false);
      if (!SITE_ID) throw new Error("No device/site selected.");

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: SITE_ID }),
      });
      if (!res.ok) {
        let msg = `Request failed: HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {}
        throw new Error(msg);
      }

      const raw = await res.json();
      if (!raw || raw.success === false) {
        throw new Error(raw?.message || "API returned no data or success=false");
      }

      const json = normalizeHistorical(raw);
      console.log({json})
      setApiData(json);

      const hasMonthly = Array.isArray(json.monthly) && json.monthly.length > 0;
      const hasYearly  = Array.isArray(json.yearly)  && json.yearly.length  > 0;
      if (!hasMonthly && !hasYearly) setEmpty(true);
    } catch (e) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (SITE_ID) fetchData(); }, [SITE_ID]);
  return { apiData, loading, error, empty, refetch: fetchData };
};

// Optional “Refresh Data” trigger
const triggerServerRecompute = async (device) => {
  const url =`${process.env.REACT_APP_HISTORY_URL}/SingleSiteHistoricalData`

 
// const url = "http://127.0.0.1:5001/rmstesting-d5aa6/us-central1/SingleSiteHistoricalData";
  const payload = {
    site: {
      name: device.name,
      path: device.path,
      timeInterval: device.timeInterval,
      siteId: device.path
    }
  };
  const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" }});
  return response.data;
};



// ---------------------------------------------
// UI Subcomponents
// ---------------------------------------------
const ErrorBanner = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-5 h-5" />
      <span className="font-medium">Error:</span>
      <span>{message}</span>
    </div>
    {onRetry && (
      <button onClick={onRetry} className="ml-4 px-3 py-1 border border-red-300 hover:bg-red-100 text-red-800">
        Retry
      </button>
    )}
  </div>
);

const EmptyState = ({ onRefresh }) => (
  <div className="border border-yellow-200 bg-yellow-50 text-yellow-900 px-4 py-3">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-5 h-5" />
      <div>
        <div className="font-semibold">No historical data available for this site yet.</div>
        <div className="text-sm mt-1">If you recently installed the device, click “Refresh Data”.</div>
      </div>
    </div>
    {onRefresh && (
      <div className="mt-3">
        <div className="text-sm mt-1">If you recently installed the device, the page reload will auto-recompute.</div>
      </div>
    )}
  </div>
);

const DataHeader = ({ loading, error, lastProcessedTs, device,  empty }) => {
 
 
  const statusText =
    loading ? "Loading data..." :
    error   ? `Error occurred` :
    empty   ? "No data available" :
    lastProcessedTs ? `Last updated: ${lastProcessedTs}` : "Real-time monitoring";

  return (
    <div className="bg-white px-8 py-2 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className={`flex items-center gap-2 mt-2 ${error ? "text-red-700" : "text-black"}`}>
            <CalendarDays className="w-4 h-4" />
            {statusText}
          </p>
        </div>
      
      </div>
     {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
     {(!error && empty) && <div className="mt-3"><EmptyState /></div>}
    </div>
  );
};

const EnergyConsumptionCards = ({ generation, loading: generationLoading, yesterdaySolarKwh,yesterdayGridKwh,  yesterdayLoadKwh }) => {
  const [cardLoading, setCardLoading] = useState(false);
  const [data, setData] = useState({ solargen: 0, gridgen: 0, loadconsumption: 0 });

  useEffect(() => {
    setCardLoading(true);
    const timer = setTimeout(() => {
      if (generation) {
        setData({
          solargen: Number(generation.solargen || 0),
          gridgen: Number(generation.gridgen || 0),
          loadconsumption: Number(generation.loadconsumption || 0),
        });
      }
      setCardLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [generation]);

  const CardLoader = () => (
    <div className="flex items-center justify-center h-16">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );


 
  

  return (
    <div className="bg-white border-b-2 border-gray-100">
      <div className="px-8 py-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Solar */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-emerald-500 p-2"><Sun className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="font-semibold text-gray-700">Solar Generation</h3>
                <p className="text-sm text-gray-500">Clean Energy</p>
              </div>
            </div>
            {cardLoading || generationLoading ? <CardLoader/> : (
              <>
                <div className="flex items-end gap-3">
                  <div className="text-3xl font-bold text-emerald-600">
                    {Number(data.solargen).toFixed(2)} <span className="text-lg text-gray-500">kWh</span>
                  </div>
                 
                </div>
                <div className="mt-2 text-sm text-gray-700">Yesterday: <span className="font-semibold">{nf.format(yesterdaySolarKwh || 0)} kWh</span></div>
              </>
            )}
          </div>

          {/* Grid */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-500 p-2"><PlugZap className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="font-semibold text-gray-700">Grid Energy</h3>
                <p className="text-sm text-gray-500">Utility Power</p>
              </div>
            </div>
            {cardLoading || generationLoading ? <CardLoader/> : (
              <>
                <div className="text-3xl font-bold text-blue-600">
                  {Number(data.gridgen).toFixed(2)} <span className="text-lg text-gray-500">kWh</span>
                </div>
                
                
   <div className="mt-2 text-sm text-gray-700">
         Yesterday: <span className="font-semibold">{nf.format(yesterdayGridKwh || 0)} kWh</span>
       </div>
              </>
            )}
          </div>

          {/* Load */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-100 border border-orange-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-orange-500 p-2"><Zap className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="font-semibold text-gray-700">Load Consumption</h3>
                <p className="text-sm text-gray-500">Total Usage</p>
              </div>
            </div>
            {cardLoading || generationLoading ? <CardLoader/> : (
              <>
                <div className="text-3xl font-bold text-orange-600">
                  {Number(data.loadconsumption).toFixed(2)} <span className="text-lg text-gray-500">kWh</span>
                </div>
              
                <div className="mt-2 text-sm text-gray-700">
        Yesterday: <span className="font-semibold">{nf.format(yesterdayLoadKwh || 0)} kWh</span>       </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Filter controls (NO "All")
const FilterControls = ({
  filterType, setFilterType,
  selectedYear, setSelectedYear,
  selectedMonth, setSelectedMonth,
  yearly, yearlyObj, currentYear, currentMonth,
  energyType, setEnergyType
}) => {
  const [openYearPopup, setOpenYearPopup] = useState(false);
  const [openMonthPopup, setOpenMonthPopup] = useState(false);

  return (
    <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-4">
        <div className="bg-white border border-gray-300 p-1">
          {[
            { key: "month", label: "Month View" },
            { key: "year", label: "Year View" },
            { key: "total", label: "Total View" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`px-6 py-2 text-sm font-medium transition-colors ${
                filterType === tab.key ? "bg-blue-600 text-white" : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
              }`}
              onClick={() => {
                setFilterType(tab.key);
                setOpenMonthPopup(false);
                setOpenYearPopup(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Energy Type (no "all") */}
        <div className="bg-white border border-gray-300 p-1 ml-2">
          {["solar","grid","load"].map((k) => (
            <button
              key={k}
              className={`px-4 py-2 text-sm font-medium capitalize ${
                energyType === k ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50"
              }`}
              onClick={() => setEnergyType(k)}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Year Selector */}
        <div className="relative">
          <button
            onClick={() => { setOpenYearPopup(!openYearPopup); setOpenMonthPopup(false); }}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50"
          >
            Year: {selectedYear}
          </button>
          {openYearPopup && (
            <div className="absolute z-10 mt-2 bg-white border border-gray-300 shadow-xl p-2 grid grid-cols-4 gap-2 max-h-60 min-w-[240px] overflow-auto">
              {yearly
                .slice()
                .sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10))
                .map((y) => (
                  <button
                    key={y.id}
                    onClick={() => {
                      setSelectedYear(y.id);
                      const monthsMap = yearly.find((yy) => yy.id === y.id)?.months || {};
                      const newMonth = monthsMap[currentMonth] !== undefined ? currentMonth : latestMonthIdForYear(yearly, y.id);
                      setSelectedMonth(newMonth);
                      setOpenYearPopup(false);
                    }}
                    className={`px-3 py-2 text-sm ${selectedYear === y.id ? "bg-blue-600 text-white" : "bg-gray-50 hover:bg-blue-50 text-gray-700"}`}
                  >
                    {y.id}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Month Selector */}
        {filterType === "month" && (
          <div className="relative">
            <button
              onClick={() => { setOpenMonthPopup(!openMonthPopup); setOpenYearPopup(false); }}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 min-w-[180px]"
            >
              {monthLabel(selectedMonth)} {selectedYear}
            </button>
            {openMonthPopup && (
              <div className="absolute z-10 mt-2 bg-white border border-gray-300 shadow-xl p-3 grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((m, idx) => {
                  const val = String(idx + 1).padStart(2, "0");
                  const has = yearlyObj?.months?.[val] !== undefined;
                  return (
                    <button
                      key={m}
                      disabled={!has}
                      onClick={() => { if (has) { setSelectedMonth(val); setOpenMonthPopup(false); } }}
                      className={`p-2 text-sm ${
                        selectedMonth === val ? "bg-blue-600 text-white"
                        : has ? "bg-gray-50 hover:bg-blue-50 text-gray-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------
// Charts (single series only)
// ---------------------------------------------
const MonthDailyChart = ({ data, selectedYear, selectedMonth, energyType }) => {
  const title = `Daily ${SERIES[energyType].label} Energy`;
  const noPoints = !data?.length || data.every(d => Number(d[energyType] ?? 0) === 0);

  return (
    <div className="bg-white border border-gray-200 mb-8">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {title} — {monthLabel(selectedMonth)} {selectedYear}
        </h2>
      </div>
      <div className="p-6">
        {noPoints ? (
          <div className="text-gray-500 text-sm">No data to display for this month.</div>
        ) : (
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis domain={[0, 'auto']} tickFormatter={(v) => `${v} kWh`} stroke="#6b7280" />
                <Tooltip
                  formatter={(v) => [`${nf.format(Number(v) || 0)} kWh`, SERIES[energyType].label]}
                  labelFormatter={(label) => `Day ${label}, ${monthLabel(selectedMonth)} ${selectedYear}`}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "0" }}
                />
                <Bar
                  dataKey={SERIES[energyType].key}
                  fill={SERIES[energyType].color}
                  name={SERIES[energyType].label}
                />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

const YearMonthlyBarAndPie = ({ monthlyChartData, pieData, selectedYear, total, energyType }) => {
  const title = `Monthly ${SERIES[energyType].label} Energy — ${selectedYear}`;
  const noPoints = !monthlyChartData?.length || monthlyChartData.every(d => Number(d[energyType] ?? 0) === 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
      <div className="bg-white border border-gray-200 xl:col-span-2">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="p-6">
          {noPoints ? (
            <div className="text-gray-500 text-sm">No data to display for this year.</div>
          ) : (
            <div className="w-full h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" />
                  <YAxis domain={[0, 'auto']} tickFormatter={(v) => `${v} kWh`} stroke="#6b7280" />
                  <Tooltip
                    formatter={(v) => [`${nf.format(Number(v) || 0)} kWh`, SERIES[energyType].label]}
                    labelFormatter={(label) => `${selectedYear} ${label}`}
                    contentStyle={{ backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "0" }}
                  />
                  <Bar
                    dataKey={SERIES[energyType].key}
                    fill={SERIES[energyType].color}
                    name={SERIES[energyType].label}
                  />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Solar distribution pie (unchanged) */}
      <div className="bg-white border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Monthly Solar Distribution</h2>
        </div>
        <div className="p-6">
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name">
                  {pieData.map((_, i) => <Cell key={`slice-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => `${nf.format(Number(v) || 0)} kWh`}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "0" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">Total Annual {SERIES[energyType].label} Energy</div>
            <div className="text-2xl font-bold text-gray-900">{nf.format(Number(total) || 0)} kWh</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TotalYearlyBar = ({ yearlyChartData, energyType }) => {
  const title = `Total Yearly ${SERIES[energyType].label} Energy`;
  const noPoints = !yearlyChartData?.length || yearlyChartData.every(d => Number(d[energyType] ?? 0) === 0);

  return (
    <div className="bg-white border border-gray-200 mb-8">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">
        {noPoints ? (
          <div className="text-gray-500 text-sm">No data to display across years.</div>
        ) : (
          <div className="w-full h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyChartData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#6b7280" />
                <YAxis domain={[0, 'auto']} tickFormatter={(v) => `${v} kWh`} stroke="#6b7280" />
                <Tooltip
                  formatter={(v) => [`${nf.format(Number(v) || 0)} kWh`, SERIES[energyType].label]}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "0" }}
                />
                <Bar
                  dataKey={SERIES[energyType].key}
                  fill={SERIES[energyType].color}
                  name={SERIES[energyType].label}
                />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------
// Main Component
// ---------------------------------------------
const MergedHistoricalPage = ({ generation }) => {
  const { apiData, loading, error, empty, refetch } = useApiData();

  const now = new Date();
  const CURRENT_YEAR = String(now.getFullYear());
  const CURRENT_MONTH = String(now.getMonth() + 1).padStart(2, "0");

  const [filterType, setFilterType] = useState("month");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [energyType, setEnergyType] = useState("solar"); // 'solar' | 'grid' | 'load'
const didRecompute = useRef(false); // guard (e.g., StrictMode)
 
  const device = useSelector((state) => state.location.device);

 // Detect hard reload (Navigation Timing v2; fallback to v1)
  const isPageReload = () => {
  const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (nav && "type" in nav) return nav.type === "reload";
    return window.performance?.navigation?.type === 1; // deprecated fallback
  };

 // Recompute only on first session load OR on hard reload
  useEffect(() => {
    if (!device) return;
    if (didRecompute.current) return;

    const firstVisitThisSession = !sessionStorage.getItem("__hist_recomputed");
    const reloaded = isPageReload();

    if (firstVisitThisSession || reloaded) {
      didRecompute.current = true;
      (async () => {
        try {
          await triggerServerRecompute(device);
          // After recompute, pull fresh data
          await refetch();
        } catch (e) {
          console.error(e);
        } finally {
          // mark so we don't run again in this tab session
          sessionStorage.setItem("__hist_recomputed", "1");
        }
      })();
    }
  }, [device, refetch]);



  const safe = {
    yearly: apiData?.yearly ?? [],
    monthly: apiData?.monthly ?? [],
    lastProcessedTs: apiData?.lastProcessedTs ?? ""
  };
  console.log(safe);

  // Initial selection based on available data
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    if (!safe.yearly.length) return;

    const hasCurrentYear = safe.yearly.some((y) => y.id === CURRENT_YEAR);
    const desiredYear = hasCurrentYear ? CURRENT_YEAR : latestYearId(safe.yearly);
    const monthsMap = safe.yearly.find((y) => y.id === desiredYear)?.months || {};
    const desiredMonth = monthsMap[CURRENT_MONTH] !== undefined ? CURRENT_MONTH : latestMonthIdForYear(safe.yearly, desiredYear);

    setSelectedYear(desiredYear);
    setSelectedMonth(desiredMonth);
    didInit.current = true;
  }, [safe.yearly, CURRENT_YEAR, CURRENT_MONTH]);

  // Ensure valid month when year changes
  useEffect(() => {
    if (!safe.yearly.length) return;
    const monthsMap = safe.yearly.find((y) => y.id === selectedYear)?.months || {};
    if (monthsMap[selectedMonth] === undefined) {
      const fallback = monthsMap[CURRENT_MONTH] !== undefined ? CURRENT_MONTH : latestMonthIdForYear(safe.yearly, selectedYear);
      if (fallback && fallback !== selectedMonth) setSelectedMonth(fallback);
    }
  }, [selectedYear, safe.yearly, CURRENT_MONTH, selectedMonth]);


 
  // Objects
  const yearlyObj = useMemo(
    () => safe.yearly.find((y) => y.id === selectedYear) || null,
    [safe.yearly, selectedYear]
  );

  const monthlyObj = useMemo(() => {
    const padded = `${selectedYear}-${selectedMonth}`;
    const unpad  = `${selectedYear}-${parseInt(selectedMonth, 10)}`;
    return (
      safe.monthly.find((m) => m.id === padded) ||
      safe.monthly.find((m) => m.id === unpad)  ||
      safe.monthly.find((m) => (m?.month_start || "").slice(0, 7) === padded) ||
      null
    );
  }, [safe.monthly, selectedYear, selectedMonth]);

  // ------- Chart data for ONE selected series -------
  const monthlyChartData = useMemo(() => {
    if (!yearlyObj?.months) return [];
    return Object.entries(yearlyObj.months)
      .map(([m, vals]) => ({ label: monthLabel(m), [energyType]: Number(vals?.[energyType] || 0) }))
      .sort((a, b) => MONTH_NAMES.indexOf(a.label) - MONTH_NAMES.indexOf(b.label));
  }, [yearlyObj, energyType]);

  const yearlyChartData = useMemo(() => {
    if (!safe.yearly.length) return [];
    return safe.yearly.map((y) => {
      const pick = energyType === "solar" ? y?.solarYearTotal : energyType === "grid" ? y?.gridYearTotal : y?.loadYearTotal;
      return { year: y.id, [energyType]: Number(pick || 0) };
    });
  }, [safe.yearly, energyType]);

  const dailyChartData = useMemo(() => {
    const y = parseInt(selectedYear, 10);
    const m = parseInt(selectedMonth, 10);
    const days = getDaysInMonth(y, m);
    return Array.from({ length: days }, (_, i) => {
      const key = String(i + 1).padStart(2, "0");
      const raw = monthlyObj?.days?.[key] || { solar: 0, grid: 0, load: 0 };
      return { day: key, [energyType]: Number(raw?.[energyType] || 0) };
    });
  }, [monthlyObj, selectedYear, selectedMonth, energyType]);

  // Pie = solar distribution across months (kept as-is)
  const pieData = useMemo(() => {
    if (!yearlyObj?.months) return [];
    return Object.entries(yearlyObj.months)
      .map(([m, v]) => ({ name: monthLabel(m), value: Number(v?.solar || 0) }))
      .sort((a, b) => MONTH_NAMES.indexOf(a.name) - MONTH_NAMES.indexOf(b.name));
  }, [yearlyObj]);

  // Period total number for the right card in Year view
  const periodEnergyKwh = useMemo(() => {
    if (filterType === "month") return Number(monthlyObj?.[`${energyType}_energy_kwh`] || 0);
    if (filterType === "year") {
      if (!yearlyObj) return 0;
      return Number(
        energyType === "solar" ? yearlyObj.solarYearTotal :
        energyType === "grid"  ? yearlyObj.gridYearTotal  :
                                 yearlyObj.loadYearTotal
      ) || 0;
    }
    // total across all years for selected series
    return safe.yearly.reduce((a, y) => {
      const v = energyType === "solar" ? y?.solarYearTotal : energyType === "grid" ? y?.gridYearTotal : y?.loadYearTotal;
      return a + Number(v || 0);
    }, 0);
  }, [filterType, monthlyObj, yearlyObj, safe.yearly, energyType]);

  // Yesterday Solar (IST) for header cards
  const yesterdayIST = new Date(toIST(new Date()).getTime() - 24 * 3600 * 1000);
  const { y: yY, m: mY, day: dY } = istYMD(yesterdayIST);
  const yesterdayMonthObj = useMemo(
    () => safe.monthly.find((m) => m.id === `${yY}-${mY}`) || null,
    [safe.monthly, yY, mY]
  );
  const yesterdaySolarKwh = useMemo(
    () => Number(yesterdayMonthObj?.days?.[dY]?.solar || 0),
    [yesterdayMonthObj, dY]
  );

const yesterdayGridKwh = useMemo(
 () => Number(yesterdayMonthObj?.days?.[dY]?.grid || 0),  [yesterdayMonthObj, dY]
); 
const yesterdayLoadKwh = useMemo(
  () => Number(yesterdayMonthObj?.days?.[dY]?.load || 0),
  [yesterdayMonthObj, dY]
 );

  // lastProcessedTs in IST
 // raw input can be ISO string like "2025-08-28T11:47:13.386Z" or a number (ms)
const rawLU = safe.lastProcessedTs;

// Ensure it's in ms
const timestampMs = typeof rawLU === "number" && rawLU < 1e12 
  ? rawLU * 1000   // convert seconds → ms
  : rawLU;

const d = new Date(timestampMs);

// Format in Kolkata timezone or return empty string if invalid
const lastProcessedTs = Number.isNaN(d.getTime())
  ? ""
  : d.toLocaleString("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

console.log("Last updated:", lastProcessedTs);

// Example: "28 Aug 2025, 17:20"


  return (
    <div className="bg-gray-50 min-h-screen">
    
 <DataHeader loading={loading} error={error} lastProcessedTs={lastProcessedTs} device={device} empty={empty} />


      <EnergyConsumptionCards generation={generation} loading={loading} yesterdaySolarKwh={yesterdaySolarKwh}  yesterdayGridKwh={yesterdayGridKwh}  yesterdayLoadKwh={yesterdayLoadKwh} />

      <FilterControls
        filterType={filterType}
        setFilterType={setFilterType}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        yearly={safe.yearly}
        yearlyObj={yearlyObj}
        currentYear={String(new Date().getFullYear())}
        currentMonth={String(new Date().getMonth() + 1).padStart(2, "0")}
        energyType={energyType}
        setEnergyType={setEnergyType}
      />

      <div className="px-8 py-6">
        {filterType === "month" && (
          <MonthDailyChart
            data={dailyChartData}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            energyType={energyType}
          />
        )}

        {filterType === "year" && (
          <YearMonthlyBarAndPie
            monthlyChartData={monthlyChartData}
            pieData={pieData}
            selectedYear={selectedYear}
            total={periodEnergyKwh}
            energyType={energyType}
          />
        )}

        {filterType === "total" && (
          <TotalYearlyBar
            yearlyChartData={yearlyChartData}
            energyType={energyType}
          />
        )}
      </div>
    </div>
  );
};

export default MergedHistoricalPage;
