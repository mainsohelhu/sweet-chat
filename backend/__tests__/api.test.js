/**
 * Sweetchat — Backend Test Suite
 * Tests for auth, user, chat, and message endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// ─── Test helpers ──────────────────────────────────────────────────────────────
const TEST_USER = {
  displayName: 'Test User',
  email: 'test@sweetchat.test',
  password: 'password123',
};
const TEST_USER_2 = {
  displayName: 'Test User 2',
  email: 'test2@sweetchat.test',
  password: 'password456',
};

let token1, token2, userId1, userId2, chatId;

beforeAll(async () => {
  // Connect to test DB
  await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/sweetchat_test');
  // Clean up
  await User.deleteMany({ email: { $in: [TEST_USER.email, TEST_USER_2.email] } });
});

afterAll(async () => {
  await User.deleteMany({ email: { $in: [TEST_USER.email, TEST_USER_2.email] } });
  await mongoose.connection.close();
});

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe('POST /api/auth/signup', () => {
  it('should create a new user with email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(TEST_USER)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.accessToken).toBeDefined();
    token1 = res.body.accessToken;
    userId1 = res.body.user._id;
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(TEST_USER)
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...TEST_USER, email: 'weak@test.com', password: '123' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject missing email and phone', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ displayName: 'No Contact', password: 'password123' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('should login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    token1 = res.body.accessToken;
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: TEST_USER.email, password: 'wrongpassword' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@test.com', password: 'password123' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('should return current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it('should reject request without token', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('should reject invalid token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken')
      .expect(401);
  });
});

// ─── User Tests ───────────────────────────────────────────────────────────────
describe('User API', () => {
  beforeAll(async () => {
    // Create second user
    const res = await request(app)
      .post('/api/auth/signup')
      .send(TEST_USER_2)
      .expect(201);
    token2 = res.body.accessToken;
    userId2 = res.body.user._id;
  });

  it('should search users by name', async () => {
    const res = await request(app)
      .get('/api/users/search?q=Test User 2')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body.users[0].displayName).toContain('Test User 2');
  });

  it('should add a contact', async () => {
    const res = await request(app)
      .post(`/api/users/contacts/${userId2}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.contacts.some((c) => c._id === userId2)).toBe(true);
  });

  it('should get contacts', async () => {
    const res = await request(app)
      .get('/api/users/me/contacts')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(Array.isArray(res.body.contacts)).toBe(true);
  });

  it('should update profile', async () => {
    const res = await request(app)
      .put('/api/users/me/profile')
      .set('Authorization', `Bearer ${token1}`)
      .send({ displayName: 'Updated Name', statusMessage: 'Hello from test' })
      .expect(200);

    expect(res.body.user.displayName).toBe('Updated Name');
    expect(res.body.user.statusMessage).toBe('Hello from test');
  });

  it('should remove contact', async () => {
    const res = await request(app)
      .delete(`/api/users/contacts/${userId2}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ─── Chat Tests ───────────────────────────────────────────────────────────────
describe('Chat API', () => {
  it('should create or get a direct chat', async () => {
    const res = await request(app)
      .get(`/api/chats/direct/${userId2}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.chat).toBeDefined();
    expect(res.body.chat.isGroup).toBe(false);
    expect(res.body.chat.participants.some((p) => p._id === userId2 || p === userId2)).toBe(true);
    chatId = res.body.chat._id;
  });

  it('should return same chat on second call (idempotent)', async () => {
    const res = await request(app)
      .get(`/api/chats/direct/${userId2}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(res.body.chat._id).toBe(chatId);
  });

  it('should create a group chat', async () => {
    const res = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'Test Group', participantIds: [userId2] })
      .expect(201);

    expect(res.body.chat.isGroup).toBe(true);
    expect(res.body.chat.name).toBe('Test Group');
  });

  it('should reject group with no name', async () => {
    const res = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${token1}`)
      .send({ participantIds: [userId2] })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should list all chats', async () => {
    const res = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(Array.isArray(res.body.chats)).toBe(true);
    expect(res.body.chats.length).toBeGreaterThan(0);
  });
});

// ─── Message Tests ────────────────────────────────────────────────────────────
describe('Message API', () => {
  let messageId;

  it('should send a text message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({ chatId, content: 'Hello from test!', type: 'text' })
      .expect(201);

    expect(res.body.message.content).toBe('Hello from test!');
    expect(res.body.message.type).toBe('text');
    messageId = res.body.message._id;
  });

  it('should sanitize XSS in message content', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({ chatId, content: '<script>alert("xss")</script>Hello', type: 'text' })
      .expect(201);

    expect(res.body.message.content).not.toContain('<script>');
  });

  it('should fetch messages for a chat', async () => {
    const res = await request(app)
      .get(`/api/messages/${chatId}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThan(0);
  });

  it('should search messages', async () => {
    const res = await request(app)
      .get(`/api/messages/${chatId}/search?query=Hello`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('should delete message for self', async () => {
    const res = await request(app)
      .delete(`/api/messages/${messageId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ forEveryone: false })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should prevent user2 from deleting user1 message for everyone', async () => {
    // Send a new message as user1
    const msgRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({ chatId, content: 'Delete test', type: 'text' })
      .expect(201);

    // Try to delete for everyone as user2
    await request(app)
      .delete(`/api/messages/${msgRes.body.message._id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ forEveryone: true })
      .expect(403);
  });

  it('should reject messages to chats user is not in', async () => {
    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({ chatId: new mongoose.Types.ObjectId(), content: 'Hack', type: 'text' })
      .expect(404);
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
describe('Health', () => {
  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});
