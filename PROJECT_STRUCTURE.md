# Nippy Project Structure and Implementation Map

This file is meant to serve as a compact but detailed memory document for future LLM sessions. It is not just a folder tree. It explains the current implementation status, the important functions, the state variables, the imports, and the cross-file relationships that matter when continuing the project.

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

The app is not just scaffolded. It has real backend controllers, models, routes, and web3 integration logic already wired together.

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
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
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

## 11. Important implementation notes for future work

- The app already assumes a local dev setup with the frontend on port 5173 and backend on port 5000
- The frontend uses localStorage keys named nippy_token and nippy_user
- Web3 payments are wired to Polygon Amoy testnet values in useWeb3Transfer.js
- The backend uses JWT auth and requires the JWT secret to be available in environment variables
- The media pipeline is designed around Cloudflare R2 / S3-compatible object storage
- Some routes and UI panels are present but may still be partially incomplete; the placeholders in App.jsx are evidence of that

## 12. Best starting points for continuing the project

If a future agent needs to continue development, the best places to start are:

1. client/src/App.jsx for route-level context
2. client/src/components/FanFeed.jsx and FanChatWindow.jsx for monetized content and chat flows
3. server/controllers/contentController.js for content posting and feed logic
4. server/controllers/messageController.js for messaging and access rules
5. server/controllers/purchaseController.js for payment verification and monetization logic
6. server/models/User.js and server/models/Purchase.js for the most important domain structures

This document should be treated as the compact memory of the current Nippy implementation state. It is the fastest way for a future LLM to understand the project without re-reading the entire repository from scratch.
