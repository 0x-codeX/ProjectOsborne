# Things to fix before Production.

1. Event Listener Fragility: Your web3Listener.js handles HTTP polling and WSS gracefully. However, if your Node server crashes and restarts, you might miss events that fired during the downtime if the 2000-block lookback isn't enough. Eventually, you'll need a dedicated indexer (like The Graph) or a robust queueing system (like Redis/BullMQ) to make this truly ironclad.
   
2. Withdrawal Worker: Your treasuryWorker.js signs transactions with a private key. Ensure that server is heavily firewalled and isolated from the public-facing API.