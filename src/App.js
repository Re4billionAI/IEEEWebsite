
import Home from "./pages/Dashboard/main"
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import User from "./pages/User"

import {BrowserRouter, Route, Routes} from "react-router-dom"
import ProtectedRoute from "./components/ProtectedApp/protectedApp"


import Location from "./pages/Location/main"
import Alerts from "./pages/Alerts/main"


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
