
import { useState, useEffect, useCallback } from 'react';
import { Activity, Sun, Power, Search, Zap, Battery, ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BsBatteryCharging } from "react-icons/bs";
import Cookies from 'js-cookie';
import { updateLocation } from '../Redux/CounterSlice';
import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import debounce from 'lodash.debounce';

// Define the API URL
const DATA_URL = `${process.env.REACT_APP_HOST}/admin/sitesBriefData`;

export default function BrieData({ handlePageChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navLoading, setNavLoading] = useState(false); // Loading state for navigation
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'siteName', direction: 'ascending' });
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'inactive'
  const [voltageFilter, setVoltageFilter] = useState('all'); // 'all', '24v', '48v'
  const [selectedDate, setSelectedDate] = useState(new Date()); // User-selected date
  const [lastUpdated, setLastUpdated] = useState(null); // Timestamp of last data refresh

  const additionalData = useSelector((state) => state.location.locations);

  const getCookie = (name) => {
    const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return matches ? decodeURIComponent(matches[1]) : null;
  };

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [selectedLocation, setSelectedLocation] = useState({
    name: getCookie("locationName"),
    path: getCookie("locationPath"),
    board: getCookie("locationBoard"),
    type: getCookie("locationType"),
    timeInterval: getCookie("locationTimeInterval")
  });

  // Format date to YYYY-MM-DD
  const formatDateForPayload = (date) => {
    try {
      if (!(date instanceof Date) || isNaN(date)) {
        throw new Error('Invalid date object');
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (err) {
      console.error('Date formatting error:', err.message);
      return null;
    }
  };

  // Validate date is not in the future
  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    return date > today;
  };

  // Handle date navigation
  const handlePreviousDate = () => {
    try {
      if (navLoading) return; // Prevent rapid clicks
      setNavLoading(true);
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() - 1);
      setSelectedDate(newDate);
    } catch (err) {
      console.error('Previous date error:', err.message);
      setError('Failed to navigate to previous date.');
    } finally {
      setTimeout(() => setNavLoading(false), 500); // Brief delay to prevent spam
    }
  };

  const handleNextDate = () => {
    try {
      if (navLoading) return; // Prevent rapid clicks
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + 1);
      if (isFutureDate(newDate)) {
        return; // Prevent navigating to future dates
      }
      setNavLoading(true);
      setSelectedDate(newDate);
    } catch (err) {
      console.error('Next date error:', err.message);
      setError('Failed to navigate to next date.');
    } finally {
      setTimeout(() => setNavLoading(false), 500); // Brief delay to prevent spam
    }
  };

  const handleTodayDate = () => {
    try {
      if (navLoading) return;
      setNavLoading(true);
      setSelectedDate(new Date());
    } catch (err) {
      console.error('Today date error:', err.message);
      setError('Failed to set date to today.');
    } finally {
      setTimeout(() => setNavLoading(false), 500);
    }
  };

  // Fetch data
  const fetchData = async (date) => {
    try {
      setLoading(true);
      setError(null);

      // Validate date
      if (!(date instanceof Date) || isNaN(date)) {
        throw new Error('Invalid date selected');
      }
      if (isFutureDate(date)) {
        throw new Error('Future dates are not allowed');
      }

      const formattedDate = formatDateForPayload(date);
      if (!formattedDate) {
        throw new Error('Failed to format date');
      }

      

      const response = await fetch(DATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formattedDate })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch error:', response.status, errorText); // Debug: Log HTTP error
        let userMessage = 'Failed to fetch data. Please try again later.';
        switch (response.status) {
          case 400:
            userMessage = 'Invalid request. Please check the selected date.';
            break;
          case 401:
            userMessage = 'Unauthorized. Please log in and try again.';
            break;
          case 500:
            userMessage = 'Server error. Please contact support.';
            break;
          default:
            userMessage = `HTTP error! Status: ${response.status}`;
        }
        throw new Error(userMessage);
      }

      const jsonData = await response.json();
     

      // Basic response validation
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid response format from server');
      }

      setData(jsonData);
      setLastUpdated(new Date().toLocaleString()); // Update last refreshed timestamp
    } catch (err) {
      console.error('Fetch error:', err.message); // Debug
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when date changes
  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const changeLocation = (site) => {
    try {
     
      if (!site || !site.siteName) {
        throw new Error('Invalid site data');
      }
      const data = additionalData.find((item) => item.name === site.siteName);
      if (!data) {
        console.warn('No matching location found in additionalData for:', site.siteName); // Debug
        return;
      }

      dispatch(updateLocation(data));
      setSelectedLocation(data);

      Cookies.set("locationName", data.name);
      Cookies.set("locationPath", data.path);
      Cookies.set("locationBoard", data.board);
      Cookies.set("locationType", data.type);
      Cookies.set("locationTimeInterval", data.timeInterval);
      Cookies.set("locationGeocode", JSON.stringify(data.geocode));

      navigate("/");
      setSearchTerm("");
      handlePageChange("specificPage");

    } catch (err) {
      console.error('Change location error:', err.message);
      setError('Failed to change location. Please try again.');
    }
  };

  const refreshData = () => {
    fetchData(selectedDate);
  };

  const resetData = () => {
    setError(null);
    setSelectedDate(new Date());
    setSearchTerm('');
    setVoltageFilter('all');
    setActiveTab('all');
    fetchData(new Date());
  };

  // Format timestamp for display
  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    } catch (err) {
      console.error('Date display formatting error:', err.message);
      return 'N/A';
    }
  };

  // Extract voltage category from site name
  const getVoltageCategoryFromName = (siteName) => {
    try {
      if (!siteName) return 'other';
      const parts = siteName.split('-');
      const lastPart = parts[parts.length - 1].toLowerCase();
      if (lastPart === '24v') return '24v';
      if (lastPart === '48v') return '48v';
      return 'other';
    } catch (err) {
      console.error('Voltage category error:', err.message);
      return 'other';
    }
  };

  // Debounced search handler
  const debouncedSetSearchTerm = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSetSearchTerm(e.target.value);
  };

  // Export table data as CSV
  const exportToCSV = () => {
    try {
      const headers = [
        'Site Name',
        'Solar Energy (kWh)',
        'Grid Energy (kWh)',
        'Inverter Energy (kWh)',
        'Battery Voltage',
        'Last Update',
        'Status',
        'System Type'
      ];

      const rows = sortedSites.map(site => [
        `"${site.siteName || 'Unknown'}"`,
        site.solarEnergy?.solarEnergy ? parseFloat(site.solarEnergy.solarEnergy).toFixed(2) : 'N/A',
        site.solarEnergy?.gridEnergy ? parseFloat(site.solarEnergy.gridEnergy).toFixed(2) : 'N/A',
        site.solarEnergy?.inverterEnergy ? parseFloat(site.solarEnergy.inverterEnergy).toFixed(2) : 'N/A',
        site.solarEnergy?.batteryVoltage ? `${parseFloat(site.solarEnergy.batteryVoltage).toFixed(2)} V` : 'N/A',
        site.latestValues?.tValue ? `"${formatDate(site.latestValues.tValue * 1000)}"` : 'N/A',
        site.isWorking ? 'Active' : 'Inactive',
        getVoltageCategoryFromName(site.siteName).toUpperCase()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `solar_sites_${formatDateForPayload(selectedDate) || 'data'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV error:', err.message);
      setError('Failed to export data. Please try again.');
    }
  };

  // Filter sites
  const filteredSites = (() => {
    try {
      if (!data?.data) return [];
      const sites = [...(data.data.workingSites || []), ...(data.data.notWorkingSites || [])];
      return sites.filter(site => {
        if (!site || !site.siteName || !site.siteId) {
          console.warn('Invalid site data:', site); // Debug
          return false;
        }
        const matchesSearch = site.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             site.siteId.toLowerCase().includes(searchTerm.toLowerCase());
        
        const voltageCategory = getVoltageCategoryFromName(site.siteName);
        
        let matchesVoltageFilter = true;
        if (voltageFilter !== 'all') {
          matchesVoltageFilter = voltageCategory === voltageFilter;
        }
        
        let matchesTabFilter = true;
        if (activeTab === 'active') {
          matchesTabFilter = site.isWorking;
        } else if (activeTab === 'inactive') {
          matchesTabFilter = !site.isWorking;
        }
        
        return matchesSearch && matchesTabFilter && matchesVoltageFilter;
      });
    } catch (err) {
      console.error('Filter sites error:', err.message);
      setError('Error processing site data. Please refresh.');
      return [];
    }
  })();

  // Sort sites
  const sortedSites = (() => {
    try {
      return [...filteredSites].sort((a, b) => {
        if (sortConfig.key.includes('.')) {
          const [parent, child] = sortConfig.key.split('.');
          const aValue = parseFloat(a[parent]?.[child] || 0);
          const bValue = parseFloat(b[parent]?.[child] || 0);
          if (isNaN(aValue) || isNaN(bValue)) {
            console.warn('Sort error - NaN values:', { aValue, bValue, parent, child }); // Debug
          }
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    } catch (err) {
      console.error('Sort sites error:', err.message);
      setError('Error sorting site data. Please refresh.');
      return filteredSites;
    }
  })();

  // Handle sorting changes
  const requestSort = (key) => {
    try {
      let direction = 'ascending';
      if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
      }
      setSortConfig({ key, direction });
    } catch (err) {
      console.error('Sort request error:', err.message);
      setError('Error updating sort configuration.');
    }
  };

  const getCapacityForSite = (siteName) => {
  try {
    const match = additionalData.find((loc) => loc.name === siteName);
    return match?.capacity || 'N/A';
  } catch (err) {
    console.error('Error fetching capacity:', err.message);
    return 'N/A';
  }
};


  // Calculate counts
  const getFilteredCounts = () => {
    try {
      if (!data?.data) return { active: 0, inactive: 0, total: 0 };
      
      const sitesWithVoltageFilter = [...(data.data.workingSites || []), ...(data.data.notWorkingSites || [])].filter(site => {
        if (!site || !site.siteName) {
          console.warn('Invalid site in counts:', site); // Debug
          return false;
        }
        if (voltageFilter === 'all') return true;
        return getVoltageCategoryFromName(site.siteName) === voltageFilter;
      });
      
      const activeSites = sitesWithVoltageFilter.filter(site => site.isWorking);
      const inactiveSites = sitesWithVoltageFilter.filter(site => !site.isWorking);
      
      return {
        active: activeSites.length,
        inactive: inactiveSites.length,
        total: sitesWithVoltageFilter.length
      };
    } catch (err) {
      console.error('Count calculation error:', err.message);
      setError('Error calculating site counts.');
      return { active: 0, inactive: 0, total: 0 };
    }
  };

  const counts = getFilteredCounts();

  return (
    <div className="min-h-screen bg-gray-100">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
           
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={refreshData} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
              <button 
                onClick={resetData} 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className=" px-8 py-8">
          <header className="mb-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                 
                  Solar Sites Monitoring Dashboard
                </h1>
               
                {lastUpdated && (
                  <p className="text-sm text-gray-500 mt-1">
                    Last updated: {lastUpdated}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousDate}
                  className={`px-2 py-2 rounded flex items-center ${
                    navLoading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  title="Previous Day"
                  disabled={navLoading}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleTodayDate}
                  className={`px-2 py-2 rounded flex items-center ${
                    navLoading || selectedDate.toDateString() === new Date().toDateString()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  title="Today"
                  disabled={navLoading || selectedDate.toDateString() === new Date().toDateString()}
                >
                  <Calendar size={16} />
                </button>
                <div className="relative">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    className="pl-5 pr-4 py-2 border border-gray-500  text-gray-700 w-32"
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select date"
                    maxDate={new Date()} // Prevent future dates
                  />
                 
                </div>
                <button
                  onClick={handleNextDate}
                  className={`px-2 py-2 rounded flex items-center ${
                    navLoading || isFutureDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  title="Next Day"
                  disabled={navLoading || isFutureDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                >
                  <ChevronRight size={16} />
                </button>
                <button 
                  onClick={refreshData} 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  
                </button>
              </div>
            </div>
          </header>

          {/* Dashboard Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6  shadow-md border-l-4 border-blue-500 relative group" title="Total number of monitored solar sites">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3  mr-4">
                  <Activity className="text-blue-500" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase">Total Sites</p>
                  <p className="text-2xl font-bold">{data?.totalSites || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6  shadow-md border-l-4 border-green-500 relative group" title="Total solar energy generated (kWh)">
              <div className="flex items-center">
                <div className="bg-green-100 p-3  mr-4">
                  <Sun className="text-green-500" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase">Solar Energy</p>
                  <p className="text-2xl font-bold">{parseFloat(data?.totalSolarEnergy || 0).toFixed(2)} kWh</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6  shadow-md border-l-4 border-red-500 relative group" title="Total grid energy consumed (kWh)">
              <div className="flex items-center">
                <div className="bg-red-100 p-3  mr-4">
                  <Power className="text-red-500" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase">Grid Energy</p>
                  <p className="text-2xl font-bold">{parseFloat(data?.totalGridEnergy || 0).toFixed(2)} kWh</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6  shadow-md border-l-4 border-purple-500 relative group" title="Total inverter energy output (kWh)">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3  mr-4">
                  <Zap className="text-purple-500" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase">load Consumption</p>
                  <p className="text-2xl font-bold">{parseFloat(data?.totalInverterEnergy || 0).toFixed(2)} kWh</p>
                </div>
              </div>
            </div>
          </div>

          {/* Site Data Table */}
          <div className="bg-white  shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold">Site Data</h2>
                <div className="flex gap-2 items-center flex-wrap">
                  {/* Voltage Filter Buttons and Search Input */}
                  <button
                    onClick={() => setVoltageFilter('all')}
                    className={`px-4 py-2  flex items-center ${
                      voltageFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setVoltageFilter('24v')}
                    className={`px-4 py-2  flex items-center ${
                      voltageFilter === '24v' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Battery className="mr-2" size={16} />
                    24V
                  </button>
                  <button
                    onClick={() => setVoltageFilter('48v')}
                    className={`px-4 py-2  flex items-center ${
                      voltageFilter === '48v' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <BsBatteryCharging className="mr-2" size={16}/>
                    48V
                  </button>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search sites..."
                      className="pl-10 pr-4 py-2 text-gray-500 border border-gray-500  w-48"
                      onChange={handleSearchChange}
                      defaultValue={searchTerm}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-600" size={16} />
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                    title="Export table data as CSV"
                  >
                    <Download className="mr-2" size={16} />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex border-b overflow-x-auto">
              <button
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'all' 
                    ? 'border-b-2 border-blue-600 text-blue-800' 
                    : 'text-blue-600 hover:text-blue-800'
                }`}
                onClick={() => {
                  setActiveTab('all');
                  setVoltageFilter('all');
                }}
              >
                All Sites ({counts.total})
              </button>
              <button
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'active' 
                    ? 'border-b-2 border-green-500 text-green-600' 
                    : 'text-green-500 hover:text-green-600'
                }`}
                onClick={() => setActiveTab('active')}
              >
                Active Sites ({counts.active})
              </button>
              <button
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'inactive' 
                    ? 'border-b-2 border-red-500 text-red-600' 
                    : 'text-red-500 hover:text-red-600'
                }`}
                onClick={() => setActiveTab('inactive')}
              >
                Inactive Sites ({counts.inactive})
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-center">
                  <tr>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-1/6"
                      onClick={() => requestSort('siteName')}
                    >
                      Site Name
                      {sortConfig.key === 'siteName' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider w-1/8">
  Connected Capacity(kWp)
</th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 w-1/8"
                      onClick={() => requestSort('solarEnergy.solarEnergy')}
                    >
                      Solar Energy (kWh)
                      {sortConfig.key === 'solarEnergy.solarEnergy' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 w-1/8"
                      onClick={() => requestSort('solarEnergy.gridEnergy')}
                    >
                      Grid Energy (kWh)
                      {sortConfig.key === 'solarEnergy.gridEnergy' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 w-1/8"
                      onClick={() => requestSort('solarEnergy.inverterEnergy')}
                    >
                      load consumption (kWh)
                      {sortConfig.key === 'solarEnergy.inverterEnergy' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100 w-1/8"
                      onClick={() => requestSort('solarEnergy.batteryVoltage')}
                    >
                      Battery Voltage(V)
                      {sortConfig.key === 'solarEnergy.batteryVoltage' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider w-1/6">
                      Last Update
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider w-1/12">
                      Status
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider w-1/12">
                      System Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white text-center divide-y divide-gray-200">
                  {sortedSites.length > 0 ? (
                    sortedSites.map((site) => {
                      const voltageCategory = getVoltageCategoryFromName(site.siteName);
                      const statusColor = site.isWorking ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                      const status = site.isWorking ? 'Active' : 'Inactive';
                      
                      return (
                        <tr key={site.siteId} className="hover:bg-gray-50 cursor-pointer" onClick={() => changeLocation(site)}>
                          <td className="px-3 py-4 text-left whitespace-nowrap text-sm">
                            <div className="font-medium text-gray-900">{site.siteName || 'Unknown'}</div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
  {getCapacityForSite(site.siteName)}
</td>

                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {site.solarEnergy?.solarEnergy ? parseFloat(site.solarEnergy.solarEnergy).toFixed(2) : 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {site.solarEnergy?.gridEnergy ? parseFloat(site.solarEnergy.gridEnergy).toFixed(2) : 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {site.solarEnergy?.inverterEnergy ? parseFloat(site.solarEnergy.inverterEnergy).toFixed(2) : 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {site.solarEnergy?.batteryVoltage ? `${parseFloat(site.solarEnergy.batteryVoltage).toFixed(2)} ` : 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            {site.latestValues?.tValue ? formatDate(site.latestValues.tValue * 1000) : 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold  ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold  ${
                              voltageCategory === '24v' ? 'bg-orange-100 text-orange-800' :
                              voltageCategory === '48v' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {voltageCategory === '24v' ? '24V' : voltageCategory === '48v' ? '48V' : 'Other'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-3 py-4 text-center text-sm text-gray-500">
                        No sites found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
