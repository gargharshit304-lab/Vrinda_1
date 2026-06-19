import { Navigate, useLocation } from "react-router-dom";
import { getAuthToken } from "../data/authStorage";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = getAuthToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
}
