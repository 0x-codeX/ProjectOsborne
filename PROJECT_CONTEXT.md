# Nippy Project Context

This document captures the working context of the Nippy project for future contributors and LLM agents. It is meant to complement the structural file by explaining the product intent, current implementation state, and the most important workflows that matter when continuing development.

## 1. Product purpose

Nippy is a creator monetization platform for adult-content creators and their fans. The core idea is to combine:

- creator-led content publishing
- fan access and engagement
- paywalled content unlocks
- direct messaging and bundle-based chat access
- wallet-based payments and creator payouts

The system is designed around a role-based experience: creators publish and monetize, while fans browse content, purchase access, and message creators.

## 2. Product goals and user journeys

### Creator journey

A creator can:

- sign up and complete onboarding
- submit KYC and profile setup information
- create content and set pricing
- publish media with teaser access rules
- receive payments from fans for PPV, subscriptions, or bundles
- manage messages and creator inbox
- request withdrawals from accumulated funds

### Fan journey

A fan can:

- sign up, verify age, and complete onboarding
- browse creator content in a feed
- purchase access to content, bundles, or direct messages
- chat with creators in real time
- follow creators, bookmark content, and interact with posts

## 3. Main product domains

### Authentication and onboarding

The app has a multi-step onboarding experience for both roles. The frontend uses role-based routes and the backend stores account state in the user model. This includes:

- age verification
- role selection
- profile setup
- creator KYC flow
- wallet-based login or email/password login

### Content and monetization

Creators can upload content that may be public, private, or paywalled. The backend processes media, stores teaser assets, and records purchases so content can be unlocked after payment.

### Messaging and access rules

The platform supports direct messages with business-rule based access. Fans may need to buy a bundle, unlock a DM, or have a valid purchase before sending or receiving certain content.

### Payments and payouts

The application integrates with a wallet hook and a smart contract/payment gateway flow. Purchases are verified on the server side and recorded so later access checks can be enforced.

## 4. Current implementation status

The project is already more than a scaffold. It currently includes:

- a working frontend router and layout system
- a login, signup, and auth experience
- onboarding and profile setup flows
- a creator dashboard and fan dashboard experience
- a feed with purchase unlock logic
- a real-time messaging interface over Socket.IO
- backend controllers for content, purchases, messages, users, auth, and withdrawals
- MongoDB-backed persistence and media storage integration
- web3 payment verification hooks for creator payouts and fan purchases

Some UI areas are still partially incomplete, but the core monetization and communication loops are already implemented.

## 5. Key technical choices

### Frontend

The frontend uses:

- React + Vite for the app shell
- React Router for route-based navigation
- Tailwind CSS for styling
- Axios for API requests
- Socket.IO client for chat
- Ethers.js for wallet operations

### Backend

The backend uses:

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Socket.IO for real-time messaging
- Cloudflare R2 / S3-compatible object storage for media
- background workers and cron jobs for supporting operations

## 6. Important app behavior to remember

### Auth behavior

Users can authenticate in a few ways:

- email/password login
- Google OAuth flow
- wallet signature-based login

The frontend stores auth state in local storage and the backend issues a JWT for subsequent API calls.

### Feed behavior

The content feed is not just a static list. It integrates with purchase state so users can see whether they can access a post or whether they need to pay first.

### Messaging behavior

The messaging system is access-aware. A fan may be allowed to send a message only if they have enough bubble balance, a valid bundle, or a paid unlock for that conversation. The server enforces these rules before broadcasting the message.

### Purchase behavior

Purchases are verified using transaction data. The backend decides whether the payment corresponds to:

- content unlock
- subscription access
- chat bundle
- DM unlock

That purchase record later influences whether content or messages should be shown to the user.

## 7. The most important files to understand first

If another agent needs to continue this project quickly, these are the best files to inspect first:

- [client/src/App.jsx](client/src/App.jsx) for routing and entrypoint structure
- [client/src/components/FanFeed.jsx](client/src/components/FanFeed.jsx) for content browsing and purchase UX
- [client/src/components/FanChatWindow.jsx](client/src/components/FanChatWindow.jsx) for the fan messaging experience
- [client/src/components/CreatorMessages.jsx](client/src/components/CreatorMessages.jsx) for the creator inbox experience
- [client/src/hooks/useWeb3Transfer.js](client/src/hooks/useWeb3Transfer.js) for wallet and payment flow
- [server/server.js](server/server.js) for server setup and Socket.IO wiring
- [server/controllers/contentController.js](server/controllers/contentController.js) for content posting and feed logic
- [server/controllers/messageController.js](server/controllers/messageController.js) for access-aware messaging rules
- [server/controllers/purchaseController.js](server/controllers/purchaseController.js) for purchase verification and unlock logic
- [server/models/User.js](server/models/User.js) for the most central domain model

## 8. Handoff guidance for future agents

A future agent should assume the following:

- the app is already wired end-to-end for basic creator/fan monetization
- role-based UI and backend access are important design constraints
- payment and messaging flows are not isolated; they share the same purchase and access rules
- onboarding state and profile state are central to the app’s behavior
- the server should be treated as the authority for access control, not the client UI alone

## 9. Working assumptions

- Local frontend development is expected on port 5173
- Local backend development is expected on port 5000
- Authentication is JWT-based and requires environment configuration
- Web3 payments are tied to a Polygon Amoy-style setup in the current implementation
- Media storage is expected to be object-storage based rather than local file storage

## 10. Recommended continuation strategy

When continuing work, the safest order is:

1. understand the route structure in [client/src/App.jsx](client/src/App.jsx)
2. inspect the content and message flows in [server/controllers/contentController.js](server/controllers/contentController.js) and [server/controllers/messageController.js](server/controllers/messageController.js)
3. verify the purchase logic in [server/controllers/purchaseController.js](server/controllers/purchaseController.js)
4. only then adjust UI, payment, or onboarding behavior

This file should be treated as the lightweight working context for Nippy: the product intent, the main user flows, and the implementation areas that matter most for future progress.