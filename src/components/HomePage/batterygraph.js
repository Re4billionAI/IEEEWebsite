import React, { useState, useCallback, useEffect } from "react";
import { useSelector } from 'react-redux';
import { ReferenceLine } from "recharts"; 
import { FiX } from "react-icons/fi";
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
import { Maximize2, ChevronDown } from 'lucide-react';

// Define tooltip colors for the Battery properties
const tooltipProps = {
  BatteryVoltage: { color: "blue" },
  BatteryVoltage2: { color: "green" },
  BatteryVoltage3: { color: "red" },
  BatteryVoltage4: { color: "purple" },
  BatteryCurrent: { color: "orange" },
  BatteryChargeCurrent: { color: "teal" },
  BatteryDischargeCurrent: { color: "brown" },
};

// Format the X-axis ticks (time labels)
const formatTick = (tick) => {
  if (!tick || typeof tick !== "string") return "";
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

// Custom Tooltip component displaying Battery units
const CustomTooltip = ({ active, payload, label }) => {
  const formatLabel = (label) => {
    return label.replace(/([a-z])([A-Z])/g, "$1 $2");
  };

  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-300 p-2 rounded-md shadow-sm">
        <p className="font-semibold">{`Time: ${label}`}</p>
        {payload.map((item, index) => (
          <p key={index} style={{ color: item.color }}>
            {`${formatLabel(item.name)}: ${
              item.value !== undefined ? item.value : "N/A"
            } ${units[item.name] || ""}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const BatteryGraph = ({ graphValues }) => {
  const site = useSelector((state) => state.location.device);
 

  // Define site-specific parameters
  const getParameters = (siteType, siteName) => {
    if (siteType === "testing 1") {
      return [
        { label: "Voltage1", key: "showVoltage1", dataKey: "BatteryVoltage" },
        { label: "Voltage2", key: "showVoltage2", dataKey: "BatteryVoltage2" },
        { label: "Voltage3", key: "showVoltage3", dataKey: "BatteryVoltage3" },
        { label: "Voltage4", key: "showVoltage4", dataKey: "BatteryVoltage4" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    } else if (siteType === "testing 2") {
      return [
        { label: "Voltage1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Voltage2", key: "showVoltage2", dataKey: "BatteryVoltage2" },
        { label: "Current", key: "showCurrent", dataKey: "BatteryCurrent" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    } else if (siteType === "testing 3" || siteName === "Saram-TN") {
      return [
        { label: "Voltage1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Current", key: "showCurrent", dataKey: "BatteryCurrent" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    }else if ( siteName === "KarelaPada-MH-48V" || siteName === "GhayGotha-MH-48V") {
      return [
          { label: "Voltage1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Voltage2", key: "showVoltage2", dataKey: "BatteryVoltage2" },
        { label: "Voltage3", key: "showVoltage3", dataKey: "BatteryVoltage3" },
        { label: "Voltage4", key: "showVoltage4", dataKey: "BatteryVoltage4" },
      { label: "Current", key: "showCurrent", dataKey: "BatteryCurrent" },
      
      ];
    }else if (siteType === "48v"&& (siteName !== "KarelaPada-MH"|| siteName !== "GhayGotha-MH")) {
      return [
        { label: "Voltage1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Voltage2", key: "showVoltage2", dataKey: "BatteryVoltage2" },
        { label: "Voltage3", key: "showVoltage3", dataKey: "BatteryVoltage3" },
        { label: "Voltage4", key: "showVoltage4", dataKey: "BatteryVoltage4" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    } else if (siteType === "24v") {
      return [
        { label: "Voltage1", key: "showVoltage", dataKey: "BatteryVoltage" },
        { label: "Current", key: "showCurrent", dataKey: "BatteryCurrent" },
        { label: "Charge Current", key: "showChrgCurrent", dataKey: "BatteryChargeCurrent" },
        { label: "Discharge Current", key: "showDisCurrent", dataKey: "BatteryDischargeCurrent" },
      ];
    }
    // Default case
    return [
      { label: "Voltage1", key: "showVoltage", dataKey: "BatteryVoltage" },
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

  // State for active modal
  const [activeModal, setActiveModal] = useState(null);

  // Handle modal toggle
  const handleModalToggle = (modalName) => {
    setActiveModal(modalName);
  };

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

  return (
    <>
      <div className="bg-white rounded-3xl border w-full sm:w-[49%] border-gray-200 overflow-hidden mb-6">
        <div className="flex justify-between items-center p-4 bg-gray-50 border border-b-gray-300 rounded-t-lg">
          <h3 className="md:text-lg text-sm text-black font-bold">
            Battery Readings
          </h3>
          <div className="flex gap-2">
            <div className="relative group inline-block">
              {/* Tooltip trigger */}
              <div className="cursor-pointer px-2 py-1 flex bg-gray-200 rounded-full text-sm">Options <ChevronDown/></div>

              {/* Tooltip content */}
              <div className="absolute hidden group-hover:block z-10 mt-0 p-3 bg-white border rounded-lg shadow-lg min-w-[160px] transform -translate-x-14 space-y-3">
                <div className="flex flex-col gap-1">
                  {parameters.map(param => {
                    const color = tooltipProps[param.dataKey].color;
                    return (
                      <button
                        key={param.key}
                        onClick={() => handleCheckboxChange("Battery", param.key, !visibility.Battery[param.key])}
                        style={{
                          backgroundColor: visibility.Battery[param.key] ? color : "transparent",
                          border: `2px solid ${visibility.Battery[param.key] ? color : "black"}`,
                          color: visibility.Battery[param.key] ? "white" : "black",
                        }}
                        className="w-full px-1 py-1 rounded-full text-sm transition-colors flex items-center justify-center"
                      >{param.label}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            <button onClick={() => handleModalToggle("Battery")} className="text-gray-600 bg-white rounded-lg md:block hidden border border-gray hover:text-gray-800 p-2 hover:bg-gray-100">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-0 pb-5 relative z-1">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={graphValues} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="ccAxisXValue" tickFormatter={formatTick} tick={{ fontSize: 12 }} />
              <YAxis domain={calculateYDomain()} tickCount={10} tick={{ fontSize: 12 }} tickFormatter={val => new Intl.NumberFormat().format(Math.round(val))} />
                <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              {parameters.map(param => (
                visibility.Battery[param.key] && <Line key={param.dataKey} type="monotone" dataKey={param.dataKey} stroke={tooltipProps[param.dataKey].color} dot={false} />
              ))}
              <Brush dataKey="ccAxisXValue" height={30} stroke="#007BFF" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal */}
      {activeModal && (
        <div className="fixed inset-0 flex items-center justify-center z-10">
          <div className="absolute inset-0 bg-gray-800 opacity-75" onClick={() => handleModalToggle(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-11/12 md:w-3/4">
            <div className="flex justify-between items-center p-2 gap-2 bg-gray-100 border border-b-gray-300 text-black rounded-t-lg">
              <h3 className="md:text-lg text-sm text-black font-bold">{`${activeModal} Readings`}</h3>
              <div className="flex gap-2">
                {parameters.map(param => {
                  const color = tooltipProps[param.dataKey].color;
                  return (
                    <button
                      key={param.key}
                      onClick={() => handleCheckboxChange(activeModal, param.key, !visibility[activeModal][param.key])}
                      style={{
                        backgroundColor: visibility[activeModal][param.key] ? color : 'transparent',
                        border: `2px solid ${color}`,
                        color: visibility[activeModal][param.key] ? 'white' : color,
                      }}
                      className="md:px-2 px-1 py-1 rounded-full md:text-[12px] text-[10px] transition-colors"
                    >{param.label}</button>
                  );
                })}
              </div>
              <button onClick={() => handleModalToggle(null)} className="text-gray-600 bg-white rounded-lg border border-gray hover:text-gray-800 p-2 hover:bg-gray-100">
                <FiX size={20} />
              </button>
            </div>
            <div className="pr-2 bg-white shadow rounded-lg overflow-x-auto">
              <div className="p-0 bg-white shadow rounded-lg w-full h-[250px] sm:h-[200px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphValues} margin={{ top: 10, right: 10, left: 0, bottom: 10 }} className="bg-gray-50">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="ccAxisXValue" tickFormatter={formatTick} tick={{ fontSize: 12 }} />
                    <YAxis domain={calculateYDomain()} tickCount={10} tick={{ fontSize: 12 }} tickFormatter={val => new Intl.NumberFormat().format(Math.round(val))} />
                      <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
                    <Tooltip content={<CustomTooltip />} />
                    {parameters.map(param => (
                      visibility[activeModal][param.key] && <Line key={param.dataKey} type="monotone" dataKey={param.dataKey} stroke={tooltipProps[param.dataKey].color} dot={false} className="transition duration-300 hover:opacity-80" />
                    ))}
                    <Brush dataKey="ccAxisXValue" height={30} stroke="#007BFF" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BatteryGraph;