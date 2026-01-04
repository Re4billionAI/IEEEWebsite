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
    setAlert(null);

    const token = Cookies.get('token');
    const isToday = !date || new Date(date).toDateString() === new Date().toDateString();

    try {
      if (!navigator.onLine) throw new Error('No internet connection.');
      if (!token) throw new Error('Authentication token is missing');

      let response;
      const formattedDate = date ? format(date, "yyyy-MM-dd") : null;

      // If it's today (or no date selected), use /admin/db for live data
      // Actually, StatusCard used /admin/date for historical and /admin/db for live? 
      // The previous logic was mixed. Let's standarize.
      // StatusCard fetched /admin/date even for today to get charts? 
      // GenCards relied on /admin/db.
      
      // We will try to fetch both or just one that gives us everything.
      // /admin/db gives snapshot + charts for today?.
      // /admin/date gives charts for that date.

      if (isToday) {
        // Fetch Live Data
        response = await axios.post(
          `${process.env.REACT_APP_HOST}/admin/db`,
          { selectedItem: device.path, timeInterval: device.timeInterval || 5 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Fetch Historical Data
        response = await axios.post(
          `${process.env.REACT_APP_HOST}/admin/date`,
          { selectedItem: device.path, date: formattedDate },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (response.status === 200) {
        const resData = response.data;
        const mainData = resData.data;
        
        // Handle slightly different structures if necessary
        // /admin/db -> { data: { p1ValueTot..., dataCharts: [] } }
        // /admin/date -> { data: { dataCharts: [] } } (Maybe?)

        const charts = mainData.dataCharts || [];
        
        setData(resData); // Full response
        setSnapshot(mainData.snapshot || {}); // Only available in /admin/db usually

        // Energies Calculation
        let solarGen = 0;
        let loadCons = 0;
        const timeDelta = device.timeInterval || 5;

        // Calculate from charts for both Live and Historical to get full precision
        // If charts are empty, we might fallback to pValueTot for 'isToday'
        if (charts.length > 0) {
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
            // If we calculated something, use it. Otherwise fallback to API total if available.
            // Note: API 'p1ValueTot' might be pre-calculated/truncated, but if charts are empty (start of day), it might be 0 anyway.
            setEnergies({
                solargen: solarGen || mainData.p1ValueTot || 0,
                gridgen: mainData.p2ValueTot || 0,
                loadconsumption: loadCons || mainData.p3ValueTot || 0
            });
        } else {
            setEnergies({
                solargen: solarGen,
                gridgen: 0, // Usually 0 for solar-only sites or calculated differently
                loadconsumption: loadCons
            });
        }

        // Alert Logic (Check freshness of data)
        if (isToday && charts.length > 0) {
            const lastChart = charts[charts.length - 1];
            const checkTime = lastChart.ccAxisXValue; // "HH:MM"
            if (checkTime) {
                const t = new Date();
                const [h, m] = checkTime.split(':').map(Number);
                const checkDate = new Date();
                checkDate.setHours(h, m, 0, 0);
                
                // Handle edge case where checkTime is yesterday (e.g. near midnight)
                // Just simple diff for now
                if (checkDate > t) checkDate.setDate(checkDate.getDate() - 1);

                const diff = (t - checkDate) / (1000 * 60); // minutes
                setAlert(diff <= 30 ? "success" : "danger");
            }
        } else if (isToday) {
            setAlert("danger"); // No data for today
        } else {
            setAlert(null); // No alert for history
        }

      }
    } catch (err) {
      console.error("Fetch Data Error:", err);
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
