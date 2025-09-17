import { useEffect, useState, useRef } from "react";
import { FiX, FiSearch, FiEdit2, FiPlus } from "react-icons/fi";
import { useSelector, useDispatch } from "react-redux";
import {
  updateLocation,
  toggleSpecificPage,
  toggleSidebar,
  loadLocations,
} from "../Redux/CounterSlice";
import { useNavigate, useLocation } from "react-router-dom";
import Cookies from "js-cookie";

export default function Sitesbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const addPopupRef = useRef(null);
  const editPopupRef = useRef(null);

  const {
    locations = [],
    isSidebarOpen: isOpen,
    loadStatus,
    loadError,
    device,
  } = useSelector((state) => state.location);

  useEffect(() => {
    dispatch(loadLocations());
  }, [dispatch]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showEditIcons, setShowEditIcons] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState(Cookies.get("siteId") || null);

  const [newSiteData, setNewSiteData] = useState({
    name: "",
    path: "",
    board: "",
    type: "24v",
    timeInterval: "",
    capacity: "",
    geocode: ["", ""],
    siteId: "",
  });

  const [editSiteData, setEditSiteData] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !addPopupRef.current?.contains(event.target) &&
        !editPopupRef.current?.contains(event.target)
      ) {
        dispatch(toggleSidebar());
        setShowEditIcons(false);
        setShowAddPopup(false);
        setShowEditPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, dispatch]);

  // Fixed handleInputChange function
  const handleInputChange = (e, setter, current) => {
    const { name, value } = e.target;
    setter({
      ...current,
      [name]: value, // Keep the value as string to allow empty inputs and proper typing
    });
  };

  // Fixed handleGeocodeChange function
  const handleGeocodeChange = (e, index, setter, current) => {
    const value = e.target.value;
    const newGeocode = [...current.geocode];
    newGeocode[index] = value; // Keep as string to allow empty inputs and proper typing
    setter({ ...current, geocode: newGeocode });
  };

  const addNewSite = async () => {
    try {
      const sanitizedData = {
        ...newSiteData,
        timeInterval: newSiteData.timeInterval === "" ? 5 : parseFloat(newSiteData.timeInterval),
        capacity: newSiteData.capacity === "" ? 1 : parseInt(newSiteData.capacity),
        geocode: [
          newSiteData.geocode[0] === "" ? 0 : parseFloat(newSiteData.geocode[0]),
          newSiteData.geocode[1] === "" ? 0 : parseFloat(newSiteData.geocode[1]),
        ],
      };
      
      const response = await fetch( `${process.env.REACT_APP_HOST}/admin/AddsiteInfo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedData),
      });
      const result = await response.json();
      if (result.ok) {
        alert("Site added successfully!");
        dispatch(loadLocations());
        setShowAddPopup(false);
        setNewSiteData({
          name: "",
          path: "",
          board: "",
          type: "24v",
          timeInterval: "",
          capacity: "",
          geocode: ["", ""],
          siteId: "",
        });
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Error adding site:", error);
    }
  };

  const updateSite = async () => {
    try {
      const sanitizedData = {
        ...editSiteData,
        timeInterval: editSiteData.timeInterval === "" ? 5 : parseFloat(editSiteData.timeInterval),
        capacity: editSiteData.capacity === "" ? 1 : parseInt(editSiteData.capacity),
        geocode: [
          editSiteData.geocode[0] === "" ? 0 : parseFloat(editSiteData.geocode[0]),
          editSiteData.geocode[1] === "" ? 0 : parseFloat(editSiteData.geocode[1]),
        ],
      };
      const response = await fetch( `${process.env.REACT_APP_HOST}/admin/updateSiteInfo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedData),
      });
      const result = await response.json();
      if (result.ok) {
        alert("Site updated successfully!");
        dispatch(loadLocations());
        setShowEditPopup(false);
        setEditSiteData(null);
        setShowEditIcons(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Error updating site:", error);
    }
  };

  const changeLocation = (data) => {
    dispatch(updateLocation(data));
    dispatch(toggleSidebar());
    setShowEditIcons(false);
    setSelectedSiteId(data.siteId);

    Cookies.set("locationName", data.name);
    Cookies.set("locationPath", data.path);
    Cookies.set("locationBoard", data.board);
    Cookies.set("locationType", data.type);
    Cookies.set("locationTimeInterval", data.timeInterval);
    Cookies.set("locationGeocode", JSON.stringify(data.geocode));
    Cookies.set("capacity", JSON.stringify(data.capacity));
    Cookies.set("siteId", data.siteId);

    if (location.pathname === "/") {
      window.location.reload();
    } else {
      navigate("/");
    }
    setSearchTerm("");
  };

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
    setShowEditIcons(false);
    setShowAddPopup(false);
    setShowEditPopup(false);
  };

  const filteredData = (locations || []).filter((d) => {
    const name = (d?.name || "").toLowerCase();
    const board = (d?.board || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || board.includes(q);
  });

  return (
    <>
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-indigo-800 to-indigo-900 shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } z-50 text-white font-sans`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-300/20">
          <h2 className="text-xl font-semibold text-white">Sites</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddPopup(true)}
              className="p-2 rounded-full bg-indigo-600 transition-colors"
              aria-label="Add Site"
            >
              <FiPlus size={20} className="text-green-400 hover:text-green-300" />
            </button>
            <button
              onClick={() => setShowEditIcons(!showEditIcons)}
              className="p-2 rounded-full bg-indigo-600 transition-colors"
              aria-label="Toggle Edit Mode"
            >
              <FiEdit2 size={20} className="text-yellow-400 hover:text-yellow-300" />
            </button>
            <button
              onClick={handleToggleSidebar}
              className="p-2 rounded-full hover:bg-indigo-600 transition-colors"
              aria-label="Close Sidebar"
            >
              <FiX size={22} className="text-indigo-200 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Search + Status + Site List */}
        <div className="p-4">
          <div className="relative mb-4">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-300" size={20} />
            <input
              type="text"
              placeholder="Search sites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-indigo-700/50 text-white placeholder-indigo-300 border border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Status */}
          {loadStatus === "loading" && (
            <div className="text-indigo-200 text-sm mb-3">Loading sites...</div>
          )}
          {loadStatus === "failed" && (
            <div className="text-red-300 text-sm mb-3">
              Failed to load sites: {String(loadError)}
            </div>
          )}

          {/* Site List */}
          <ul className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
            {filteredData.map((data) => (
              <li
                key={data.siteId}
                className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                  selectedSiteId === data.siteId
                    ? "bg-indigo-500 text-white"
                    : "bg-indigo-700/50 hover:bg-indigo-600 text-white"
                }`}
              >
                <span
                  onClick={() => changeLocation(data)}
                  className="text-sm font-medium truncate flex-1"
                >
                  {data.name}
                </span>
                {showEditIcons && (
                  <button
                    onClick={() => {
                      setEditSiteData({
                        ...data,
                        timeInterval: data.timeInterval?.toString() ?? "",
                        capacity: data.capacity?.toString() ?? "",
                        geocode: [data.geocode?.[0]?.toString() ?? "", data.geocode?.[1]?.toString() ?? ""],
                      });
                      setShowEditPopup(true);
                    }}
                    className="ml-2 p-1 text-indigo-200 hover:text-yellow-300"
                    title="Edit site"
                  >
                    <FiEdit2 size={18} />
                  </button>
                )}
              </li>
            ))}
            {loadStatus === "succeeded" && filteredData.length === 0 && (
              <li className="text-indigo-200 text-sm">No sites found.</li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-indigo-300/20">
          <p className="text-center text-indigo-300 text-xs font-medium">v2.0.0</p>
        </div>

        {/* Scrollbar */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
          }
        `}</style>
      </div>

      {/* Add Site Popup */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div ref={addPopupRef} className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAddPopup(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
              aria-label="Close Add Popup"
            >
              <FiX size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-800 mb-5">Add New Site</h3>
            {["name", "path", "board", "siteId"].map((field) => (
              <input
                key={field}
                type="text"
                name={field}
                value={newSiteData[field]}
                onChange={(e) => handleInputChange(e, setNewSiteData, newSiteData)}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                className="w-full border border-gray-300 p-3 mb-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            ))}
            <select
              name="type"
              value={newSiteData.type}
              onChange={(e) => handleInputChange(e, setNewSiteData, newSiteData)}
              className="w-full border border-gray-300 p-3 mb-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="24v">24V</option>
              <option value="48v">48V</option>
            </select>
            <input
              type="number"
              name="timeInterval"
              value={newSiteData.timeInterval}
              onChange={(e) => handleInputChange(e, setNewSiteData, newSiteData)}
              placeholder="Time Interval"
              step="0.1"
              min="0"
              className="w-full border border-gray-300 p-3 mb-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="number"
              name="capacity"
              value={newSiteData.capacity}
              onChange={(e) => handleInputChange(e, setNewSiteData, newSiteData)}
              placeholder="Capacity"
              step="1"
              min="0"
              className="w-full border border-gray-300 p-3 mb-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex space-x-3 mb-3">
              <input
                type="number"
                step="any"
                value={newSiteData.geocode[0]}
                onChange={(e) => handleGeocodeChange(e, 0, setNewSiteData, newSiteData)}
                placeholder="Latitude"
                className="w-1/2 border border-gray-300 p-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="number"
                step="any"
                value={newSiteData.geocode[1]}
                onChange={(e) => handleGeocodeChange(e, 1, setNewSiteData, newSiteData)}
                placeholder="Longitude"
                className="w-1/2 border border-gray-300 p-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={addNewSite}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Site
            </button>
            <button
              onClick={() => setShowAddPopup(false)}
              className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Site Popup */}
      {showEditPopup && editSiteData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div ref={editPopupRef} className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowEditPopup(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
              aria-label="Close Edit Popup"
            >
              <FiX size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-800 mb-5">Edit Site</h3>
            {["name", "path", "board", "siteId"].map((field) => (
              <input
                key={field}
                type="text"
                name={field}
                value={editSiteData[field]}
                onChange={(e) => handleInputChange(e, setEditSiteData, editSiteData)}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                className="w-full border border-gray-300 p-3 mb-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            ))}
            <select
              name="type"
              value={editSiteData.type}
              onChange={(e) => handleInputChange(e, setEditSiteData, editSiteData)}
              className="w-full border border-gray-300 p-3 mb-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="24v">24V</option>
              <option value="48v">48V</option>
            </select>
            <input
              type="number"
              name="timeInterval"
              value={editSiteData.timeInterval}
              onChange={(e) => handleInputChange(e, setEditSiteData, editSiteData)}
              placeholder="Time Interval"
              step="0.1"
              min="0"
              className="w-full border border-gray-300 p-3 mb-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="number"
              name="capacity"
              value={editSiteData.capacity}
              onChange={(e) => handleInputChange(e, setEditSiteData, editSiteData)}
              placeholder="Capacity"
              step="1"
              min="0"
              className="w-full border border-gray-300 p-3 mb-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex space-x-3 mb-3">
              <input
                type="number"
                step="any"
                value={editSiteData.geocode[0]}
                onChange={(e) => handleGeocodeChange(e, 0, setEditSiteData, editSiteData)}
                placeholder="Latitude"
                className="w-1/2 border border-gray-300 p-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="number"
                step="any"
                value={editSiteData.geocode[1]}
                onChange={(e) => handleGeocodeChange(e, 1, setEditSiteData, editSiteData)}
                placeholder="Longitude"
                className="w-1/2 border border-gray-300 p-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={updateSite}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Update Site
            </button>
            <button
              onClick={() => setShowEditPopup(false)}
              className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}