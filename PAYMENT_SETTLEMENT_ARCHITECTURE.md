# Nippy Payment and Settlement Architecture

**Purpose:** This document is the implementation map for any LLM working on Nippy payments, creator earnings, liquidation, withdrawals, treasury operations, or admin approval. It explains how the fan payment rail and creator settlement rail work together.

**Last reviewed:** 2026-08-23  
**Repository:** `ProjectOsborne` / Nippy  
**Important status:** The payment verification paths and dashboard UI exist. The four-way settlement design is the intended operating model, but some cross-rail settlement and ledger writes still require completion and reconciliation.

## 1. The four-way matrix

A Nippy transaction has two independent dimensions:

1. **Fan payment rail:** `FIAT` or `CRYPTO`.
2. **Creator settlement rail:** `FIAT` or `CRYPTO`.

This produces four flows:

| Rail             | Fan pays                   | Creator receives                | Main business rule                                                                                                                                               |
| ---------------- | -------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crypto-to-Crypto | USDT through Polygon       | USDT directly in creator wallet | Gateway splits the payment on-chain. No admin or creator settlement click.                                                                                       |
| Fiat-to-Fiat     | Card/bank through Paystack | Fiat bank payout                | Paystack clears the money, then the scheduled fiat batch pays the creator.                                                                                       |
| Fiat-to-Crypto   | Card/bank through Paystack | USDT in creator wallet          | Fiat is cleared first; creator requests liquidation, admin confirms treasury liquidity, then creator claims a signed USDT voucher.                               |
| Crypto-to-Fiat   | USDT through Polygon       | NGN bank payout                 | USDT is held in the Nippy treasury/escrow balance; creator requests a live liquidation quote, admin confirms NGN liquidity, then the request enters fiat payout. |

The payment method selected by the fan must never silently determine the creator's settlement method. The creator's payout configuration and the platform's ledger determine settlement.

## 2. Canonical transaction lifecycle

Every paid resource follows this conceptual lifecycle:

```text
CREATOR PRICE
  -> fan-facing quote and payment method
  -> payment provider or Polygon gateway
  -> backend verification
  -> Purchase audit record
  -> resource fulfillment
  -> creator ledger credit
  -> clearing or direct settlement
  -> withdrawal/liquidation request
  -> admin/treasury processing when required
  -> final bank or wallet settlement
```

### 2.1 Price and payment data

The client may submit payment metadata, but the backend must derive the authoritative price from the database:

- PPV price comes from `Content`.
- Subscription price comes from `User.monetizationSettings` and the selected tier.
- Chat bundle price comes from `User.monetizationSettings` and bundle quantity.
- DM unlock price comes from `Message`.
- Live gift value comes from the request's validated raw amount and the live purchase rules.

The important values in the verification request are:

- `paymentMethod`: `FIAT` or `CRYPTO`.
- `reference`: Paystack idempotency key for fiat.
- `txHash`: Polygon idempotency key for crypto.
- `chargeAmount` and `chargeCurrency`: what the fan was charged.
- `rawAmount` and `rawCurrency`: the creator/base amount used for revenue accounting.
- `purchaseType`: `PPV`, `SUBSCRIPTION`, `CHAT_BUNDLE`, `DM_UNLOCK`, or `LIVE_GIFT`.

The controller must not trust a frontend amount without comparing it to the resource and creator records.

## 3. Shared payment verification path

### Primary backend file

`server/controllers/purchaseController.js`, function `verifyPayment()`.

### Verification order

1. Read the authenticated buyer from `req.user._id`.
2. Normalize `purchaseType` to uppercase.
3. Select the idempotency key: Paystack `reference` for fiat, blockchain `txHash` for crypto.
4. Return the existing purchase if that key was already processed.
5. Load the creator and the purchased resource.
6. Derive `dbBasePrice` from the database.
7. Check `rawAmount` against the database base price to prevent underpayment or tampering.
8. Reload the fan and enforce age eligibility for restricted content.
9. Verify the external payment:
   - Fiat: call Paystack transaction verification and check success, currency, and amount in minor units converted by `/ 100`.
   - Crypto: load the Polygon transaction and receipt, require a successful receipt, require the Nippy gateway address, decode the gateway call, verify token, creator recipient, and charge amount.
10. Create a completed `Purchase` record.
11. Fulfill the resource:
   - PPV adds the fan wallet to `Content.unlockedFor`.
   - DM unlock adds the fan wallet to `Message.unlockedFor`.
   - Chat bundle increments the conversation bubble balance.
12. Credit the creator ledger using the base/raw amount and platform split.
13. Create notifications and emit live events where applicable.
14. Return the purchase result.

A transaction on-chain or a successful Paystack response is not, by itself, an application entitlement. Nippy grants access only after this server-side verification and fulfillment sequence.

## 4. Rail 1: Crypto-to-Crypto

### Business meaning

The fan pays USDT and the creator accepts crypto. The Nippy gateway performs the revenue split on-chain. The intended split is 80% to the creator and the platform skim to Nippy.

### Runtime flow

```text
FanFeed/FanChatWindow
  -> useWeb3Transfer.transferUSDT()
  -> USDT approve() for the gateway
  -> gateway purchaseWithERC20(...)
  -> gateway routes creator share directly to creator wallet
  -> client posts txHash to /api/purchases/verify
  -> purchaseController verifies Polygon transaction and gateway arguments
  -> Nippy records Purchase and unlocks the resource
  -> EarningsDashboard shows lifetimeWeb3EarnedUSDT analytics
```

### Required files

- `client/src/hooks/useWeb3Transfer.js`: connects the fan wallet, switches to Polygon, approves USDT, and submits the gateway transaction.
- `client/src/components/FanFeed.jsx`: starts PPV payment and sends verification metadata.
- `client/src/components/FanChatWindow.jsx`: starts bundle/DM payment and sends verification metadata.
- `server/controllers/purchaseController.js`: verifies receipt, gateway address, token address, decoded function, creator recipient, and charge amount.
- `contracts/src/NippyPaymentGateway.sol`: defines the on-chain payment and split behavior.
- `contracts/src/MockUSDT.sol`: test token used on Amoy.
- `contracts/script/DeployNippyPaymentGateway.s.sol` and related deployment scripts: deploy and configure the gateway.
- `server/workers/web3Listener.js` and `server/services/chainListener.js`: background event processing and reconciliation.
- `server/models/Purchase.js`: records the verified purchase.

### Settlement rule

There is no admin approval, escrow release, creator click, or bank conversion in the normal Crypto-to-Crypto path. The creator wallet receives the on-chain share immediately according to the deployed contract.

### Current risks

- The server's Web3 listener is currently disabled during Livepeer stabilization.
- The verifier currently uses testnet configuration such as `MOCK_USDT_ADDRESS`.
- The purchase crediting block still references legacy wallet fields (`balanceUSDT` and `totalEarnedUSDT`) while the current wallet schema exposes fiat maps and `lifetimeWeb3EarnedUSDT`. This must be reconciled before relying on dashboard accounting.

## 5. Rail 2: Fiat-to-Fiat

### Business meaning

The fan pays by card or another Paystack-supported fiat method. The creator wants bank settlement. Paystack and Nippy hold the funds through clearing, then a scheduled batch pays the creator's bank account.

### Runtime flow

```text
Fan starts Paystack checkout
  -> Paystack returns reference
  -> client posts reference, chargeAmount, chargeCurrency, rawAmount
  -> purchaseController verifies Paystack status, amount, and currency
  -> Purchase is created and resource is fulfilled
  -> creator fiat ledger receives the creator share
  -> amount remains in fiatBalances.floating during clearing
  -> clearing moves value to fiatBalances.withdrawable
  -> Friday batch selects approved NGN Transaction records
  -> Paystack bulk transfer pays creator bank recipients
```

### Required files

- `client/src/components/FanFeed.jsx`, `FanChatWindow.jsx`, and other checkout surfaces: initialize Paystack and submit the reference.
- `server/controllers/purchaseController.js`: verifies the Paystack reference and charged amount.
- `server/services/paystackService.js`: creates transfer recipients and performs an individual fiat payout in NGN kobo.
- `server/workers/fiatBatchProcessor.js`: schedules the Friday 3:00 PM WAT bulk transfer, creates/reuses NUBAN recipients, submits Paystack bulk transfers, and marks `Transaction` records as `PROCESSING`.
- `server/models/Transaction.js`: represents fiat clearing and batch-transfer records.
- `server/models/Purchase.js`: records the original sale.
- `server/models/Wallet.js`: stores `fiatBalances.floating`, `fiatBalances.withdrawable`, and `fiatTotalEarned` maps.
- `server/models/User.js`: stores bank details, payout method, preferred currency, and creator settings.
- `server/routes/purchaseRoutes.js`, `server/routes/earningsRoutes.js`, and `server/routes/webhookRoutes.js`: route payment, earnings, and provider callbacks.

### Settlement rule

This is an automatic operational path after clearing. The creator does not need to click Liquidate. The admin does not manually approve each normal fiat-to-fiat payout, although the treasury/admin system must still monitor and reconcile the batch.

### Currency rule

`fiatBatchProcessor.js` currently submits NGN transfers and converts amounts to kobo by multiplying by 100. A non-NGN creator balance must be converted to NGN before it enters this batch, or the batch must be extended to support another Paystack settlement currency. Never pass a GHS or USD amount to an NGN transfer without an explicit conversion record.

## 6. Rail 3: Fiat-to-Crypto

### Business meaning

The fan pays fiat, but the creator wants USDT. Nippy cannot promise a crypto amount at the instant of the fan's card payment unless it accepts exchange-rate and treasury risk. The safer design is a creator-initiated liquidation.

### Runtime flow

```text
Fan pays Paystack
  -> purchaseController verifies fiat payment
  -> creator value enters fiat clearing ledger
  -> clearing completes and value becomes withdrawable fiat
  -> creator clicks Liquidate to USDT
  -> EarningsDashboard requests POST /api/earnings/quote
  -> backend fetches live P2P USDT/NGN rate and applies 3% spread
  -> quote expires after five minutes
  -> creator confirms liquidation
  -> backend creates a ClearingRequest and waits for treasury/admin approval
  -> admin confirms fiat liquidity landed in Paystack/treasury
  -> Super Admin approves, or God Admin uses instant approval
  -> backend signs an EIP-712 USDT payout voucher
  -> creator clicks Claim USDT in EarningsDashboard
  -> creator calls claimPayout(...) from MetaMask
  -> payout contract releases USDT
```

### Why the creator must click Liquidate

The click is an explicit acceptance of the current P2P rate. It prevents Nippy from locking a conversion rate on Monday and paying a materially different crypto value after the exchange market moves. It also gives the treasury team time to ensure that the platform has actual liquidity before issuing a crypto payout voucher.

### Required files

- `client/src/components/EarningsDashboard.jsx`: displays fiat balances, requests the quote, confirms liquidation, and claims approved USDT vouchers.
- `server/controllers/earningsController.js`: exposes dashboard data, P2P preview, quote generation, and liquidation execution.
- `server/utils/p2pLiquidity.js`: fetches Monierate parallel USDT/NGN rates, falls back to the configured treasury rate, applies a 3% spread, and creates five-minute quotes.
- `server/models/ClearingRequest.js`: required model for the pending liquidation queue and approval state.
- `server/controllers/adminController.js`: initiates, lists, approves, and instant-clears liquidation requests; logs admin actions.
- `server/routes/adminRoutes.js`: protects clearing routes with `requireAnyAdmin`, `requireSuperAdmin`, and `requireGodAdmin`.
- `admin/src/pages/PayoutQueue.jsx`: displays withdrawal and liquidation tabs, requires a deposit confirmation checkbox, and selects approve versus instant-clear by admin role.
- `admin/src/pages/SystemLogs.jsx`: exposes audit history.
- `admin/src/components/AdminLayout.jsx` and `admin/src/components/ProtectedRoute.jsx`: protect and frame the admin portal.
- `server/workers/treasuryWorker.js`: sends USDT for approved withdrawal requests when the custody model requires a server-side transfer.
- `server/models/Withdrawal.js`: stores payout amount, destination, status, and transaction hash; it needs explicit currency and settlement rail fields.

### Current implementation boundary

`earningsController.executeLiquidation()` currently swaps internal wallet map values:

- `USDT_TO_NGN`: decreases `fiatBalances.withdrawable.USDT` and increases `fiatBalances.floating.NGN`.
- `NGN_TO_USDT`: decreases `fiatBalances.withdrawable.NGN` and increases `fiatBalances.floating.USDT`.

The code must not be described as a completed external exchange until it records a `ClearingRequest`, enforces approval, confirms actual treasury liquidity, and reconciles the final on-chain or Paystack settlement.

## 7. Rail 4: Crypto-to-Fiat

### Business meaning

The fan pays USDT, but the creator wants NGN in a bank account. The creator's crypto value must remain visible as an escrow/USDT balance until the creator requests conversion. Nippy must not automatically credit withdrawable NGN at the moment of the fan payment.

### Runtime flow

```text
Fan pays USDT through Polygon gateway
  -> purchaseController verifies the successful gateway transaction
  -> creator's crypto entitlement is recorded in the crypto/escrow ledger
  -> EarningsDashboard shows USDT Escrow Card
  -> creator clicks Liquidate to NGN
  -> backend requests a live USDT_TO_NGN liquidation quote
  -> quote uses current P2P rate minus the protective spread
  -> creator confirms the quote
  -> ClearingRequest enters the admin queue
  -> Super/God Admin confirms Paystack NGN liquidity
  -> approved amount becomes a fiat clearing transaction
  -> Friday 3:00 PM WAT batch sends NGN to the creator's bank
```

### Why automatic NGN crediting is incorrect

If Nippy credits `withdrawable.NGN` immediately, it commits to an exchange rate at the time of the fan's crypto payment. If USDT/NGN moves before bank settlement, Nippy absorbs the difference. Manual liquidation gives the creator the current executable quote and gives treasury staff time to fund the NGN obligation.

### Required files

- `client/src/components/EarningsDashboard.jsx`: the bank creator branch displays the USDT card and the Liquidate to NGN action; it also shows a cached preview rate and requests a live quote on click.
- `server/controllers/purchaseController.js`: verifies the original crypto payment and must credit the canonical crypto/escrow ledger, not withdrawable NGN.
- `server/controllers/earningsController.js`: generates and executes `USDT_TO_NGN` quotes.
- `server/utils/p2pLiquidity.js`: obtains the live rate and applies the protective spread.
- `server/models/ClearingRequest.js`: stores creator, direction, amount, quote snapshot, approval, deposit confirmation, and final transaction references.
- `server/controllers/adminController.js`: maker-checker approval and audit logging.
- `server/routes/adminRoutes.js`: role-restricted clearing endpoints.
- `admin/src/pages/PayoutQueue.jsx`: lets staff inspect the queue and confirm treasury deposit before approval.
- `server/workers/fiatBatchProcessor.js`: sends approved NGN `Transaction` records to Paystack in the scheduled batch.
- `server/models/Transaction.js`: tracks the fiat settlement instruction and Paystack reference/status.
- `server/services/paystackService.js`: supports bank recipient creation and fiat transfer.
- `server/models/Wallet.js`: must distinguish crypto escrow/withdrawable value from fiat floating and withdrawable value.

### Settlement rule

The creator must click Liquidate to NGN. Admin approval is required because the request creates a real NGN obligation. No normal Crypto-to-Fiat request should move directly to withdrawable NGN without a quote snapshot, approval record, and treasury reconciliation.

## 8. EarningsDashboard explained

### File

`client/src/components/EarningsDashboard.jsx`.

### Data loaded on mount

The component calls:

- `GET /api/earnings/dashboard`: wallet maps, withdrawals, recent completed sales, active subscribers, and PPV count.
- `GET /api/users/settings/monetization`: creator pricing/base currency settings.
- `GET /api/earnings/p2p-rate`: cached P2P preview rate; failure falls back to `1500` for display only.

### Dashboard sections

1. **Web2 Fiat Balances:** renders currency cards from `fiatBalances.withdrawable`, `fiatBalances.floating`, and `fiatTotalEarned`.
2. **P2P controls:** for bank creators, USDT can be liquidated to NGN; for non-bank creators, fiat can be liquidated to USDT. The UI requests a live quote only when the action is selected.
3. **Web3 Instant Settlements:** displays `lifetimeWeb3EarnedUSDT` as direct crypto earnings. This is not the same as a custodial fiat balance.
4. **Withdrawal history:** displays statuses and lets a creator with `PENDING_CLAIM` metadata call the payout contract with `claimPayout(amount, nonce, deadline, signature)`.
5. **Recent sales and platform metrics:** reads completed `Purchase` records and counts active subscriptions/PPV sales.

### Trust boundary

The dashboard is a presentation and request layer. It must not be trusted for:

- payment amount or currency,
- wallet balance,
- quote validity,
- age verification,
- admin approval,
- payout eligibility, or
- final transaction status.

Those values must be reloaded and validated by the server or blockchain.

## 9. Admin settlement and maker-checker architecture

### Admin frontend

`admin/src/pages/PayoutQueue.jsx` is designed with two tabs:

- **WITHDRAWALS:** lists `/api/admin/withdrawals?status=...` and posts withdrawal actions.
- **LIQUIDATIONS:** lists `/api/admin/clearing/pending`, requires `depositConfirmed`, then posts `/api/admin/clearing/approve` or `/api/admin/clearing/instant`.

Role behavior:

- `MODERATE_ADMIN`: can inspect and initiate allowed operations.
- `SUPER_ADMIN`: can approve clearing requests and process normal maker-checker actions.
- `GOD_ADMIN`: can use the emergency/instant clearing path and force treasury audits/batches.

Admin route protection is applied in `server/routes/adminRoutes.js` after base JWT authentication. `server/middleware/adminMiddleware.js` enforces the role hierarchy.

### Admin backend

`server/controllers/adminController.js` is responsible for:

- creating and logging administrative actions,
- retrieving pending clearings,
- approving normal clearings,
- performing God Admin instant clear operations,
- retrieving and processing withdrawal payouts,
- triggering reconciliation and fiat batches, and
- writing `SystemLog` entries.

The admin layer must not approve a clearing request solely because a creator clicked Liquidate. It must verify the quote, direction, amount, destination, duplicate state, treasury deposit/liquidity confirmation, and the current approval role.

### Required models

- `server/models/ClearingRequest.js`: liquidation request state machine.
- `server/models/Transaction.js`: fiat transfer and reconciliation state.
- `server/models/Withdrawal.js`: creator payout request and final transfer hash.
- `server/models/SystemLog.js`: immutable administrative audit trail.
- `server/models/Wallet.js`: canonical creator balances.

## 10. Workers and external services

| File                                   | Responsibility                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `server/workers/fiatBatchProcessor.js` | Scheduled Friday 3:00 PM WAT Paystack bulk NGN transfers.                                                             |
| `server/workers/treasuryWorker.js`     | Server-side USDT transfers for pending withdrawal records; requires treasury private key and Polygon RPC.             |
| `server/workers/treasuryAuditor.js`    | Reconciliation/audit support invoked by admin operations.                                                             |
| `server/workers/web3Listener.js`       | Blockchain event listener and purchase reconciliation; currently disabled in `server/server.js` during stabilization. |
| `server/services/chainListener.js`     | Supporting chain-listener abstraction.                                                                                |
| `server/services/paystackService.js`   | Paystack recipient creation and individual fiat payout transfer.                                                      |
| `server/utils/p2pLiquidity.js`         | Live P2P rate, fallback rate, quote spread, and quote expiry.                                                         |
| `server/utils/currencyConversion.js`   | Cached fiat conversion and display-price rounding for supported currencies.                                           |

## 11. Models and canonical ledger requirements

### Current wallet shape

`server/models/Wallet.js` currently defines:

```javascript
fiatBalances.withdrawable[currency]
fiatBalances.floating[currency]
fiatTotalEarned[currency]
lifetimeWeb3EarnedUSDT
```

This supports the dashboard's multi-currency cards and separates clearing from withdrawable funds.

### Required canonical accounting rules

- Direct Crypto-to-Crypto creator proceeds are on-chain and should be reported separately from Nippy-held balances.
- Fiat sales should credit the creator's fiat ledger using the creator/base settlement currency and remain floating until clearing.
- Crypto-to-Fiat value must remain crypto/escrow until a creator-approved, admin-approved liquidation.
- Fiat-to-Crypto value must remain fiat until a creator liquidation request is approved and a crypto voucher is issued.
- Creator revenue splits must be calculated from the authoritative base amount, not an untrusted client amount or a later display conversion.
- Every ledger movement needs source, destination, amount, currency, exchange rate/quote ID where relevant, actor, timestamp, and external reference.

### Current mismatch that future LLMs must fix carefully

`purchaseController.verifyPayment()` currently updates legacy fields named `balanceUSDT` and `totalEarnedUSDT`, while `Wallet.js` does not define those fields and the dashboard reads the fiat maps and `lifetimeWeb3EarnedUSDT`. A verified purchase can therefore succeed without appearing in the dashboard's expected ledger. Do not patch this by adding another parallel balance. Select one canonical ledger and update:

- `server/models/Wallet.js`,
- `server/controllers/purchaseController.js`,
- `server/controllers/earningsController.js`,
- `server/controllers/withdrawalController.js`,
- `server/models/Withdrawal.js`,
- `server/models/Transaction.js`, and
- the relevant workers and admin actions.

## 12. Required state machines

### Clearing request

```text
NOT_REQUESTED
  -> QUOTED
  -> CREATOR_CONFIRMED
  -> PENDING_ADMIN_LIQUIDITY_CHECK
  -> APPROVED
  -> FIAT_TRANSFER_PENDING or CRYPTO_VOUCHER_ISSUED
  -> SETTLED
```

Failure branches must include `EXPIRED`, `REJECTED`, `FAILED`, and `CANCELLED`. A quote expiry must not be bypassed by replaying the old client payload.

### Fiat clearing

```text
FIAT_PAYMENT_VERIFIED
  -> FLOATING
  -> CLEARED
  -> WITHDRAWABLE
  -> BATCHED
  -> PAYSTACK_PROCESSING
  -> COMPLETED or FAILED
```

### Crypto payout voucher

```text
LIQUIDATION_APPROVED
  -> EIP712_VOUCHER_CREATED
  -> PENDING_CLAIM
  -> CLAIM_SUBMITTED
  -> ONCHAIN_CONFIRMED or CLAIM_FAILED
```

## 13. Implementation checklist for the next LLM

1. Add or verify `ClearingRequest` schema, indexes, status transitions, quote snapshot, and idempotency key.
2. Make `executeLiquidation()` create a clearing request and require server-side quote validation instead of trusting the submitted quote object.
3. Define whether crypto-to-crypto proceeds are analytics-only or also represented in a separate crypto ledger; do not mix them with fiat balances.
4. Replace legacy `balanceUSDT`/`totalEarnedUSDT` writes with canonical wallet updates.
5. Add `currency` and `settlementRail` to withdrawals and transactions.
6. Ensure fiat-to-fiat and crypto-to-fiat NGN records are compatible with `fiatBatchProcessor.js`.
7. Ensure Fiat-to-Crypto approval creates a signed voucher and that the dashboard can claim it exactly once.
8. Re-enable and harden the Web3 listener with durable cursor/retry behavior before mainnet.
9. Add Paystack webhook signature/idempotency handling and chargeback reversal workflow.
10. Add integration tests for all four rails, duplicate callbacks, stale quotes, currency mismatch, insufficient balances, rejected approvals, failed bank transfers, and failed on-chain claims.

## 14. File inventory by concern

### Fan checkout and payment initiation

- `client/src/components/FanFeed.jsx`
- `client/src/components/FanChatWindow.jsx`
- `client/src/components/BookmarksFeed.jsx`
- `client/src/components/CreatorPublicProfile.jsx`
- `client/src/hooks/useWeb3Transfer.js`
- `client/src/utils/api.js`
- payment UI/provider integration files used by the client

### Purchase and fulfillment

- `server/controllers/purchaseController.js`
- `server/controllers/contentController.js`
- `server/controllers/messageController.js`
- `server/models/Purchase.js`
- `server/models/Content.js`
- `server/models/Message.js`
- `server/models/Conversation.js`
- `server/routes/purchaseRoutes.js`

### Creator earnings and withdrawal

- `client/src/components/EarningsDashboard.jsx`
- `server/controllers/earningsController.js`
- `server/controllers/withdrawalController.js`
- `server/models/Wallet.js`
- `server/models/Withdrawal.js`
- `server/models/Transaction.js`
- `server/routes/earningsRoutes.js`
- `server/services/paystackService.js`

### Liquidation and treasury

- `server/utils/p2pLiquidity.js`
- `server/controllers/adminController.js`
- `server/routes/adminRoutes.js`
- `server/models/ClearingRequest.js`
- `server/workers/treasuryWorker.js`
- `server/workers/treasuryAuditor.js`
- `server/workers/fiatBatchProcessor.js`
- `server/services/chainListener.js`
- `server/workers/web3Listener.js`

### Admin UI

- `admin/src/App.jsx`
- `admin/src/components/AdminLayout.jsx`
- `admin/src/components/ProtectedRoute.jsx`
- `admin/src/pages/PayoutQueue.jsx`
- `admin/src/pages/SystemLogs.jsx`
- `admin/src/pages/AccessControl.jsx`
- `admin/src/pages/User360.jsx`
- `admin/src/pages/SupportDesk.jsx`
- `admin/src/pages/AdminLogin.jsx`

### Smart contracts and deployment

- `contracts/src/NippyPaymentGateway.sol`
- `contracts/src/MockUSDT.sol`
- `contracts/script/DeployNippyPaymentGateway.s.sol`
- `contracts/script/DeployMockUSDT.s.sol`
- `contracts/script/DeployMaster.s.sol`
- `contracts/test/`
- `client/src/hooks/useWeb3Transfer.js`
- `client/src/components/EarningsDashboard.jsx`

## 15. Function and connection map

This is the shortest useful call graph for an LLM. Start at the user action, follow the route, then follow the controller's model and external-service calls.

### 15.1 Fan payment entry points

| File                                      | Functions/state                                                                                                                                         | Connects to                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `client/src/components/FanFeed.jsx`       | `fetchFeed()`, `handleUnlockPost()`, `handlePayment()`; owns feed, payment modal, selected post, payment method, and processing state.                  | `contentController.getFeed()`, `useWeb3Transfer.transferUSDT()`, Paystack checkout, and `purchaseController.verifyPayment()`. |
| `client/src/components/FanChatWindow.jsx` | `fetchMessages()`, `handleBuyBundle()`, `handleUnlockMessage()`, `handleSendMessage()`; owns conversation, bubbles, locked messages, and payment state. | `messageController.getMessages()`, `buyMessageBundle()`, `sendMessage()`, `useWeb3Transfer`, and purchase verification.       |
| `client/src/components/BookmarksFeed.jsx` | Repeats the restricted-content/PPV unlock entry path for bookmarked posts.                                                                              | Must use the same age gate, quote, payment, and verification rules as `FanFeed.jsx`.                                          |
| `client/src/hooks/useWeb3Transfer.js`     | Wallet connection, Polygon network selection, USDT approval, gateway call, and transaction hash return.                                                 | `NippyPaymentGateway.sol`; the caller later posts the hash to `/api/purchases/verify`.                                        |
| `client/src/utils/api.js`                 | Adds authentication to API calls and handles client API errors.                                                                                         | All protected payment, earnings, and age-verification routes.                                                                 |

The frontend starts a payment but does not decide whether it is valid. It must pass the provider result to the backend and use the server response to unlock content.

### 15.2 Purchase controller functions

| Function                         | Responsibility                                                                                                                                                                 | Models/services it connects                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `verifyPayment(req, res)`        | Idempotency, database price lookup, age enforcement, Paystack verification or Polygon transaction decoding, purchase creation, fulfillment, creator credit, and notifications. | `Purchase`, `User`, `Content`, `Message`, `Conversation`, `Wallet`, `Notification`, `ethers`, Paystack API, and `currencyConversion`.                        |
| `getFanDashboard(req, res)`      | Returns a fan's purchase and access dashboard.                                                                                                                                 | `Purchase`, `Content`, and fan identity from `requireAuth`.                                                                                                  |
| `getCryptoQuote(req, res)`       | Converts a fiat/display amount to a required USDT amount, records the rate and expiry in the response.                                                                         | Bybit rate API, cached quote state, and the frontend Web3 payment flow.                                                                                      |
| `getLiveExchangeRates(req, res)` | Returns cached USD-based exchange rates.                                                                                                                                       | `currencyConversion.getExchangeRates()` and `server/config/exchangeRates.js`.                                                                                |
| `getLiquidationQuote(req, res)`  | Generates a live creator liquidation quote.                                                                                                                                    | `p2pLiquidity.generateLiquidationQuote()`. This route is duplicated in `earningsRoutes.js` and `purchaseRoutes.js`; keep one canonical route during cleanup. |

`verifyPayment()` recognizes `PPV`, `SUBSCRIPTION`, `CHAT_BUNDLE`, `DM_UNLOCK`, and `LIVE_GIFT`. It uses `reference` as the fiat idempotency key and `txHash` as the crypto idempotency key. The current implementation stores `amountPaid`, `currency`, `basePriceNGN`, `paymentMethod`, and provider identifiers in `Purchase`.

### 15.3 Creator earnings controller functions

| Function                        | Responsibility                                                                                                           | Connections                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `getDashboard(req, res)`        | Loads the creator wallet, recent completed purchases, withdrawals, active subscriptions, and PPV count.                  | `Wallet`, `Purchase`, `Withdrawal`; called by `GET /api/earnings/dashboard` from `EarningsDashboard.jsx`.                        |
| `requestWithdrawal(req, res)`   | Validates the minimum amount, atomically decreases the legacy `balanceUSDT` field, and creates a pending `Withdrawal`.   | `Wallet`, `Withdrawal`; called by `POST /api/earnings/withdraw`.                                                                 |
| `getP2PRatePreview(req, res)`   | Returns a cached preview rate for dashboard display.                                                                     | `p2pLiquidity.getLiveP2PRates(false)`; called by `GET /api/earnings/p2p-rate`.                                                   |
| `getLiquidationQuote(req, res)` | Gets a just-in-time quote with a 3% protective spread.                                                                   | `p2pLiquidity.generateLiquidationQuote(amount, direction, 0.03)`.                                                                |
| `executeLiquidation(req, res)`  | Checks quote expiry and balance, then moves values between internal fiat map buckets for `USDT_TO_NGN` or `NGN_TO_USDT`. | `Wallet`; called by `POST /api/earnings/liquidate`. It still needs ClearingRequest creation and server-side quote recomputation. |

### 15.4 EarningsDashboard functions and connections

| Function/handler                             | What it does                                                                                                                                      | API or contract connection                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `fetchDashboardData()`                       | Loads dashboard, monetization settings, and cached P2P preview in parallel; normalizes fallback response shapes into local state.                 | `GET /earnings/dashboard`, `GET /users/settings/monetization`, `GET /earnings/p2p-rate`.          |
| `handleOpenWithdrawModal(currency, amount)`  | Opens the withdrawal/liquidation UI for a selected balance.                                                                                       | Local modal state only; final action must call the backend.                                       |
| `handleOpenLiquidateModal(currency, amount)` | Chooses direction from payout method: bank creators use `USDT_TO_NGN`; other creators use `${currency}_TO_USDT`.                                  | `POST /earnings/quote`, then stores the returned quote.                                           |
| `executeLiquidation()`                       | Submits the selected amount and quote for execution and refreshes the dashboard.                                                                  | `POST /earnings/liquidate`. The backend must revalidate all quote fields.                         |
| `handleClaimPayout(withdrawal)`              | Connects MetaMask, switches to configured Polygon chain, reads voucher metadata, calls `claimPayout()`, waits for confirmation, and reloads data. | `VITE_NIPPY_TREASURY_PAYOUT_ADDRESS`, payout contract ABI, and `Withdrawal.metadata`.             |
| fiat balance rendering                       | Displays `withdrawable`, `floating`, and all-time totals by currency.                                                                             | `wallet.fiatBalances.withdrawable`, `wallet.fiatBalances.floating`, and `wallet.fiatTotalEarned`. |
| Web3 rendering                               | Displays direct crypto earnings separately from fiat balances.                                                                                    | `wallet.lifetimeWeb3EarnedUSDT`.                                                                  |

`EarningsDashboard.jsx` is a UI coordinator. It should never be used as a ledger, approval authority, or source of truth.

### 15.5 Admin clearing functions

| Function                         | Role                                                                     | Route and next step                                                                       |
| -------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `initiateClearing(req, res)`     | Creates a creator liquidation request after a creator action.            | `POST /api/admin/clearing/initiate`; stores `ClearingRequest`.                            |
| `getPendingClearings(req, res)`  | Lists pending liquidation requests for the admin queue.                  | `GET /api/admin/clearing/pending`; consumed by `admin/src/pages/PayoutQueue.jsx`.         |
| `approveClearing(req, res)`      | Super Admin maker-checker approval after deposit/liquidity confirmation. | `POST /api/admin/clearing/approve`; should create a fiat `Transaction` or crypto voucher. |
| `godAdminInstantClear(req, res)` | God Admin emergency/instant clearing path.                               | `POST /api/admin/clearing/instant`; must be fully audited and restricted.                 |
| `processPayoutAction(req, res)`  | Processes or rejects normal withdrawal records.                          | `POST /api/admin/withdrawals/action`; connects to `Withdrawal` and payout workers.        |
| `logAdminAction(...)`            | Writes admin actions to the audit log.                                   | `SystemLog`; used by all sensitive admin operations.                                      |

The admin frontend uses `nippy_admin_token` and `nippy_admin_user`. It must not trust creator-submitted amounts or a checkbox alone: the backend must reload the clearing request, quote, balances, destination, and role before changing state.

### 15.6 Models and field ownership

- `server/models/User.js`: owns identity, role, payout method, bank details, wallet address, preferred currency, creator pricing, KYC, and age verification.
- `server/models/Content.js`: owns creator, base price, NSFW state, private media, teaser, and unlock state.
- `server/models/Message.js`: owns DM price, sender/creator relationship, locked state, and unlock state.
- `server/models/Purchase.js`: owns the immutable purchase audit record linking fan, creator, resource, purchase type, payment method, fiat reference or blockchain hash, paid amount, currency, and base price.
- `server/models/Conversation.js`: owns message bubbles, participants, and bundle effects after a verified `CHAT_BUNDLE` purchase.
- `server/models/Wallet.js`: owns creator fiat maps, floating/withdrawable state, fiat totals, and direct Web3 earning analytics.
- `server/models/ClearingRequest.js`: owns a creator liquidation request, direction, payout method, admin approval, and deposit confirmation.
- `server/models/Transaction.js`: owns settlement instructions, NGN/USDT amount and currency, swap details, quote/admin linkage, status, and external metadata.
- `server/models/Withdrawal.js`: owns a creator withdrawal destination, amount, status, and final transaction hash. It currently needs explicit currency and settlement rail fields.
- `server/models/SystemLog.js`: owns the audit trail for admin approvals, overrides, payouts, and treasury operations.

### 15.7 Workers, services, and external connections

- `server/workers/web3Listener.js` -> listens/reconciles blockchain payment events -> `Purchase`, creator wallets, and fulfillment. It is currently disabled from `server/server.js` during stabilization.
- `server/services/chainListener.js` -> supporting chain-listener abstraction used for Web3 monitoring/recovery.
- `server/workers/fiatBatchProcessor.js` -> selects pending NGN `Transaction` records -> creates Paystack recipients -> submits bulk transfers -> marks transactions `PROCESSING`.
- `server/services/paystackService.js` -> creates a Paystack transfer recipient and submits individual NGN bank transfers in kobo.
- `server/workers/treasuryWorker.js` -> reads pending `Withdrawal` records -> signs/transfers USDT from the treasury wallet -> records `txHash` and status.
- `server/workers/treasuryAuditor.js` -> reconciles treasury balances and is callable from admin operations.
- `server/utils/p2pLiquidity.js` -> Monierate live P2P rate -> fallback rate -> spread-adjusted quote -> five-minute expiry.
- `server/utils/currencyConversion.js` -> external exchange-rate providers -> one-hour cache -> fallback rates -> display conversion/rounding.
- `contracts/src/NippyPaymentGateway.sol` -> receives approved token payments and performs the on-chain creator/platform split.
- `contracts/src/MockUSDT.sol` -> local/testnet token used by deployment scripts and the Web3 hook.

### 15.8 Route map

```text
FanFeed/FanChatWindow
  -> POST /api/purchases/verify
  -> purchaseController.verifyPayment
  -> Purchase + Content/Message/Conversation + Wallet

EarningsDashboard
  -> GET /api/earnings/dashboard
  -> earningsController.getDashboard
  -> Wallet + Withdrawal + Purchase

EarningsDashboard
  -> POST /api/earnings/quote
  -> POST /api/earnings/liquidate
  -> earningsController quote/execution functions
  -> p2pLiquidity + Wallet (then ClearingRequest is required)

PayoutQueue
  -> GET /api/admin/clearing/pending
  -> POST /api/admin/clearing/approve or /instant
  -> adminController clearing functions
  -> ClearingRequest + Transaction + Wallet + SystemLog

fiatBatchProcessor
  -> Transaction(status=PENDING, type=LIQUIDATION, currency=NGN)
  -> Paystack bulk transfer
  -> Transaction(status=PROCESSING/COMPLETED)

treasuryWorker
  -> Withdrawal(status=PENDING)
  -> Polygon USDT transfer
  -> Withdrawal(status=COMPLETED, txHash)
```

## 16. Non-negotiable invariants

- Never credit withdrawable NGN automatically for a Crypto-to-Fiat sale.
- Never issue a crypto voucher before the approved clearing request confirms liquidity.
- Never let a frontend amount override the database price or server quote.
- Never fulfill a duplicate Paystack reference or blockchain transaction twice.
- Never treat `localStorage`, a JWT snapshot, or a UI balance as authoritative.
- Never mix a fiat amount and a USDT amount without a currency field and rate/quote snapshot.
- Never report direct on-chain creator earnings as if they were Nippy-held fiat funds.
- Never run production treasury operations with an exposed private key on the public API server.
- Every admin approval, payout, liquidation, rejection, and override must be auditable.
