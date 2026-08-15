/**
 * Utility to round prices UP to the nearest .00 or .50 increment.
 * @param {number} amount - Raw converted currency value (e.g., 7.34)
 * @returns {number} - Clean rounded value (e.g., 7.50)
 */
function roundUpToNearestHalf(
  amount,
) {
  if (
    !amount ||
    isNaN(
      amount,
    ) ||
    amount <=
      0
  )
    return 0;
  return (
    Math.ceil(
      amount *
        2,
    ) / 2
  );
}

module.exports =
  {
    roundUpToNearestHalf,
  };
