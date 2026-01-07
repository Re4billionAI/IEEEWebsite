import React, { useState, useCallback, useEffect } from "react";
import { useSelector } from 'react-redux';
import { ReferenceLine, Legend } from "recharts"; 
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  ResponsiveContainer,
} from "recharts";
import { Battery, TrendingUp } from 'lucide-react';

// Enhanced color scheme with distinct colors for each battery reading
const batteryColors = {
  BatteryVoltage: { stroke: "#8b5cf6", fill: "rgba(139, 92, 246, 0.15)" },           // Purple
  BatteryVoltage2: { stroke: "#ec4899", fill: "rgba(236, 72, 153, 0.15)" },          // Pink
  BatteryVoltage3: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.15)" },          // Amber
  BatteryVoltage4: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.15)" },          // Emerald
  BatteryCurrent: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.15)" },            // Red
  BatteryChargeCurrent: { stroke: "#06b6d4", fill: "rgba(6, 182, 212, 0.15)" },      // Cyan
  BatteryDischargeCurrent: { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.15)" },  // Orange
};

// Format the X-axis ticks (time labels)
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

// Map Battery keys to their respective units
const units = {
  BatteryVoltage: "V",
  BatteryVoltage2: "V",
  BatteryVoltage3: "V",
  BatteryVoltage4: "V",
  BatteryCurrent: "A",
  BatteryChargeCurrent: "A",
  BatteryDischargeCurrent: "A",
};

// Custom Tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  const formatLabel = (label) => {
    return label.replace(/([a-z])([A-Z])/g, "$1 $2");
  };

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
                <span className="text-xs text-gray-600 font-medium">{formatLabel(item.name)}:</span>
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

const BatteryGraph = ({ graphValues }) => {
  const site = useSelector((state) => state.location.device);

  // Define site-specific parameters
  const getParameters = (siteType, siteName) => {
    if (siteType === "testing 1"|| siteName==="Testing2-48v") {
      return [
        { label: "Voltage 1", key: "showVoltage1", dataKey: "BatteryVoltage" },
        { label: "Voltage 2", key: "showVoltage2", dataKey: "BatteryVoltage2" },
        { label: "Voltage 3", key: "showVoltage3", dataKey: "BatteryVoltage3" },
        { label: "Voltage 4", key: "showVoltage4", dataKey: "BatteryVoltage4" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    } else if (siteType === "testing 2") {
      return [
        { label: "Voltage 1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Voltage 2", key: "showVoltage2", dataKey: "BatteryVoltage2" },
        { label: "Current", key: "showCurrent", dataKey: "BatteryCurrent" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    } else if (siteType === "testing 3" || siteName === "Saram-TN") {
      return [
        { label: "Voltage 1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Current", key: "showCurrent", dataKey: "BatteryCurrent" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    }else if (siteType === "48v") {
      return [
        { label: "Voltage 1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Voltage 2", key: "showVoltage2", dataKey: "BatteryVoltage2" },
        { label: "Voltage 3", key: "showVoltage3", dataKey: "BatteryVoltage3" },
        { label: "Voltage 4", key: "showVoltage4", dataKey: "BatteryVoltage4" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    } else if (siteType === "24v") {
      return [
        { label: "Voltage 1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Current", key: "showCurrent", dataKey: "BatteryCurrent" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    }
    // Default case
    return [
      { label: "Voltage 1", key: "showVoltage", dataKey: "BatteryVoltage" },
      { label: "Current", key: "showCurrent", dataKey: "BatteryCurrent" },
      { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
      { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
    ];
  };

  // Get parameters for current site
  const [parameters, setParameters] = useState(() => getParameters(site.type, site.name));

  // Initialize visibility state based on parameters
  const [visibility, setVisibility] = useState(() => {
    const initialVisibility = {};
    parameters.forEach(param => {
      initialVisibility[param.key] = true;
    });
    return { Battery: initialVisibility };
  });

  // Update parameters and visibility when site changes
  useEffect(() => {
    const newParameters = getParameters(site.type, site.name);
    setParameters(newParameters);

    const newVisibility = {};
    newParameters.forEach(param => {
      newVisibility[param.key] = true;
    });
    setVisibility({ Battery: newVisibility });
  }, [site.type, site.name]);

  // Toggle visibility for parameters
  const handleCheckboxChange = useCallback((category, key, checked) => {
    setVisibility(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: checked,
      },
    }));
  }, []);

  // Calculate Y-axis domain based on visible parameters
  const calculateYDomain = () => {
    const activeDataKeys = parameters
      .filter(param => visibility.Battery[param.key])
      .map(param => param.dataKey);

    if (activeDataKeys.length === 0) {
      return [0, 100];
    }

    const values = graphValues.flatMap(data =>
      activeDataKeys.map(key => Number(data[key]) || 0)
    );

    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.floor(min - 5), Math.ceil(max + 5)];
  };

  const calculateStats = (data, keys) => {
    const values = data.flatMap(d => keys.map(k => Number(d[k]) || 0));
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { max: max.toFixed(2), avg: avg.toFixed(2) };
  };

  const batteryStats = calculateStats(
    graphValues, 
    parameters.map(p => p.dataKey)
  );

  return (
    <div className="bg-white border-2 border-gray-200 shadow-lg overflow-hidden w-full">
      <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 p-6 border-b-2 border-emerald-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 shadow-md">
              <Battery className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Battery Performance</h3>
              <p className="text-sm text-gray-600 mt-0.5">Voltage and current metrics</p>
            </div>
          </div>

          {/* Dropdown Toggle */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-emerald-200 hover:bg-emerald-50 transition-all text-sm font-medium text-gray-700">
              <TrendingUp className="w-4 h-4" />
              Options
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-gray-200 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Toggle Readings</p>
              <div className="flex flex-col gap-2">
                {parameters.map(param => {
                  const colorConfig = batteryColors[param.dataKey];
                  const isActive = visibility.Battery[param.key];
                  return (
                    <button
                      key={param.key}
                      onClick={() => handleCheckboxChange("Battery", param.key, !isActive)}
                      className={`px-3 py-2 text-xs font-medium transition-all text-left ${
                        isActive
                          ? 'text-white shadow-md'
                          : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                      style={isActive ? { backgroundColor: colorConfig.stroke } : {}}
                    >
                      {param.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-br from-emerald-50/30 to-green-50/30">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={graphValues} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              {Object.entries(batteryColors).map(([key, config]) => (
                <linearGradient key={key} id={`${key}Gradient`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.stroke} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={config.stroke} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
            <XAxis dataKey="ccAxisXValue" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
            <YAxis 
              domain={calculateYDomain()} 
              tickCount={10} 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              stroke="#9ca3af"
              tickFormatter={val => new Intl.NumberFormat().format(Math.round(val))} 
            />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {parameters.map(param => (
              visibility.Battery[param.key] && (
                <Area 
                  key={param.dataKey} 
                  type="monotone" 
                  dataKey={param.dataKey} 
                  stroke={batteryColors[param.dataKey].stroke}
                  fill={`url(#${param.dataKey}Gradient)`}
                  strokeWidth={2.5}
                  name={param.label}
                />
              )
            ))}
            <Brush 
              dataKey="ccAxisXValue" 
              height={35} 
              stroke="#10b981"
              fill="rgba(16, 185, 129, 0.1)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BatteryGraph;
