import { useState } from "react";
import { FiX, FiSearch } from "react-icons/fi";
import { useSelector, useDispatch } from 'react-redux'
import { updateLocation, toggleSpecificPage, toggleSidebar } from '../Redux/CounterSlice'
import { Link, useLocation, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";









export default function Sitesbar() {
  // Additional data items
  

    const dispatch = useDispatch();
    const specificPage = useSelector(state => state.location.specificPage);
    
   
  const isOpen = useSelector((state) => state.location.isSidebarOpen);
  
    const handlePageChange = () => {
    
      dispatch(toggleSpecificPage("specificPage"));
      
    
    }
      const handleToggle = () => {
    dispatch(toggleSidebar());
  };
  

 const additionalData = useSelector((state) => state.location.locations);
 




  const getCookie = (name) => {
    const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return matches ? decodeURIComponent(matches[1]) : null;
  };
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState({name: getCookie("locationName"), path: getCookie("locationPath"), board: getCookie("locationBoard"), type: getCookie("locationType"), timeInterval:getCookie("locationTimeInterval") });
  const [searchTerm, setSearchTerm] = useState("");



 



const changeLocation = (data) => {

  dispatch(updateLocation(data));
  setSelectedLocation(data);
  dispatch(toggleSidebar()); // ✅ properly close the sidebar

  Cookies.set("locationName", data.name);
  Cookies.set("locationPath", data.path);
  Cookies.set("locationBoard", data.board);
  Cookies.set("locationType", data.type);
  Cookies.set("locationTimeInterval", data.timeInterval);
  Cookies.set("locationGeocode", JSON.stringify(data.geocode));
Cookies.set("capacity", JSON.stringify(data.capacity));
Cookies.set("siteId", JSON.stringify(data.siteId));




  navigate("/");
  setSearchTerm("");
};



  // Filter the data based on search term (case-insensitive)
  const filteredData = additionalData.filter((data) =>
    data.name.toLowerCase().includes(searchTerm.toLowerCase())||data.board.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-indigo-700 to-purple-700 shadow-2xl backdrop-blur-lg transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } z-50`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-indigo-200/30">
        <button className="px-4 py-1 bg-indigo-500  text-white text-lg font-bold hover:bg-indigo-600 transition-colors">
          sites
        </button>
        <button
          onClick={handleToggle}
          className="text-indigo-200 hover:text-white transition-colors"
        >
          <FiX className="text-2xl" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4">
        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-3 text-indigo-200" />
          <input
            type="text"
            placeholder="Search sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2  border border-gray-300 bg-indigo-600 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors"
          />
        </div>

        {/* Additional Data List with Custom Scrollbar */}
        <ul className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
          {filteredData.map((data, index) => (
            <li
              key={index}
              onClick={() => {
                handlePageChange();
                changeLocation(data);
                
              }}
              className={`px-4 py-2 mr-2  cursor-pointer transition-colors  text-sm ${
                selectedLocation.name === data.name
                  ? "bg-white text-gray-700"
                  : "bg-indigo-500 hover:bg-indigo-900 text-white"
              }`}
            >
              {data.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className=" absolute bottom-0 left-0 right-0 p-4 border-t border-indigo-200/30">
        <p className="text-center text-indigo-200 text-sm">v1.5.0</p>
      </div>

      {/* Custom styles for the scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 6px;
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          border-top-radius:30px;
          scrollbar-color: rgba(255, 255, 255, 0.5) transparent;
        }
          
      `}</style>
    </div>
  );
}
