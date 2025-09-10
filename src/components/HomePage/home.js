import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import Cookies from 'js-cookie';
import Spinner from "../Loader/loader";
import { ArrowLeft, Menu } from 'lucide-react';
import StatusCard from './statusCard';
import EnergyConsumption from './EnergyConsumptions';
import Graph from './graphs';
import { Home, BarChart2, Info } from 'lucide-react'; // or your preferred icon library
import HistoricalPage from './hisrtoricalData';
import ParameterRepresentation from './parameter';

import SiteDetails from '../InstallationForm/siteInfo.js';
import { toggleSidebar } from '../Redux/CounterSlice';

const HomePage = ({ handlePageChange }) => {
  const device = useSelector((state) => state.location.device);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [alert, showAlert] = useState(null);
  const [energies, setEnergies] = useState({ solargen: 0, gridgen: 0, loadconsumption: 0 });

  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.location.isSidebarOpen);
  const allLocations = useSelector((state) => state.location.locations);

  const fetchData = async (item, timeInterval) => {
    if (!item) return;
    try {
      setLoading(true);
      setError(null);
      if (!navigator.onLine) throw new Error('No internet connection. Please check your network.');
      const token = Cookies.get('token');
      if (!token) throw new Error('Authentication token is missing');

      const response = await axios.post(
        `${process.env.REACT_APP_HOST}/admin/db`,
        { selectedItem: item, timeInterval },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        const data = response.data.data;
        setLiveData(response.data);
        setEnergies({
          solargen: data.p1ValueTot,
          gridgen: data.p2ValueTot,
          loadconsumption: data.p3ValueTot
        });

        if (data.dataCharts.length > 0) {
          const t = new Date();
          const currTime = new Intl.DateTimeFormat("en-US", {
            hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata"
          }).format(t); 

          const check = data.dataCharts[data.dataCharts.length - 1].ccAxisXValue;
          const [currHours, currMinutes] = currTime.split(":").map(Number);
          const [checkHours, checkMinutes] = check.split(":").map(Number);

          const now = new Date();
          const currentDateTime = new Date(now);
          currentDateTime.setHours(currHours, currMinutes, 0, 0);

          const checkDateTime = new Date(now);
          checkDateTime.setHours(checkHours, checkMinutes, 0, 0);
          if (checkDateTime > currentDateTime) checkDateTime.setDate(checkDateTime.getDate() - 1);

          const diffInMinutes = Math.abs((currentDateTime - checkDateTime) / (1000 * 60));

          showAlert(diffInMinutes <= 30 ? "success" : "danger");
        } else {
          showAlert("danger");
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message === 'No internet connection. Please check your network.'
        ? err.message
        : err.response?.data?.message || 'Failed to fetch data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const updatedEnergies = (solargen, gridgen, loadconsumption) => {
    setEnergies({ solargen, gridgen, loadconsumption });
  };

  const getDeviceCapacity = () => {
    if (!device?.name || !Array.isArray(allLocations)) return 'N/A';
    const match = allLocations.find((loc) => loc.name === device.name);
    return match?.capacity || 'N/A';
  };



  useEffect(() => {
    if (device?.path) fetchData(device.path, device.timeInterval);
  }, [device]);

  const ErrorDisplay = ({ message }) => (
    <div className="flex flex-col items-center justify-start h-screen w-full pt-28">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 max-w-md">
        <img
          src="/images/error-illustration.svg"
          alt="Error"
          className="w-32 h-32 mx-auto mb-4"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "data:image/svg+xml;base64,..."; // fallback base64
          }}
        />
        <h3 className="text-red-600 text-xl font-bold mb-2 text-center">Connection Error</h3>
        <p className="text-gray-700 text-center">{message}</p>
        <button
          onClick={() => {
            if (device?.path) fetchData(device.path, device.timeInterval);
          }}
          className="mt-4 w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="h flex flex-col md:px-6 gap-0 pb-[10px] md:pb-0">
      
   
     
       
<div className="relative p-1  flex items-center justify-center">
  {/* Arrow button fixed to the left */}
  <button
    className="absolute left-4 p-2  text-black  flex hover:bg-gray-300 hover:text-black items-center"
    onClick={() => handlePageChange("mainPage")}
  >
    <ArrowLeft size={24} />
  </button>

  {/* Tab Navigation centered */}
 <div className="inline-flex  items-center rounded ">
  {['Overview', 'Analytics', 'Information'].map((tab) => {
    const icons = {
      Overview: <Home size={20} />,
      Analytics: <BarChart2 size={20} />,
      Information: <Info size={20} />
    };

    return (
      <button
        key={tab}
        className={`px-4 py-1 focus:outline-none flex items-center justify-center ${
          activeTab === tab
            ? 'border-b-2 border-blue-500 text-black font-semibold'
            : 'text-gray-500 font-bold'
        }`}
        onClick={() => setActiveTab(tab)}
      >
        {/* Icon for mobile, hidden on sm+ */}
        <span className="sm:hidden">{icons[tab]}</span>

        {/* Text for sm+ screens, hidden on xs */}
        <span className="hidden sm:inline">{tab}</span>
      </button>
    );
  })}
</div>


</div>


        {loading && <Spinner />}
        {error && <ErrorDisplay message={error} />}

        {!loading && !error && liveData && (
          <div className="mt-4">
            {activeTab === 'Overview' && (
              <div>
                <StatusCard
                  device={device?.name || 'kollar'}
                  type={device?.type || 'unknown'}
                  alert={alert}
                  lastupdate={liveData.data.snapshot.tValue}
                  updatedEngergies={updatedEnergies}
                  capacity={getDeviceCapacity()}
                />
                {/* <EnergyConsumption generation={energies} /> */}
               
                 <HistoricalPage generation={energies} parameters={liveData.data.snapshot} device={device?.name || 'kollar'} type={device?.type || 'unknown'} />
                  <ParameterRepresentation parameters={liveData.data.snapshot} device={device?.name || 'kollar'} type={device?.type || 'unknown'} />
              </div>
            )}

            {activeTab === 'Analytics' && (
              <Graph site={device?.name || 'kollar'} dataCharts={liveData.data.dataCharts} />
            )}

            { activeTab === 'Information' && (
              <SiteDetails  />
            )}
          </div>
        )}
      </div>
  
  );
};

export default HomePage;
