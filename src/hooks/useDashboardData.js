import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { format } from "date-fns";

export const useDashboardData = (device, date) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [energies, setEnergies] = useState({ solargen: 0, gridgen: 0, loadconsumption: 0 });
  const [snapshot, setSnapshot] = useState(null);

  const fetchData = useCallback(async () => {
    if (!device?.path) return;

    setLoading(true);
    setError(null);

    const token = Cookies.get('token');
    const isToday = !date || new Date(date).toDateString() === new Date().toDateString();

    try {
      if (!navigator.onLine) throw new Error('No internet connection.');
      if (!token) throw new Error('Authentication token is missing');

      const formattedDate = date ? format(date, "yyyy-MM-dd") : null;
      
      // Always fetch Live Data for Snapshot (tValue)
      const livePromise = axios.post(
          `${process.env.REACT_APP_HOST}/admin/db`,
          { selectedItem: device.path, timeInterval: device.timeInterval || 5 },
          { headers: { Authorization: `Bearer ${token}` } }
      );

      let historyPromise = Promise.resolve(null);
      
      if (!isToday) {
        historyPromise = axios.post(
          `${process.env.REACT_APP_HOST}/admin/date`,
          { selectedItem: device.path, date: formattedDate },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const [liveResponse, historyResponse] = await Promise.all([livePromise, historyPromise]);

      // Handle Snapshot (Always from Live Data)
      if (liveResponse.status === 200 && liveResponse.data?.data?.snapshot) {
          setSnapshot(liveResponse.data.data.snapshot);
      }

      // -------------------------------------------------------------
      // Determine which dataset to use for Charts & Energies
      // -------------------------------------------------------------
      
      let processingData = null; // The response data we will use for charts

      if (isToday) {
          // Use Live Data
          if (liveResponse.status === 200) {
              processingData = liveResponse.data;
              setData(liveResponse.data);
          }
      } else {
          // Use Historical Data
          if (historyResponse && historyResponse.status === 200) {
              processingData = historyResponse.data;
              setData(historyResponse.data);
          }
      }

      if (processingData && processingData.data) {
        const mainData = processingData.data;
        const charts = mainData.dataCharts || [];
        
        // Energies Calculation
        let solarGen = null;
        let loadCons = null;
        const timeDelta = device.timeInterval || 5;

        // Calculate from charts
        if (charts.length > 0) {
            solarGen = 0;
            loadCons = 0;
            charts.forEach((item) => {
                const solarV = parseFloat(item.SolarVoltage || item.solarVoltage) || 0;
                const solarC = parseFloat(item.SolarCurrent || item.solarCurrent) || 0;
                const invV = parseFloat(item.InverterVoltage || item.inverterVoltage) || 0;
                const invC = parseFloat(item.InverterCurrent || item.inverterCurrent) || 0;

                solarGen += (solarC * solarV * timeDelta * 60) / (1000 * 3600);
                loadCons += (invC * invV * timeDelta * 60) / (1000 * 3600);
            });
        }

        if (isToday) {
            setEnergies({
                solargen: solarGen,
                gridgen: mainData.p2ValueTot || 0,
                loadconsumption: loadCons
            });
        } else {
            setEnergies({
                solargen: solarGen,
                gridgen: 0, 
                loadconsumption: loadCons
            });
        }

        // Alert Logic (Always Check Live Status)
        // We always use liveResponse to determine if the device is currently online
        const liveCharts = liveResponse?.data?.data?.dataCharts || [];
        
        if (liveCharts.length > 0) {
            const lastChart = liveCharts[liveCharts.length - 1]; // Last data point
            const checkTime = lastChart.ccAxisXValue; // "HH:MM"
            if (checkTime) {
                const t = new Date();
                const [h, m] = checkTime.split(':').map(Number);
                const checkDate = new Date();
                checkDate.setHours(h, m, 0, 0);
                
                // Handle edge case where checkTime is yesterday (e.g. near midnight)
                if (checkDate > t) checkDate.setDate(checkDate.getDate() - 1);

                const diff = (t - checkDate) / (1000 * 60); // minutes
                setAlert(diff <= 30 ? "success" : "danger");
            } else {
                setAlert("danger");
            }
        } else {
            setAlert("danger"); // No live data available
        }
      }

    } catch (err) {
      console.error("Fetch Data Error:", err);
      // We might have partial success (e.g. Live worked, History failed)
      // For now, just show error
      setError(err.response?.data?.error || err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [device, date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, alert, energies, snapshot, refresh: fetchData };
};
