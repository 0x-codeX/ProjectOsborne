// server/config/exchangeRates.js

module.exports =
  {
    // We strictly support only these currencies to start
    SUPPORTED_CURRENCIES:
      [
        "NGN",
        "GHS",
        "USD",
      ],

    // Default fallback if an unknown currency or country is passed
    DEFAULT_CURRENCY:
      "USD",

    // Cache TTL: 1 hour in milliseconds
    CACHE_TTL_MS:
      60 *
      60 *
      1000,

    // Location-based initial suggestions
    COUNTRY_TO_CURRENCY:
      {
        Nigeria:
          "NGN",
        Ghana:
          "GHS",
        "United States":
          "USD",
        default:
          "USD",
      },

    // Hardcoded fallback rates (1 USD = X Target) if BOTH external APIs fail
    // Update these periodically manually just to be safe.
    FALLBACK_RATES_FROM_USD:
      {
        NGN: 1550,
        GHS: 15.5,
        USD: 1.0,
      },
  };
