import axios from "axios";

// 1. Get a clean root domain (strip '/api' if Vercel injected it)
const rawUrl =
  import.meta
    .env
    .VITE_API_URL ||
  "https://nippy-serverside.onrender.com";
const rootDomain =
  rawUrl.replace(
    "/api",
    "",
  );

const api =
  axios.create(
    {
      baseURL:
        rootDomain,
      headers:
        {
          "Content-Type":
            "application/json",
        },
    },
  );

// 2. REQUEST INTERCEPTOR: The "Bouncer & Router"
api.interceptors.request.use(
  (
    config,
  ) => {
    // Automatically inject '/api' into the URL if it is missing
    if (
      config.url &&
      !config.url.startsWith(
        "/api",
      ) &&
      !config.url.startsWith(
        "http",
      )
    ) {
      const cleanPath =
        config.url.startsWith(
          "/",
        )
          ? config.url.substring(
              1,
            )
          : config.url;
      config.url = `/api/${cleanPath}`;
    }

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
api.interceptors.response.use(
  (
    response,
  ) => {
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

      // Kick them to the login screen securely
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
