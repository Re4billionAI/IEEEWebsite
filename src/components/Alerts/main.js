import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader, AlertCircle, Clock, Search, RefreshCw, Filter, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

const Alerts = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [activeTabs, setActiveTabs] = useState({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Function to convert YYYY-MM-DD to DD-MM-YYYY
  const formatDateToDDMMYYYY = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
  };

  // Function to format date for display
  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
 const API_URL =`${process.env.REACT_APP_HOST}/admin/alerts`
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        API_URL,
        { date: formatDateToDDMMYYYY(date) }
      );
      const alerts = response.data?.alerts || [];
      const formattedAlerts = alerts.map(alert => ({
        ...alert,
        date: formatDateToDDMMYYYY(alert.date || date)
      }));
      setData(formattedAlerts);
      setActiveTabs(formattedAlerts.reduce((acc, _, index) => ({ ...acc, [index]: 'common' }), {}));
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const filteredData = data?.filter((alert) =>
    filter === '' ||
    (alert.commonIssues && Object.keys(alert.commonIssues).some((site) =>
      site.toLowerCase().includes(filter.toLowerCase()))
    )
  );

  const sortedData = [...filteredData].sort((a, b) => {
    // Convert DD-MM-YYYY back to Date object for sorting
    const dateA = new Date(formatDateToDDMMYYYY(a.date || date));
    const dateB = new Date(formatDateToDDMMYYYY(b.date || date));
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleTabChange = (index, tab) => {
    setActiveTabs((prev) => ({ ...prev, [index]: tab }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="bg-white p-8 rounded-xl shadow-lg flex items-center space-x-4">
          <Loader className="animate-spin w-10 h-10 text-indigo-600" />
          <span className="text-lg font-medium text-gray-700">Loading alerts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-center text-gray-800 mb-2">Error Loading Data</h3>
          <p className="text-center text-gray-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 pb-10">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10 mb-5">
        <div className="max-w-7xl mx-auto py-4 px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-indigo-700">System Alerts Dashboard</h1>
            
            {/* Date Selector */}
            <div className="relative">
             
              
            <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
            </div>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
     

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-6">
        {/* Alerts Grid */}
        {paginatedData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <Clock className="w-16 h-16 text-indigo-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Alerts Found</h3>
            <p className="text-gray-500 mb-6">There are no alerts available for {formatDateForDisplay(date)}.</p>
            <button
              onClick={() => {
                setDate(new Date().toISOString().split('T')[0]);
              }}
              className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-200 transition-all"
            >
              View Today's Alerts
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 w-100 gap-6">
            {paginatedData.map((alert, index) => (
              <div
                key={index}
                className="bg-white  shadow-lg rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r  from-indigo-600 to-purple-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">
                    {formatDateForDisplay(alert.date ? alert.date.split('-').reverse().join('-') : date)}
                  </h2>
                </div>

                {/* Tabs */}
                <div className="flex border-b  border-gray-200">
                  <button
                    onClick={() => handleTabChange(index, 'common')}
                    className={`flex-1 py-3 text-center font-medium transition-all ${
                      activeTabs[index] === 'common'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Critical Issues
                  </button>
                  <button
                    onClick={() => handleTabChange(index, 'hourly')}
                    className={`flex-1 py-3 text-center font-medium transition-all ${
                      activeTabs[index] === 'hourly'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Warning issues
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-5">
                  {activeTabs[index] === 'common' && (
                    <div>
                      {alert.commonIssues && Object.keys(alert.commonIssues).length > 0 ? (
                        Object.keys(alert.commonIssues).map((site, idx) => (
                          <div key={idx} className="mb-4">
                            <h4 className="text-md font-bold text-gray-900 bg-gray-100 p-2 rounded-md mb-2">
                              {site}
                            </h4>
                            {alert.commonIssues[site].map((issue, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 mb-2 bg-red-50 rounded-lg border-l-4 border-red-500 hover:bg-red-100 transition-all"
                              >
                                <AlertCircle className="text-red-500 w-5 h-5 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-700 text-sm">
                                  {issue.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="bg-green-100 rounded-full p-3 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-center">No Critical issues found.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTabs[index] === 'hourly' && (
                    <div className="space-y-4">
                      {alert.filteredHourlyResults && alert.filteredHourlyResults.length > 0 ? (
                        alert.filteredHourlyResults.map((hourly, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200"
                          >
                            <div className="bg-indigo-100 p-3 flex items-center gap-2">
                              <Clock className="text-indigo-600 w-5 h-5" />
                              <p className="text-sm font-medium text-indigo-800">
                                {hourly.timeRange.start} → {hourly.timeRange.end}
                              </p>
                            </div>
                            <div className="p-3">
                              {Object.keys(hourly.filteredErrorCounts).map((site, siteIdx) => (
                                <div key={siteIdx} className="mb-3">
                                  <h4 className="text-sm font-bold text-gray-900 bg-gray-100 p-2 rounded-md mb-2">
                                    {site}
                                  </h4>
                                  {Object.entries(hourly.filteredErrorCounts[site]).map(([message, count], msgIdx) => (
                                    <div
                                      key={msgIdx}
                                      className="flex items-start gap-3 p-3 mb-2 bg-yellow-50 rounded-lg border-l-4 border-yellow-400 hover:bg-yellow-100 transition-all"
                                    >
                                      <AlertCircle className="text-yellow-500 w-5 h-5 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-700 text-sm">
                                          {message}
                                        </p>
                                       
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="bg-blue-100 rounded-full p-3 mb-3">
                            <Clock className="h-6 w-6 text-blue-600" />
                          </div>
                          <p className="text-gray-500 text-center">No hourly results found.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center">
            <div className="inline-flex bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 border-r border-gray-200 transition-all"
              >
                Previous
              </button>
              
              <div className="px-4 py-2 bg-white text-gray-700 border-r border-gray-200 flex items-center">
                <span>Page {currentPage} of {totalPages}</span>
              </div>
              
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;