import React, { useEffect, useState } from "react";
import { FaDesktop, FaLightbulb, FaFan, FaServer, FaCamera, FaLaptop, FaMoneyBillWave, FaWifi, FaSyncAlt } from "react-icons/fa";
import axios from "axios";

const deviceIcons = {
  "Monitor": FaDesktop,
  "Laptop Charger": FaLaptop,
  "CashCounter": FaMoneyBillWave,
  "CCTV": FaCamera,
  "Scanner": FaLightbulb,
  "Fan": FaFan,
  "WiFi Dongle": FaWifi,
  "Server": FaServer
};

export default function ApplianceStatus({ siteId="Saram-TN", siteName = "Saram-TN" }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch running devices from backend
  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching devices for siteName:", siteName);
      
      const res = await axios.post(
        "http://127.0.0.1:5001/rmstesting-d5aa6/us-central1/firebackend/admin/getLiveAppliances", 
        { siteName },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log("Full response:", res.data);
      
      // Check if response is successful
      if (res.data.ok) {
        // Try to get data from either runningDevices or appliances
        const deviceData = res.data.runningDevices || res.data.appliances || [];
        console.log("Device data:", deviceData);
        setDevices(deviceData);
      } else {
        console.error("API returned error:", res.data.error);
        setError(res.data.error || "Failed to fetch devices");
      }
      
    } catch (error) {
      console.error("Error fetching devices:", error);
      
      if (error.response) {
        // Server responded with error status
        console.error("Response error:", error.response.status, error.response.data);
        setError(`Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        console.error("Network error:", error.request);
        setError("Network error: Unable to reach server");
      } else {
        // Something else happened
        console.error("Request setup error:", error.message);
        setError(`Request error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {

    fetchDevices();
    
   
  }, [siteId, siteName]);



const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching devices for siteName:", siteName);
      
      const res = await axios.post(
        "http://127.0.0.1:5001/rmstesting-d5aa6/us-central1/firebackend/admin/loadmonitor", 
        { siteName, siteId },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log("Full response:", res.data);
      
      // Check if response is successful
      if (res.data.ok) {
        // Try to get data from either runningDevices or appliances
        const deviceData = res.data.runningDevices || res.data.appliances || [];
        console.log("Device data:", deviceData);
        setDevices(deviceData);
      } else {
        console.error("API returned error:", res.data.error);
        setError(res.data.error || "Failed to fetch devices");
      }
      
    } catch (error) {
      console.error("Error fetching devices:", error);
      
      if (error.response) {
        // Server responded with error status
        console.error("Response error:", error.response.status, error.response.data);
        setError(`Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        console.error("Network error:", error.request);
        setError("Network error: Unable to reach server");
      } else {
        // Something else happened
        console.error("Request setup error:", error.message);
        setError(`Request error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-6 bg-gray-100 rounded-lg min-h-screen mt-5">
      <h1 className="text-3xl font-bold mb-6 text-center">Appliance Status</h1>
      
      {/* Add error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center text-xl">Loading...</div>
      ) : (
        <>
          {/* Add debug info in development */}
          <div className="mb-4 text-sm flex flex -row justify-between  items-center text-gray-600">
            <p></p>
           <button
              onClick={refreshData}
              disabled={loading}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                loading
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700",
              ].join(" ")}
            >
              <FaSyncAlt className={["text-xs", loading ? "" : "animate-spin-slow"].join(" ")} />
              Refresh
            </button>
          </div>
        
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.keys(deviceIcons).map((deviceName) => {
              const Icon = deviceIcons[deviceName];
              const deviceData = devices.find(d => d.name === deviceName);
              const isRunning = deviceData ? (deviceData.units > 0 || deviceData.state > 0) : false;
              
              return (
                <div
                  key={deviceName}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-lg transform transition duration-300
                    ${isRunning ? "bg-green-200 scale-105" : "bg-gray-300 opacity-60"}`}
                >
                  <Icon className={`text-6xl ${isRunning ? "text-green-600" : "text-gray-500"}`} />
                  <span className="mt-3 text-lg font-semibold">{deviceName}</span>
                  {isRunning && (
                    <span className="mt-1 text-green-700 font-medium">
                      {deviceData.units > 0 ? `${deviceData.units} ON` : 'ON'}
                    </span>
                  )}
                  {!isRunning && <span className="mt-1 text-gray-600 font-medium">OFF</span>}
                  
                  {/* Debug info - remove in production */}
                  {deviceData && (
                    <div className="text-xs text-gray-500 mt-1">
                      Units: {deviceData.units}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}