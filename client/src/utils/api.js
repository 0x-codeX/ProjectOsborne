import axios from "axios";

// 1. Create a customized Axios instance
const api =
  axios.create(
    {
      // Point this to your backend environment
      baseURL:
        import.meta
          .env
          .VITE_API_URL ||
        "http://localhost:5000/api",
      headers:
        {
          "Content-Type":
            "application/json",
        },
    },
  );

// 2. REQUEST INTERCEPTOR: The "Bouncer"
// This runs BEFORE every single request leaves your frontend
api.interceptors.request.use(
  (
    config,
  ) => {
    // Grab the token securely
    const token =
      localStorage.getItem(
        "nippy_token",
      );

    // If we have a token, slap it on the authorization header
    if (
      token
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (
    error,
  ) => {
    return Promise.reject(
      error,
    );
  },
);

// 3. RESPONSE INTERCEPTOR: The "Safety Net"
// This runs EVERY TIME your frontend receives a response from the backend
api.interceptors.response.use(
  (
    response,
  ) => {
    // If the request was successful, just pass it through
    return response;
  },
  (
    error,
  ) => {
    // If the backend says "401 Unauthorized" (token expired, banned, or invalid)
    if (
      error.response &&
      error
        .response
        .status ===
        401
    ) {
      console.warn(
        "Session expired or invalid. Logging out.",
      );

      // Wipe the dead credentials
      localStorage.removeItem(
        "nippy_token",
      );
      localStorage.removeItem(
        "nippy_user",
      );

      // Force reload and kick them to the login screen securely
      // We use window.location here because this file lives outside React Router
      if (
        window
          .location
          .pathname !==
        "/auth/login"
      ) {
        window.location.href =
          "/auth/login";
      }
    }

    return Promise.reject(
      error,
    );
  },
);

export default api;
