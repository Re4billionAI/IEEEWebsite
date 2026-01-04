import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import panels from "../../../assets/images/panels.jpg";
import WeatherInfo from "./whether.js";
import {
  CalendarDays,
  Download,
  Thermometer,
  CheckCircle,
  CircleAlert,
} from "lucide-react";
import { useSelector } from "react-redux";

const CoolingSystemCard = ({ device, alert, type, capacity, lastupdate, date, setDate, chartData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const dateInputRef = useRef(null);
  
  const devicelocation = useSelector((state) => state.location.device);
  const timeDelta = devicelocation?.timeInterval || 5;

  // Use the lastupdate prop if available
  const lasttime = lastupdate ? new Date(lastupdate * 1000) : new Date();

  // Handle Export based on PASSED chartData (from parent)
  const handlePrint = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!chartData || chartData.length === 0) {
        alert("No data available to export for this date.");
        setIsLoading(false);
        return;
      }

      // Generate Excel Logic reused but using chartData prop
      const data = chartData.map((item) => {
        // Ensure consistent keys from parent data
        return {
          Time: item.ccAxisXValue || "Unknown",
          "Solar Voltage": parseFloat(item.SolarVoltage) || 0,
          "SV Unit": "V",
          "Solar Current": parseFloat(item.SolarCurrent) || 0,
          "SC Unit": "A",
          "Inverter Voltage": parseFloat(item.InverterVoltage) || 0,
          "IV Unit": "V",
          "Inverter Current": parseFloat(item.InverterCurrent) || 0,
          "IC Unit": "A",
          "Battery Current": parseFloat(item.BatteryCurrent) || 0,
          "BC Unit": "A",
          "Battery Voltage 1": parseFloat(item.BatteryVoltage) || 0,
          "BV1 Unit": "V",
          "Battery Voltage 2": parseFloat(item.BatteryVoltage2) || 0,
          "BV2 Unit": "V",
          "Battery Voltage 3": parseFloat(item.BatteryVoltage3) || 0,
          "BV3 Unit": "V",
          "Battery Voltage 4": parseFloat(item.BatteryVoltage4) || 0,
          "BV4 Unit": "V"
        };
      });

      // Calculate totals for summary
      let solarGeneration = 0;
      let loadConsumption = 0;

      chartData.forEach((item) => {
        const solarCurrent = parseFloat(item.SolarCurrent) || 0;
        const inverterCurrent = parseFloat(item.InverterCurrent) || 0;
        const solarVoltage = parseFloat(item.SolarVoltage) || 0;
        const inverterVoltage = parseFloat(item.InverterVoltage) || 0;

        solarGeneration += (solarCurrent * solarVoltage * timeDelta * 60) / (1000 * 3600);
        loadConsumption += (inverterCurrent * inverterVoltage * timeDelta * 60) / (1000 * 3600);
      });

      // Add summary row
      data.push({});
      data.push({
        Time: "End of Day Summary",
        "Solar Voltage": "Solar Generation:",
        "SV Unit": `${solarGeneration.toFixed(2)} kWh`,
        "Solar Current": "",
        "SC Unit": "",
        "Inverter Voltage": "Load Consumption:",
        "IV Unit": `${loadConsumption.toFixed(2)} kWh`,
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Energy Data");

      const width = { wch: 12 };
      ws["!cols"] = Array(20).fill(width);

      const formattedDate = format(date, "yyyy-MM-dd");
      const safeDeviceName = device?.replace(/[^a-zA-Z0-9-_]/g, "_") || "device";
      const filename = `${safeDeviceName}-${formattedDate}.xlsx`;

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, filename);

    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Failed to generate report.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between h-auto gap-4 w-full">
      <div className="flex flex-col sm:flex-row bg-white border-[1px] border-gray-300 shadow-sm overflow-hidden w-[70%]">
        {/* Image Section */}
        <img
          src={panels}
          alt="System"
          className="w-full sm:w-60 h-60 sm:h-auto object-cover object-center"
        />

        {/* Content Section */}
        <div className="flex flex-col justify-between p-4 w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold text-gray-800">{device}</h2>
            <div className="flex items-center text-gray-500 text-sm gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="font-medium text-gray-700">
                Last Update: {lasttime.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
              <Thermometer className="w-4 h-4" />
              Connected Capacity: {capacity} kWp
            </div>

            <div className="flex gap-3 items-center w-full sm:w-auto">
              <input
                type="date"
                ref={dateInputRef}
                value={format(date, "yyyy-MM-dd")}
                onChange={(e) => setDate(new Date(e.target.value))}
                max={format(new Date(), "yyyy-MM-dd")} 
                className="border border-gray-300 text-sm px-3 py-2 w-full sm:w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePrint}
                disabled={isLoading}
                className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Download className="w-4 h-4" />
                {isLoading ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>

          {/* Alert Status */}
          {alert !== "success" ? (
            <button className="flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2 text-sm shadow-md max-w-fit mr-auto">
              <CircleAlert className="w-4 h-4" /> Offline
            </button>
          ) : (
            <button className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 text-sm shadow-md max-w-fit mr-auto">
              <CheckCircle className="w-4 h-4" /> Online
            </button>
          )}
        </div>
      </div>

      {/* Weather Info */}
      <div className="flex flex-col items-center justify-between w-full sm:w-[50%] p-5 bg-white border-[1px] border-gray-300 shadow-sm">
        {devicelocation?.geocode && (
             <WeatherInfo lat={devicelocation.geocode[0]} lon={devicelocation.geocode[1]} />
        )}
      </div>
    </div>
  );
};

export default CoolingSystemCard;