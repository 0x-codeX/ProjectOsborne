import axios from "axios";

const api =
  axios.create(
    {
      // Falls back to your deployed server if the env variable isn't found
      baseURL:
        import.meta
          .env
          .VITE_API_URL ||
        "https://nippy-serverside.onrender.com/api",
    },
  );

// Automatically inject the admin token into every request
api.interceptors.request.use(
  (
    config,
  ) => {
    const token =
      localStorage.getItem(
        "nippy_admin_token",
      );
    if (
      token
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

export default api;
