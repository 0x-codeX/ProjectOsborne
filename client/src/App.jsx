// client/src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Layouts & Context Providers
import CreatorLayout from "./components/CreatorLayout";
import FanLayout from "./components/FanLayout";
import { UploadProvider } from "./components/UploadContext";

// Public / Onboarding Pages
import AgeGateway from "./components/AgeGateway";
import LandingPage from "./components/LandingPage";
import KycPage from "./components/KycPage";
import BioDataSetup from "./components/BioDataSetup";
import FanBiodata from "./components/FanBiodata";

// Fan Pages
import FanFeed from "./components/FanFeed";
import NotificationsFeed from "./components/NotificationsFeed";
import BookmarksFeed from "./components/BookmarksFeed";
import FanDashboard from "./components/FanDashboard";
import FanProfile from "./components/FanProfile";
import FanSettings from "./components/FanSettings";
import FanInbox from "./components/FanInbox";
import FanChatWindow from "./components/FanChatWindow";
import CreatorPublicProfile from "./components/CreatorPublicProfile";
import LivePlayer from "./components/LivePlayer";

// Creator Pages
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatorVault from "./pages/CreatorVault";
import CreatorProfile from "./components/CreatorProfile";
import CreatorSettings from "./components/CreatorSettings";
import CreatorFeed from "./components/CreatorFeed";
import CreatorMessages from "./components/CreatorMessages";
import CreatorLiveSetup from "./components/CreatorLiveSetup";
import CreatorLiveStudio from "./components/CreatorLiveStudio";

// Dummy components to prevent white-screen crashes on new routes
const Placeholder =
  ({
    title,
  }) => (
    <div className="p-10 text-center text-gray-400 text-xl font-bold flex items-center justify-center h-full">
      {
        title
      }{" "}
      module
      is
      currently
      under
      construction.
    </div>
  );

function App() {
  return (
    <GoogleOAuthProvider
      clientId={
        import.meta
          .env
          .VITE_GOOGLE_CLIENT_ID
      }
    >
      <Router>
        <Routes>
          {/* =========================================
              PUBLIC & ONBOARDING ROUTES
          ========================================= */}
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

          {/* =========================================
              FAN ZONE (Rendered inside FanLayout)
          ========================================= */}
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
              path="/messages"
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
              path="/stream/:id"
              element={
                <LivePlayer />
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
            />
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

            {/* The Black Hole: This must stay at the bottom of FanLayout routes */}
            <Route
              path="/creator/:id"
              element={
                <CreatorPublicProfile />
              }
            />
          </Route>

          {/* Standalone full-screen chat window */}
          <Route
            path="/messages/:id"
            element={
              <FanChatWindow />
            }
          />

          {/* =========================================
              CREATOR ZONE (Rendered inside CreatorLayout)
          ========================================= */}
          {/* IRONCLAD FIX: Wrap Outlet inside UploadProvider so child routes actually render */}
          <Route
            element={
              <UploadProvider>
                <Outlet />
              </UploadProvider>
            }
          >
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
                path="/creator/vault"
                element={
                  <CreatorVault />
                }
              />
              <Route
                path="/creator/profile"
                element={
                  <CreatorProfile />
                }
              />
              <Route
                path="/creator/settings"
                element={
                  <CreatorSettings />
                }
              />
              <Route
                path="/creator/feed"
                element={
                  <CreatorFeed />
                }
              />
              <Route
                path="/creator/messages"
                element={
                  <CreatorMessages />
                }
              />
              <Route
                path="/creator/live/setup"
                element={
                  <CreatorLiveSetup />
                }
              />
              <Route
                path="/creator/studio/:id"
                element={
                  <CreatorLiveStudio />
                }
              />
              <Route
                path="/creator/notifications"
                element={
                  <Placeholder title="Creator Alerts" />
                }
              />
            </Route>
          </Route>
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
