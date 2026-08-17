import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import User360 from "./pages/User360";
import AccessControl from "./pages/AccessControl";
import SupportDesk from "./pages/SupportDesk";
import PayoutQueue from "./pages/PayoutQueue";
import SystemLogs from "./pages/SystemLogs";



function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTE */}
        <Route
          path="/login"
          element={
            <AdminLogin />
          }
        />

        {/* PROTECTED ROUTES - Base path starts here */}
        <Route
          path="/"
          element={
            <ProtectedRoute />
          }
        >
          {/* LAYOUT WRAPPER */}
          <Route
            element={
              <AdminLayout />
            }
          >
            {/* 'index' means this loads automatically at the '/' path */}
            <Route
              index
              element={
                <User360 />
              }
            />

            {/* Nested paths (NO leading slashes) */}
            <Route
              path="support"
              element={
                <SupportDesk />
              }
            />
            <Route
              path="payouts"
              element={
                <PayoutQueue />
              }
            />
            <Route
              path="access"
              element={
                <AccessControl />
              }
            />
            <Route
              path="logs"
              element={
                <SystemLogs />
              }
            />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
