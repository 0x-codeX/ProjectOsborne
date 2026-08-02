# Project Structure

```text
nippy/
├── B4-Production.md
├── context.md
├── PROJECT_CONTEXT.md
├── PROJECT_STRUCTURE.md
├── client/
│   ├── index.html
│   ├── package.json
│   ├── README.md
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── App.css
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── assets/
│       ├── components/
│       │   ├── AgeGateway.jsx
│       │   ├── AuthPage.jsx
│       │   ├── BioDataSetup.jsx
│       │   ├── BookmarksFeed.jsx
│       │   ├── CreatorLayout.jsx
│       │   ├── CreatorProfile.jsx
│       │   ├── CreatorPublicProfile.jsx
│       │   ├── EarningsDashboard.jsx
│       │   ├── FanBiodata.jsx
│       │   ├── FanChatWindow.jsx
│       │   ├── FanDashboard.jsx
│       │   ├── FanFeed.jsx
│       │   ├── FanInbox.jsx
│       │   ├── FanLayout.jsx
│       │   ├── FanProfile.jsx
│       │   ├── FanSettings.jsx
│       │   ├── FeedPost.jsx
│       │   ├── KycPage.jsx
│       │   ├── LandingPage.jsx
│       │   ├── MediaUploader.jsx
│       │   ├── MonetizationSettings.jsx
│       │   ├── NotificationsFeed.jsx
│       │   ├── SecureVideoPlayer.jsx
│       │   └── WithdrawalModal.jsx
│       ├── hooks/
│       │   └── useWeb3Transfer.js
│       └── pages/
│           ├── ChatWindow.jsx
│           ├── CreatorDashboard.jsx
│           ├── CreatorVault.jsx
│           └── Inbox.jsx
├── contracts/
│   ├── foundry.toml
│   ├── README.md
│   ├── broadcast/
│   │   ├── DeployMaster.s.sol/
│   │   ├── DeployMockUSDT.s.sol/
│   │   └── DeployNippyPaymentGateway.s.sol/
│   ├── cache/
│   │   ├── solidity-files-cache.json
│   │   ├── DeployMaster.s.sol/
│   │   ├── DeployMockUSDT.s.sol/
│   │   └── DeployNippyPaymentGateway.s.sol/
│   ├── lib/
│   │   ├── forge-std/
│   │   └── openzeppelin-contracts/
│   ├── script/
│   │   ├── DeployMaster.s.sol
│   │   ├── DeployMockUSDT.s.sol
│   │   └── DeployNippyPaymentGateway.s.sol
│   ├── src/
│   │   ├── MockUSDT.sol
│   │   └── NippyPaymentGateway.sol
│   └── test/
│       └── Counter.t.sol
└── server/
    ├── package.json
    ├── server.js
    ├── controllers/
    │   ├── authController.js
    │   ├── contentController.js
    │   ├── earningsController.js
    │   ├── kycController.js
    │   ├── mediaController.js
    │   ├── messageController.js
    │   ├── notificationController.js
    │   ├── purchaseController.js
    │   ├── userController.js
    │   └── withdrawalController.js
    ├── cron/
    │   └── reaper.js
    ├── middleware/
    │   └── authMiddleware.js
    ├── models/
    │   ├── Content.js
    │   ├── Conversation.js
    │   ├── Message.js
    │   ├── Notification.js
    │   ├── Purchase.js
    │   ├── User.js
    │   ├── Wallet.js
    │   └── Withdrawal.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── contentRoutes.js
    │   ├── earningsRoutes.js
    │   ├── mediaRoutes.js
    │   ├── messageRoutes.js
    │   ├── notificationRoutes.js
    │   ├── purchaseRoutes.js
    │   ├── userRoutes.js
    │   └── withdrawalRoutes.js
    ├── utils/
    │   └── cloudflare.js
    └── workers/
        ├── resetTest.js
        ├── seedTest.js
        └── treasuryWorker.js
        └── web3Listener.js
```
