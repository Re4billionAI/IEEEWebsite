import React, { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import Cookies from "js-cookie";
import { useSelector } from 'react-redux';
import axios from "axios";
import { ChevronLeft, ChevronRight,ChevronDown, RefreshCcw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  ResponsiveContainer,
} from "recharts";
import { Maximize2 } from 'lucide-react';
import { FiX } from "react-icons/fi";
import BatteryGraph from "./batterygraph";

// Tooltip properties with colors
const tooltipProps = {
  "SolarVoltage": { color: "blue" },
  "SolarCurrent": { color: "green" },
  "SolarPower": { color: "red" },
  "InverterVoltage": { color: "blue" },
  "InverterCurrent": { color: "green" },
  "InverterPower":  { color: "red" },
  "GridVoltage": { color: "blue" },
  "GridCurrent": { color: "green" },
  "GridPower":  { color: "red" },
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
  GridVoltage: "V",
  GridCurrent: "A",
  GridPower: "W",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-300 p-2 rounded-md shadow-sm">
        <p className="font-semibold">{`Time: ${label}`}</p>
        {payload.map((item, index) => (
          <p key={index} style={{ color: item.color }}>
            {`${item.name}: ${item.value !== undefined ? item.value : 'N/A'} ${units[item.name] || ""}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const parameters = [
  { label: 'Voltage', key: 'showVoltage', index: 0 },
  { label: 'Current', key: 'showCurrent', index: 1 },
  { label: 'Power', key: 'showPower', index: 2 },
];

const Graph = ({  dataCharts }) => {
  
  const device = useSelector((state) => state.location.device);
 
  const [loading, setLoading] = useState(false);
  const [graphValues, setGraphValues] = useState(dataCharts);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeModal, setActiveModal] = useState(null);
  // Removed Battery from visibility state
  const [visibility, setVisibility] = useState({
    Solar: { showVoltage: true, showCurrent: true, showPower: true },
    Inverter: { showVoltage: true, showCurrent: true, showPower: true },
    Grid: { showVoltage: true, showCurrent: true, showPower: true },
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

  const handleCheckboxChange = useCallback((category, key, checked) => {
    setVisibility((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: checked,
      },
    }));
  }, []);

  const handleModalToggle = useCallback((category) => {
    setActiveModal((prev) => (prev === category ? null : category));
  }, []);

  // Removed Battery from categories
  const categories = {
    Solar: ["SolarVoltage", "SolarCurrent", "SolarPower"],
    Inverter: ["InverterVoltage", "InverterCurrent", "InverterPower"],
    Grid: ["GridVoltage", "GridCurrent", "GridPower"],
  };

  const calculateYDomain = (category, keys) => {
    const activeKeys = keys.filter((key, index) => {
      if (index === 0) return visibility[category]?.showVoltage;
      if (index === 1) return visibility[category]?.showCurrent;
      if (index === 2) return visibility[category]?.showPower;
      return false;
    });

    if (activeKeys.length === 0) {
      return [0, 100];
    }

    const values = graphValues.flatMap((data) =>
      activeKeys.map((key) => data[key] || 0)
    );

    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 100;
    
    return [0, max + 20];
  };

// ---- Helpers / Constants ----
const NIGHT_START_MIN = 19 * 60;      // 19:00 -> 1140
const MORNING_END_MIN = 5 * 60 + 30;  // 05:30 -> 330
const VOLTAGE_ZERO_EPS = 0;           // e.g., set 0.2 to treat near-zero as zero for solar
const MIN_AC_VOLTAGE = 50;            // Grid/Inverter clamp threshold

function getMinutesOfDayFromValue(v) {
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v; // seconds -> ms if needed
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
  return null; // unknown -> don't modify
}
function isNightTime(mins) {
  if (mins == null) return false;
  return mins >= NIGHT_START_MIN || mins < MORNING_END_MIN;
}

// ---- Main ----
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

        // -------- Solar rules --------
        const rawSolarV = chart.SolarVoltage ?? 0;
        const rawSolarI = chart.SolarCurrent ?? 0;

        const SolarVoltage = night ? 0 : rawSolarV;
        let SolarCurrent = night ? 0 : rawSolarI;

        // All-day rule: if solar volts ~ 0, force current = 0
        if (Math.abs(SolarVoltage) <= VOLTAGE_ZERO_EPS) {
          SolarCurrent = 0;
        }
        const SolarPower = (SolarCurrent * SolarVoltage).toFixed(2);

        // -------- Inverter rules (clamp if V < 50) --------
        const rawInvV = chart.InverterVoltage ?? 0;
        const rawInvI = chart.InverterCurrent ?? 0;
        const invClamped = rawInvV < MIN_AC_VOLTAGE;

        const InverterVoltage = invClamped ? 0 : rawInvV;
        const InverterCurrent = invClamped ? 0 : rawInvI;
        const InverterPower = (InverterCurrent * InverterVoltage).toFixed(2);

        // -------- Grid rules (clamp if V < 50) --------
        const rawGridV = chart.GridVoltage ?? 0;
        const rawGridI = chart.GridCurrent ?? 0;
        const gridClamped = rawGridV < MIN_AC_VOLTAGE;

        const GridVoltage = gridClamped ? 0 : rawGridV;
        const GridCurrent = gridClamped ? 0 : rawGridI;
        const GridPower = (GridCurrent * GridVoltage).toFixed(2);

        return {
          ccAxisXValue: formatTick(chart.ccAxisXValue),

          // Solar
          SolarVoltage,
          SolarCurrent,
          SolarPower,

          // Inverter
          InverterVoltage,
          InverterCurrent,
          InverterPower,

          // Grid
          GridVoltage,
          GridCurrent,
          GridPower,

          // Battery (unchanged except preserving negative discharge)
          BatteryCurrent: chart.BatteryCurrent || 0,
          BatteryVoltage: chart.BatteryVoltage || 0,
          BatteryVoltage2: chart.BatteryVoltage2 || 0,
          BatteryVoltage3: chart.BatteryVoltage3 || 0,
          BatteryVoltage4: chart.BatteryVoltage4 || 0,
          BatteryChargeCurrent: chart.BatteryChrgCurrent || 0,
          BatteryDischargeCurrent:
            chart.BatteryDisCurrent !== null && chart.BatteryDisCurrent !== undefined
              ? chart.BatteryDisCurrent
              : 0,
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

  return (
    <div className="m-2">
      
      <div className="flex items-center justify-start mb-4 gap-2 p-2 border md:rounded-lg rounded-lg shadow-md bg-gray-100">
      <div className="md:flex md:flex-row md:justify-between md:items-center gap-2 md:w-[60%] flex flex-col items-center justify-center w-full">
  <h1 className="text-xl font-semibold text-center md:text-left">{device.name}</h1>
  <div className="flex items-center gap-4 justify-center">
    <button
      onClick={() => handleNavigation("backward")}
      className="bg-blue-500 p-2 rounded-full hover:bg-blue-600 text-white"
      aria-label="Previous date"
    >
      <ChevronLeft className="w-5 h-5" />
    </button>
    <input
      type="date"
      value={format(selectedDate, "yyyy-MM-dd")}
      onChange={handleDateChange}
      className="p-2 border rounded-lg bg-white text-gray-900"
      aria-label="Select date"
    />
    <button
      onClick={() => handleNavigation("forward")}
      className="bg-blue-500 p-2 rounded-full hover:bg-blue-600 text-white"
      aria-label="Next date"
    >
      <ChevronRight className="w-5 h-5" />
    </button>
    <button
      onClick={refreshDate}
      className="bg-green-500 p-2 rounded-full hover:bg-green-600 text-white"
      aria-label="Refresh date"
    >
      <RefreshCcw className="w-5 h-5" />
    </button>
  </div>
</div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center my-4 h-56">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 border-solid"></div>
        </div>
      ) : (selectedDate > new Date()) ? (
        <div className="text-center p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
          <h1 className="text-lg font-semibold">Please select a current or past date</h1>
        </div>
      ) : (
        <div className="flex flex-wrap justify-between w-full">
          <BatteryGraph graphValues={graphValues}/>
          {Object.entries(categories).map(([category, keys]) => {
            const yDomain = calculateYDomain(category, keys);
            const categoryVisibility = visibility[category];

            return (
              <div key={category} className="bg-white  rounded-3xl border w-full sm:w-[49%] border-gray-200 overflow-hidden mb-6">
                
                <div className="flex justify-between items-center p-4 bg-gray-50 border border-b-gray-300 text-white rounded-t-lg">
                  <h3 className="md:text-lg text-sm text-black font-bold">{category} Readings</h3>
                  
                 <div className="flex justify-between items-center gap-2"> 
                  <div className="relative group inline-block">
  {/* Tooltip trigger */}
  <div className="cursor-pointer px-2 py-1 flex bg-gray-200 text-black rounded-full text-sm">
     Options <ChevronDown/>
  </div>

  {/* Tooltip content */}
  <div className="absolute hidden group-hover:block z-10 mt-0 p-3 bg-white border rounded-lg shadow-lg min-w-[160px] transform -translate-x-14 space-y-3">
    <div className="flex flex-col gap-1">
    {parameters.map((param) => {
                      const dataKey = keys[param.index];
                      const color = tooltipProps[dataKey].color;
                      
                      return (
                        <button
                          key={param.key}
                          onClick={() => handleCheckboxChange(
                            category, 
                            param.key, 
                            !categoryVisibility[param.key]
                          )}
                          style={{
                            backgroundColor: categoryVisibility[param.key] ? color : 'transparent',
                            border: `2px solid ${categoryVisibility[param.key] ? color : 'black'}`,
                            color: categoryVisibility[param.key] ? "white" : 'black',
                          }}
                          className="md:px-2 px-1 py-1 rounded-full md:text-[12px] text-[10px] font-small transition-colors"
                        >
                          {param.label}
                        </button>
                      );
                    })}
    </div>
  </div>

                  </div>

                  <button 
                    onClick={() => handleModalToggle(category)}
                    className="text-gray-600 bg-white md:block hidden rounded-lg border border-gray hover:text-gray-800 p-2 hover:bg-gray-100"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button></div>
                </div>
                <div className="p-0 pb-5 relative z-1">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={graphValues}
                      margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="ccAxisXValue" tickFormatter={formatTick} tick={{ fontSize: 12 }}/>
                      <YAxis
                        domain={yDomain}
                        tickCount={10}
                        tick={{
                          fontSize: 12
                        }}
                        tickFormatter={(value) =>
                          new Intl.NumberFormat().format(Math.round(value))
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {categoryVisibility.showVoltage && (
                        <Line type="monotone" dataKey={keys[0]} stroke={tooltipProps[keys[0]].color} dot={false} />
                      )}
                      {categoryVisibility.showCurrent && (
                        <Line type="monotone" dataKey={keys[1]} stroke={tooltipProps[keys[1]].color} dot={false} />
                      )}
                      {categoryVisibility.showPower && (
                        <Line type="monotone" dataKey={keys[2]} stroke={tooltipProps[keys[2]].color} dot={false} />
                      )}
                      <Brush dataKey="ccAxisXValue" height={30} stroke="#007BFF" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}

          {activeModal && (
            <div className="fixed inset-0 flex items-center justify-center z-10">
              <div
                className="absolute inset-0 bg-gray-800 opacity-75"
                onClick={() => handleModalToggle(null)}
              ></div>
              <div className="relative bg-white rounded-lg shadow-xl w-11/12 md:w-3/4">
                <div className="flex justify-between items-center p-2 gap-2 bg-gray-100 border border-b-gray-300 text-black rounded-t-lg">
                  <h3 className="md:text-lg text-sm text-black font-bold">{activeModal} Readings</h3>
                  <div className="flex gap-2">
                    {parameters.map((param) => {
                      const dataKey = categories[activeModal][param.index];
                      const color = tooltipProps[dataKey].color;
                      
                      return (
                        <button
                          key={param.key}
                          onClick={() => handleCheckboxChange(
                            activeModal, 
                            param.key, 
                            !visibility[activeModal][param.key]
                          )}
                          style={{
                            backgroundColor: visibility[activeModal][param.key] ? color : 'transparent',
                            border: `2px solid ${color}`,
                            color: visibility[activeModal][param.key] ? 'white' : color,
                          }}
                          className="md:px-2 px-1 py-1 rounded-full md:text-[12px] text-[10px] font-small transition-colors"
                        >
                          {param.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handleModalToggle(null)}
                    className="text-gray-600 bg-white rounded-lg border border-gray hover:text-gray-800 p-2 hover:bg-gray-100"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                
                <div className="pr-2 bg-white shadow rounded-lg overflow-x-auto">
                  <div className="p-0 bg-white shadow rounded-lg w-full h-[250px] sm:h-[200px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={graphValues}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                        className="bg-gray-50"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="ccAxisXValue"
                          tickFormatter={formatTick}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          domain={calculateYDomain(activeModal, categories[activeModal])}
                          tickCount={10}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) =>
                            new Intl.NumberFormat().format(Math.round(value))
                          }
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {visibility[activeModal]?.showVoltage && (
                          <Line
                            type="monotone"
                            dataKey={categories[activeModal][0]}
                            stroke={tooltipProps[categories[activeModal][0]].color}
                            dot={false}
                            className="transition duration-300 hover:opacity-80"
                          />
                        )}
                        {visibility[activeModal]?.showCurrent && (
                          <Line
                            type="monotone"
                            dataKey={categories[activeModal][1]}
                            stroke={tooltipProps[categories[activeModal][1]].color}
                            dot={false}
                            className="transition duration-300 hover:opacity-80"
                          />
                        )}
                        {visibility[activeModal]?.showPower && (
                          <Line
                            type="monotone"
                            dataKey={categories[activeModal][2]}
                            stroke={tooltipProps[categories[activeModal][2]].color}
                            dot={false}
                            className="transition duration-300 hover:opacity-80"
                          />
                        )}
                        <Brush dataKey="ccAxisXValue" height={30} stroke="#007BFF" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Graph;
