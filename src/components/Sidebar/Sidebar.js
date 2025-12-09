import React, { useState, useEffect } from "react";
import { Home, Bell, Settings, Grid, LogOut, User, MapPin } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const [currentTab, setCurrentTab] = useState(localStorage.getItem("currentTab") || "Home");
  const location = useLocation();
  const navigate = useNavigate();

  // Save selected tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("currentTab", currentTab);
  }, [currentTab]);

  // Update currentTab when the URL changes
  useEffect(() => {
    const path = location.pathname.split("/")[1]; // Get the first part of the URL
    setCurrentTab(path || "Home");
  }, [location]);

  const handleNavigation = (label, link) => {
    setCurrentTab(label);
    navigate(`/${link}`);
  };

  return (
    <>
      {/* Sidebar for larger screens */}
      <nav className="hidden md:flex w-[265px] h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex-col -3xl shadow-2xl border-r border-gray-300">
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/dky72aehn/image/upload/v1746253013/Layer_2_pvgh9s.png"
              alt="logo"
              className="w-10 h-18 rounded-xl shadow-sm"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-green-500 bg-clip-text text-transparent">
              Re4billion
            </h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-6 px-0 gap-2">
          {[{ icon: Home, label: "Home", link: "" },{ icon: Bell, label: "Alerts", link: "Alerts" }, { icon: MapPin, label: "Location", link: "Location" }].map(
            (item, index) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.label, item.link)}
                className={`flex items-center gap-3 px-6 py-3.5  text-md  font-medium w-full transition-all ${
                  currentTab === item.label
                    ? "bg-blue-600 text-white shadow-lg border-l-8 border-l-gray-500"
                    : "text-gray-600 hover:bg-white  hover:text-blue-600"
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          )}
        </div>

       
      </nav>

      {/* Mobile Navbar */}
      <div className="md:hidden  bottom-0 fixed z-10 left-0  bg-white shadow-lg flex flex-row-1 p-2 justify-around py-3 border-t border-gray-200 transition-transform duration-300 w-full">
        {[{ icon: Home, label: "Home", active: true, link: "" }, { icon: Bell, label: "Alerts", link: "Alerts" }, { icon: MapPin, label: "Location", link: "Location" }].map(
          (item, index) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.label, item.link)}
              className={`w-[90%] m-auto flex flex-col items-center justify-center py-2 rounded-xl ${
                currentTab === item.label
                  ? "bg-blue-500 text-white shadow-lg"
                  : "text-gray-600 hover:bg-white hover:shadow-md hover:text-blue-600"
              }`}
            >
              <item.icon size={24} />
              <span className="text-xs">{item.label}</span>
            </button>
          )
        )}
      </div>
    </>
  );
};

export default Sidebar;
