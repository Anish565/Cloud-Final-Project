import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faHome, faUser, faHistory } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  profileImageUrl?: string;
}

const Navbar: React.FC<NavbarProps> = ({ profileImageUrl }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    sessionStorage.removeItem("idToken");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  return (
    <nav className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <h1 className="text-xl font-bold">Stock Simulator</h1>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="nav-link hover:text-gray-300 flex items-center space-x-2">
              <FontAwesomeIcon icon={faHome} className="w-5 h-5" />
              <span>Home</span>
            </Link>
            
            <Link to="/profile" className="nav-link hover:text-gray-300 flex items-center space-x-2">
              <FontAwesomeIcon icon={faUser} className="w-5 h-5" />
              <span>Profile</span>
            </Link>
            
            <Link to="/session-history" className="nav-link hover:text-gray-300 flex items-center space-x-2">
              <FontAwesomeIcon icon={faHistory} className="w-5 h-5" />
              <span>Session History</span>
            </Link>

            <div className="border-l border-gray-700 h-8 mx-2"></div>

            <div className="flex items-center space-x-3">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-700"
                />
              ) : (
                <FontAwesomeIcon icon={faUserCircle} size="lg" className="text-gray-400" />
              )}
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
