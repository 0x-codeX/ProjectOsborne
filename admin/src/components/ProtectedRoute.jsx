import {
  Navigate,
  Outlet,
} from "react-router-dom";

const ProtectedRoute =
  () => {
    const token =
      localStorage.getItem(
        "nippy_admin_token",
      );

    if (
      !token
    ) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    // It MUST return <Outlet /> here, otherwise nested routes will be invisible
    return (
      <Outlet />
    );
  };

export default ProtectedRoute;
