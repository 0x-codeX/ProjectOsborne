# Things to fix before Production.

1. Event Listener Fragility: Your web3Listener.js handles HTTP polling and WSS gracefully. However, if your Node server crashes and restarts, you might miss events that fired during the downtime if the 2000-block lookback isn't enough. Eventually, you'll need a dedicated indexer (like The Graph) or a robust queueing system (like Redis/BullMQ) to make this truly ironclad.
   
2. Withdrawal Worker: Your treasuryWorker.js signs transactions with a private key. Ensure that server is heavily firewalled and isolated from the public-facing API.


Short-Term (Today): Type allow, get that pub-...r2.dev URL, and plug it into your .env file (remember: no https://, no trailing slash). We need this just to prove your backend pipeline works, the FFmpeg compression runs, and the frontend blur UI triggers correctly on your local machine.

Long-Term (Production): Before you launch this to actual paying users, we will come back to this exact page and click "Connect a Custom Domain" (e.g., media.yournippydomain.com). Doing that removes the rate limit and unlocks Cloudflare's massive global caching network, which is critical for serving videos fast in Nigeria without skyrocketing your server costs.

Before you go to mainnet, you will want to update your GATEWAY_ABI smart contract to accept a purchaseType integer (e.g., 0 = PPV, 1 = Sub, 2 = Chat). When the contract emits that integer in its event, your Web3 listener will know exactly what the user bought without having to guess based on missing contentIds.

For CloudFlare CORS Policy
(Note: Using * is fine for development. When you launch the actual business, we will lock AllowedOrigins down to your official production domain name).

Block the attach media contents via chats for now.


what is your architectural plan for handling fiat chargebacks on Paystack if a malicious fan uses a stolen credit card, buys a PPV, and the bank forces a reversal after the creator has already withdrawn the funds?
