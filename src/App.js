
import Home from "./components/HomePage/main"
import Login from "./components/LoginPage"
import NotFound from "./components/NotFoundPage"
import User from "./components/UserPage"

import {BrowserRouter, Route, Routes} from "react-router-dom"
import ProtectedRoute from "../src/components/ProtectedApp/protectedApp"


import Location from "./components/location/main"
import Alerts from "./components/Alerts/main"


function App() {
  return (
    <BrowserRouter>

     <Routes>
    <Route exact path="/login" element={<Login/> } />
{/* Admin Routes*/}
     <Route  element={<ProtectedRoute   extraProps={{name:"Admin"}}/>}>
     <Route exact path="/" element={<Home/>} />
   

     <Route exact path="/Location" element={<Location/>} />
     <Route exact path="/Alerts" element={<Alerts/>} />
     </Route>

{/* User Routes*/}
     <Route  element={<ProtectedRoute   extraProps={{name:"User"}}/>}>
     <Route exact path="/User" element={<User/>} />
     </Route>
{/* User Routes*/}
      <Route path="*" element={<NotFound/>}/>
    </Routes>
     
    </BrowserRouter>
  );
}

export default App;
