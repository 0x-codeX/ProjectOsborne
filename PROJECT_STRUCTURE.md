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
│   │   └── Tailwind configuration for the Vite client styling setup.
│   ├── vite.config.js
│   │   └── Vite configuration for the frontend development and build workflow.
│   ├── public/
│   └── src/
│       ├── App.css
│       ├── App.jsx
│       │   └── Main React entry component that renders the app shell.
│       ├── index.css
│       ├── main.jsx
│       │   └── React bootstrap file that mounts the application to the DOM.
│       ├── assets/
│       ├── components/
│       │   ├── AgeGateway.jsx
│       │   │   └── Age verification gate for access-controlled features.
│       │   ├── AuthPage.jsx
│       │   │   └── Authentication screen for creators and fans.
│       │   ├── BioDataSetup.jsx
│       │   │   └── Profile setup UI for user biodata collection.
│       │   ├── BookmarksFeed.jsx
│       │   │   └── Feed view for bookmarked creator content.
│       │   ├── CreatorLayout.jsx
│       │   │   └── Shared layout for creator-facing pages.
│       │   ├── CreatorProfile.jsx
│       │   │   └── Creator profile management interface.
│       │   ├── CreatorPublicProfile.jsx
│       │   │   └── Public-facing creator profile view.
│       │   ├── CreatorMessages.jsx
│       │   │   └── Messaging component for creator-side conversations.
│       │   ├── EarningsDashboard.jsx
│       │   │   └── Revenue dashboard for creator earnings insights.
│       │   ├── FanBiodata.jsx
│       │   │   └── Fan profile data form and display component.
│       │   ├── FanChatWindow.jsx
│       │   │   └── Messaging UI for fan-to-creator conversations.
│       │   ├── FanDashboard.jsx
│       │   │   └── Dashboard experience for fans.
│       │   ├── FanFeed.jsx
│       │   │   └── Content feed tailored for fan browsing.
│       │   ├── FanInbox.jsx
│       │   │   └── Inbox view for fan message management.
│       │   ├── FanLayout.jsx
│       │   │   └── Shared layout for fan-specific pages.
│       │   ├── FanProfile.jsx
│       │   │   └── Fan profile management component.
│       │   ├── FanSettings.jsx
│       │   │   └── Settings interface for fan account preferences.
│       │   ├── FeedPost.jsx
│       │   │   └── Component for rendering a feed post entry.
│       │   ├── KycPage.jsx
│       │   │   └── KYC onboarding experience for user verification.
│       │   ├── LandingPage.jsx
│       │   │   └── Marketing and onboarding landing page.
│       │   ├── MediaUploader.jsx
│       │   │   └── Media upload experience for content submission.
│       │   ├── MonetizationSettings.jsx
│       │   │   └── Creator monetization configuration interface.
│       │   ├── NotificationsFeed.jsx
│       │   │   └── Notification feed UI for app alerts.
│       │   ├── SecureVideoPlayer.jsx
│       │   │   └── Protected video player for premium content.
│       │   └── WithdrawalModal.jsx
│       │       └── Withdrawal flow modal for moving funds.
│       ├── hooks/
│       │   └── useWeb3Transfer.js
│       │       └── Hook for handling blockchain transfer flow in the client.
│       └── pages/
│           ├── ChatWindow.jsx
│           │   └── Dedicated chat page for direct conversations.
│           ├── CreatorDashboard.jsx
│           │   └── Creator dashboard page for managing content and revenue.
│           ├── CreatorVault.jsx
│           │   └── Creator vault page for funds and withdrawals.
│           └── Inbox.jsx
│               └── Inbox page for message and notification viewing.
└── server/
    ├── package.json
    ├── server.js
    │   └── Main Node.js entry point for the backend API server.
    ├── controllers/
    │   ├── authController.js
    │   │   └── Authentication and session management logic.
    │   ├── contentController.js
    │   │   └── Content creation and retrieval controller logic.
    │   ├── earningsController.js
    │   │   └── Earnings aggregation and reporting controller logic.
    │   ├── kycController.js
    │   │   └── KYC-related request handling and validation.
    │   ├── mediaController.js
    │   │   └── Media upload and file handling controller logic.
    │   ├── messageController.js
    │   │   └── Messaging and conversation controller logic.
    │   ├── notificationController.js
    │   │   └── Notification generation and delivery controller logic.
    │   ├── purchaseController.js
    │   │   └── Purchase and payment flow controller logic.
    │   ├── userController.js
    │   │   └── User profile and account controller logic.
    │   └── withdrawalController.js
    │       └── Withdrawal request processing controller logic.
    ├── cron/
    │   └── reaper.js
    │       └── Scheduled cleanup job for stale or expired records.
    ├── middleware/
    │   └── authMiddleware.js
    │       └── Authentication middleware for protected routes.
    ├── models/
    │   ├── Content.js
    │   │   └── Mongoose model for creator content documents.
    │   ├── Conversation.js
    │   │   └── Mongoose model for chat conversations.
    │   ├── Message.js
    │   │   └── Mongoose model for chat messages.
    │   ├── Notification.js
    │   │   └── Mongoose model for app notifications.
    │   ├── Purchase.js
    │   │   └── Mongoose model for purchases and payments.
    │   ├── User.js
    │   │   └── Mongoose model for user accounts.
    │   ├── Wallet.js
    │   │   └── Mongoose model for wallet state.
    │   └── Withdrawal.js
    │       └── Mongoose model for payout withdrawals.
    ├── routes/
    │   ├── authRoutes.js
    │   │   └── Auth endpoints for login, registration, and session handling.
    │   ├── contentRoutes.js
    │   │   └── Routes for content CRUD and feed operations.
    │   ├── earningsRoutes.js
    │   │   └── Routes for earnings and monetization data.
    │   ├── mediaRoutes.js
    │   │   └── Routes for media upload and retrieval.
    │   ├── messageRoutes.js
    │   │   └── Routes for direct messaging features.
    │   ├── notificationRoutes.js
    │   │   └── Routes for notification queries and updates.
    │   ├── purchaseRoutes.js
    │   │   └── Routes for purchase and payment handling.
    │   ├── userRoutes.js
    │   │   └── Routes for user profile and account operations.
    │   └── withdrawalRoutes.js
    │       └── Routes for withdrawal request management.
    ├── utils/
    │   └── cloudflare.js
    │       └── Helper utilities for Cloudflare media integrations.
    └── workers/
        ├── resetTest.js
        │   └── Worker script for resetting test state.
        ├── seedTest.js
        │   └── Worker script for populating test data.
        ├── treasuryWorker.js
        │   └── Background worker for treasury and payout processing.
        └── web3Listener.js
            └── Listener worker for blockchain-related events.
```
