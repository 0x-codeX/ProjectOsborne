const axios = require("axios");
const {
  roundUpToNearestHalf,
} = require("./priceRounding");

// In-memory exchange rate cache (1-hour TTL)
let rateCache =
  {};
let lastCacheTime = 0;
const CACHE_TTL_MS =
  60 *
  60 *
  1000;

// Fallback rates if external exchange API is unreachable
const FALLBACK_RATES_FROM_USD =
  {
    NGN: 1550,
    EUR: 0.92,
    GBP: 0.78,
    CAD: 1.36,
    KES: 129.5,
    GHS: 15.5,
    USD: 1.0,
  };

const COUNTRY_TO_CURRENCY =
  {
    Nigeria:
      "NGN",
    "United States":
      "USD",
    "United Kingdom":
      "GBP",
    Kenya:
      "KES",
    Ghana:
      "GHS",
    Canada:
      "CAD",
    Germany:
      "EUR",
    France:
      "EUR",
    default:
      "USD",
  };

/**
 * Fetches USD-based exchange rates with caching.
 */
async function getExchangeRates() {
  const now =
    Date.now();
  if (
    rateCache &&
    now -
      lastCacheTime <
      CACHE_TTL_MS &&
    Object.keys(
      rateCache,
    )
      .length >
      0
  ) {
    return rateCache;
  }

  try {
    const res =
      await axios.get(
        "https://open.er-api.com/v6/latest/USD",
      );
    if (
      res.data &&
      res
        .data
        .rates
    ) {
      rateCache =
        res
          .data
          .rates;
      lastCacheTime =
        now;
      return rateCache;
    }
  } catch (err) {
    console.warn(
      "[-] Exchange rate fetch failed. Using fallbacks.",
      err.message,
    );
  }

  return FALLBACK_RATES_FROM_USD;
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
        "NGN",
      paystackNGNAmount: 0,
    };
  }

  const targetCurrency =
    COUNTRY_TO_CURRENCY[
      userCountryOrCurrency
    ] ||
    userCountryOrCurrency ||
    COUNTRY_TO_CURRENCY.default;

  // If user is in Nigeria, return raw NGN without currency conversion
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

  const rates =
    await getExchangeRates();
  const usdRate =
    rates[
      "NGN"
    ] ||
    FALLBACK_RATES_FROM_USD.NGN;
  const targetRate =
    rates[
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
  };
}

module.exports =
  {
    convertAndRoundPrice,
    COUNTRY_TO_CURRENCY,
  };
