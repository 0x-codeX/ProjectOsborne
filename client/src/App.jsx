// client/src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import CreatorLayout from "./components/CreatorLayout";
import FanLayout from "./components/FanLayout";
import AgeGateway from "./components/AgeGateway";
import LandingPage from "./components/LandingPage";
import KycPage from "./components/KycPage";
import CreatorDashboard from "./pages/CreatorDashboard";
import BioDataSetup from "./components/BioDataSetup";
import CreatorProfile from "./components/CreatorProfile";
import CreatorVault from "./pages/CreatorVault";
import FanFeed from "./components/FanFeed";
import FanBiodata from "./components/FanBiodata";
import NotificationsFeed from "./components/NotificationsFeed";
import BookmarksFeed from "./components/BookmarksFeed";
import FanDashboard from "./components/FanDashboard";
import FanProfile from "./components/FanProfile";
import FanSettings from "./components/FanSettings";
import CreatorPublicProfile from "./components/CreatorPublicProfile";
import FanInbox from "./components/FanInbox";
import FanChatWindow from "./components/FanChatWindow";






// Dummy components to prevent white-screen crashes on new fan routes
const Placeholder =
  ({
    title,
  }) => (
    <div className="p-10 text-center text-gray-400 text-xl">
      {
        title
      }{" "}
      coming
      soon...
    </div>
  );

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC & ONBOARDING ROUTES */}
        <Route
          path="/"
          element={
            <AgeGateway />
          }
        />
        <Route
          path="/auth/login"
          element={
            <LandingPage />
          }
        />
        <Route
          path="/fan-setup"
          element={
            <FanBiodata />
          }
        />

        {/* Creator Onboarding */}
        <Route
          path="/auth/creator/biodata"
          element={
            <BioDataSetup />
          }
        />
        <Route
          path="/auth/creator/kyc"
          element={
            <KycPage />
          }
        />

        {/* FAN ZONE */}
        <Route
          element={
            <FanLayout />
          }
        >
          <Route
            path="/feed"
            element={
              <FanFeed />
            }
          />
          <Route
            path="messages"
            element={
              <FanInbox />
            }
          />
          <Route
            path="/notifications"
            element={
              <NotificationsFeed />
            }
          />
          <Route
            path="/fan/dashboard"
            element={
              <FanDashboard />
            }
          />
          <Route
            path="/fan/profile"
            element={
              <FanProfile />
            }
          />{" "}
          {/* WIRED HERE */}
          <Route
            path="/fan/settings"
            element={
              <FanSettings />
            }
          />
          <Route
            path="/bookmarks"
            element={
              <BookmarksFeed />
            }
          />
          <Route
            path="/creator/:id"
            element={
              <CreatorPublicProfile />
            }
          />
        </Route>
        
        <Route
          path="/messages/:id"
          element={
            <FanChatWindow />
          }
        />

        {/* CREATOR ZONE */}
        <Route
          element={
            <CreatorLayout />
          }
        >
          <Route
            path="/creator/dashboard"
            element={
              <CreatorDashboard />
            }
          />
          <Route
            path="/creator/profile"
            element={
              <CreatorProfile />
            }
          />
          <Route
            path="/creator/vault"
            element={
              <CreatorVault />
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
