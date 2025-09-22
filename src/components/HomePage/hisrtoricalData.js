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
import {
  CalendarDays,
  Loader2,
  PlugZap,
  Sun,
  Zap,
  AlertTriangle,
  Leaf,
  Factory,
  Cloud,
} from "lucide-react";

// ---------------------------------------------
// Constants
// ---------------------------------------------
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#84cc16","#f97316"];

const SERIES = {
  solar: { key: "solar", label: "Solar", color: "#10b981" },
  grid:  { key: "grid",  label: "Grid",  color: "#3b82f6" },
  load:  { key: "load",  label: "Load",  color: "#f59e0b" },
};

// Environmental factors
const EF_CO2_KG_PER_KWH = 0.70;
const TREE_CO2_ABSORB_KG_PER_YEAR = 21.77;
const KG_STANDARD_COAL_PER_KWH = 0.50;

// ---------- Financial constants (tweak as needed) ----------
const GRID_TARIFF_INR_PER_KWH   = 9.0;   // ₹/kWh avoided when solar serves on-site load
const EXPORT_TARIFF_INR_PER_KWH = 3.0;   // ₹/kWh for export (FiT/net-metering). Set 0 if not applicable.
const IS_PPA                     = false; // set true if a PPA is used
const PPA_RATE_INR_PER_KWH       = 0.0;  // ₹/kWh paid to PPA provider when IS_PPA is true
const PERIOD_OM_COST_INR         = 0.0;  // optional fixed O&M deduction per period

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
// API Helpers (Option A: gated auto-fetch + AbortController)
// ---------------------------------------------
const useApiData = (auto = true) => {
  const [apiData, setApiData] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [empty, setEmpty] = useState(false);

  const device = useSelector((state) => state.location.device);
  const API_URL = `${process.env.REACT_APP_HOST}/admin/getHistoricalData`;
  const SITE_ID = device?.path;

  const inFlight = useRef(null); // AbortController

  const fetchData = async () => {
    try {
      // cancel any previous request
      if (inFlight.current) inFlight.current.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;

      setLoading(true);
      setError("");
      setEmpty(false);
      if (!SITE_ID) throw new Error("No device/site selected.");

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: SITE_ID }),
        signal: ctrl.signal,
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
      setApiData(json);

      const hasMonthly = Array.isArray(json.monthly) && json.monthly.length > 0;
      const hasYearly  = Array.isArray(json.yearly)  && json.yearly.length  > 0;
      if (!hasMonthly && !hasYearly) setEmpty(true);
    } catch (e) {
      if (e.name === "AbortError") return; // silently ignore
      setError(e.message || "Unknown error");
    } finally {
      // clear saved controller if it belongs to this run
      inFlight.current = null;
      setLoading(false);
    }
  };

  // 👉 Only auto-fetch when `auto` is true
  useEffect(() => {
    if (auto && SITE_ID) fetchData();
    // cleanup on unmount: abort any in-flight request
    return () => {
      if (inFlight.current) inFlight.current.abort();
    };
  }, [SITE_ID, auto]);

  return { apiData, loading, error, empty, refetch: fetchData };
};

// Optional “Refresh Data” trigger
const triggerServerRecompute = async (device) => {
  const url = `${process.env.REACT_APP_HISTORY_URL}/SingleSiteHistoricalData`;
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
const ErrorBanner = ({ message }) => (
  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-5 h-5" />
      <span className="font-medium">Error:</span>
      <span>{message}</span>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="border border-yellow-200 bg-yellow-50 text-yellow-900 px-4 py-3">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-5 h-5" />
      <div>
        <div className="font-semibold">No historical data available for this site yet.</div>
        <div className="text-sm mt-1">If you recently installed the device, click “Refresh Data”.</div>
      </div>
    </div>
  </div>
);

const DataHeader = ({ loading, error, lastProcessedTs, empty }) => {
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

const EnergyConsumptionCards = ({ generation, loading: generationLoading,isToday,parameters, yesterdaySolarKwh,yesterdayGridKwh,  yesterdayLoadKwh }) => {
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
          <div className="relative overflow-hidden flex flex-row bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-emerald-500 p-2 ">
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 leading-tight">Solar Generation</h3>
                </div>
              </div>

              {cardLoading || generationLoading ? (
                <CardLoader/>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <div className="text-3xl font-bold text-emerald-700 tracking-tight">
                      {Number(data.solargen).toFixed(2)} <span className="text-lg font-medium text-gray-600">kWh</span>
                    </div>
                  </div>

                  {isToday && (
                    <div className="mt-2 text-xs sm:text-sm text-gray-700">
                      Yesterday: <span className="font-semibold">{nf.format(yesterdaySolarKwh || 0)} kWh</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right telemetry */}
            <div className="flex flex-row items-end justify-center  ml-auto mt-4 sm:mt-0">
              <div className="bg-white/70 flex flex-row items-center border justify-center   px-3 py-2 sm:px-4 sm:py-3 ">
                <span className="font-semibold">{parameters.solarVoltage.toFixed(2)} V</span>
                <span className="mx-3">{` ${"|"} `}</span>
                <span className="font-semibold">{parameters.solarCurrent.toFixed(2)} A</span>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-200/40 blur-2xl"></div>
          </div>

          {/* Grid */}
          <div className="relative overflow-hidden flex flex-row bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-500 p-2">
                  <PlugZap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 leading-tight">Grid Generation</h3>
                </div>
              </div>

              {cardLoading || generationLoading ? (
                <CardLoader/>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <div className="text-3xl font-bold text-blue-700 tracking-tight">
                      {Number(data.gridgen).toFixed(2)} <span className="text-lg font-medium text-gray-600">kWh</span>
                    </div>
                  </div>

                  {isToday && (
                    <div className="mt-2 text-xs sm:text-sm text-gray-700">
                      Yesterday: <span className="font-semibold">{nf.format(yesterdayGridKwh || 0)} kWh</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right telemetry */}
            <div className="flex flex-row items-end justify-center  ml-auto mt-4 sm:mt-0">
              <div className="bg-white/70 flex flex-row items-center border justify-center   px-3 py-2 sm:px-4 sm:py-3 ">
                <span className="font-semibold">{parameters.gridVoltage.toFixed(2)} V</span>
                <span className="mx-3">{` ${"|"} `}</span>
                <span className="font-semibold">{parameters.gridCurrent.toFixed(2)} A</span>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48  bg-blue-200/40 blur-2xl"></div>
          </div>

          {/* Load */}
          <div className="relative overflow-hidden flex flex-row bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-500 p-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 leading-tight">Load Consumption</h3>
                </div>
              </div>

              {cardLoading || generationLoading ? (
                <CardLoader/>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <div className="text-3xl font-bold text-orange-700 tracking-tight">
                      {Number(data.loadconsumption).toFixed(2)} <span className="text-lg font-medium text-gray-600">kWh</span>
                    </div>
                  </div>

                  {isToday && (
                    <div className="mt-2 text-xs sm:text-sm text-gray-700">
                      Yesterday: <span className="font-semibold">{nf.format(yesterdayLoadKwh || 0)} kWh</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right telemetry */}
            <div className="flex flex-row items-end justify-center  ml-auto mt-4 sm:mt-0">
              <div className="bg-white/70 flex flex-row items-center border justify-center   px-3 py-2 sm:px-4 sm:py-3 ">
                <span className="font-semibold">{parameters.inverterVoltage.toFixed(2)} V</span>
                <span className="mx-3">{` ${"|"} `}</span>
                <span className="font-semibold">{parameters.inverterCurrent.toFixed(2)} A</span>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48  bg-orange-200/40 blur-2xl"></div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Filter controls
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

        {/* Energy Type */}
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

// EnvironmentalBenefits
const EnvironmentalBenefits = ({ solarKwh, periodLabel }) => {
  const kwh = Math.max(0, Number(solarKwh) || 0);
  const co2Kg  = kwh * EF_CO2_KG_PER_KWH;
  const coalKg = kwh * KG_STANDARD_COAL_PER_KWH;
  const trees  = TREE_CO2_ABSORB_KG_PER_YEAR > 0 ? (co2Kg / TREE_CO2_ABSORB_KG_PER_YEAR) : 0;

  const items = [
    {
      title: "CO₂ Avoided",
      value: `${nf.format(co2Kg)} kg`,
      line: `${nf.format(kwh)} kWh → ${nf.format(co2Kg)} kg CO₂ avoided`,
      icon: <Cloud className="w-5 h-5 text-emerald-700" />,
      bgFrom: "from-emerald-50",
      bgTo: "to-green-100",
      border: "border-emerald-200",
    },
    {
      title: "Coal Saved",
      value: `${nf.format(coalKg)} kg`,
      line: `${nf.format(kwh)} kWh → ${nf.format(coalKg)} kg coal saved`,
      icon: <Factory className="w-5 h-5 text-blue-700" />,
      bgFrom: "from-blue-50",
      bgTo: "to-blue-100",
      border: "border-blue-200",
    },
    {
      title: "Trees Equivalent",
      value: nf.format(trees),
      line: `${nf.format(kwh)} kWh → ${nf.format(trees)} trees`,
      icon: <Leaf className="w-5 h-5 text-emerald-700" />,
      bgFrom: "from-lime-50",
      bgTo: "to-emerald-100",
      border: "border-lime-200",
    },
  ];

  return (
    <div className="bg-white border border-gray-200 mb-8">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Environmental Benefits</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it) => (
            <div
              key={it.title}
              className={`relative overflow-hidden bg-gradient-to-br ${it.bgFrom} ${it.bgTo} border ${it.border} rounded-lg p-5`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/80 p-2 rounded-md border">{it.icon}</div>
                <h3 className="font-semibold text-gray-800">{it.title}</h3>
              </div>

              <div className="text-3xl font-bold text-gray-900">{it.value}</div>
              <div className="text-sm text-gray-600 mt-1">{periodLabel}</div>

              <div className="text-xs text-gray-700 mt-2">{it.line}</div>

              <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/30 blur-2xl"></div>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-bold text-gray-900 mt-4">
          Factors: {EF_CO2_KG_PER_KWH} kg CO₂/kWh, {KG_STANDARD_COAL_PER_KWH} kg coal/kWh, 1 tree ≈ {TREE_CO2_ABSORB_KG_PER_YEAR} kg CO₂/yr.
        </div>
      </div>
    </div>
  );
};

// -------------------------
// FinancialBenefits (NEW)
// -------------------------
const FinancialBenefits = ({
  solarKwh,
  loadKwh,
  periodLabel,
  gridTariff = GRID_TARIFF_INR_PER_KWH,
  exportTariff = EXPORT_TARIFF_INR_PER_KWH,
  isPpa = IS_PPA,
  ppaRate = PPA_RATE_INR_PER_KWH,
  omCost = PERIOD_OM_COST_INR
}) => {
  // Approximation using totals:
  // Self-consumed ≈ min(solar, load); Export ≈ solar - self-consumed
  const kwhSolar  = Math.max(0, Number(solarKwh) || 0);
  const kwhLoad   = Math.max(0, Number(loadKwh)  || 0);
  const selfUse   = Math.min(kwhSolar, kwhLoad);
  const exportKwh = Math.max(0, kwhSolar - selfUse);

  // ₹ values
  const gridAvoidedINR = selfUse   * gridTariff;
  const exportINR      = exportKwh * exportTariff;
  const ppaCostINR     = isPpa ? (kwhSolar * ppaRate) : 0;

  const grossBenefitINR = gridAvoidedINR + exportINR;
  const netSavingsINR   = grossBenefitINR - ppaCostINR - (omCost || 0);
  const effRateINR      = kwhSolar > 0 ? (netSavingsINR / kwhSolar) : 0;

  const items = [
    {
      title: "Grid Cost Avoided",
      value: `₹ ${nf.format(gridAvoidedINR)}`,
      line: `${nf.format(selfUse)} kWh × ₹${gridTariff}/kWh`,
      bgFrom: "from-emerald-50", bgTo: "to-emerald-100", border: "border-emerald-200",
      icon: <PlugZap className="w-5 h-5 text-emerald-700" />
    },
   
    ...(isPpa ? [{
      title: "PPA Payment",
      value: `₹ ${nf.format(ppaCostINR)}`,
      line: `${nf.format(kwhSolar)} kWh × ₹${ppaRate}/kWh`,
      bgFrom: "from-amber-50", bgTo: "to-amber-100", border: "border-amber-200",
      icon: <CalendarDays className="w-5 h-5 text-amber-700" />
    }] : []),
    ...(omCost > 0 ? [{
      title: "O&M Cost (Period)",
      value: `₹ ${nf.format(omCost)}`,
      line: "Fixed O&M deducted",
      bgFrom: "from-slate-50", bgTo: "to-slate-100", border: "border-slate-200",
      icon: <Factory className="w-5 h-5 text-slate-700" />
    }] : [])
  ];

  return (
    <div className="bg-white border border-gray-200 mb-8">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Financial Benefits</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((it) => (
            <div key={it.title}
              className={`relative overflow-hidden bg-gradient-to-br ${it.bgFrom} ${it.bgTo} border ${it.border} rounded-lg p-5`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/80 p-2 rounded-md border">{it.icon}</div>
                <h3 className="font-semibold text-gray-800">{it.title}</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900">{it.value}</div>
              <div className="text-sm text-gray-600 mt-1">{periodLabel}</div>
              <div className="text-xs text-gray-700 mt-2">{it.line}</div>
              <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/30 blur-2xl"></div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border p-4">
            <div className="text-sm text-gray-600">Gross Benefit</div>
            <div className="text-2xl font-semibold">₹ {nf.format(grossBenefitINR)}</div>
          </div>
          <div className="border p-4">
            <div className="text-sm text-gray-600">Net Savings</div>
            <div className="text-2xl font-semibold">₹ {nf.format(netSavingsINR)}</div>
          </div>
          <div className="border p-4">
            <div className="text-sm text-gray-600">Effective Savings Rate</div>
            <div className="text-2xl font-semibold">₹ {nf.format(effRateINR)} / kWh</div>
          </div>
        </div>

        <div className="text-[11px] font-bold text-gray-900 mt-4">
          Assumptions: Self-consumption ≈ min(Solar kWh, Load kWh); Export ≈ Solar − Self-consumption.
          For exact values, use interval (15-min) data to compute simultaneity.
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------
// Main Component (Option A gating applied here)
// ---------------------------------------------
const MergedHistoricalPage = ({ generation, isToday, parameters }) => {
  // 👇 gate auto-fetch
  const [bootstrapped, setBootstrapped] = useState(false);
  const { apiData, loading, error, empty } = useApiData(bootstrapped);

  const now = new Date();
  const CURRENT_YEAR = String(now.getFullYear());
  const CURRENT_MONTH = String(now.getMonth() + 1).padStart(2, "0");

  const [filterType, setFilterType] = useState("month");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [energyType, setEnergyType] = useState("solar");
  const didRecompute = useRef(false);

  const device = useSelector((state) => state.location.device);

  // Detect hard reload
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
        } catch (e) {
          console.error(e);
        } finally {
          sessionStorage.setItem("__hist_recomputed", "1");
          setBootstrapped(true); // 👉 allow exactly ONE fetch now
        }
      })();
    } else {
      // No recompute needed this session—allow one normal fetch
      setBootstrapped(true);
    }
  }, [device]);

  const safe = {
    yearly: apiData?.yearly ?? [],
    monthly: apiData?.monthly ?? [],
    lastProcessedTs: apiData?.lastProcessedTs ?? ""
  };

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

  const pieData = useMemo(() => {
    if (!yearlyObj?.months) return [];
    return Object.entries(yearlyObj.months)
      .map(([m, v]) => ({ name: monthLabel(m), value: Number(v?.solar || 0) }))
      .sort((a, b) => MONTH_NAMES.indexOf(a.name) - MONTH_NAMES.indexOf(b.name));
  }, [yearlyObj]);

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
    return safe.yearly.reduce((a, y) => {
      const v = energyType === "solar" ? y?.solarYearTotal : energyType === "grid" ? y?.gridYearTotal : y?.loadYearTotal;
      return a + Number(v || 0);
    }, 0);
  }, [filterType, monthlyObj, yearlyObj, safe.yearly, energyType]);

  // Solar-only for Environmental Benefits
  const periodSolarKwh = useMemo(() => {
    if (filterType === "month") return Number(monthlyObj?.solar_energy_kwh || 0);
    if (filterType === "year")  return Number(yearlyObj?.solarYearTotal || 0);
    return safe.yearly.reduce((a, y) => a + Number(y?.solarYearTotal || 0), 0);
  }, [filterType, monthlyObj, yearlyObj, safe.yearly]);

  // Load energy for the period (for FinancialBenefits self-consumption calc)
  const periodLoadKwh = useMemo(() => {
    if (filterType === "month") return Number(monthlyObj?.load_energy_kwh || 0);
    if (filterType === "year")  return Number(yearlyObj?.loadYearTotal || 0);
    return safe.yearly.reduce((a, y) => a + Number(y?.loadYearTotal || 0), 0);
  }, [filterType, monthlyObj, yearlyObj, safe.yearly]);

  const periodLabel = useMemo(() => {
    if (filterType === "month") return `${monthLabel(selectedMonth)} ${selectedYear}`;
    if (filterType === "year")  return `${selectedYear}`;
    return "All Years";
  }, [filterType, selectedMonth, selectedYear]);

  // Yesterday metrics (IST)
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
  const rawLU = safe.lastProcessedTs;
  const timestampMs = typeof rawLU === "number" && rawLU < 1e12 ? rawLU * 1000 : rawLU;
  const d = new Date(timestampMs);
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

  return (
    <div className="bg-gray-50 min-h-screen">
      <DataHeader loading={loading} error={error} lastProcessedTs={lastProcessedTs} empty={empty} />

      <EnergyConsumptionCards
        generation={generation}
        loading={loading}
        isToday={isToday}
        yesterdaySolarKwh={yesterdaySolarKwh}
        yesterdayGridKwh={yesterdayGridKwh}
        yesterdayLoadKwh={yesterdayLoadKwh}
        parameters={parameters}
      />

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

      <EnvironmentalBenefits solarKwh={periodSolarKwh} periodLabel={periodLabel} />

      {/* NEW: Financial Benefits */}
      <FinancialBenefits
        solarKwh={periodSolarKwh}
        loadKwh={periodLoadKwh}
        periodLabel={periodLabel}
      />
    </div>
  );
};

export default MergedHistoricalPage;
