

import { useRef, useEffect, useState } from "react";
import Cookies from "js-cookie";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import axios from "axios";
import { useSelector } from "react-redux";
import panels from "../images/panels.jpg";
import WeatherInfo from "./whether.js";
import {
  CalendarDays,
  Download,
  Thermometer,
  CheckCircle,
  CircleAlert,
} from "lucide-react";

const CoolingSystemCard = ({ device, alert, type, capacity, lastupdate, updatedEngergies }) => {
  const devicelocation = useSelector((state) => state.location.device);
  console.log("Device Location:", devicelocation);
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const lasttime = new Date(lastupdate * 1000);
  const dateInputRef = useRef(null);
  const timeDelta = devicelocation?.timeInterval; // Fallback to 1 if undefined



  useEffect(() => {
    const fetchData = async () => {
      const { newDataArray } = await dataFetch();

      if (newDataArray.length === 0) {
        console.warn("No data fetched for date:", format(date, "yyyy-MM-dd"));
        return;
      }

      let solarGeneration = 0;
      let gridEnergy = 0;
      let loadConsumption = 0;

      newDataArray.forEach((item) => {
        const solarCurrent = parseFloat(item.solarCurrent) || 0;
        const gridCurrent = parseFloat(item.gridCurrent) || 0;
        const inverterCurrent = parseFloat(item.inverterCurrent) || 0;
        const solarVoltage = parseFloat(item.solarVoltage) || 0;
        const gridVoltage = parseFloat(item.gridVoltage) || 0;
        const inverterVoltage = parseFloat(item.inverterVoltage) || 0;

        solarGeneration += (solarCurrent * solarVoltage * timeDelta * 60) / (1000 * 3600);
        gridEnergy += (gridCurrent * gridVoltage * timeDelta * 60) / (1000 * 3600);
        loadConsumption += (inverterCurrent * inverterVoltage * timeDelta * 60) / (1000 * 3600);
      });

      updatedEngergies(solarGeneration, gridEnergy, loadConsumption);
    };

    fetchData();
  }, [date]);

  const dataFetch = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await axios.post(
        `${process.env.REACT_APP_HOST}/admin/date`,
        { selectedItem: devicelocation?.path || "", date: format(date, "yyyy-MM-dd") },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        const dataCharts = response.data?.data?.dataCharts;
        if (!Array.isArray(dataCharts)) {
          throw new Error("Invalid API response: dataCharts is not an array");
        }

       

        const newDataArray = dataCharts.map((chart) => ({
          time: chart.ccAxisXValue || "Unknown",
          solarVoltage: `${chart.SolarVoltage || 0}`,
          solarCurrent: `${chart.SolarCurrent || 0}`,
          inverterVoltage: `${chart.InverterVoltage || 0}`,
          inverterCurrent: `${chart.InverterCurrent || 0}`,
          gridVoltage: `${chart.GridVoltage || 0}`,
          gridCurrent: `${chart.GridCurrent || 0}`,
          batteryCurrent: `${chart.BatteryCurrent || 0}`,
          batteryVoltage: `${chart.BatteryVoltage || 0}`,
          batteryVoltage1: `${chart.BatteryVoltage1 || 0}`,
          batteryVoltage2: `${chart.BatteryVoltage2 || 0}`,
          batteryVoltage3: `${chart.BatteryVoltage3 || 0}`,
          batteryVoltage4: `${chart.BatteryVoltage4 || 0}`,
          BatteryChrgCurrent:`${chart.BatteryChrgCurrent || 0}`,
          BatteryDisCurrent:`${chart.BatteryDisCurrent || 0}`

        }));
        console.log("Fetched data:", newDataArray);
        return { newDataArray };
      }
      return { newDataArray: [] };
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return { newDataArray: [] };
    }
  };

  const handlePrint = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { newDataArray } = await dataFetch();

      if (newDataArray.length === 0) {
        console.warn("No data fetched for the selected date");
        throw new Error("No data available for the selected date.");
      }
 console.log({"newDataArray":newDataArray})
      // Validate and transform data
      const data = newDataArray.map((item) => {
        const row = {
          Time: item.time || "Unknown",
          "Solar Voltage": parseFloat(item.solarVoltage) || 0,
          "SV Unit": "V",
          "Solar Current": parseFloat(item.solarCurrent) || 0,
          "SC Unit": "A",
          "Inverter Voltage": parseFloat(item.inverterVoltage) || 0,
          "IV Unit": "V",
          "Inverter Current": parseFloat(item.inverterCurrent) || 0,
          "IC Unit": "A",
          "Grid Voltage": parseFloat(item.gridVoltage) || 0,
          "GV Unit": "V",
          "Grid Current": parseFloat(item.gridCurrent) || 0,
          "GC Unit": "A",
          "Battery Current": parseFloat(item.batteryCurrent) || 0,
          "BC Unit": "A",
          "Battery Voltage 1": parseFloat(item.batteryVoltage) || 0,
          "BV1 Unit": "V",
          "Battery Voltage 2": parseFloat(item.batteryVoltage2) || 0,
          "BV2 Unit": "V",
          "Battery Voltage 3": parseFloat(item.batteryVoltage3) || 0,
          "BV3 Unit": "V",
          "Battery Voltage 4": parseFloat(item.batteryVoltage4) || 0,
          "BV4 Unit": "V",
           "BatteryChrgCurrent": parseFloat(item.BatteryChrgCurrent) || 0,
          "BCHC Unit": "A",
           "BatteryDisCurrent": parseFloat(item.BatteryDisCurrent) || 0,
          "BDSC Unit": "A",
        };

        // Validate numeric fields
        const numericFields = [
          "Solar Voltage", "Solar Current", "Inverter Voltage", "Inverter Current",
          "Grid Voltage", "Grid Current", "Battery Current",
          "Battery Voltage 1", "Battery Voltage 2", "Battery Voltage 3", "Battery Voltage 4","BatteryChrgCurrent","BatteryDisCurrent"
        ];
        numericFields.forEach((field) => {
          if (isNaN(row[field])) {
            console.warn(`Invalid numeric value for ${field} in row:`, row);
            row[field] = 0;
          }
        });

        return row;
      });

      console.log("Transformed data for Excel:", data);

      // Calculate energy values
      let solarGeneration = 0;
      let gridEnergy = 0;
      let loadConsumption = 0;

      newDataArray.forEach((item) => {
        const solarCurrent = parseFloat(item.solarCurrent) || 0;
        const gridCurrent = parseFloat(item.gridCurrent) || 0;
        const inverterCurrent = parseFloat(item.inverterCurrent) || 0;
        const solarVoltage = parseFloat(item.solarVoltage) || 0;
        const gridVoltage = parseFloat(item.gridVoltage) || 0;
        const inverterVoltage = parseFloat(item.inverterVoltage) || 0;

        solarGeneration += (solarCurrent * solarVoltage * timeDelta * 60) / (1000 * 3600);
        gridEnergy += (gridCurrent * gridVoltage * timeDelta * 60) / (1000 * 3600);
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
        "Inverter Voltage": "Grid Energy:",
        "IV Unit": `${gridEnergy.toFixed(2)} kWh`,
        "Inverter Current": "",
        "IC Unit": "",
        "Grid Voltage": "Load Consumption:",
        "GV Unit": `${loadConsumption.toFixed(2)} kWh`,
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Energy Data");

      // Set column widths
      const columnWidths = [
        { wch: 12 }, // Time
        { wch: 12 }, // Solar Voltage
        { wch: 7 }, // SV Unit
        { wch: 12 }, // Solar Current
        { wch: 7 }, // SC Unit
        { wch: 15 }, // Inverter Voltage
        { wch: 7 }, // IV Unit
        { wch: 15 }, // Inverter Current
        { wch: 7 }, // IC Unit
        { wch: 12 }, // Grid Voltage
        { wch: 7 }, // GV Unit
        { wch: 12 }, // Grid Current
        { wch: 7 }, // GC Unit
        { wch: 15 }, // Battery Current
        { wch: 7 }, // BC Unit
        { wch: 15 }, // Battery Voltage 1
        { wch: 7 }, // BV1 Unit
        { wch: 15 }, // Battery Voltage 2
        { wch: 7 }, // BV2 Unit
        { wch: 15 }, // Battery Voltage 3
        { wch: 7 }, // BV3 Unit
        { wch: 15 }, // Battery Voltage 4
        { wch: 7 }, // BV4 Unit
      ];
      ws["!cols"] = columnWidths;

      // Generate filename using selected date
      const formattedDate = format(date, "yyyy-MM-dd");
      const safeDeviceName = devicelocation?.name?.replace(/[^a-zA-Z0-9-_]/g, "_") || "device";
      const filename = `${safeDeviceName}-${formattedDate}.xlsx`;

      // Write to file using file-saver
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([excelBuffer], { type: fileType });
      saveAs(blob, filename);

      console.log(`Excel file saved as: ${filename}`);
    } catch (error) {
      console.error("Error generating Excel file:", error.message);
      if (typeof alert === "function") {
        alert(`Failed to generate Excel report: ${error.message}`);
      } else {
        console.warn(`Failed to generate Excel report: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between  h-auto   gap-4 w-full">
      <div className="flex flex-col sm:flex-row bg-white border-[1px] border-gray-300 shadow-sm overflow-hidden w-[70%]">
        {/* Image Section */}
        <img
          src={panels}
          alt="Cooling System"
          className="w-full sm:w-60 h-60 sm:h-auto object-cover object-center"
        />

        {/* Content Section */}
        <div className="flex flex-col justify-between p-4 w-full">
          {/* System Name & Last Update */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold text-gray-800">{device}</h2>
            <div className="flex items-center text-gray-500 text-sm gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="font-medium text-gray-700">
                Last Update: {lasttime.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Status & Date Picker */}
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
                max={format(new Date(), "yyyy-MM-dd")} // Disable future dates
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

          {/* Status Button */}
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
       <WeatherInfo lat={devicelocation.geocode[0]} lon={devicelocation.geocode[1]} />
    </div>
    </div>
  );
};

export default CoolingSystemCard;