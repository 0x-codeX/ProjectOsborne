// server/utils/currencyConversion.js
const axios = require("axios");
const {
  roundUpToNearestHalf,
} = require("./priceRounding");
const config = require("../config/exchangeRates");

// In-memory exchange rate cache
let rateCache =
  {};
let lastCacheTime = 0;

/**
 * Fetches USD-based exchange rates using a 3-Tier Fallback Strategy.
 */
async function getExchangeRates() {
  const now =
    Date.now();

  // Return cached rates if they are fresh
  if (
    Object.keys(
      rateCache,
    )
      .length >
      0 &&
    now -
      lastCacheTime <
      config.CACHE_TTL_MS
  ) {
    return rateCache;
  }

  // TIER 1: Primary API (ExchangeRate-API)
  if (
    process
      .env
      .EXCHANGE_RATE_API
  ) {
    try {
      const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API}/latest/USD`;
      const res =
        await axios.get(
          url,
          {
            timeout: 5000,
          },
        ); // 5 second timeout
      if (
        res.data &&
        res
          .data
          .conversion_rates
      ) {
        rateCache =
          res
            .data
            .conversion_rates;
        lastCacheTime =
          now;
        console.log(
          "[i] Exchange rates updated via Primary API",
        );
        return rateCache;
      }
    } catch (err) {
      console.warn(
        "[-] Primary Exchange API failed:",
        err.message,
      );
    }
  }

  // TIER 2: Secondary API (CurrencyFreak)
  if (
    process
      .env
      .CURRENCYFREAK_API
  ) {
    try {
      const url = `https://api.currencyfreak.com/v2.0/rates/latest?apikey=${process.env.CURRENCYFREAK_API}`;
      const res =
        await axios.get(
          url,
          {
            timeout: 5000,
          },
        );
      if (
        res.data &&
        res
          .data
          .rates
      ) {
        // CurrencyFreak returns strings for rates, we MUST parse them to floats
        const parsedRates =
          {};
        for (const [
          currency,
          rate,
        ] of Object.entries(
          res
            .data
            .rates,
        )) {
          parsedRates[
            currency
          ] =
            parseFloat(
              rate,
            );
        }
        rateCache =
          parsedRates;
        lastCacheTime =
          now;
        console.log(
          "[i] Exchange rates updated via Secondary API (CurrencyFreak)",
        );
        return rateCache;
      }
    } catch (err) {
      console.warn(
        "[-] Secondary Exchange API failed:",
        err.message,
      );
    }
  }

  // TIER 3: Hardcoded Fallback
  console.warn(
    "[!] All live Exchange APIs failed. Engaging hardcoded fallbacks.",
  );
  return config.FALLBACK_RATES_FROM_USD;
}

/**
 * Converts a base NGN price into target currency and rounds UP to .00 or .50.
 * @param {number} basePriceNGN - Base price stored in database (in NGN)
 * @param {string} userCountryOrCurrency - User's country or requested currency code
 */
async function convertAndRoundPrice(
  basePriceNGN,
  userCountryOrCurrency = "USD",
) {
  if (
    !basePriceNGN ||
    basePriceNGN <=
      0
  ) {
    return {
      basePriceNGN: 0,
      displayPrice: 0,
      displayCurrency:
        config.DEFAULT_CURRENCY,
      paystackNGNAmount: 0,
    };
  }

  // 1. Resolve the requested currency (map country name to currency if necessary)
  let targetCurrency =
    config
      .COUNTRY_TO_CURRENCY[
      userCountryOrCurrency
    ] ||
    userCountryOrCurrency;

  // 2. Enforce the strict 3-currency rule (fallback to USD if invalid)
  if (
    !config.SUPPORTED_CURRENCIES.includes(
      targetCurrency,
    )
  ) {
    targetCurrency =
      config.DEFAULT_CURRENCY;
  }

  // No math needed if the target is NGN
  if (
    targetCurrency ===
    "NGN"
  ) {
    return {
      basePriceNGN,
      displayPrice:
        basePriceNGN,
      displayCurrency:
        "NGN",
      paystackNGNAmount:
        basePriceNGN,
    };
  }

  // Fetch rates
  const rates =
    await getExchangeRates();
  const usdRate =
    rates[
      "NGN"
    ] ||
    config
      .FALLBACK_RATES_FROM_USD
      .NGN;
  const targetRate =
    rates[
      targetCurrency
    ] ||
    config
      .FALLBACK_RATES_FROM_USD[
      targetCurrency
    ] ||
    1;

  // Step 1: Convert NGN to USD base
  const priceInUSD =
    basePriceNGN /
    usdRate;

  // Step 2: Convert USD to Target Currency
  const rawTargetPrice =
    priceInUSD *
    targetRate;

  // Step 3: Apply Math.ceil(* 2) / 2 Rounding
  const displayPrice =
    roundUpToNearestHalf(
      rawTargetPrice,
    );

  // Step 4: Reverse-calculate the exact Paystack NGN amount to charge for this rounded display price
  const paystackNGNAmount =
    Math.round(
      (displayPrice /
        targetRate) *
        usdRate,
    );

  return {
    basePriceNGN,
    displayPrice,
    displayCurrency:
      targetCurrency,
    paystackNGNAmount,
    exchangeRateUsed:
      targetRate /
      usdRate, // Tracking this helps with audit logs
  };
}

module.exports =
  {
    getExchangeRates,
    convertAndRoundPrice,
  };
