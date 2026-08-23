const axios = require("axios");

// ISO 3166-1 alpha-2 country codes for strict jurisdictions
// US (States like TX, UT, VA), UK (Online Safety Act), AUS, and strict EU nations.
const STRICT_JURISDICTIONS =
  [
    "US",
    "GB",
    "AU",
    "DE",
    "FR",
    "IT",
    "ES",
    "NL",
  ];

/**
 * Interrogates an IP address to determine its origin and VPN/Proxy status.
 * @param {string} ipAddress - The client's IP address
 * @returns {object} { requiresIdCheck, country, isVpn }
 */
exports.checkGeofence =
  async (
    ipAddress,
  ) => {
    // 1. Bypass for local development
    if (
      !ipAddress ||
      ipAddress ===
        "::1" ||
      ipAddress ===
        "127.0.0.1"
    ) {
      console.log(
        "Localhost detected. Bypassing geofence.",
      );
      return {
        requiresIdCheck: false,
        country:
          "DEV",
        isVpn: false,
      };
    }

    try {
      // 2. Fetch IP Intelligence
      // ip-api is free for non-commercial use (45 requests per minute).
      // The fields parameter explicitly requests Proxy and Hosting (Datacenter) detection.
      const response =
        await axios.get(
          `http://ip-api.com/json/${ipAddress}?fields=status,countryCode,proxy,hosting`,
        );

      if (
        response
          .data
          .status !==
        "success"
      ) {
        throw new Error(
          "IP API returned a failed status.",
        );
      }

      const country =
        response
          .data
          .countryCode;

      // 3. Evaluate Risk
      // If proxy is true (VPN/Tor) OR hosting is true (Datacenter/Cloud provider), they are hiding.
      const isVpn =
        response
          .data
          .proxy ===
          true ||
        response
          .data
          .hosting ===
          true;

      // 4. Determine if they are in the danger zone
      const requiresIdCheck =
        STRICT_JURISDICTIONS.includes(
          country,
        );

      return {
        requiresIdCheck,
        country,
        isVpn,
      };
    } catch (error) {
      console.error(
        "[GeoService Error] Failed to lookup IP:",
        error.message,
      );

      // THE FAILSAFE: If the IP lookup service goes down, what do you do?
      // We fail "closed". We assume they need an ID check to protect your liability.
      return {
        requiresIdCheck: true,
        country:
          "UNKNOWN",
        isVpn: false,
      };
    }
  };
