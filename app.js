require('module-alias/register');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const NodeCache = require('node-cache');
const helmet = require('helmet');
const hpp = require('hpp');

dotenv.config({ path: path.join(__dirname, '.env') });

const config = require('./config/config');
const errorHandler = require('@middleware/errorHandler');
const { apiLimiter, authLimiter } = require('@middleware/security');

const contentRoutes = require('@routes/contentRoutes');
const authRoutes = require('@routes/authRoutes');
const userRoutes = require('@routes/userRoutes');
const subscriberRoutes = require('@routes/subscriberRoutes');
const projectRoutes = require('@routes/projectRoutes');
const portfolioRoutes = require('@routes/portfolioRoutes');
const serviceOrderRoutes = require('@routes/serviceOrderRoutes');
const proposalRoutes = require('@routes/proposalRoutes');
const projectRoomRoutes = require('@routes/projectRoomRoutes');
const chatRoomRoutes = require('@routes/chatRoomRoutes');
const messageRoutes = require('@routes/messageRoutes');

const app = express();
const server = http.createServer(app);

const { initWebSocketServer } = require('@websocket/websocket');
const wss = initWebSocketServer(server);

const cache = new NodeCache({ stdTTL: 600 });
app.set('cache', cache);
app.set('wss', wss);

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));

app.use(express.json({ limit: config.fileUpload?.maxFileUpload || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use("/api", apiLimiter);
app.use(hpp());

/* ===== Deep NoSQL Sanitizer ===== */
const deepSanitize = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const clean = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (!key.startsWith('$') && key !== '__proto__') {
      clean[key] = deepSanitize(obj[key]);
    }
  }
  return clean;
};

app.use((req, res, next) => {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query);
  next();
});
/* =============================== */

app.use(compression());

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/content`, contentRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/subscribers`, subscriberRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/portfolio`, portfolioRoutes);
app.use(`${API_PREFIX}/service-orders`, serviceOrderRoutes);
app.use(`${API_PREFIX}/proposals`, proposalRoutes);
app.use(`${API_PREFIX}/project-rooms`, projectRoomRoutes);
app.use(`${API_PREFIX}/chat-rooms`, chatRoomRoutes);
app.use(`${API_PREFIX}/messages`, messageRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);

app.get("/", (req, res) => res.send("HIXA API is running"));

app.use(errorHandler);

module.exports = { app, server };
