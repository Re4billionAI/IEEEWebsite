import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, LogOut } from "lucide-react";
import { useSelector, useDispatch } from 'react-redux'
import { updateLocation, toggleSidebar } from "../../store/slices/LocationSlice"
import { toggleSpecificPage, setSpecificPage } from "../../store/slices/LocationSlice"


import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import PlantInstallationModal from '../InstallationForm/Inputs.js';





 
const Head = () => {
  const [showSearch, setShowSearch] = useState(false);
  
  const [query, setQuery] = useState("");
  const [filteredLocations, setFilteredLocations] = useState([]);

const locations = useSelector((state) => state.location.locations);

 
  const navigate = useNavigate();
 


const dispatch=useDispatch()



    const specificPage = useSelector(state => state.location.specificPage);
  
  
    const handlePageChange = () => {
    
      dispatch(toggleSpecificPage("specificPage"));
      
    
    }

  const handleToggle = () => {
    dispatch(toggleSidebar());
  };
const desktopSearchRef = useRef(null);
const mobileSearchRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value) {
      const suggestions = locations.filter((location) =>
        location.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredLocations(suggestions);
    } else {
      setFilteredLocations([]);
    }
  };

  const changeLocation = (data) => {
 
    dispatch(updateLocation(data));
    
   
    Cookies.set("locationName", data.name);
    Cookies.set("locationPath", data.path);
    Cookies.set("locationBoard", data.board);
    navigate("/");
    setShowSearch("")
    setQuery("")
    setFilteredLocations([])
    
  };


 


  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('selectedItem');
    Cookies.remove('selectedLocation');
    Cookies.remove('role');
    Cookies.remove('locationName'); 
    Cookies.remove('locationPath'); 
    Cookies.remove('locationBoard'); 
    Cookies.remove('locationType'); 
    Cookies.remove('locationTimeInterval');


    window.location.href = "/login";
}
  
  // state to toggle search bar visibility

  const handleSearchClick = () => {
    setShowSearch(!showSearch); // toggle the search bar visibility
  };




  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !desktopSearchRef.current?.contains(event.target) &&
        !mobileSearchRef.current?.contains(event.target)
      ) {
        setFilteredLocations([]);
      }
    };

    if (filteredLocations.length > 0) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [filteredLocations]);




  return (
    <div className="sticky md:w-full gap-2 mb-2 top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-md  bg-white md:bg-transparent ">
      {/* Left Section - Company Logo & Sidebar Toggle */}
      <div className="flex items-center gap-2">
          {/* Sidebar Toggle Button */}
           <button onClick={handleToggle} className={`p-2 bg-blue-600  md:hidden text-white m-0  ${specificPage!=="specificPage"?"hidden":"block"}  shadow-md flex items-center`}>
          <Menu size={20} />
        </button>

        {/* Company Logo */}
        <img 
          src="https://res.cloudinary.com/dky72aehn/image/upload/v1746253013/Layer_2_pvgh9s.png" // Replace with your logo's path
          alt="Company Logo" 
          className="w-10 h-10 object-contain md:hidden" 
        />
        
      
      </div>

      {/* Center Section - Search Bar */}
      
      <div className="flex items-center gap-0 flex-grow justify-end md:justify-start w-[20%] ">
        {/* Desktop Search Bar (always visible on desktop) */}
<button
  onClick={handleToggle}
  className={`p-2 bg-blue-600 text-white m-0 shadow-md items-center ${
    specificPage === "specificPage" ? "hidden md:flex" : "hidden"
  }`}
>
  <Menu size={24} />
</button>



        <div className="hidden md:flex flex-row justify-center items-center gap-0">
<div className="relative mr-3 w-64"> {/* Set fixed width or use w-full with a parent constraint */}
  <input
    type="text"
    value={query}
    onChange={handleChange}
    placeholder="Search Site"
    className="p-2 border border-gray-300 pl-2 w-full"
  />
  {filteredLocations.length > 0 && (
    <ul className="absolute z-10 w-full bg-white border rounded shadow">
      {filteredLocations.map((location, index) => (
        <li
          key={index}
          className="p-2 hover:bg-gray-200 cursor-pointer"
          onClick={() => {
            changeLocation(location);
            handlePageChange();
          }}
        >
          {location.name}
        </li>
      ))}
    </ul>
  )}
</div>







          <button className="border border-gray-300 bg-white p-2 ">
            <Search />
          </button>
        </div>

        {/* Mobile Search Toggle Icon */}
       

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden flex flex-row  items-center justify-end gap-0   w-[100%]">
         <div className="relative mr-2">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search Site"
        className="p-2 rounded-full  pl-2 w-[100%] border border-gray-20"
      />
      {filteredLocations.length > 0 && (
        <ul className="absolute  bg-white border rounded mt-1 shadow">
          {filteredLocations.map((location, index) => (
            <li key={index} className="p-2 hover:bg-gray-200 cursor-pointer"  onClick={() => changeLocation(location)}>
              {location.name}
            </li>
          ))}
        </ul>
      )}
    </div>
          </div>
        )}
         <button 
          onClick={handleSearchClick} 
          className="md:hidden  bg-white p-2 border border-gray-200 rounded-full">
          <Search />
        </button>
      </div>
 <PlantInstallationModal  />
      {/* Right Section - Logout Button */}
   <button className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 font-medium transition shadow flex items-center gap-2">
  <LogOut className="w-5 h-5" />
  <span className="hidden md:inline">Logout</span>
</button>
    </div>
  );
};

export default Head;




