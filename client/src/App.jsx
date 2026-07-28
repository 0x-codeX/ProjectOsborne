// client/src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import AgeGateway from "./components/AgeGateway";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import KycPage from "./components/KycPage";
import CreatorDashboard from "./pages/CreatorDashboard";
import BioDataSetup from "./components/BioDataSetup"; 
import CreatorProfile from "./components/CreatorProfile";
// Adjust the path if you put it in a /pages folder instead

// Keep the rest of your placeholders for now
const Login =
  () => (
    <div className="min-h-screen bg-nippy-onyx text-nippy-blush p-10">
      <h1>
        Fan/Creator
        Login
      </h1>
    </div>
  );
const CreatorProfile =
  () => (
    <div className="min-h-screen bg-nippy-onyx text-nippy-blush p-10">
      <h1>
        Creator
        Profile
      </h1>
    </div>
  );

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <AgeGateway />
          }
        />
        <Route
          path="/home"
          element={
            <LandingPage />
          }
        />
        <Route
          path="/auth/login"
          element={
            <AuthPage />
          }
        />
        <Route
          path="/auth/creator/biodata"
          element={
            <BioDataSetup />
          }
        />
        <Route
          path="/creator/profile"
          element={
            <CreatorProfile />
          }
        />
        <Route
          path="/auth/creator/kyc"
          element={
            <KycPage />
          }
        />
        <Route
          path="/creator/dashboard"
          element={
            <CreatorDashboard />
          }
        />
        {/* Other routes... */}
      </Routes>
    </Router>
  );
}

export default App;
