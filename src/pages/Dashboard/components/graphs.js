import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Cookies from "js-cookie";
import { useSelector } from 'react-redux';
import axios from "axios";
import { ChevronLeft, ChevronRight, RefreshCcw, Sun, Zap, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import BatteryGraph from "./batterygraph";

// Enhanced color scheme with distinct colors for each reading
const chartConfig = {
  solar: {
    voltage: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.15)" },    // Blue
    current: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.15)" },    // Emerald
    power: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.15)" },      // Amber
    theme: "emerald",
  },
  inverter: {
    voltage: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.15)" },      // Red
    current: { stroke: "#06b6d4", fill: "rgba(6, 182, 212, 0.15)" },      // Cyan
    power: { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.15)" },       // Indigo
    theme: "amber",
  },
};

const formatTick = (tick) => {
  if (!tick || typeof tick !== 'string') return '';
  const [hourStr, minuteStr] = tick.split(":");
  if (!hourStr || !minuteStr) return tick;
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr, 10);
  if (isNaN(hour) || isNaN(minute)) return tick;
  minute = minute < 10 ? `0${minute}` : minuteStr;
  hour = hour < 10 ? `0${hour}` : hour;
  return hour === 24 ? `00:${minute}` : `${hour}:${minute}`;
};

const units = {
  SolarVoltage: "V",
  SolarCurrent: "A",
  SolarPower: "W",
  InverterVoltage: "V",
  InverterCurrent: "A",
  InverterPower: "W",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border-2 border-gray-200 p-4 shadow-xl">
        <p className="font-bold text-gray-800 mb-2 text-sm">{`Time: ${label}`}</p>
        <div className="space-y-1.5">
          {payload.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.stroke }}
                />
                <span className="text-xs text-gray-600 font-medium">{item.name}:</span>
              </div>
              <span className="font-bold text-sm" style={{ color: item.stroke }}>
                {`${item.value !== undefined ? Number(item.value).toFixed(2) : 'N/A'} ${units[item.dataKey] || ""}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Graph = ({ dataCharts }) => {
  const device = useSelector((state) => state.location.device);
  const [loading, setLoading] = useState(false);
  const [graphValues, setGraphValues] = useState(dataCharts);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Visibility state for Solar and Inverter
  const [solarVisibility, setSolarVisibility] = useState({
    voltage: true,
    current: true,
    power: true,
  });
  
  const [inverterVisibility, setInverterVisibility] = useState({
    voltage: true,
    current: true,
    power: true,
  });

  const handleDateChange = (event) => {
    setSelectedDate(new Date(event.target.value));
  };

  const handleNavigation = (direction) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + (direction === "forward" ? 1 : -1));
    setSelectedDate(currentDate);
  };

  const refreshDate = () => {
    setSelectedDate(new Date());
  };

  // Helper functions
  const NIGHT_START_MIN = 19 * 60;
  const MORNING_END_MIN = 5 * 60 + 30;
  const VOLTAGE_ZERO_EPS = 0;
  const MIN_AC_VOLTAGE = 50;

  function getMinutesOfDayFromValue(v) {
    if (typeof v === "number") {
      const ms = v < 1e12 ? v * 1000 : v;
      const d = new Date(ms);
      if (!isNaN(d)) return d.getHours() * 60 + d.getMinutes();
    }
    if (typeof v === "string") {
      const iso = new Date(v);
      if (!isNaN(iso)) return iso.getHours() * 60 + iso.getMinutes();
      const hhmm = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
      if (hhmm) {
        let h = parseInt(hhmm[1], 10);
        const m = parseInt(hhmm[2], 10);
        const ampm = hhmm[3]?.toLowerCase();
        if (ampm) {
          if (ampm === "pm" && h < 12) h += 12;
          if (ampm === "am" && h === 12) h = 0;
        }
        if (h >= 0 && h < 24 && m >= 0 && m < 60) return h * 60 + m;
      }
    }
    return null;
  }

  function isNightTime(mins) {
    if (mins == null) return false;
    return mins >= NIGHT_START_MIN || mins < MORNING_END_MIN;
  }

  const changeDate = async () => {
    if (loading) setLoading(false);

    try {
      const token = Cookies.get("token");
      const response = await axios.post(
        `${process.env.REACT_APP_HOST}/admin/date`,
        {
          selectedItem: device?.path || "",
          date: format(selectedDate, "yyyy-MM-dd"),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200 && response.data?.data?.dataCharts) {
        const newDataArray = response.data.data.dataCharts.map((chart) => {
          const minutes = getMinutesOfDayFromValue(chart.ccAxisXValue);
          const night = isNightTime(minutes);

          const rawSolarV = chart.SolarVoltage ?? 0.00;
          const rawSolarI = chart.SolarCurrent ?? 0.00;

          const SolarVoltage = night ? 0.00 : rawSolarV;
          let SolarCurrent = night ? 0.00 : rawSolarI;

          if (Math.abs(SolarVoltage) <= VOLTAGE_ZERO_EPS) {
            SolarCurrent = 0.00;
          }
          const SolarPower = (SolarCurrent * SolarVoltage).toFixed(2);

          const rawInvV = chart.InverterVoltage ?? 0.00;
          const rawInvI = chart.InverterCurrent ?? 0.00;
          const invClamped = rawInvV < MIN_AC_VOLTAGE;

          const InverterVoltage = invClamped ? 0.00 : rawInvV;
          const InverterCurrent = invClamped ? 0.00 : rawInvI;
          const InverterPower = (InverterCurrent * InverterVoltage).toFixed(2);

          return {
            ccAxisXValue: formatTick(chart.ccAxisXValue),
            SolarVoltage,
            SolarCurrent,
            SolarPower,
            InverterVoltage,
            InverterCurrent,
            InverterPower,
            BatteryCurrent: chart.BatteryCurrent || 0.00,
            BatteryVoltage: chart.BatteryVoltage || 0.00,
            BatteryVoltage2: chart.BatteryVoltage2 || 0.00,
            BatteryVoltage3: chart.BatteryVoltage3 || 0.00,
            BatteryVoltage4: chart.BatteryVoltage4 || 0.00,
            BatteryChargeCurrent: chart.BatteryChrgCurrent || 0.00,
            BatteryDischargeCurrent:
              chart.BatteryDisCurrent !== null && chart.BatteryDisCurrent !== undefined
                ? chart.BatteryDisCurrent
                : 0.00,
          };
        });

        setGraphValues(newDataArray);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    changeDate();
  }, [selectedDate]);

  const toggleSolarVisibility = (key) => {
    setSolarVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const toggleInverterVisibility = (key) => {
    setInverterVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-md">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{device.name}</h1>
              <p className="text-sm text-gray-600 mt-0.5">Energy Analytics Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavigation("backward")}
              className="bg-white border-2 border-gray-200 p-2.5 hover:bg-gray-50 text-gray-700 transition-all hover:shadow-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={handleDateChange}
              className="px-4 py-2.5 border-2 border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            />
            <button
              onClick={() => handleNavigation("forward")}
              className="bg-white border-2 border-gray-200 p-2.5 hover:bg-gray-50 text-gray-700 transition-all hover:shadow-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={refreshDate}
              className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 hover:from-blue-600 hover:to-indigo-700 text-white transition-all shadow-md hover:shadow-lg"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96 bg-white border-2 border-gray-200">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 font-semibold text-lg">Loading analytics...</p>
          </div>
        </div>
      ) : selectedDate > new Date() ? (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 p-8 text-center">
          <h2 className="text-xl font-bold text-yellow-800">Please select a current or past date</h2>
        </div>
      ) : (
        <div className="space-y-6">
          <BatteryGraph graphValues={graphValues} />

          {/* Solar and Inverter Graphs */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Solar Graph */}
            <div className="bg-white border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-6 border-b-2 border-orange-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 shadow-md">
                      <Sun className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Solar Performance</h3>
                      <p className="text-sm text-gray-600 mt-0.5">Real-time generation metrics</p>
                    </div>
                  </div>

                  {/* Dropdown Toggle */}
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-200 hover:bg-orange-50 transition-all text-sm font-medium text-gray-700">
                      <TrendingUp className="w-4 h-4" />
                      Options
                    </button>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-gray-200 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Toggle Readings</p>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => toggleSolarVisibility('voltage')}
                          className={`px-3 py-2 text-xs font-medium transition-all text-left ${
                            solarVisibility.voltage
                              ? 'text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          style={solarVisibility.voltage ? { backgroundColor: chartConfig.solar.voltage.stroke } : {}}
                        >
                          Solar Voltage
                        </button>
                        <button
                          onClick={() => toggleSolarVisibility('current')}
                          className={`px-3 py-2 text-xs font-medium transition-all text-left ${
                            solarVisibility.current
                              ? 'text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          style={solarVisibility.current ? { backgroundColor: chartConfig.solar.current.stroke } : {}}
                        >
                          Solar Current
                        </button>
                        <button
                          onClick={() => toggleSolarVisibility('power')}
                          className={`px-3 py-2 text-xs font-medium transition-all text-left ${
                            solarVisibility.power
                              ? 'text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          style={solarVisibility.power ? { backgroundColor: chartConfig.solar.power.stroke } : {}}
                        >
                          Solar Power
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-orange-50/30 to-amber-50/30">
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={graphValues} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="solarVoltageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.solar.voltage.stroke} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartConfig.solar.voltage.stroke} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="solarCurrentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.solar.current.stroke} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartConfig.solar.current.stroke} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="solarPowerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.solar.power.stroke} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartConfig.solar.power.stroke} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                    <XAxis dataKey="ccAxisXValue" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {solarVisibility.voltage && (
                      <Area 
                        type="monotone" 
                        dataKey="SolarVoltage" 
                        stroke={chartConfig.solar.voltage.stroke}
                        fill="url(#solarVoltageGradient)"
                        strokeWidth={2.5}
                        name="Solar Voltage"
                      />
                    )}
                    {solarVisibility.current && (
                      <Area 
                        type="monotone" 
                        dataKey="SolarCurrent" 
                        stroke={chartConfig.solar.current.stroke}
                        fill="url(#solarCurrentGradient)"
                        strokeWidth={2.5}
                        name="Solar Current"
                      />
                    )}
                    {solarVisibility.power && (
                      <Area 
                        type="monotone" 
                        dataKey="SolarPower" 
                        stroke={chartConfig.solar.power.stroke}
                        fill="url(#solarPowerGradient)"
                        strokeWidth={2.5}
                        name="Solar Power"
                      />
                    )}
                    <Brush 
                      dataKey="ccAxisXValue" 
                      height={35} 
                      stroke={chartConfig.solar.power.stroke}
                      fill="rgba(245, 158, 11, 0.1)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inverter Graph */}
            <div className="bg-white border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 p-6 border-b-2 border-blue-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-md">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Inverter Performance</h3>
                      <p className="text-sm text-gray-600 mt-0.5">Load consumption metrics</p>
                    </div>
                  </div>

                  {/* Dropdown Toggle */}
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-200 hover:bg-blue-50 transition-all text-sm font-medium text-gray-700">
                      <TrendingUp className="w-4 h-4" />
                      Options
                    </button>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-gray-200 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Toggle Readings</p>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => toggleInverterVisibility('voltage')}
                          className={`px-3 py-2 text-xs font-medium transition-all text-left ${
                            inverterVisibility.voltage
                              ? 'text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          style={inverterVisibility.voltage ? { backgroundColor: chartConfig.inverter.voltage.stroke } : {}}
                        >
                          Inverter Voltage
                        </button>
                        <button
                          onClick={() => toggleInverterVisibility('current')}
                          className={`px-3 py-2 text-xs font-medium transition-all text-left ${
                            inverterVisibility.current
                              ? 'text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          style={inverterVisibility.current ? { backgroundColor: chartConfig.inverter.current.stroke } : {}}
                        >
                          Inverter Current
                        </button>
                        <button
                          onClick={() => toggleInverterVisibility('power')}
                          className={`px-3 py-2 text-xs font-medium transition-all text-left ${
                            inverterVisibility.power
                              ? 'text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          style={inverterVisibility.power ? { backgroundColor: chartConfig.inverter.power.stroke } : {}}
                        >
                          Inverter Power
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-blue-50/30 to-indigo-50/30">
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={graphValues} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inverterVoltageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.inverter.voltage.stroke} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartConfig.inverter.voltage.stroke} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="inverterCurrentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.inverter.current.stroke} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartConfig.inverter.current.stroke} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="inverterPowerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartConfig.inverter.power.stroke} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartConfig.inverter.power.stroke} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                    <XAxis dataKey="ccAxisXValue" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {inverterVisibility.voltage && (
                      <Area 
                        type="monotone" 
                        dataKey="InverterVoltage" 
                        stroke={chartConfig.inverter.voltage.stroke}
                        fill="url(#inverterVoltageGradient)"
                        strokeWidth={2.5}
                        name="Inverter Voltage"
                      />
                    )}
                    {inverterVisibility.current && (
                      <Area 
                        type="monotone" 
                        dataKey="InverterCurrent" 
                        stroke={chartConfig.inverter.current.stroke}
                        fill="url(#inverterCurrentGradient)"
                        strokeWidth={2.5}
                        name="Inverter Current"
                      />
                    )}
                    {inverterVisibility.power && (
                      <Area 
                        type="monotone" 
                        dataKey="InverterPower" 
                        stroke={chartConfig.inverter.power.stroke}
                        fill="url(#inverterPowerGradient)"
                        strokeWidth={2.5}
                        name="Inverter Power"
                      />
                    )}
                    <Brush 
                      dataKey="ccAxisXValue" 
                      height={35} 
                      stroke={chartConfig.inverter.power.stroke}
                      fill="rgba(99, 102, 241, 0.1)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Graph;
