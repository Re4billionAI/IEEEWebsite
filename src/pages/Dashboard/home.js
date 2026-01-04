import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, Home, BarChart2, Info } from 'lucide-react';

// Hooks
import { useDashboardData } from '../../hooks/useDashboardData';

// Components
import Spinner from "../../components/Loader/loader";
import SiteDetails from '../../components/InstallationForm/siteInfo.js';
import StatusCard from './components/statusCard';
import EnergyConsumptionCards from './components/GenCards'; // Was HistoricalPage/GenCards
import Graph from './components/graphs';
import ParameterRepresentation from './components/parameter';
import HistoryDashboard from './components/BarGraph/HistoryDashboard';

const HomePage = ({ handlePageChange }) => {
  const device = useSelector((state) => state.location.device);
  const [activeTab, setActiveTab] = useState('Overview');
  const [date, setDate] = useState(new Date());

  // Use the custom hook for all data fetching
  const { 
    data, 
    loading, 
    error, 
    alert, 
    energies, 
    snapshot,
    refresh 
  } = useDashboardData(device, date);

  const isToday = !date || new Date(date).toDateString() === new Date().toDateString();

  const ErrorDisplay = ({ message }) => (
    <div className="flex flex-col items-center justify-start h-screen w-full pt-28">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 max-w-md">
        <h3 className="text-red-600 text-xl font-bold mb-2 text-center">⚠️ Error</h3>
        <p className="text-gray-700 text-center">{message}</p>

        <button
          onClick={refresh}
          className="mt-4 w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="h flex flex-col md:px-6 gap-0 pb-[10px] md:pb-0">
      
      {/* Navigation Header */}
      <div className="relative p-1 flex items-center justify-center">
        <button
          className="absolute left-4 p-2 text-black flex hover:bg-gray-300 hover:text-black items-center rounded-full transition-colors"
          onClick={() => handlePageChange("mainPage")}
        >
          <ArrowLeft size={24} />
        </button>

        <div className="inline-flex items-center rounded">
          {['Overview', 'Analytics', 'Information'].map((tab) => {
            const icons = {
              Overview: <Home size={20} />,
              Analytics: <BarChart2 size={20} />,
              Information: <Info size={20} />
            };

            return (
              <button
                key={tab}
                className={`px-4 py-1 focus:outline-none flex items-center justify-center gap-2 ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-black font-semibold'
                    : 'text-gray-500 font-bold hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                <span className="sm:hidden">{icons[tab]}</span>
                <span className="hidden sm:inline">{tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-4">
        {loading && !data ? (
             <Spinner />
        ) : error ? (
            <ErrorDisplay message={error} />
        ) : (
          <>
            {activeTab === 'Overview' && (
              <div className="space-y-6">
                <StatusCard
                  device={device?.name || 'Unknown Device'}
                  type={device?.type || 'unknown'}
                  capacity={device?.capacity || 'N/A'}
                  
                  // Data Props
                  alert={alert}
                  lastupdate={snapshot?.tValue} // timestamp
                  
                  // Date Control
                  date={date}
                  setDate={setDate}
                  
                  // For Excel Export
                  chartData={data?.data?.dataCharts || []}
                />

                <EnergyConsumptionCards 
                    generation={energies} 
                    loading={loading}
                    isToday={isToday} 
                    parameters={snapshot} // Live voltage/current
                />

                {/* Only show HistoryDashboard (Bar Chart) if needed, or maybe pass data to it? 
                    It seems HistoryDashboard fetches its own data entirely? 
                    The user previously had it. It might duplicate logic.
                    For now, I'll keep it as is, but it might need refactoring too.
                */}
                <HistoryDashboard siteId={device?.path} />
                
                <ParameterRepresentation 
                    parameters={snapshot} 
                    device={device?.name} 
                    type={device?.type} 
                />
              </div>
            )}

            {activeTab === 'Analytics' && (
              <Graph 
                site={device?.name || 'Unknown'} 
                dataCharts={data?.data?.dataCharts || []} 
              />
            )}

            {activeTab === 'Information' && (
              <SiteDetails />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
