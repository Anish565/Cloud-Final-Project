import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SessionPage from "./pages/SessionPage";
import ProfilePage from "./pages/ProfilePage";
import SessionHistoryPage from "./pages/SessionHistoryPage";
import MFA from "./pages/MFA";
import ProtectedRoute from "./utils/ProtectedRoute";
import { useEffect } from "react";
import { setupTokenRefresh } from "./utils/refreshingToken";
import { scheduleEndOfDayCheck } from "./utils/checkDate";
import useWebSocket from "./utils/websocketService";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


function App() {
  useEffect(() => {
    setupTokenRefresh();
  }, []);
  
  const sessions = useWebSocket(); 
  useEffect(() => {
    scheduleEndOfDayCheck(sessions);
  }, [sessions]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />  
        <Route path="/session/:id?" element={<ProtectedRoute><SessionPage /></ProtectedRoute>} /> {/* This will have an ID */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/session-history" element={<ProtectedRoute><SessionHistoryPage /></ProtectedRoute>} />
        <Route path="/mfa" element={<MFA />} />
      </Routes>
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </Router>
  )
}

export default App;