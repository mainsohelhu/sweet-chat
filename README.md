# 💬 Sweetchat

> A modern, full-stack real-time chat application — WhatsApp-inspired, production-ready.

![Sweetchat](https://img.shields.io/badge/version-1.0.0-brand?color=7c3aed)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-20%2B-brightgreen)
![React](https://img.shields.io/badge/react-18-61dafb)

---

## ✨ Features

| Feature | Details |
|---|---|
| **Authentication** | Email & phone signup/login, JWT refresh tokens, password reset via email, email verification |
| **Contacts** | Add/remove friends, search users, online/offline status |
| **Real-Time Messaging** | 1-to-1 and group chats, WebSockets (Socket.io), typing indicators |
| **Message Types** | Text, images, video, audio, documents, GIFs, emoji |
| **Media Sharing** | Drag-and-drop, file picker, preview before send, local/S3 storage |
| **Reactions & Replies** | React to messages with emoji, reply-to threading |
| **Read Receipts** | Sent ✓, Delivered ✓✓, Read 🔵✓✓ |
| **Delete Messages** | Delete for self or delete for everyone (within 1 hour) |
| **Search** | Search messages within a conversation |
| **Voice & Video Calls** | WebRTC 1-to-1 audio/video calls, accept/reject, mute, call logs |
| **E2E Encryption** | AES-256 client-side encryption for all messages |
| **Notifications** | In-app toast + browser push notifications |
| **Dark Mode** | Light/Dark/System theme toggle |
| **Profiles** | Display name, avatar, status message |
| **Security** | Rate limiting, Helmet, XSS sanitization, input validation, JWT auth |

---

## 🏗️ Architecture

```
sweetchat/
├── backend/                    # Node.js + Express API
│   ├── controllers/            # Business logic
│   │   ├── authController.js   # Auth: signup, login, reset
│   │   ├── chatController.js   # Chat CRUD
│   │   └── messageController.js# Message CRUD + search
│   ├── middleware/
│   │   └── auth.js             # JWT protect + socket auth
│   ├── models/
│   │   ├── User.js             # User schema
│   │   ├── Chat.js             # Chat schema
│   │   └── Message.js          # Message schema
│   ├── routes/                 # Express routers
│   ├── socket/
│   │   └── socketHandlers.js   # Socket.io real-time events
│   ├── utils/
│   │   ├── email.js            # Nodemailer
│   │   └── sms.js              # Twilio OTP
│   ├── __tests__/
│   │   └── api.test.js         # Jest integration tests
│   ├── .env.example
│   ├── Dockerfile
│   └── server.js               # Entry point
│
├── frontend/                   # React 18 + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/           # Auth forms
│   │   │   ├── calls/          # CallManager, CallScreen, IncomingCallModal
│   │   │   ├── chat/           # ChatList, ChatWindow, MessageBubble, MessageInput
│   │   │   ├── contacts/       # ContactsPanel
│   │   │   ├── layout/         # Sidebar, ProfilePanel
│   │   │   └── ui/             # MediaViewer, shared UI
│   │   ├── hooks/
│   │   │   └── useSocket.jsx   # Socket.io context
│   │   ├── pages/              # Route-level page components
│   │   ├── store/              # Zustand state stores
│   │   ├── utils/
│   │   │   ├── api.js          # Axios + token refresh
│   │   │   ├── encryption.js   # AES-256 E2E
│   │   │   └── helpers.js      # Date, color, format utils
│   │   └── App.jsx
│   ├── .env.example
│   ├── Dockerfile
│   └── tailwind.config.js
│
├── docker-compose.yml
└── README.md
```

**Tech Stack:**
- **Frontend:** React 18, Tailwind CSS, Zustand, Socket.io-client, SimplePeer (WebRTC), Axios
- **Backend:** Node.js, Express.js, Socket.io, Mongoose
- **Database:** MongoDB
- **Auth:** JWT (access + refresh tokens)
- **Media:** Local storage (dev) / AWS S3 (prod)
- **Calls:** WebRTC via SimplePeer

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js ≥ 20
- MongoDB (local or [Atlas](https://cloud.mongodb.com))
- npm or yarn

### 1. Clone & setup

```bash
git clone https://github.com/your-username/sweetchat.git
cd sweetchat
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values (MongoDB URI, JWT secrets, etc.)
npm install
npm run dev
# API running at http://localhost:5000
```

### 3. Frontend setup

```bash
cd ../frontend
cp .env.example .env
# Edit .env if your backend is not at localhost:5000
npm install
npm start
# App running at http://localhost:3000
```

### 4. Open the app
Navigate to **http://localhost:3000** and create an account!

---

## 🐳 Docker (Recommended)

Run the entire stack with one command:

```bash
# Copy and edit env vars
cp backend/.env.example backend/.env
# Set at minimum: JWT_SECRET, JWT_REFRESH_SECRET

docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for refresh tokens |
| `PORT` | — | API port (default: 5000) |
| `CLIENT_URL` | — | Frontend URL for CORS |
| `EMAIL_HOST` | — | SMTP host (Gmail: smtp.gmail.com) |
| `EMAIL_USER` | — | SMTP username |
| `EMAIL_PASS` | — | SMTP password / app password |
| `TWILIO_ACCOUNT_SID` | — | Twilio SID (for phone OTP) |
| `TWILIO_AUTH_TOKEN` | — | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | — | Twilio phone number |
| `AWS_ACCESS_KEY_ID` | — | AWS access key (S3) |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret (S3) |
| `AWS_S3_BUCKET` | — | S3 bucket name |
| `AWS_REGION` | — | AWS region (default: us-east-1) |
| `USE_LOCAL_STORAGE` | — | `true` = save files locally (dev) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_API_URL` | ✅ | Backend API URL |
| `REACT_APP_SOCKET_URL` | ✅ | Socket.io server URL |
| `REACT_APP_ENCRYPTION_KEY` | ✅ | AES encryption key (32 chars) |

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

Test coverage includes:
- Auth (signup, login, token refresh, password reset)
- User (search, add/remove contacts, profile update)
- Chat (create direct/group, list chats)
- Message (send, fetch, delete, search, XSS protection)

---

## ☁️ Deployment

### Option A: Render (Recommended for quick deploy)

**Backend:**
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo, set root to `backend/`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all environment variables from `backend/.env.example`

**Frontend:**
1. Create a new **Static Site** on Render
2. Root: `frontend/`, Build: `npm run build`, Publish: `build/`
3. Set `REACT_APP_API_URL` to your backend Render URL

**Database:** Use [MongoDB Atlas](https://cloud.mongodb.com) free tier.

---

### Option B: Vercel (Frontend) + Railway (Backend)

**Backend on Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

**Frontend on Vercel:**
```bash
npm i -g vercel
cd frontend
vercel --prod
```

---

### Option C: AWS (Production)

1. **MongoDB** → MongoDB Atlas or AWS DocumentDB
2. **Backend** → EC2 (t3.micro) or ECS Fargate with the provided Dockerfile
3. **Frontend** → S3 + CloudFront (static hosting)
4. **Media** → AWS S3 bucket (set `USE_LOCAL_STORAGE=false` and AWS env vars)
5. **SSL** → AWS Certificate Manager + ALB

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Send reset email |
| PUT | `/api/auth/reset-password/:token` | Reset password |
| GET | `/api/auth/verify-email/:token` | Verify email |
| GET | `/api/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/search?q=...` | Search users |
| GET | `/api/users/:userId` | Get user profile |
| PUT | `/api/users/me/profile` | Update own profile |
| GET | `/api/users/me/contacts` | Get contacts |
| POST | `/api/users/contacts/:userId` | Add contact |
| DELETE | `/api/users/contacts/:userId` | Remove contact |
| POST | `/api/users/block/:userId` | Block user |

### Chats
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chats` | Get all chats |
| GET | `/api/chats/direct/:userId` | Get/create direct chat |
| POST | `/api/chats/group` | Create group chat |
| GET | `/api/chats/:chatId` | Get single chat |
| PUT | `/api/chats/:chatId/participants` | Add group members |
| DELETE | `/api/chats/:chatId/leave` | Leave group |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/messages` | Send message |
| GET | `/api/messages/:chatId` | Get messages (paginated) |
| GET | `/api/messages/:chatId/search?query=...` | Search messages |
| DELETE | `/api/messages/:messageId` | Delete message |
| POST | `/api/messages/:messageId/react` | Add reaction |

### Uploads
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/uploads/file` | Upload media/document |
| POST | `/api/uploads/avatar` | Upload avatar |

---

## 🔌 Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join_chat` | `chatId` | Join chat room |
| `leave_chat` | `chatId` | Leave chat room |
| `typing_start` | `{ chatId }` | Start typing |
| `typing_stop` | `{ chatId }` | Stop typing |
| `call_initiate` | `{ targetUserId, callType, offer, chatId }` | Start call |
| `call_answer` | `{ targetUserId, answer, callId }` | Accept call |
| `call_reject` | `{ targetUserId, callId }` | Reject call |
| `call_end` | `{ targetUserId, callId, duration }` | End call |
| `ice_candidate` | `{ targetUserId, candidate, callId }` | ICE candidate |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `new_message` | `{ message, chatId }` | New message received |
| `user_typing` | `{ chatId, userId, isTyping }` | Typing indicator |
| `user_online` | `{ userId, isOnline, lastSeen }` | Presence update |
| `message_deleted` | `{ messageId, chatId, forEveryone }` | Message deleted |
| `message_reaction` | `{ messageId, reactions }` | Reaction updated |
| `messages_read` | `{ chatId, userId, messageIds }` | Read receipt |
| `chat_created` | `{ chat }` | New chat created |
| `incoming_call` | `{ from, callType, offer, chatId, callId }` | Incoming call |
| `call_answered` | `{ answer, callId }` | Call accepted |
| `call_rejected` | `{ callId, reason }` | Call rejected |
| `call_ended` | `{ callId, duration }` | Call ended |
| `ice_candidate` | `{ candidate, callId, from }` | ICE candidate |

---

## 🔐 Security

- **JWT tokens** — short-lived access tokens (7d) + rotating refresh tokens (30d)
- **Password hashing** — bcrypt with salt rounds = 12
- **Rate limiting** — 10 auth requests per 15 minutes
- **Helmet.js** — HTTP security headers
- **XSS sanitization** — all user input sanitized with `xss` library
- **E2E Encryption** — AES-256 client-side message encryption
- **CORS** — restricted to configured `CLIENT_URL`
- **Input validation** — express-validator on all auth endpoints

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT © Sweetchat

---

<p align="center">Built with ❤️ using React, Node.js, Socket.io, and MongoDB</p>
# sweet-chat
