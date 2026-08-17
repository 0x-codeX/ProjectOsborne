# Nippy Project Structure and Implementation Map

This file is meant to serve as a compact but detailed memory document for future LLM sessions. It is not just a folder tree. It explains the current implementation status, the important functions, the state variables, the imports, and the cross-file relationships that matter when continuing the project.

**⚡ Quick Navigation:**
- **Starting Work?** → Jump to [Section 15](#15-best-starting-points-for-continuing-the-project) for quick start guide
- **Fixing Bugs?** → [Section 12](#12-critical-production-issues-must-fix-before-launch) lists all known issues
- **Going to Production?** → [Section 14](#14-production-readiness-checklist) has deployment checklist
- **Understanding Code Flow?** → [Section 14.2+](#14-complete-frontend-backend-connection-map) has detailed API mappings
- **Need Admin Features?** → [Section 11](#11-admin-dashboard--controllers) documents admin system

## 1. What Nippy is

Nippy is a creator-first content platform with the following working domains:

- Fan onboarding and age gating
- Creator onboarding and KYC flow
- Paywalled content posting and feed browsing
- PPV content and subscription-based monetization
- Direct messaging with message bundles and unlock rules
- Web3 payments using Polygon/USDT and a custom payment gateway contract
- Creator earnings and withdrawal flow
- Notifications, bookmarks, likes, comments, and basic social graph features

## 2. Current implementation status

The project already has a meaningful working base in these areas:

- Frontend routing and role-based layouts for fans and creators
- Authentication flow for email/password and Web3 login
- Creator/fan profile and onboarding forms
- Content feed rendering with paywall and unlock logic
- Messaging UI and socket-based real-time chat
- Purchase verification flow for content, subscriptions, bundles, and DMs
- Creator earnings dashboard and payout request handling
- Cloudflare R2 / S3-style asset handling for private/public media
- Background workers for treasury and test data
- Admin dashboard with user management and support ticketing

The app is not just scaffolded. It has real backend controllers, models, routes, and web3 integration logic already wired together.

## 2.5 Production Status & Risk Assessment

**Current Status:** Feature-complete for public beta on testnet; **NOT READY for mainnet**

| Risk Category       | Status        | Impact                           | Priority   |
| ------------------- | ------------- | -------------------------------- | ---------- |
| Web3 Event Listener | ⚠️ Fragile     | Missed transactions if crash     | 🔴 CRITICAL |
| Fiat Chargebacks    | ❌ Not Handled | Platform loss + creator debt     | 🔴 CRITICAL |
| Treasury Key Mgmt   | ⚠️ Exposed     | All funds at risk if compromised | 🔴 CRITICAL |
| Testnet Config      | ⚠️ Hardcoded   | Can't switch to mainnet USDT     | 🟡 MEDIUM   |
| Smart Contract      | ⚠️ Ambiguous   | Can't distinguish payment types  | 🟡 MEDIUM   |
| Media Streaming     | ⚠️ Incomplete  | No signed URLs for secure access | 🟠 LOW      |
| Admin Email         | ⚠️ Untested    | Notifications may fail           | 🟠 LOW      |

**Before any mainnet deployment, you MUST complete Section 12 (Critical Production Issues) and Section 14 (Production Readiness Checklist).**

## 3. High-level architecture

### Client-side stack

- React + Vite
- React Router for page/route control
- Tailwind CSS for UI styling
- Axios for HTTP calls
- Socket.IO client for chat
- Ethers.js for wallet and transaction interaction
- Lucide React for icons

### Server-side stack

- Node.js + Express
- MongoDB + Mongoose
- Socket.IO server for real-time messaging
- JWT-based authentication middleware
- Cloudflare R2 / S3-compatible storage for media
- Web3 transaction verification and blockchain payment processing

## 4. Repository map

```text
nippy/
├── admin/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AccessControl.jsx
│   │   │   ├── SupportDesk.jsx
│   │   │   └── User360.jsx
│   │   └── main.jsx
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── context/
│   └── package.json
├── contracts/
│   ├── src/
│   ├── script/
│   └── test/
├── server/
│   ├── controllers/
│   ├── cron/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── workers/
│   └── server.js
└── PROJECT_STRUCTURE.md
```

## 5. Core application flow

### A. User entry and role-based routing

The app starts in the client router layer and routes users based on age verification and onboarding state.

- The entry path is handled by App.jsx
- LandingPage.jsx controls login/signup experience
- AgeGateway.jsx gates access to the app before onboarding is complete
- FanBiodata.jsx and BioDataSetup.jsx collect profile data for fans and creators
- KycPage.jsx is used for creator compliance onboarding

### B. Content and monetization flow

The main monetization loop is:

1. Creator uploads content through the content posting flow
2. The backend stores the original file privately and creates a public teaser
3. The feed loads content from the backend with price and unlock information
4. Fans purchase access through the purchase flow
5. The backend verifies the on-chain transaction and creates a completed purchase record
6. The UI unlocks the content or message access based on that purchase state

### C. Messaging flow

The messaging flow is:

1. A fan opens a chat window for a creator
2. The frontend loads conversation history from the backend
3. The backend checks bubble balance, bundle availability, access validity, and PPV rules
4. The server emits a Socket.IO event on successful send
5. The receiving client updates the chat UI in real time

## 6. Frontend files and their responsibilities

### client/src/App.jsx

Purpose:
- Main React router entrypoint for the whole frontend

Imports:
- BrowserRouter, Routes, Route from react-router-dom
- CreatorLayout, FanLayout, AgeGateway, LandingPage, KycPage, BioDataSetup
- CreatorProfile, CreatorVault, FanFeed, FanBiodata, NotificationsFeed
- BookmarksFeed, FanDashboard, FanProfile, FanSettings, CreatorPublicProfile
- CreatorFeed, CreatorMessages, FanInbox, FanChatWindow
- GoogleOAuthProvider from @react-oauth/google

Exported component:
- App (default)

Important function:
- Placeholder({ title }) – a fallback component used to avoid blank screens on incomplete routes

Important state:
- None inside App.jsx itself

Responsibilities:
- Registers all routes
- Wraps the app with Google OAuth
- Provides role-based route groups for fan and creator layouts

Connections:
- Routes to LandingPage for auth
- Routes to FanLayout and CreatorLayout for role-based sections
- Connects to FanFeed, FanChatWindow, CreatorMessages, CreatorPublicProfile, and onboarding components

---

### client/src/components/LandingPage.jsx

Purpose:
- Main login/signup UI for fans and creators

Imports:
- React and useState
- useNavigate from react-router-dom
- icons from lucide-react
- ethers from ethers
- useGoogleLogin from @react-oauth/google
- background image and logo assets

Exported component:
- LandingPage (default)

Important state:
- view: controls login vs signup flow
- selectedRole: fan or creator
- email, password, error, loading

Important functions:
- resetForm() – clears local form state
- handleEmailSubmit(e) – sends login/register request to /api/auth/login or /api/auth/register
- handleWeb3Auth() – connects to browser wallet and starts wallet-based auth flow
- handleGoogleSuccess() – finishes Google OAuth flow

Responsibilities:
- Authenticates users with email/password, Google OAuth, or wallet-based login
- Stores nippy_token and nippy_user in localStorage
- Redirects creators and fans to the correct onboarding or dashboard route

Connections:
- Talks to server auth endpoints
- Sends users to BioDataSetup, KycPage, FanBiodata, CreatorDashboard, and FanFeed

---

### client/src/components/AgeGateway.jsx

Purpose:
- Entry gate that checks whether the user is old enough and has passed the initial gate

Imports:
- React and useState
- useNavigate from react-router-dom

Exported component:
- AgeGateway (default)

Important state:
- ageConfirmed, loading, error

Important functions:
- handleContinue() – validates the gate and moves forward

Responsibilities:
- Protects the app from underage access
- Routes users into onboarding or the auth experience

Connections:
- Connected to the root route in App.jsx

---

### client/src/components/BioDataSetup.jsx

Purpose:
- Multi-step onboarding form for creators

Imports:
- React, useState, useEffect
- useNavigate and maybe useLocation
- assets/icons

Exported component:
- BioDataSetup (default)

Important state:
- many form fields such as username, email, phone, gender, country, referredBy, willingNsfw, agreedTerms, confirmedAge, profileImage, payoutAddress, securityPassword, securitySignature

Important functions:
- handleInputChange() – updates form state
- handleSubmit() – submits profile/biodata to the backend
- handleImageUpload() – uploads or stores profile image info
- loadExistingProfile() – preloads previously saved account details

Responsibilities:
- Lets creators complete account setup
- Sends profile data to /api/users/profile via the backend
- Works with the user controller and account-security validation rules

Connections:
- Connected to /auth/creator/biodata in App.jsx
- Uses the same backend profile update logic as other user profile flows

---

### client/src/components/FanBiodata.jsx

Purpose:
- Fan onboarding and profile setup page

Imports:
- React, useState
- useNavigate

Exported component:
- FanBiodata (default)

Important state:
- form state for profile data and onboarding flags

Important functions:
- handleSubmit() – sends fan biodata to the backend
- handleChange() – updates form state

Responsibilities:
- Collects the fan’s info before granting access to the fan experience
- Supports the fan-specific route /fan-setup

Connections:
- Connected to App.jsx route /fan-setup
- Uses the user profile update endpoint

---

### client/src/components/FanFeed.jsx

Purpose:
- Main feed for fans to browse content

Imports:
- React, useState, useEffect, useRef
- useWeb3Transfer from ../hooks/useWeb3Transfer
- icons from lucide-react
- Link from react-router-dom

Exported component:
- FanFeed (default)

Important state:
- feed, loading, processingId, pendingPosts, activeCommentPostId, commentText, submittingComment, paymentModalPost, paymentMethod

Important functions:
- fetchFeed() – loads content from /api/content/feed
- pollForNewPosts() – silently checks for new feed items in the background
- handleLike(), handleBookmark(), handleCommentSubmit() – interact with content actions
- handleUnlockPost() / handlePayment() – initiate payment and unlock flow

Responsibilities:
- Shows creator posts and paywalled content cards
- Supports likes, bookmarks, comments, and purchase flows
- Manages the feed polling strategy to keep it responsive without overwhelming the server

Connections:
- Calls content endpoints and purchase verification endpoints
- Uses the useWeb3Transfer hook for payment initiation
- Routes to CreatorPublicProfile and media/video player components

---

### client/src/components/FanChatWindow.jsx

Purpose:
- Fan-side direct messaging UI with unlock and payment logic

Imports:
- React, useState, useRef, useEffect
- useParams, useNavigate from react-router-dom
- icons from lucide-react
- axios
- useWeb3Transfer
- io from socket.io-client

Exported component:
- FanChatWindow (default)

Important state:
- inputText, messages, chatInfo, bubblesLeft, requiresBundle, isPurchasingBundle, bundlePrice, paymentModalMsg, paymentMethod, processingId, unlockingMsgId

Important functions:
- fetchMessages() – loads the current conversation history
- scrollToBottom() – keeps the chat view anchored at the bottom
- handleSendMessage() – sends a text message and enforces messaging rules
- handleUnlockMessage() – starts the DM unlock purchase flow
- handleBuyBundle() – purchases a message bundle from the creator

Responsibilities:
- Manages live messages and purchase-based unlocks
- Integrates with Socket.IO for real-time message updates
- Enforces fan-side restrictions such as text-only messages and bubble balances

Connections:
- Talks to /api/messages/:id and /api/messages/send
- Uses the purchase controller through the backend for unlock and bundle purchases
- Connects to the Socket.IO server in server.js

---

### client/src/components/CreatorMessages.jsx

Purpose:
- Creator-side inbox and messaging dashboard

Imports:
- React, useState, useEffect, useRef
- axios
- icons from lucide-react
- io from socket.io-client

Exported component:
- CreatorMessages (default)

Important state:
- inbox, chatHistory, activeTab, selectedChat, messageInput, searchQuery, isLoadingInbox, isSending, vaultItems, selectedVaultItem, pendingAttachment, isRecording, recordingTime

Important functions:
- fetchInbox() – loads the creator’s inbox from /api/messages/inbox
- fetchMessages() – loads the selected conversation history
- handleSendMessage() – sends a message from the creator side
- handleVaultSelection() – picks a vault item to attach to a DM
- startRecording() / stopRecording() – handles media voice capture if enabled

Responsibilities:
- Allows creators to manage conversations, send messages, and attach vault items
- Supports a rich DM experience with attachment and recording support

Connections:
- Uses the same Socket.IO chat backend as FanChatWindow
- Connects to the message controller and content vault data

---

### client/src/components/CreatorProfile.jsx

Purpose:
- Creator profile management UI

Imports:
- React, useState, useEffect
- axios
- icons

Exported component:
- CreatorProfile (default)

Important state:
- form fields for profile, monetization settings, and account data

Important functions:
- fetchProfile() – loads creator state from the backend
- handleSave() – saves changes to monetization and profile settings

Responsibilities:
- Implements creator profile editing and monetization configuration
- Hooks into monetizationSettings routes and user profile update endpoints

Connections:
- Related to userController and monetization settings on the server

---

### client/src/components/CreatorPublicProfile.jsx

Purpose:
- Public-facing creator profile page for fans

Imports:
- React, useState, useEffect
- axios
- Link

Exported component:
- CreatorPublicProfile (default)

Important state:
- profile data, creator posts, follow state, subscription info

Important functions:
- fetchCreatorProfile() – loads public creator account data
- handleFollow() – toggles follow state

Responsibilities:
- Displays public creator identity, content, and monetization info to fans

Connections:
- Used from FanFeed and route /creator/:id
- Depends on content and user endpoints

---

### client/src/components/MediaUploader.jsx

Purpose:
- Media upload experience for content creation

Imports:
- React, useState, useEffect
- axios
- icons

Exported component:
- MediaUploader (default)

Important state:
- selectedFile, preview, uploadProgress, title, description, price, isNsfw

Important functions:
- handleFileSelect() – chooses a file to upload
- handleUpload() – posts the file to the content API

Responsibilities:
- Lets creators upload media and submit paywalled content posts

Connections:
- Built to work with contentController.createContentPost and upload routes

---

### client/src/components/WithdrawalModal.jsx

Purpose:
- UI for requesting withdrawals from creator earnings

Imports:
- React, useState
- axios

Exported component:
- WithdrawalModal (default)

Important state:
- amount, destinationAddress, loading, error

Important functions:
- handleWithdraw() – submits withdrawal request to the backend

Responsibilities:
- Lets creators request payouts from their balance

Connections:
- Calls earnings and withdrawal backend routes

---

### client/src/components/FanLayout.jsx and client/src/components/CreatorLayout.jsx

Purpose:
- Shared layout wrappers for role-based navigation and page shell behavior

Imports:
- React, useState, useEffect
- react-router-dom utilities

Important state:
- sidebar/menu visibility state
- route state and maybe current active tab

Responsibilities:
- Provide the main shell around fan and creator dashboards
- Ensure route-based page rendering stays consistent

Connections:
- Wrapped around the fan and creator routes in App.jsx

---

### client/src/hooks/useWeb3Transfer.js

Purpose:
- Central hook for wallet interaction and payment execution

Imports:
- useState from react
- ethers from ethers

Exported hook:
- useWeb3Transfer()

Important state:
- isProcessingTx, txError

Important functions:
- ensurePolygonNetwork() – switches wallet to Polygon Amoy
- transferUSDT() – approves USDT and executes the gateway purchase on-chain

Responsibilities:
- Handles wallet switching, approval, and gateway purchase transaction flow

Connections:
- Used by FanFeed and FanChatWindow for content and DM payments
- Must align with the server-side purchase verification logic

## 7. Backend files and their responsibilities

### server/server.js

Purpose:
- Main Express + Socket.IO entrypoint

Imports:
- dotenv, express, mongoose, cors, helmet, http, socket.io
- route modules for auth, media, users, earnings, content, purchases, withdrawals, notifications, messages
- cron startReaper
- web3Listener worker

Exported behavior:
- No export; starts the server directly

Important setup logic:
- cors middleware for localhost:5173
- Express JSON parsing
- req.io injection for controllers
- Socket.IO connection handling
- MongoDB connection initialization
- Route mounting under /api/*
- Server listen and cron startup

Important functions and events:
- io.on("connection", socket => {...}) – handles socket connections and join_chat events
- app.get("/api/health", ...) – health check endpoint

Connections:
- All API routes are mounted here
- Socket.IO becomes available to controllers through req.io
- The web3 listener worker is initialized here

---

### server/middleware/authMiddleware.js

Purpose:
- Protects routes using JWTs and verifies creator status

Imports:
- jsonwebtoken
- User model

Exported middleware:
- requireAuth
- requireVerifiedCreator

Important behavior:
- requireAuth extracts Bearer token, verifies JWT, loads the user, and attaches it to req.user
- requireVerifiedCreator enforces that creators are KYC-verified before entry

Connections:
- Used by most protected routes in the server

---

### server/controllers/authController.js

Purpose:
- Handles authentication, user creation, and Web3 nonce flows

Imports:
- crypto, User, bcrypt, jwt, ethers

Exported functions:
- registerUser(req, res)
- loginUser(req, res)
- getWeb3Nonce(req, res)
- web3Login(req, res)
- getMe(req, res)

Important behavior:
- registerUser creates a user with hashed password
- loginUser authenticates a user and returns a JWT
- getWeb3Nonce creates or updates a wallet-based login nonce
- web3Login verifies a wallet signature and logs the user in
- getMe returns the authenticated user object

Connections:
- Works directly with the User model
- Supports frontend auth flow in LandingPage.jsx

---

### server/controllers/userController.js

Purpose:
- Handles profile setup, account updates, and monetization settings

Imports:
- User, bcrypt, ethers

Exported functions:
- submitBioData(req, res)
- deleteProfile(req, res)
- getMonetizationSettings(req, res)
- updateMonetizationSettings(req, res)
- getProfile(req, res)
- updateSettings(req, res)
- updateProfile(req, res)
- toggleFollow(req, res)

Important behavior:
- submitBioData validates onboarding data and protects sensitive updates with signature/password checks
- updateProfile and updateSettings manage profile data and account preferences
- toggleFollow manages follow relationships between users

Connections:
- Used by BioDataSetup, FanBiodata, CreatorProfile, and CreatorPublicProfile

---

### server/controllers/contentController.js

Purpose:
- Main backend controller for content posting, feed rendering, likes, bookmarks, comments, and content access

Imports:
- Content, User, Purchase, Notification, cloudflare helper, S3 client, fs, path, ffmpeg, Conversation, sharp

Exported functions:
- createContentPost(req, res)
- getFeed(req, res)
- getCreatorVault(req, res)
- updateContentPost(req, res)
- deleteContentPost(req, res)
- toggleLike(req, res)
- toggleBookmark(req, res)
- addComment(req, res)
- getBookmarks(req, res)
- getCreatorPublicProfile(req, res)
- uploadVideo(req, res)

Important behavior:
- createContentPost uploads a file, generates a teaser image/video, stores it in object storage, and saves a Content record
- getFeed returns feed content with purchase and bookmark context for the current user
- getCreatorVault returns content that belongs to a creator and can be used in messaging or vault flows
- toggleLike and toggleBookmark update social actions
- addComment creates comments on posts
- getCreatorPublicProfile returns public profile and content metadata

Connections:
- Works with the Content model, User model, Purchase model, Notification model, and Cloudflare/R2 storage
- Used by FanFeed and MediaUploader and by creator-facing content flows

---

### server/controllers/purchaseController.js

Purpose:
- Verifies and records purchases, subscriptions, bundles, PPV unlocks, and DM unlocks

Imports:
- ethers, axios, Purchase, User, Content, Message, Conversation, Wallet, Notification, S3 client helpers

Exported function:
- verifyPayment(req, res)
- getFanDashboard(req, res)

Important behavior:
- verifyPayment validates payment identifiers, determines the expected price based on purchaseType, verifies the chain transaction, and creates a Purchase record
- Supports subscription, chat bundle, PPV, and DM unlock purchase types
- Uses the creator’s wallet address and the blockchain transaction hash as the source of truth

Connections:
- Used by the frontend purchase and unlock flows in FanFeed and FanChatWindow
- Writes purchase records that later unlock content and messages

---

### server/controllers/messageController.js

Purpose:
- Handles direct messages, purchases of bundles, inbox loading, conversation history, and send/receive rules

Imports:
- Conversation, Message, Purchase, User, ethers, Wallet, S3 client helpers, crypto

Exported functions:
- sendMessage(req, res)
- buyMessageBundle(req, res)
- getInbox(req, res)
- getMessages(req, res)
- verifyMessagePayment(req, res)
- getSecureMessageMedia(req, res)
- getUnreadCount(req, res)

Important behavior:
- sendMessage enforces the fan business rules: 200-character limit, no attachments for fans, bubble balance checks, and 24-hour PPV validation
- buyMessageBundle creates the purchase record for message bundles
- getMessages loads conversation history and access metadata for the current user

Connections:
- Uses Socket.IO through req.io to broadcast received messages in real time
- Works with Conversation, Message, Purchase, and User models
- Used by FanChatWindow and CreatorMessages

---

### server/controllers/earningsController.js

Purpose:
- Gives creators earnings and withdrawal data

Imports:
- Wallet, Withdrawal, Purchase

Exported functions:
- getDashboard(req, res)
- requestWithdrawal(req, res)

Important behavior:
- getDashboard returns wallet balance, withdrawals, recent transactions, active subscribers, and PPV counts
- requestWithdrawal checks the balance and creates a pending withdrawal request

Connections:
- Used by the creator dashboard and withdrawal UI

---

### server/controllers/withdrawalController.js

Purpose:
- Handles withdrawal queueing with transaction safety logic

Imports:
- mongoose, User, Withdrawal

Exported function:
- requestWithdrawal(req, res)

Important behavior:
- Uses a MongoDB transaction to atomically deduct funds and create a pending withdrawal record
- Prevents race conditions and double-spend-style issues

Connections:
- Works with the treasury worker and creator wallet flow

---

### server/controllers/notificationController.js

Purpose:
- Returns notifications for the current user

Imports:
- Notification model

Exported functions:
- getNotifications(req, res)
- getUnreadCount(req, res)
- markAllAsRead(req, res)

Connections:
- Used by NotificationsFeed and the content creation flow to broadcast new content events

---

### server/controllers/kycController.js

Purpose:
- Handles KYC session initiation and webhook callbacks

Imports:
- User model

Exported functions:
- startKycSession(req, res)
- kycWebhook(req, res)

Connections:
- Used by KycPage.jsx and creator onboarding flow

---

### server/controllers/mediaController.js

Purpose:
- Media access and signed URL support

Imports:
- S3 client helpers

Exported function:
- getSecureStreamUrl(req, res)

Connections:
- Supports secure media playback and paywalled streaming logic

## 8. Routes

The route files are thin wiring layers. They map URL paths to controller functions and enforce middleware.

### server/routes/authRoutes.js
- POST /register
- POST /login
- GET /me
- POST /web3/nonce
- POST /web3/login
- POST /kyc/webhook

### server/routes/contentRoutes.js
- POST / for content creation
- GET /feed
- GET /creator/:id/vault
- GET /creator/:id/public
- PUT /:id
- DELETE /:id
- POST /:id/like
- POST /:id/bookmark
- POST /:id/comment
- GET /:id/payload

### server/routes/messageRoutes.js
- POST /send
- POST /bundle
- GET /inbox
- GET /:id
- GET /:id/unread
- POST /verify-payment

### server/routes/purchaseRoutes.js
- POST /verify
- GET /dashboard

### server/routes/userRoutes.js
- GET /profile
- PUT /profile
- PUT /settings
- PUT /monetization
- POST /follow

### server/routes/earningsRoutes.js
- GET /dashboard
- POST /withdraw

## 8.5 Environment Variables Quick Reference

**CRITICAL - Must be set before launch:**

```env
# Authentication & Security
JWT_SECRET=<64+ char random string>        # Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
DATABASE_URL=mongodb://...                 # MongoDB connection string

# Web3 & Blockchain
POLYGON_RPC_URL=<testnet for dev, mainnet for prod>
MOCK_USDT_ADDRESS=<testnet address for dev>
USDT_MAINNET_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F  # Real USDT on Polygon
PAYMENT_GATEWAY_ADDRESS=<deployed contract address>
TREASURY_PRIVATE_KEY=<isolated private key on private network only>

# Media & Storage
CLOUDFLARE_ACCOUNT_ID=<from dashboard>
CLOUDFLARE_API_TOKEN=<from dashboard>
CLOUDFLARE_BUCKET_NAME=nippy-media

# Payments (Fiat)
PAYSTACK_SECRET_KEY=<from Paystack dashboard>
PAYSTACK_WEBHOOK_SECRET=<from Paystack webhooks>

# Email (Admin notifications)
EMAIL_USER=<Gmail or SendGrid sender>
EMAIL_PASS=<Gmail app password or SendGrid key>

# KYC & Compliance
KYC_API_KEY=<from KYC provider>

# Admin & Support
ADMIN_JWT_SECRET=<separate from main JWT_SECRET>
```

**Issues with Current Setup:**
- ✅ Testnet: `.env` is fine with mock addresses for local development
- ❌ Production: `.env` is insecure; move to AWS Secrets Manager or Vault
- ❌ TREASURY_PRIVATE_KEY: Must be isolated from public-facing API server
- ❌ MOCK_USDT_ADDRESS: Must be replaced before mainnet

## 9. Data models

### server/models/User.js

Main fields:
- email, passwordHash, googleId, role
- username, phone, gender, country, referredBy
- willingNsfw, agreedTerms, confirmedAge, isAgeVerified, isEmailVerified
- payoutAddress, hasCompletedBioData
- walletAddress, usdtBalance, nonce
- kycStatus, kycRecord
- creatorProfile, monetizationSettings
- bookmarks, followers, following

Why this matters:
- The entire onboarding, creator profile, monetization, wallet, and social graph system depends on this schema

### server/models/Content.js
- Stores creator-owned media posts, pricing, teaser keys, file keys, and content metadata

### server/models/Purchase.js
- Records completed or pending purchases for PPV, subscriptions, bundles, and DM unlocks

### server/models/Conversation.js and server/models/Message.js
- Represent chat threads and message metadata, including access/payment state

### server/models/Wallet.js and server/models/Withdrawal.js
- Track creator balances and payout requests

### server/models/Ticket.js
- Stores support tickets submitted by users
- Main fields: userId, subject, message, status (OPEN, IN_PROGRESS, RESOLVED), resolvedBy, resolvedAt
- Used by: Admin support desk to track and manage customer support requests
- Linked to: User model (userId and resolvedBy are references to User documents)

### server/models/AdminApproval.js
- Tracks admin decisions on content access and special unlocks
- Main fields: contentId, userId, adminId, approvalType (MANUAL_UNLOCK, FRAUD_REVERSAL), justification, approvalStatus (APPROVED, REJECTED), timestamp
- Used by: Admin access control system for manual content access grants and fraud handling
- Critical for: Chargeback reversal and exception handling workflows

### server/models/SystemLog.js
- Comprehensive audit trail for all admin actions
- Main fields: adminId, action (APPROVED_MANUAL_UNLOCK, SUSPENDED_USER, PROCESSED_PAYOUT, DELETED_CONTENT), targetUserId, details, timestamp
- Used by: Compliance and audit requirements, forensic investigation of disputes
- Required for: Production readiness - all critical admin actions must be logged

## 10. Important cross-file relationships

These are the most important wiring points an LLM should remember:

- App.jsx -> routes to LandingPage, FanFeed, FanChatWindow, CreatorMessages, CreatorProfile, etc.
- LandingPage.jsx -> POSTs to /api/auth/login and /api/auth/register
- FanFeed.jsx -> GETs /api/content/feed and uses useWeb3Transfer for payments
- FanFeed.jsx -> purchase flow eventually resolves through purchaseController.verifyPayment
- FanChatWindow.jsx -> GETs /api/messages/:id and sends messages via /api/messages/send
- FanChatWindow.jsx -> uses Socket.IO room join events from server.js
- CreatorMessages.jsx -> uses /api/messages/inbox and /api/messages/:id
- MediaUploader.jsx -> POSTs to content creation endpoints that trigger the server-side media processing pipeline
- contentController.createContentPost -> uploads original file, creates teaser, stores metadata, and sends notifications
- contentController.getFeed -> reads content plus purchase and bookmark status for the logged-in viewer
- purchaseController.verifyPayment -> decides whether a payment is for PPV, subscription, bundle, or DM unlock
- messageController.sendMessage -> checks access rules before sending a message
- userController.submitBioData -> handles onboarding and sensitive-account updates
- earningsController/requestWithdrawal -> creates withdrawal requests that are later processed by the withdrawal and treasury flow

## 11. Admin Dashboard & Controllers

A new admin portal (`admin/` directory) has been added for platform administration:

### Admin Pages (Frontend)
- **AdminLogin.jsx** - Admin authentication with email/password; supports GOD_ADMIN, SUPER_ADMIN, and MODERATE_ADMIN roles
- **AccessControl.jsx** - Manage user access, account status, and user restrictions; grant/revoke special access
- **SupportDesk.jsx** - View and manage support tickets with status filtering (OPEN, IN_PROGRESS, RESOLVED); assign resolution
- **User360.jsx** - Search users and view their complete profile, content, transactions, activity, and fraud/chargeback history

### Admin Controller Functions (Backend)
**server/controllers/adminController.js** exports:
- `logAdminAction()` - Helper to log all admin actions to SystemLog for audit trail
- `searchUsers()` - Search users by email, username, or wallet address; returns paginated results
- `getUser360()` - Comprehensive user profile with all purchases, withdrawals, complaints, and content history
- `getTicketStats()` - Support desk statistics
- `resolveTicket()` - Mark support ticket as resolved and log admin action
- `approveManualUnlock()` - Grant special content access to user (e.g., chargeback reversal)
- `suspendUser()` - Suspend user account and log action
- `getSystemLogs()` - View audit trail of all admin actions

### Admin Routes (Backend)
**server/routes/adminRoutes.js** provides:
- `GET /api/admin/users/search` - Search users (requireAnyAdmin middleware)
- `GET /api/admin/users/360/:userId` - Full user profile (requireAnyAdmin)
- `GET /api/admin/tickets` - Support ticket list (requireAnyAdmin)
- `POST /api/admin/tickets/:id/resolve` - Mark ticket resolved (requireAnyAdmin)
- `POST /api/admin/users/:id/approve-unlock` - Manual content unlock (requireSuperAdmin)
- `POST /api/admin/users/:id/suspend` - Suspend user (requireGodAdmin)
- `GET /api/admin/logs` - Audit trail (requireGodAdmin)

### Admin Role Hierarchy
- **GOD_ADMIN** - Full platform control, can suspend users, process payouts, view all logs
- **SUPER_ADMIN** - Support desk, user access control, manual unlocks for disputes
- **MODERATE_ADMIN** - Limited support desk, view users, resolve tickets only

Middleware in `server/middleware/adminMiddleware.js` enforces these role restrictions.

## 12. Critical Production Issues (MUST FIX BEFORE LAUNCH)

### 🔴 High Priority - Security & Payment Integrity

**1. Web3 Event Listener Fragility**
- **File:** `server/workers/web3Listener.js` and `server/services/chainListener.js`
- **Issue:** Current 2000-block lookback is insufficient if Node server crashes/restarts; can miss transactions
- **Impact:** Missed purchases = unpaid creators, angry fans
- **Fix Required:** Migrate to dedicated indexer (The Graph) or implement Redis/BullMQ queue for retry logic
- **Timeline:** Complete before mainnet deployment

**2. Fiat Chargeback Risk (Paystack Integration)**
- **Files:** `server/controllers/purchaseController.js`, `server/services/paystackService.js`
- **Issue:** No handling for stolen credit card chargebacks; creator may withdraw funds before chargeback reversal
- **Impact:** Platform loses money; creator may owe more than balance if charged back
- **Fix Required:** Implement 7-14 day hold on creator withdrawals, chargeback detection logic, and AdminApproval flow
- **Timeline:** Required for fiat payment launch

**3. Treasury Worker Private Key Exposure**
- **File:** `server/workers/treasuryWorker.js`
- **Issue:** Private key handling on public-facing API server
- **Impact:** Key compromise = all creator funds at risk
- **Fix Required:** Isolate treasury operations on private network; use HSM or AWS KMS for key management
- **Timeline:** Before mainnet with real funds

### 🟡 Medium Priority - Configuration & Testnet Issues

**4. Hardcoded Testnet Configuration**
- **File:** `client/src/hooks/useWeb3Transfer.js`
- **Current:** Polygon Amoy testnet with Mock USDT (0x3A08E5d...)
- **Issue:** No mechanism to switch to mainnet USDT (0xc2132D05D31c914a87C6611C10748AEb04B58e8F)
- **Fix Required:** Environment-based contract address switching; update all frontend payment logic
- **Timeline:** Mainnet deployment

**5. Smart Contract Type Ambiguity**
- **File:** `contracts/src/NippyPaymentGateway.sol`
- **Issue:** Payment events don't specify purchaseType (PPV vs Subscription vs Chat); backend guesses based on missing metadata
- **Impact:** Can't reliably distinguish purchase types; potential unlock mismatches
- **Fix Required:** Add purchaseType parameter to contract events; redeploy
- **Timeline:** Before public beta

**6. CloudFlare CORS Misconfiguration**
- **File:** `server/config/cloudflare.js` (or upload route config)
- **Current:** CORS policy allows `*` (all origins)
- **Issue:** Media can be embedded anywhere; no domain protection
- **Fix Required:** Lock CORS to production domain (e.g., `media.nippy.app`); implement rate limiting per user
- **Timeline:** Production deployment

### 🟠 Lower Priority - Code Quality & Completeness

**7. Incomplete Media Features**
- **File:** `server/controllers/mediaController.js` line ~94
- **Issue:** Commented-out 15-minute signed URL generation; temp file handling in `uploads/` folder
- **Impact:** No efficient secure streaming; temporary files accumulate
- **Fix Required:** Implement proper signed URL caching; clean up temp files with cron job
- **Timeline:** Before content launch

**8. Placeholder UI Components**
- **File:** `client/src/App.jsx`, `client/src/components/Placeholder.jsx`
- **Issue:** Stub pages for incomplete routes
- **Impact:** Broken UX for certain features
- **Fix Required:** Complete all placeholder components or hide routes
- **Timeline:** Feature completion

**9. Email Configuration in Admin Routes**
- **File:** `server/routes/adminRoutes.js` line ~18
- **Issue:** Nodemailer transporter hardcoded with Gmail; uses `process.env.EMAIL_USER` / `EMAIL_PASS`
- **Impact:** Admin email notifications fail if not configured
- **Fix Required:** Verify email credentials; consider SendGrid for production reliability
- **Timeline:** Before support features go live

## 13. Important implementation notes for future work

- The app already assumes a local dev setup with the frontend on port 5173, admin on port 5174, and backend on port 5000
- The frontend uses localStorage keys named `nippy_token` and `nippy_user`
- Web3 payments are wired to Polygon Amoy testnet values in `useWeb3Transfer.js`; mainnet USDT address must be configured in `.env`
- The backend uses JWT auth with `JWT_SECRET` from environment; recommend minimum 64-character random secret
- The media pipeline is designed around Cloudflare R2 / S3-compatible object storage; R2 credentials required in `.env`
- Admin actions are logged to SystemLog for compliance; archive logs regularly for audit
- The admin dashboard is a separate Vite app running independently from the main client application
- Withdrawal processing requires Paystack API key and webhook secret in `.env` for fiat settlement
- All secrets must be moved from `.env` to AWS Secrets Manager or HashiCorp Vault before production
- Database backups should be automated and tested regularly; consider MongoDB Atlas automated backups

## 14. Production Readiness Checklist

Before launching to mainnet and real money, verify these items:

### Security & Secrets Management
- [ ] All `.env` secrets moved to AWS Secrets Manager or HashiCorp Vault
- [ ] JWT_SECRET is 64+ characters, randomly generated
- [ ] Database passwords different from development
- [ ] Private keys for treasury isolated on separate network
- [ ] SSL/TLS certificates installed and auto-renewed
- [ ] API rate limiting configured per user/IP
- [ ] CORS locked to production domain only

### Web3 & Payment Processing
- [ ] Polygon Amoy testnet replaced with mainnet RPC URL
- [ ] Real USDT mainnet address configured (0xc2132D05D31c914a87C6611C10748AEb04B58e8F)
- [ ] Smart contract redeployed on mainnet with updated purchaseType parameter
- [ ] Payment gateway tested with small amounts ($0.10 transactions)
- [ ] Web3 listener switched to The Graph indexer or Redis queue fallback
- [ ] Withdrawal worker isolated on private network
- [ ] Mock USDT completely removed from production environment

### Fiat & Risk Management
- [ ] Paystack webhook signature validation enabled and tested
- [ ] Chargeback detection logic implemented in purchaseController
- [ ] Withdrawal hold period set (7-14 days recommended)
- [ ] Fraud reversal policy documented and implemented
- [ ] Creator payouts tested end-to-end with real amounts
- [ ] Chargeback scenario tested (stolen card → payout → reversal)

### Database & Audit
- [ ] MongoDB Atlas automated backups configured
- [ ] Database encryption at rest enabled
- [ ] All SystemLog entries older than 1 year archived
- [ ] Admin action logging tested for completeness
- [ ] User data encryption for PII (email masking in logs)

### Frontend & Admin Portal
- [ ] All placeholder components removed or completed
- [ ] Admin authentication tested with all role levels
- [ ] Support ticket workflow tested end-to-end
- [ ] User360 search performance tested with 100k+ users
- [ ] Error boundaries and fallback UI in place

### Monitoring & Alerting
- [ ] Sentry or similar error tracking configured
- [ ] CloudWatch/DataDog metrics for payment failures
- [ ] Alert on Web3 listener lag > 10 blocks
- [ ] Alert on withdrawal processing failures
- [ ] Database backup verification runs weekly

### Content & Media
- [ ] CloudFlare R2 rate limiting tested
- [ ] Temp file cleanup cron job active
- [ ] Media signing URLs implemented for secure streaming
- [ ] NSFW content filter tested (if enforcement required)

### Documentation & Ops
- [ ] Runbooks for common scenarios (payment reversal, user suspension, emergency pause)
- [ ] Incident response plan documented
- [ ] Support team trained on admin dashboard
- [ ] Withdrawal/payout procedures documented
- [ ] Post-launch monitoring metrics defined

## 15. Best starting points for continuing the project

If a future agent needs to continue development, the best places to start are:

### For Feature Development:
1. `client/src/App.jsx` - Route-level context and role-based page structure
2. `client/src/components/FanFeed.jsx` and `FanChatWindow.jsx` - Monetized content and chat flows
3. `server/controllers/contentController.js` - Content posting and feed logic
4. `server/controllers/messageController.js` - Messaging and access rules
5. `server/controllers/purchaseController.js` - Payment verification and monetization logic
6. `server/models/User.js` and `server/models/Purchase.js` - Most important domain structures

### For Admin & Compliance:
7. `admin/src/pages/` - Admin dashboard feature development and support ticket management
8. `server/controllers/adminController.js` - Admin action implementations
9. `server/models/SystemLog.js` and `server/models/AdminApproval.js` - Audit trail and exception handling

### For Production Readiness (CRITICAL):
10. **Start with "Critical Production Issues" section (Section 12)** - These MUST be fixed before mainnet
11. **Complete "Production Readiness Checklist" (Section 14)** - Verify all items before launch
12. Review `server/workers/web3Listener.js` for event listener reliability and crash recovery
13. Review `server/workers/treasuryWorker.js` for private key management and security isolation
14. Implement chargeback handling in `server/controllers/purchaseController.js` (Issue #2)
15. Configure mainnet USDT address in `client/src/hooks/useWeb3Transfer.js` (Issue #4)

This document should be treated as the compact memory of the current Nippy implementation state. It is the fastest way for a future LLM to understand the project without re-reading the entire repository from scratch.

**Last Updated:** 2026-08-17
**Status:** Feature-complete for public beta; CRITICAL production issues must be addressed before mainnet launch
**Key Blockers (Fix in This Order):**
1. 🔴 Web3 event listener reliability (Section 12.1)
2. 🔴 Fiat chargeback handling (Section 12.2)
3. 🔴 Treasury worker key management (Section 12.3)
4. 🟡 Testnet → Mainnet configuration (Section 12.4)

---

## 13. Price Rounding and Currency Conversion System

### Overview and Business Logic

The price-rounding system is a strategic feature that simultaneously delivers premium e-commerce UX and generates platform revenue through "micro-slippage" accumulation.

**The Problem It Solves:**
- Fans see random non-standard prices like $7.34 or €6.37, which feels like a cheap, unoptimized conversion
- International transactions incur fees (Paystack 3.9%, bank transfers, micro-volatility) that erode creator earnings
- Currency fluctuations create unpredictable pricing for the same content across regions

**The Solution:**
- Every price is rounded UP to the nearest .50 or .00 increment (e.g., $7.34 → $7.50, €6.37 → €6.50)
- This creates a clean, professional e-commerce experience (matching major platforms)
- The extra margin automatically offsets platform processing costs and generates a micro-profit buffer

**Revenue Math Example:**
- Creator sets base price: NGN 10,000
- Fan in USD sees: $7.34 (raw conversion at 1,360:1 rate)
- Rounded display to fan: $7.50
- Paystack charge: $7.50 × 1,360 = NGN 10,200
- Creator receives: 80% of NGN 10,000 = NGN 8,000
- Platform keeps: NGN 200 as processing margin
- Across thousands of transactions, these accumulate into meaningful revenue

### Mathematical Implementation

The rounding function uses a simple formula to always round UP to the nearest half:

```javascript
/**
 * Rounds UP to the nearest .00 or .50 increment
 * @param {number} amount - Raw converted amount (e.g., 7.34)
 * @returns {number} - Rounded amount (e.g., 7.50)
 */
function roundUpToNearestHalf(amount) {
  return Math.ceil(amount * 2) / 2;
}

// Examples:
console.log(roundUpToNearestHalf(6.37));    // Output: 6.50
console.log(roundUpToNearestHalf(7.34));    // Output: 7.50
console.log(roundUpToNearestHalf(5.44));    // Output: 5.50
console.log(roundUpToNearestHalf(10.23));   // Output: 10.50
console.log(roundUpToNearestHalf(949.39));  // Output: 949.50
```

### Checkout Pipeline Execution

The conversion must happen in four strictly-ordered steps to ensure UI accuracy and payment consistency:

```
[1. Base Price (NGN)] ──────> 10,000
                                 │
                                 ▼
[2. Raw Rate Conversion] ──> 10,000 / 1,360 = $7.34 USD
                                 │
                                 ▼
[3. Round UP Function] ────> roundUpToNearestHalf($7.34) = $7.50
                                 │
                                 ▼
[4. Reverse to NGN for Paystack] ──> $7.50 × 1,360 = NGN 10,200
                                 │
                                 ▼
[5. Send to Paystack] ────> amount: 1020000 (kobo)
```

**Step-by-Step Execution:**
1. **Step 1 - Base Price:** Stored in Content/Message/Subscription record in NGN (or creator's base currency)
2. **Step 2 - Raw Rate Conversion:** Call exchange rate API (e.g., fixer.io, Paystack rates) to convert base price to fan's currency
3. **Step 3 - Apply Rounding:** `roundUpToNearestHalf(7.34)` produces $7.50 → **Display this to the fan**
4. **Step 4 - Reverse to Base Currency:** Convert the rounded $7.50 back to NGN ($7.50 × 1,360 = 10,200 NGN)
5. **Step 5 - Send Payload to Paystack:** Submit `amount: 1020000` (in kobo; Paystack base unit)

When the transaction completes, the fan is charged exactly what the UI showed ($7.50), but Paystack collects NGN 10,200 instead of 10,000.

### Files That Must Be Modified or Created

#### **Backend Utility Files (NEW)**

**`server/utils/priceRounding.js`** (NEW FILE - CRITICAL)
- Exports `roundUpToNearestHalf(amount)` function
- Exports `calculateRoundedPrice(basePriceNGN, exchangeRateUSD, targetCurrency)` function
- Purpose: Centralized, reusable rounding logic to prevent discrepancies across the codebase
- Used by: purchaseController, messageController, contentController, any price-calculation point

**`server/utils/currencyConversion.js`** (NEW FILE - IMPORTANT)
- Exports `getExchangeRate(baseCurrency, targetCurrency)` function
- Fetches live exchange rates from a provider (Paystack API, fixer.io, or cached database)
- Exports `convertAndRound(basePriceNGN, targetCurrency)` function
- Caches rates to avoid excessive API calls (with TTL invalidation)
- Purpose: Single source of truth for currency conversion across the platform
- Used by: contentController (when populating feed), messageController (when calculating bundle prices), purchaseController (when verifying payments)

**`server/config/exchangeRates.js`** (NEW FILE - CONFIG)
- Stores API endpoints, cache TTLs, and fallback rates
- Example structure:
  ```javascript
  module.exports = {
    PROVIDERS: {
      PAYSTACK: process.env.PAYSTACK_API_KEY,
      FIXER: process.env.FIXER_API_KEY,
    },
    CACHE_TTL_MINUTES: 60,  // Refresh rates hourly
    BASE_CURRENCY: 'NGN',
    FALLBACK_RATES: {
      'USD': 1360,
      'EUR': 1480,
      'GBP': 1700,
    }
  };
  ```

#### **Backend Controller Modifications (EXISTING FILES - CRITICAL)**

**`server/controllers/contentController.js`** (MODIFICATION)
- **Function: `createContentPost(req, res)`**
  - Currently stores price as submitted by creator
  - **NO CHANGE:** Keep base price stored as-is in Content model
  - Price rounding happens at display time, not at creation

- **Function: `getFeed(req, res)`** - MUST MODIFY
  - Currently returns content with `price` field as stored
  - **NEW BEHAVIOR:** For each content item, call `convertAndRound(content.price, fanCountry)` to return display price
  - Add fields to response: `displayPrice`, `displayCurrency`, `basePrice`, `baseCurrency`
  - Example response mutation:
    ```javascript
    content.displayPrice = 7.50;   // Rounded
    content.displayCurrency = 'USD';
    content.basePrice = 10000;
    content.baseCurrency = 'NGN';
    content.rawConvertedPrice = 7.34;  // For debugging
    ```
  - Used by: FanFeed.jsx (displays to fan)

- **Function: `getCreatorPublicProfile(req, res)`** - MUST MODIFY
  - When returning creator's public content list, apply the same conversion logic as getFeed
  - Ensures public profile page shows consistent rounded prices

**`server/controllers/messageController.js`** (MODIFICATION)
- **Function: `buyMessageBundle(req, res)`** - MUST MODIFY
  - Currently calculates bundle price directly
  - **NEW BEHAVIOR:** 
    ```javascript
    const basePrice = creator.messageBundlePriceNGN;
    const convertedPrice = await convertAndRound(basePrice, fanCountry);
    // Store both in Purchase record: basePrice and displayPrice
    ```
  - Must ensure fan sees rounded price before checkout

- **Function: `getMessages(req, res)`** - MUST MODIFY
  - When returning message access metadata, include rounded bundle/unlock prices
  - Used by: FanChatWindow.jsx (displays bundle pricing)

- **Function: `sendMessage(req, res)`** - NO CHANGE NEEDED
  - Current logic for access rules remains unchanged
  - Rounding affects UI/pricing display, not message send logic

**`server/controllers/purchaseController.js`** (MODIFICATION - MOST CRITICAL)
- **Function: `verifyPayment(req, res)`** - MUST MODIFY CAREFULLY
  - This is the most sensitive function because it validates what the user actually paid
  - **Current behavior:** Expects the blockchain transaction to match some expected amount
  - **NEW BEHAVIOR:**
    1. Receive `{ contentId, creatorId, fanCountry, purchaseType, transactionHash }`
    2. Fetch the base price from Content/Creator model: `basePrice = 10000 NGN`
    3. Calculate what the fan SHOULD have been charged: `displayPrice = convertAndRound(basePrice, 'USD')`
    4. Reverse that back to NGN: `expectedNGNAmount = displayPrice * exchangeRate`
    5. Verify the blockchain transaction amount matches the expected amount (within 1-2 NGN tolerance for floating-point errors)
    6. Create Purchase record with both basePrice and displayPrice stored
  - **Critical constraint:** The blockchain transaction amount must be the ROUNDED equivalent, not the base price
  - This means the frontend's useWeb3Transfer must send the rounded amount

**`server/controllers/earningsController.js`** (MODIFICATION)
- **Function: `getDashboard(req, res)`** - MUST MODIFY
  - Creator dashboard should show earnings **based on base price, not display price**
  - Add a "platform processing margin" line showing accumulated rounding differences
  - Show both:
    - Creator earnings: 80% of 10,000 NGN = 8,000 NGN
    - Platform margin: (200 NGN extra collected, shown separately)
  - Do NOT apply rounding to creator payouts—always pay based on base price

#### **Frontend Component Modifications (EXISTING FILES)**

**`client/src/components/FanFeed.jsx`** (MODIFICATION)
- **Function: `fetchFeed()`** - MINOR UPDATE
  - Response now includes `displayPrice` and `displayCurrency` fields
  - **Update all price displays:** Change from `content.price` to `content.displayPrice`
  - Show both raw and rounded for debugging (optional): "7.34 → $7.50"

- **Function: `handlePayment()` / `handleUnlockPost()`** - CRITICAL UPDATE
  - Currently passes `content.price` to useWeb3Transfer hook
  - **NEW BEHAVIOR:** Must pass `content.displayPrice` (the rounded amount)
  - This ensures the blockchain transaction matches what the fan sees

**`client/src/components/FanChatWindow.jsx`** (MODIFICATION)
- **Function: `fetchMessages()` / state update** - MINOR UPDATE
  - Response now includes rounded bundle price in `chatInfo.bundleDisplayPrice`
  - Update all bundle price displays from `bundlePrice` to `bundleDisplayPrice`

- **Function: `handleBuyBundle()` / `handleUnlockMessage()`** - CRITICAL UPDATE
  - Must pass rounded price to useWeb3Transfer hook, not base price
  - Example:
    ```javascript
    const roundedBundlePrice = chatInfo.bundleDisplayPrice;  // $7.50
    await transferUSDT(roundedBundlePrice, creatorAddress);
    ```

**`client/src/hooks/useWeb3Transfer.js`** (MODIFICATION - CRITICAL)
- **Function: `transferUSDT(amount, recipientAddress, metadata)`** - UPDATE LOGIC
  - Currently: Takes an amount and sends it directly
  - **NEW BEHAVIOR:** 
    - Receives the **already-rounded** amount from the component
    - Sends that exact amount to the blockchain (no re-rounding on client)
    - Include `metadata.displayPrice` and `metadata.basePrice` in the transaction for server logging
  - Important: Do NOT apply rounding here; components pass the rounded amount

**`client/src/components/CreatorMessages.jsx`** (MODIFICATION)
- **Function: `fetchInbox()`** - MINOR UPDATE
  - If displaying creator's own bundle pricing to help debug/understand their margin, show both base and display prices

#### **Frontend Utility Creation (NEW)**

**`client/src/utils/priceDisplay.js`** (NEW FILE - OPTIONAL)
- Exports `formatPrice(amount, currency)` for consistent formatting
- Exports `getPriceDisplay(displayPrice, basePrice, exchangeRate)` to show price breakdown
- Example:
  ```javascript
  formatPrice(7.50, 'USD') // Output: "$7.50"
  getPriceDisplay(7.50, 10000, 1360) // Output: "USD $7.50 (NGN 10,200)"
  ```
- Used by: FanFeed, FanChatWindow, any component showing prices

#### **Models (EXISTING - MINOR FIELDS)**

**`server/models/Content.js`** (FIELD ADDITION - OPTIONAL)
- Add optional fields to track conversion state:
  - `basePrice` (store as-is, what creator set)
  - `lastConversionCache` object with timestamp and rates used
  - This helps audit and debug pricing discrepancies

**`server/models/Purchase.js`** (FIELD ADDITION - CRITICAL)
- Add new fields to every purchase record:
  - `basePrice` (creator's original price in NGN)
  - `displayPrice` (what the fan saw and was charged)
  - `displayCurrency` (USD, EUR, etc.)
  - `exchangeRateUsed` (for audit trail)
  - `platformMarginNGN` (rounding difference, calculated as: displayPrice reversed to NGN - basePrice)
  - Purpose: Full audit trail for finance reconciliation

**`server/models/Wallet.js`** (FIELD ADDITION - TRACKING)
- Add `accumulatedMarginNGN` field to track total platform margin collected
- Add `marginBySource` object breaking down margin by content/messages/bundles

### Cross-File Data Flow for Price Rounding

```
[CREATOR SETS BASE PRICE]
       ↓
   contentController.createContentPost()
       ↓
   Content model stores: price = 10,000 NGN
       ↓
[FAN LOADS FEED]
       ↓
   contentController.getFeed()
       ↓
   For each post, calls:
   - currencyConversion.getExchangeRate('NGN', 'USD')  // 1,360
   - priceRounding.convertAndRound(10000, 'USD')       // 7.50
       ↓
   Response includes: 
   { basePrice: 10000, displayPrice: 7.50, displayCurrency: 'USD' }
       ↓
   FanFeed.jsx renders: "$7.50"
       ↓
[FAN CLICKS UNLOCK]
       ↓
   FanFeed.jsx calls:
   useWeb3Transfer.transferUSDT(7.50, creatorAddress, metadata)
       ↓
   useWeb3Transfer.js sends blockchain tx:
   amount: 7.50 USDT
       ↓
[PAYSTACK / BACKEND VERIFIES]
       ↓
   purchaseController.verifyPayment()
       ↓
   Recreates the expected amount:
   - basePrice = 10,000 NGN (from Content record)
   - displayPrice = convertAndRound(10000, 'USD') = 7.50
   - expectedNGNEquivalent = 7.50 * 1,360 = 10,200 NGN
   - Verifies blockchain tx ≈ 7.50 USDT ✓
       ↓
   Creates Purchase record:
   { basePrice: 10000, displayPrice: 7.50, platformMarginNGN: 200 }
       ↓
[CREATOR CHECKS EARNINGS]
       ↓
   earningsController.getDashboard()
       ↓
   Shows creator earnings: 80% × 10,000 = 8,000 NGN
   Shows platform margin collected: 200 NGN (separate line item)
```

### Testing and Validation Checklist

When implementing this feature, verify:

1. **UI Consistency:** Fan sees $7.50 → UI shows $7.50 → Blockchain captures $7.50 → Backend records $7.50
2. **Creator Payout Accuracy:** Creator always receives 80% of their base price (10,000 NGN), never the rounded amount
3. **Rounding Direction:** Always rounds UP, never down (verify with amounts like 7.01, 7.49, 7.50, 7.51)
4. **Exchange Rate Freshness:** Rates cache expires and refreshes properly (test with manual rate change)
5. **Purchase Record Audit:** Every Purchase record has basePrice, displayPrice, and margin logged
6. **Multi-Currency Support:** Test with USD, EUR, GBP, KES, ZAR, etc.
7. **Edge Cases:** Test with very small amounts (e.g., NGN 500) and very large amounts (e.g., NGN 100,000)

### Summary Table of Files

| File                                       | Type     | Action                                               | Priority |
| ------------------------------------------ | -------- | ---------------------------------------------------- | -------- |
| `server/utils/priceRounding.js`            | NEW      | Create with `roundUpToNearestHalf()`                 | CRITICAL |
| `server/utils/currencyConversion.js`       | NEW      | Create with exchange rate fetching & caching         | CRITICAL |
| `server/config/exchangeRates.js`           | NEW      | Create config for rate providers                     | HIGH     |
| `server/controllers/purchaseController.js` | EXISTING | Modify `verifyPayment()` to validate rounded amounts | CRITICAL |
| `server/controllers/contentController.js`  | EXISTING | Modify `getFeed()` to return displayPrice            | CRITICAL |
| `server/controllers/messageController.js`  | EXISTING | Modify `buyMessageBundle()` and `getMessages()`      | CRITICAL |
| `server/controllers/earningsController.js` | EXISTING | Modify `getDashboard()` to show margins separately   | HIGH     |
| `server/models/Purchase.js`                | EXISTING | Add basePrice, displayPrice, margin fields           | CRITICAL |
| `server/models/Content.js`                 | EXISTING | Add optional basePrice tracking field                | OPTIONAL |
| `server/models/Wallet.js`                  | EXISTING | Add accumulatedMarginNGN tracking                    | HIGH     |
| `client/src/hooks/useWeb3Transfer.js`      | EXISTING | Ensure sends rounded amount only (minor update)      | CRITICAL |
| `client/src/components/FanFeed.jsx`        | EXISTING | Display `displayPrice` instead of `price`            | CRITICAL |
| `client/src/components/FanChatWindow.jsx`  | EXISTING | Display rounded bundle pricing                       | CRITICAL |
| `client/src/utils/priceDisplay.js`         | NEW      | Create helper for price formatting (optional)        | OPTIONAL |
| Database Migration                         | SCRIPT   | Add new fields to Purchase and other models          | CRITICAL |

---

## 14. Complete Frontend-Backend Connection Map

This section provides a detailed inventory of every frontend file, the backend endpoints it calls, the controllers and models involved, and the data flow. This is the master reference for understanding how the entire application is wired together.

### client/src/App.jsx – Router & Entry Point

**Purpose:** Main React router; the application's entrypoint

**Backend Connections:** Minimal direct connections; this file orchestrates the routing structure. However, all downstream components it routes to use the following patterns.

**No direct API calls;** routes users to other components that make calls.

---

### client/src/components/LandingPage.jsx – Login & Signup

**Purpose:** Authentication UI for fans and creators

**Backend Endpoints Called:**

| HTTP Method | Endpoint                 | Controller Function             | Route File      | Model(s) Accessed |
| ----------- | ------------------------ | ------------------------------- | --------------- | ----------------- |
| POST        | `/api/auth/register`     | `authController.registerUser()` | `authRoutes.js` | User              |
| POST        | `/api/auth/login`        | `authController.loginUser()`    | `authRoutes.js` | User              |
| POST        | `/api/auth/web3/nonce`   | `authController.getWeb3Nonce()` | `authRoutes.js` | User              |
| POST        | `/api/auth/web3/login`   | `authController.web3Login()`    | `authRoutes.js` | User              |
| POST        | `/api/auth/oauth/google` | *Not yet detailed*              | `authRoutes.js` | User              |

**Request/Response Examples:**

```javascript
// POST /api/auth/register
REQUEST: {
  email: "creator@example.com",
  password: "securePassword123",
  role: "creator"  // or "fan"
}
RESPONSE: {
  token: "jwt_token_here",
  user: {
    _id: "userId",
    email: "creator@example.com",
    role: "creator",
    hasCompletedBioData: false
  }
}

// POST /api/auth/login
REQUEST: {
  email: "creator@example.com",
  password: "securePassword123"
}
RESPONSE: {
  token: "jwt_token_here",
  user: { ... }
}

// POST /api/auth/web3/nonce
REQUEST: {
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f42e0"
}
RESPONSE: {
  nonce: "abc123xyz"
}

// POST /api/auth/web3/login
REQUEST: {
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f42e0",
  signature: "0x...",
  nonce: "abc123xyz"
}
RESPONSE: {
  token: "jwt_token_here",
  user: { ... }
}
```

**Frontend Functions & Their Backend Calls:**
- `handleEmailSubmit()` → calls `/api/auth/register` or `/api/auth/login`
- `handleWeb3Auth()` → calls `/api/auth/web3/nonce` then `/api/auth/web3/login`
- `handleGoogleSuccess()` → calls `/api/auth/oauth/google`
- Stores returned `token` and `user` in localStorage as `nippy_token` and `nippy_user`

**Key Implementation Details:**
- authController.registerUser() → hashes password with bcrypt, creates User document
- authController.loginUser() → validates password, generates JWT
- authController.web3Login() → verifies signature against stored nonce, generates JWT
- All responses include JWT token used as `Authorization: Bearer {token}` in future requests

---

### client/src/components/BioDataSetup.jsx – Creator Onboarding

**Purpose:** Creator profile and KYC setup form

**Backend Endpoints Called:**

| HTTP Method | Endpoint              | Controller Function               | Route File      | Model(s) Accessed |
| ----------- | --------------------- | --------------------------------- | --------------- | ----------------- |
| PUT         | `/api/users/profile`  | `userController.updateProfile()`  | `userRoutes.js` | User              |
| POST        | `/api/users/biodata`  | `userController.submitBioData()`  | `userRoutes.js` | User              |
| PUT         | `/api/users/settings` | `userController.updateSettings()` | `userRoutes.js` | User              |
| POST        | `/api/kyc/start`      | `kycController.startKycSession()` | `authRoutes.js` | User              |
| GET         | `/api/users/profile`  | `userController.getProfile()`     | `userRoutes.js` | User              |

**Request/Response Examples:**

```javascript
// POST /api/users/biodata
REQUEST: {
  username: "creatorUsername",
  phone: "+234800123456",
  gender: "male",
  country: "Nigeria",
  referredBy: "ref_code_or_empty",
  willingNsfw: false,
  agreedTerms: true,
  confirmedAge: true,
  profileImage: "base64_or_url",
  payoutAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f42e0",
  securityPassword: "password123",
  securitySignature: "0x..."
}
RESPONSE: {
  success: true,
  user: {
    _id: "userId",
    username: "creatorUsername",
    hasCompletedBioData: true,
    payoutAddress: "0x742...",
    ...
  }
}

// PUT /api/users/profile
REQUEST: {
  username: "newUsername",
  phone: "+234800999999",
  creatorProfile: {
    bio: "Indie creator",
    profileImageUrl: "https://..."
  }
}
RESPONSE: {
  success: true,
  user: { ... }
}

// POST /api/kyc/start
REQUEST: {}
RESPONSE: {
  kycSessionId: "kyc_session_123",
  redirectUrl: "https://kyc_provider_url"
}
```

**Frontend Functions & Their Backend Calls:**
- `loadExistingProfile()` → calls `GET /api/users/profile` to pre-fill form
- `handleSubmit()` → calls `POST /api/users/biodata` and `PUT /api/users/profile`
- `handleImageUpload()` → uploads to Cloudflare R2, stores URL in request
- Requires `Authorization: Bearer {token}` header

**Key Implementation Details:**
- userController.submitBioData() → validates signature, updates User.hasCompletedBioData = true
- userController.submitBioData() → checks for security password and signature to prevent unauthorized updates
- Stores sensitive fields like payoutAddress in User model

---

### client/src/components/FanBiodata.jsx – Fan Onboarding

**Purpose:** Fan profile setup and initial preferences

**Backend Endpoints Called:**

| HTTP Method | Endpoint             | Controller Function              | Route File      | Model(s) Accessed |
| ----------- | -------------------- | -------------------------------- | --------------- | ----------------- |
| POST        | `/api/users/biodata` | `userController.submitBioData()` | `userRoutes.js` | User              |
| PUT         | `/api/users/profile` | `userController.updateProfile()` | `userRoutes.js` | User              |
| GET         | `/api/users/profile` | `userController.getProfile()`    | `userRoutes.js` | User              |

**Request/Response Examples:**

```javascript
// Same endpoints as BioDataSetup but with fan-specific fields
REQUEST: {
  username: "fanUsername",
  gender: "female",
  country: "Nigeria",
  phone: "+234801234567",
  confirmedAge: true,
  profileImage: "url_or_base64"
}
RESPONSE: {
  success: true,
  user: {
    _id: "userId",
    role: "fan",
    hasCompletedBioData: true,
    ...
  }
}
```

**Frontend Functions & Their Backend Calls:**
- `handleChange()` → updates local state
- `handleSubmit()` → calls `POST /api/users/biodata` or `PUT /api/users/profile`
- Requires `Authorization: Bearer {token}` header

**Differences from Creator BioDataSetup:**
- No payoutAddress required (fans don't earn)
- No KYC session initiated (fans don't need verification)
- No security signature checks

---

### client/src/components/FanFeed.jsx – Main Content Feed

**Purpose:** Display paywalled creator content with purchase and social interactions

**Backend Endpoints Called:**

| HTTP Method | Endpoint                    | Controller Function                  | Route File          | Model(s) Accessed               |
| ----------- | --------------------------- | ------------------------------------ | ------------------- | ------------------------------- |
| GET         | `/api/content/feed`         | `contentController.getFeed()`        | `contentRoutes.js`  | Content, User, Purchase         |
| POST        | `/api/content/:id/like`     | `contentController.toggleLike()`     | `contentRoutes.js`  | Content, User                   |
| POST        | `/api/content/:id/bookmark` | `contentController.toggleBookmark()` | `contentRoutes.js`  | Content, User                   |
| POST        | `/api/content/:id/comment`  | `contentController.addComment()`     | `contentRoutes.js`  | Content                         |
| POST        | `/api/purchases/verify`     | `purchaseController.verifyPayment()` | `purchaseRoutes.js` | Purchase, Content, User, Wallet |
| GET         | `/api/content/bookmarks`    | `contentController.getBookmarks()`   | `contentRoutes.js`  | Content, User                   |

**Request/Response Examples:**

```javascript
// GET /api/content/feed?page=1&limit=20
RESPONSE: {
  success: true,
  feed: [
    {
      _id: "contentId",
      creatorId: "creatorUserId",
      title: "My Latest Video",
      description: "Check this out",
      price: 10000,  // NGN
      displayPrice: 7.50,  // USD (after rounding)
      displayCurrency: "USD",
      contentType: "video",
      teaserUrl: "https://r2.example.com/teaser.jpg",
      isNsfw: false,
      likes: 234,
      comments: 12,
      isLikedByMe: false,
      isBookmarkedByMe: true,
      isPurchasedByMe: true,
      creatorProfile: {
        username: "creator123",
        profileImageUrl: "https://..."
      }
    }
  ]
}

// POST /api/content/:id/like
REQUEST: {}
RESPONSE: {
  success: true,
  liked: true,  // or false if unliking
  totalLikes: 235
}

// POST /api/purchases/verify
REQUEST: {
  contentId: "contentId",
  purchaseType: "PPV",  // or "SUBSCRIPTION", "BUNDLE", "DM_UNLOCK"
  transactionHash: "0x...",
  amount: 7.50,
  currency: "USD"
}
RESPONSE: {
  success: true,
  purchase: {
    _id: "purchaseId",
    contentId: "contentId",
    fanId: "fanUserId",
    status: "completed",
    basePrice: 10000,
    displayPrice: 7.50,
    timestamp: "2026-08-15T10:30:00Z"
  }
}
```

**Frontend Functions & Their Backend Calls:**
- `fetchFeed()` → calls `GET /api/content/feed` on component mount and pagination
- `handleLike()` → calls `POST /api/content/:id/like`
- `handleBookmark()` → calls `POST /api/content/:id/bookmark`
- `handleCommentSubmit()` → calls `POST /api/content/:id/comment` with `{ text: "comment" }`
- `handleUnlockPost()` / `handlePayment()` → calls `useWeb3Transfer.transferUSDT()` which broadcasts blockchain tx, then calls `POST /api/purchases/verify` with tx hash
- `pollForNewPosts()` → silently polls `GET /api/content/feed` in background to detect new content
- Requires `Authorization: Bearer {token}` header for all endpoints

**Key Implementation Details:**
- contentController.getFeed() → filters by fan's preferred creators, applies purchase/bookmark context, calculates displayPrice
- purchaseController.verifyPayment() → validates blockchain transaction, calculates expected amount using priceRounding logic, creates Purchase record
- Purchase model stores both basePrice and displayPrice for audit trail

**Socket.IO Events Used:** None (Feed is HTTP polling-based)

---

### client/src/components/FanChatWindow.jsx – Direct Messaging

**Purpose:** Fan-side 1-on-1 messaging with creators, bundle/PPV unlock logic

**Backend Endpoints Called:**

| HTTP Method | Endpoint                               | Controller Function                    | Route File          | Model(s) Accessed                     |
| ----------- | -------------------------------------- | -------------------------------------- | ------------------- | ------------------------------------- |
| GET         | `/api/messages/:conversationId`        | `messageController.getMessages()`      | `messageRoutes.js`  | Conversation, Message, User, Purchase |
| POST        | `/api/messages/send`                   | `messageController.sendMessage()`      | `messageRoutes.js`  | Message, Conversation, User, Wallet   |
| POST        | `/api/messages/bundle`                 | `messageController.buyMessageBundle()` | `messageRoutes.js`  | Purchase, User, Wallet                |
| POST        | `/api/purchases/verify`                | `purchaseController.verifyPayment()`   | `purchaseRoutes.js` | Purchase, Message, User               |
| GET         | `/api/messages/:conversationId/unread` | `messageController.getUnreadCount()`   | `messageRoutes.js`  | Message                               |

**Request/Response Examples:**

```javascript
// GET /api/messages/:conversationId
RESPONSE: {
  success: true,
  conversation: {
    _id: "conversationId",
    creatorId: "creatorUserId",
    fanId: "fanUserId",
    bundlePrice: 5000,  // NGN
    bundleDisplayPrice: 3.68,  // USD (rounded up)
    bundleDisplayCurrency: "USD",
    bubblesLeft: 3,
    requiresBundle: true
  },
  messages: [
    {
      _id: "messageId",
      senderId: "creatorUserId",
      text: "Hey there!",
      timestamp: "2026-08-15T09:00:00Z",
      isLocked: false
    },
    {
      _id: "messageId2",
      senderId: "creatorUserId",
      text: "[Locked PPV message - unlock for 2500 NGN]",
      timestamp: "2026-08-15T09:05:00Z",
      isLocked: true,
      unlockPrice: 2500
    }
  ]
}

// POST /api/messages/send
REQUEST: {
  conversationId: "conversationId",
  text: "Thanks for the message!"
}
RESPONSE: {
  success: true,
  message: {
    _id: "messageId",
    senderId: "fanUserId",
    text: "Thanks for the message!",
    timestamp: "2026-08-15T10:00:00Z"
  }
}
// Also emitted via Socket.IO event 'message_sent' to the creator

// POST /api/messages/bundle
REQUEST: {
  conversationId: "conversationId",
  bundleCount: 10
}
RESPONSE: {
  success: true,
  purchase: {
    _id: "purchaseId",
    type: "MESSAGE_BUNDLE",
    bundleCount: 10,
    basePrice: 5000,
    displayPrice: 3.68
  }
}
// Triggers blockchain payment in useWeb3Transfer hook

// POST /api/purchases/verify (for DM unlock)
REQUEST: {
  messageId: "messageId2",
  purchaseType: "DM_UNLOCK",
  transactionHash: "0x...",
  amount: 1.83,
  currency: "USD"
}
RESPONSE: {
  success: true,
  message: { ...message, isLocked: false, text: "Full PPV message content" }
}
```

**Frontend Functions & Their Backend Calls:**
- `fetchMessages()` → calls `GET /api/messages/:conversationId` on component mount
- `handleSendMessage()` → calls `POST /api/messages/send` (enforces 200-char limit, no attachments for fans)
- `handleBuyBundle()` → calls `POST /api/messages/bundle`, then `useWeb3Transfer.transferUSDT()`, then `POST /api/purchases/verify`
- `handleUnlockMessage()` → calls `useWeb3Transfer.transferUSDT()`, then `POST /api/purchases/verify`
- Requires `Authorization: Bearer {token}` header

**Socket.IO Events Used:**
- `join_chat` → Emitted by frontend when entering conversation room
- `message_sent` → Received when new message arrives in real-time
- `message_locked` → Received when creator marks a message as PPV

**Key Implementation Details:**
- messageController.sendMessage() → enforces business rules: 200-char limit, checks bubble balance, validates 24-hour PPV access
- messageController.getMessages() → returns both locked and unlocked messages based on fan's purchase history
- Purchase record created for bundles tracks bubbles remaining for the fan
- Socket.IO room subscription ensures real-time message delivery

---

### client/src/components/CreatorMessages.jsx – Creator Inbox

**Purpose:** Creator-side messaging dashboard; manage conversations and attach vault items

**Backend Endpoints Called:**

| HTTP Method | Endpoint                                | Controller Function                   | Route File         | Model(s) Accessed                     |
| ----------- | --------------------------------------- | ------------------------------------- | ------------------ | ------------------------------------- |
| GET         | `/api/messages/inbox`                   | `messageController.getInbox()`        | `messageRoutes.js` | Conversation, Message, User           |
| GET         | `/api/messages/:conversationId`         | `messageController.getMessages()`     | `messageRoutes.js` | Conversation, Message, User, Purchase |
| POST        | `/api/messages/send`                    | `messageController.sendMessage()`     | `messageRoutes.js` | Message, Conversation, User, Wallet   |
| GET         | `/api/content/creator/:creatorId/vault` | `contentController.getCreatorVault()` | `contentRoutes.js` | Content, User                         |
| POST        | `/api/content/:contentId/attach`        | *Not yet detailed*                    | `contentRoutes.js` | Message, Content                      |

**Request/Response Examples:**

```javascript
// GET /api/messages/inbox
RESPONSE: {
  success: true,
  inbox: [
    {
      _id: "conversationId",
      fanId: "fanUserId",
      fanName: "fan123",
      fanProfileImage: "https://...",
      lastMessage: "Hey, can you send me...",
      lastMessageTime: "2026-08-15T10:00:00Z",
      unreadCount: 2,
      bubblesSold: 15,
      totalEarningsFromThisFan: 50000  // NGN
    }
  ]
}

// GET /api/messages/:conversationId
RESPONSE: {
  success: true,
  conversation: { ... },
  messages: [
    {
      _id: "messageId",
      senderId: "fanUserId",
      text: "Hi, can you create more content?",
      timestamp: "2026-08-15T09:00:00Z"
    }
  ]
}

// POST /api/messages/send (Creator-side, can include attachments)
REQUEST: {
  conversationId: "conversationId",
  text: "Here's exclusive content for you!",
  attachmentType: "vault_item",  // or "media"
  attachmentId: "vaultItemId"
}
RESPONSE: {
  success: true,
  message: {
    _id: "messageId",
    senderId: "creatorUserId",
    text: "Here's exclusive content for you!",
    attachment: {
      type: "vault_item",
      contentUrl: "https://r2.example.com/vault_item.mp4",
      title: "Exclusive Edit"
    },
    timestamp: "2026-08-15T10:30:00Z"
  }
}
// Emitted to fan via Socket.IO 'message_sent'

// GET /api/content/creator/:creatorId/vault
RESPONSE: {
  success: true,
  vault: [
    {
      _id: "contentId",
      title: "Behind the Scenes",
      contentUrl: "https://r2.example.com/vault/content.mp4",
      createdAt: "2026-08-10T00:00:00Z"
    }
  ]
}
```

**Frontend Functions & Their Backend Calls:**
- `fetchInbox()` → calls `GET /api/messages/inbox` on component mount
- `fetchMessages()` → calls `GET /api/messages/:conversationId` when opening a conversation
- `handleSendMessage()` → calls `POST /api/messages/send` with optional attachment
- `handleVaultSelection()` → calls `GET /api/content/creator/:creatorId/vault` to populate vault items list
- Requires `Authorization: Bearer {token}` header and `requireVerifiedCreator` middleware check

**Socket.IO Events Used:**
- `join_chat` → Emitted when opening a conversation room
- `message_sent` → Received when fan sends a message to this creator
- `typing_indicator` → Optional, for showing when fan is typing

**Key Implementation Details:**
- messageController.sendMessage() → creator version allows attachments and media
- messageController.getInbox() → lists all active conversations sorted by recent activity
- Creator can attach vault items (exclusive content) directly to messages
- Only verified creators (KYC passed) can access message inbox

---

### client/src/components/CreatorProfile.jsx – Creator Profile Management

**Purpose:** Creator-facing profile editing and monetization settings

**Backend Endpoints Called:**

| HTTP Method | Endpoint                  | Controller Function                           | Route File      | Model(s) Accessed |
| ----------- | ------------------------- | --------------------------------------------- | --------------- | ----------------- |
| GET         | `/api/users/profile`      | `userController.getProfile()`                 | `userRoutes.js` | User              |
| PUT         | `/api/users/profile`      | `userController.updateProfile()`              | `userRoutes.js` | User              |
| GET         | `/api/users/monetization` | `userController.getMonetizationSettings()`    | `userRoutes.js` | User              |
| PUT         | `/api/users/monetization` | `userController.updateMonetizationSettings()` | `userRoutes.js` | User              |
| PUT         | `/api/users/settings`     | `userController.updateSettings()`             | `userRoutes.js` | User              |

**Request/Response Examples:**

```javascript
// GET /api/users/profile
RESPONSE: {
  success: true,
  user: {
    _id: "userId",
    username: "creator123",
    email: "creator@example.com",
    phone: "+234800123456",
    creatorProfile: {
      bio: "Indie filmmaker",
      profileImageUrl: "https://r2.example.com/profile.jpg",
      coverImageUrl: "https://r2.example.com/cover.jpg",
      followers: 1200,
      following: 50
    }
  }
}

// PUT /api/users/monetization
REQUEST: {
  contentPriceNGN: 10000,
  subscriptionPriceNGN: 5000,
  messageBundleNGN: 2500,
  bundleMessageCount: 10,
  creatorCutPercentage: 80,
  requiresAgeGate: true,
  allowsPPV: true,
  enabledCurrencies: ["USD", "EUR", "GBP"]
}
RESPONSE: {
  success: true,
  user: {
    _id: "userId",
    monetizationSettings: {
      contentPriceNGN: 10000,
      subscriptionPriceNGN: 5000,
      messageBundleNGN: 2500,
      creatorCutPercentage: 80,
      ...
    }
  }
}

// PUT /api/users/profile
REQUEST: {
  username: "newUsername",
  creatorProfile: {
    bio: "Updated bio",
    profileImageUrl: "https://..."
  }
}
RESPONSE: {
  success: true,
  user: { ... }
}
```

**Frontend Functions & Their Backend Calls:**
- `fetchProfile()` → calls `GET /api/users/profile` on component mount
- `handleSave()` → calls `PUT /api/users/monetization` to save pricing strategy
- Also calls `PUT /api/users/profile` for non-monetization profile edits
- Requires `Authorization: Bearer {token}` header and `requireVerifiedCreator` middleware

**Key Implementation Details:**
- userController.getMonetizationSettings() → returns all pricing tiers set by creator
- userController.updateMonetizationSettings() → validates pricing logic, updates User.monetizationSettings
- Creator can set different prices for content, subscriptions, and message bundles
- All prices stored in base currency (NGN) and converted on display to fan's currency

---

### client/src/components/CreatorPublicProfile.jsx – Public Creator Profile

**Purpose:** Public-facing profile page for fans to discover and follow creators

**Backend Endpoints Called:**

| HTTP Method | Endpoint                                | Controller Function                           | Route File         | Model(s) Accessed       |
| ----------- | --------------------------------------- | --------------------------------------------- | ------------------ | ----------------------- |
| GET         | `/api/users/creator/:creatorId/public`  | `contentController.getCreatorPublicProfile()` | `contentRoutes.js` | User, Content, Purchase |
| GET         | `/api/content/creator/:creatorId/vault` | `contentController.getCreatorVault()`         | `contentRoutes.js` | Content, User           |
| POST        | `/api/users/follow`                     | `userController.toggleFollow()`               | `userRoutes.js`    | User                    |
| GET         | `/api/content/feed?creatorId=X`         | `contentController.getFeed()`                 | `contentRoutes.js` | Content, User, Purchase |

**Request/Response Examples:**

```javascript
// GET /api/users/creator/:creatorId/public
RESPONSE: {
  success: true,
  creator: {
    _id: "creatorId",
    username: "creator123",
    creatorProfile: {
      bio: "Indie filmmaker & artist",
      profileImageUrl: "https://...",
      followers: 5000,
      following: 120
    },
    monetizationSettings: {
      contentPriceNGN: 10000,
      subscriptionPriceNGN: 5000
    },
    isFollowedByMe: true
  }
}

// POST /api/users/follow
REQUEST: {
  creatorId: "creatorId"
}
RESPONSE: {
  success: true,
  following: true,  // or false if unfollowing
  followerCount: 5001
}
```

**Frontend Functions & Their Backend Calls:**
- `fetchCreatorProfile()` → calls `GET /api/users/creator/:creatorId/public`
- `handleFollow()` → calls `POST /api/users/follow` with creatorId
- Requires `Authorization: Bearer {token}` header (public profile viewable without auth, but follow requires auth)

**Key Implementation Details:**
- contentController.getCreatorPublicProfile() → returns public profile summary and recent content
- Shows pricing tiers (displayPrice calculated from base prices)
- Displays follower/following counts and creator stats

---

### client/src/components/MediaUploader.jsx – Content Upload

**Purpose:** Creator interface for uploading media and creating paywalled content

**Backend Endpoints Called:**

| HTTP Method | Endpoint              | Controller Function                                                  | Route File                             | Model(s) Accessed           |
| ----------- | --------------------- | -------------------------------------------------------------------- | -------------------------------------- | --------------------------- |
| POST        | `/api/content/create` | `contentController.createContentPost()`                              | `contentRoutes.js`                     | Content, User, Notification |
| POST        | `/api/content/upload` | `mediaController.uploadVideo()` or `contentController.uploadVideo()` | `contentRoutes.js` or `mediaRoutes.js` | *S3/R2 storage only*        |
| GET         | `/api/content/:id`    | `contentController.getContentPost()`                                 | `contentRoutes.js`                     | Content                     |

**Request/Response Examples:**

```javascript
// POST /api/content/create (with multipart/form-data for file upload)
REQUEST: {
  title: "My Latest Edit",
  description: "A video edit I spent hours on",
  price: 10000,  // NGN
  file: <File object>,
  isNsfw: false,
  contentType: "video"  // or "image", "audio"
}
RESPONSE: {
  success: true,
  content: {
    _id: "contentId",
    title: "My Latest Edit",
    description: "A video edit I spent hours on",
    price: 10000,
    displayPrice: 7.50,
    displayCurrency: "USD",
    originalFileUrl: "https://r2.example.com/private/original.mp4",
    teaserUrl: "https://r2.example.com/public/teaser.jpg",
    createdAt: "2026-08-15T11:00:00Z"
  }
}

// POST /api/content/upload (file-only upload)
REQUEST: {
  file: <File object>
}
RESPONSE: {
  success: true,
  fileUrl: "https://r2.example.com/uploads/file_uuid.mp4",
  mimeType: "video/mp4",
  size: 524288000
}
```

**Frontend Functions & Their Backend Calls:**
- `handleFileSelect()` → updates local state with file preview
- `handleUpload()` → calls `POST /api/content/create` with FormData (file + metadata)
  - File is multipart-encoded and uploaded directly
  - Backend stores original in private R2 bucket
  - Backend generates teaser image/video and stores in public bucket
- Requires `Authorization: Bearer {token}` header and `requireVerifiedCreator` middleware

**Key Implementation Details:**
- contentController.createContentPost() → validates file type, uploads to Cloudflare R2, generates teaser, creates Content record
- Original media stored in private bucket with restricted access
- Teaser stored in public bucket for feed preview
- Trigger notification broadcast when new content is created
- Price stored as base (NGN), displayPrice calculated when needed

---

### client/src/components/EarningsDashboard.jsx – Creator Earnings View

**Purpose:** Creator dashboard showing revenue, payouts, and performance metrics

**Backend Endpoints Called:**

| HTTP Method | Endpoint                     | Controller Function                      | Route File          | Model(s) Accessed                  |
| ----------- | ---------------------------- | ---------------------------------------- | ------------------- | ---------------------------------- |
| GET         | `/api/earnings/dashboard`    | `earningsController.getDashboard()`      | `earningsRoutes.js` | Wallet, User, Purchase, Withdrawal |
| GET         | `/api/earnings/transactions` | *Not yet detailed*                       | `earningsRoutes.js` | Purchase                           |
| POST        | `/api/earnings/withdraw`     | `earningsController.requestWithdrawal()` | `earningsRoutes.js` | Wallet, Withdrawal, User           |
| GET         | `/api/earnings/stats`        | *Not yet detailed*                       | `earningsRoutes.js` | Purchase, Content                  |

**Request/Response Examples:**

```javascript
// GET /api/earnings/dashboard
RESPONSE: {
  success: true,
  dashboard: {
    wallet: {
      balanceNGN: 500000,
      balanceUSD: 367.65,  // Converted for display
      pendingWithdrawal: 100000,
      accumulatedMarginNGN: 12500  // From price rounding
    },
    recentTransactions: [
      {
        _id: "purchaseId",
        type: "PPV",
        fanName: "fan123",
        baseAmountNGN: 10000,
        creatorEarnings: 8000,  // 80%
        timestamp: "2026-08-15T10:00:00Z"
      }
    ],
    withdrawals: [
      {
        _id: "withdrawalId",
        amountNGN: 100000,
        status: "pending",
        requestedDate: "2026-08-14T00:00:00Z"
      }
    ],
    stats: {
      totalEarningsNGN: 1200000,
      totalCreatorCutNGN: 960000,  // 80%
      platformMarginNGN: 12500,
      topContentId: "contentId",
      totalContentSold: 45,
      totalSubscribers: 120,
      totalMessagesUnlocked: 234
    }
  }
}

// POST /api/earnings/withdraw
REQUEST: {
  amountNGN: 100000,
  destinationAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f42e0"
}
RESPONSE: {
  success: true,
  withdrawal: {
    _id: "withdrawalId",
    amountNGN: 100000,
    status: "pending",
    requestedDate: "2026-08-15T11:30:00Z"
  }
}
```

**Frontend Functions & Their Backend Calls:**
- Component calls `GET /api/earnings/dashboard` on mount and on route focus
- Displays wallet balance, recent transactions, and withdrawal history
- `handleWithdraw()` in WithdrawalModal → calls `POST /api/earnings/withdraw`
- Requires `Authorization: Bearer {token}` header and `requireVerifiedCreator` middleware

**Key Implementation Details:**
- earningsController.getDashboard() → aggregates Purchase records, calculates 80% creator cut
- Shows both basePrice and displayPrice earnings for transparency
- Tracks accumulated margin from rounding as separate line item
- Withdrawal records stored atomically with wallet balance deduction

---

### client/src/components/NotificationsFeed.jsx – App Notifications

**Purpose:** Display notifications for follows, likes, comments, purchases

**Backend Endpoints Called:**

| HTTP Method | Endpoint                          | Controller Function                         | Route File              | Model(s) Accessed  |
| ----------- | --------------------------------- | ------------------------------------------- | ----------------------- | ------------------ |
| GET         | `/api/notifications`              | `notificationController.getNotifications()` | `notificationRoutes.js` | Notification, User |
| GET         | `/api/notifications/unread-count` | `notificationController.getUnreadCount()`   | `notificationRoutes.js` | Notification       |
| PUT         | `/api/notifications/mark-read`    | `notificationController.markAllAsRead()`    | `notificationRoutes.js` | Notification       |

**Request/Response Examples:**

```javascript
// GET /api/notifications?limit=20
RESPONSE: {
  success: true,
  notifications: [
    {
      _id: "notificationId",
      type: "like",  // or "follow", "comment", "purchase", "message"
      actor: {
        userId: "userId",
        username: "fan123"
      },
      content: {
        targetId: "contentId",
        title: "My Latest Edit"
      },
      message: "fan123 liked your post",
      timestamp: "2026-08-15T10:30:00Z",
      read: false
    }
  ]
}

// GET /api/notifications/unread-count
RESPONSE: {
  success: true,
  unreadCount: 5
}

// PUT /api/notifications/mark-read
REQUEST: {}
RESPONSE: {
  success: true,
  markedCount: 5
}
```

**Frontend Functions & Their Backend Calls:**
- Component calls `GET /api/notifications` on mount
- Polls `GET /api/notifications/unread-count` periodically
- On notification click, marks as read via `PUT /api/notifications/mark-read`
- Requires `Authorization: Bearer {token}` header

**Key Implementation Details:**
- Notification records created by various controller functions when events occur (like, follow, etc.)
- Notifications filterable by type
- Used by multiple components (FanFeed, CreatorProfile, etc.) to trigger notifications

---

### client/src/components/WithdrawalModal.jsx – Withdrawal Request

**Purpose:** Creator interface for requesting payouts to wallet

**Backend Endpoints Called:**

| HTTP Method | Endpoint                  | Controller Function                                                                    | Route File                                   | Model(s) Accessed        |
| ----------- | ------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------ |
| POST        | `/api/earnings/withdraw`  | `earningsController.requestWithdrawal()` or `withdrawalController.requestWithdrawal()` | `earningsRoutes.js` or `withdrawalRoutes.js` | Withdrawal, Wallet, User |
| GET         | `/api/earnings/dashboard` | `earningsController.getDashboard()`                                                    | `earningsRoutes.js`                          | Wallet, User             |

**Request/Response Examples:**

```javascript
// POST /api/earnings/withdraw
REQUEST: {
  amountNGN: 50000,
  destinationAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f42e0"
}
RESPONSE: {
  success: true,
  withdrawal: {
    _id: "withdrawalId",
    creatorId: "creatorUserId",
    amountNGN: 50000,
    status: "pending",
    requestedDate: "2026-08-15T11:30:00Z"
  }
}
// Backend stores withdrawal and deducts from Wallet.balance atomically
```

**Frontend Functions & Their Backend Calls:**
- `handleWithdraw()` → validates amount against available balance
- Calls `POST /api/earnings/withdraw` with amountNGN and destinationAddress
- Requires `Authorization: Bearer {token}` header and `requireVerifiedCreator` middleware

**Key Implementation Details:**
- withdrawalController.requestWithdrawal() → uses MongoDB transactions to atomically deduct balance and create withdrawal record
- Prevents double-spend by using atomic operations
- Withdrawal enters "pending" status, later processed by background workers

---

### client/src/hooks/useWeb3Transfer.js – Blockchain Payment Hook

**Purpose:** Centralized Web3 wallet interaction and payment execution logic

**Backend Connections (Indirect - Post-Transaction):**
- After transaction completes, **component** calls `POST /api/purchases/verify` with transaction hash
- verifyPayment in purchaseController validates the blockchain transaction

**Blockchain Contract Interaction:**
- Contract Address: `NippyPaymentGateway` on Polygon Amoy
- Function Called: `purchaseContent()` or similar payment function
- Parameters: `amount` (in USDT), `recipientAddress`, `metadata`

**Frontend Functions & Their Backend Calls:**
- `ensurePolygonNetwork()` → switches MetaMask to Polygon Amoy testnet
- `transferUSDT()` → 
  1. Calls USDT contract `approve()` for gateway contract to spend tokens
  2. Calls NippyPaymentGateway `purchaseContent()` with amount and recipient
  3. Returns transaction hash to caller
  4. Caller component then calls `POST /api/purchases/verify` with tx hash

**Key Implementation Details:**
- Uses ethers.js to interact with browser wallet (MetaMask)
- Always sends rounded amount (not base amount) to blockchain
- Transaction hash is proof of payment; backend verifies it on-chain
- No direct API connection; hook is used by components to initiate payments

---

### client/src/components/FanLayout.jsx & CreatorLayout.jsx – Role-Based Layouts

**Purpose:** Shared UI shells providing navigation and route structure

**Backend Connections:** None direct. These are pure UI/routing components. However:
- FanLayout wraps routes that use FanFeed, FanChatWindow, etc.
- CreatorLayout wraps routes that use EarningsDashboard, MediaUploader, CreatorProfile, etc.
- Both use `GET /api/users/profile` (loaded in parent App or passed via context) to determine user role and permissions

---

## 15. Data Flow Reference by Purchase Type

This section shows the complete data flow for different purchase scenarios:

### Flow 1: PPV Content Purchase (Fan buys a creator's post)

```
[FanFeed.jsx]
  ↓ fetchFeed() → GET /api/content/feed
[contentController.getFeed()]
  ↓ Returns content with displayPrice
[FanFeed displays $7.50]
  ↓ handleUnlockPost()
[useWeb3Transfer.transferUSDT($7.50)]
  ↓ Blockchain: approve USDT + purchaseContent tx
[Returns tx hash]
  ↓ handlePayment() → POST /api/purchases/verify
[purchaseController.verifyPayment()]
  ↓ Validates tx hash on blockchain
  ↓ Calculates expected NGN amount from displayPrice
  ↓ Creates Purchase record
[Purchase model stores: basePrice, displayPrice, platformMarginNGN]
  ↓ Returns unlocked content
[FanFeed.jsx updates UI to show full content]
```

### Flow 2: Message Bundle Purchase (Fan buys bubbles to message creator)

```
[FanChatWindow.jsx]
  ↓ fetchMessages() → GET /api/messages/:conversationId
[messageController.getMessages()]
  ↓ Returns bundleDisplayPrice
[FanChatWindow displays "$3.68 for 10 bubbles"]
  ↓ handleBuyBundle()
[useWeb3Transfer.transferUSDT($3.68)]
  ↓ Blockchain transaction
  ↓ POST /api/messages/bundle
[messageController.buyMessageBundle()]
  ↓ Creates Purchase record
[Purchase model: bundleCount, basePrice, displayPrice]
  ↓ Updates fan's Wallet.bubblesRemaining
  ↓ Returns success
[FanChatWindow.jsx updates bubble count]
```

### Flow 3: DM Unlock (Fan pays to unlock a PPV message from creator)

```
[FanChatWindow.jsx]
  ↓ Displays locked message: "[Pay 1500 NGN to unlock]"
  ↓ handleUnlockMessage()
[useWeb3Transfer.transferUSDT($1.10)]  // Rounded from 1500 NGN
  ↓ Blockchain transaction
  ↓ POST /api/purchases/verify with purchaseType: "DM_UNLOCK"
[purchaseController.verifyPayment()]
  ↓ Creates Purchase record
  ↓ Calls messageController to unlock message
  ↓ Returns unlocked message text
[FanChatWindow.jsx updates UI to show full message]
```

### Flow 4: Creator Earnings & Withdrawal

```
[Creator uploads content via MediaUploader.jsx]
  ↓ POST /api/content/create
[contentController.createContentPost()]
  ↓ Content stored with basePrice: 10000 NGN
  ↓ Returns contentId
  
[Time passes, fans purchase content]
  ↓ purchaseController.verifyPayment() creates Purchase records
  
[Creator checks earnings]
  ↓ GET /api/earnings/dashboard
[earningsController.getDashboard()]
  ↓ Aggregates all Purchase records for this creator
  ↓ Calculates: creator gets 80% of basePrice (always 10000 NGN base)
  ↓ Calculates: platform keeps rounding margin (e.g., 200 NGN from $7.50 rounded)
  ↓ Returns wallet balance
  
[Creator requests withdrawal via WithdrawalModal.jsx]
  ↓ POST /api/earnings/withdraw
[withdrawalController.requestWithdrawal()]
  ↓ Uses MongoDB atomic transaction
  ↓ Deducts from Wallet.balance
  ↓ Creates Withdrawal record with status: "pending"
  ↓ Returns withdrawalId
  
[Background worker processes withdrawal]
  ↓ treasuryWorker.js polls pending withdrawals
  ↓ Executes blockchain transfer to creator's wallet
  ↓ Updates Withdrawal record to status: "completed"
```

---

## 16. Summary: Frontend Files & Backend Dependencies

| Frontend File            | Primary Backend Endpoints                                          | Key Controller(s)                        | Key Model(s)                    | Middleware                          |
| ------------------------ | ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------- | ----------------------------------- |
| LandingPage.jsx          | `/api/auth/*`                                                      | authController                           | User                            | None (public)                       |
| BioDataSetup.jsx         | `/api/users/*`, `/api/kyc/*`                                       | userController, kycController            | User                            | requireAuth                         |
| FanBiodata.jsx           | `/api/users/*`                                                     | userController                           | User                            | requireAuth                         |
| FanFeed.jsx              | `/api/content/feed`, `/api/content/:id/*`, `/api/purchases/verify` | contentController, purchaseController    | Content, User, Purchase         | requireAuth                         |
| FanChatWindow.jsx        | `/api/messages/*`, `/api/purchases/verify`                         | messageController, purchaseController    | Conversation, Message, Purchase | requireAuth                         |
| CreatorMessages.jsx      | `/api/messages/*`, `/api/content/*/vault`                          | messageController, contentController     | Conversation, Message, Content  | requireAuth, requireVerifiedCreator |
| CreatorProfile.jsx       | `/api/users/*`, `/api/users/monetization`                          | userController                           | User                            | requireAuth, requireVerifiedCreator |
| CreatorPublicProfile.jsx | `/api/users/creator/:id/public`, `/api/users/follow`               | contentController, userController        | User, Content                   | requireAuth (for follow)            |
| MediaUploader.jsx        | `/api/content/create`, `/api/content/upload`                       | contentController, mediaController       | Content, Notification           | requireAuth, requireVerifiedCreator |
| EarningsDashboard.jsx    | `/api/earnings/dashboard`, `/api/earnings/withdraw`                | earningsController, withdrawalController | Wallet, Purchase, Withdrawal    | requireAuth, requireVerifiedCreator |
| NotificationsFeed.jsx    | `/api/notifications*`                                              | notificationController                   | Notification                    | requireAuth                         |
| WithdrawalModal.jsx      | `/api/earnings/withdraw`                                           | earningsController, withdrawalController | Wallet, Withdrawal              | requireAuth, requireVerifiedCreator |
| useWeb3Transfer.js       | (No direct HTTP) → Post-tx: `/api/purchases/verify`                | purchaseController                       | Purchase                        | (via component)                     |
| FanLayout.jsx            | None direct                                                        | N/A                                      | N/A                             | N/A                                 |
| CreatorLayout.jsx        | None direct                                                        | N/A                                      | N/A                             | N/A                                 |




