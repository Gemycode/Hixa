const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('@models/userModel');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> ws connection
    this.roomMembers = new Map(); // roomId -> Set of userIds
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.setupConnection();
  }

  setupConnection() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // استخراج التوكن من عنوان URL
        const token = req.url.split('token=')[1];
        if (!token) {
          return ws.close(1008, 'No token provided');
        }

        // التحقق من صحة التوكن
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return ws.close(1008, 'User not found');
        }

        // تخزين الاتصال بالمستخدم
        const userId = user._id.toString();
        this.clients.set(userId, ws);

        // إرسال رسالة ترحيب
        this.sendToUser(user._id, {
          type: 'connection',
          status: 'connected',
          userId: user._id
        });

        // معالجة الرسائل الواردة
        ws.on('message', (message) => {
          this.handleMessage(user, message);
        });

        // إغلاق الاتصال
        ws.on('close', () => {
          this.clients.delete(userId);
          // Remove user from all rooms
          const userRoomSet = this.userRooms.get(userId);
          if (userRoomSet) {
            userRoomSet.forEach(roomId => {
              const roomMembers = this.roomMembers.get(roomId);
              if (roomMembers) {
                roomMembers.delete(userId);
                if (roomMembers.size === 0) {
                  this.roomMembers.delete(roomId);
                }
              }
            });
            this.userRooms.delete(userId);
          }
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1011, 'Authentication error');
      }
    });
  }

  handleMessage(user, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join_room':
          if (data.roomId) {
            this.joinRoom(user._id, data.roomId);
            this.sendToUser(user._id, {
              type: 'joined_room',
              roomId: data.roomId,
            });
          }
          break;
        case 'leave_room':
          if (data.roomId) {
            this.leaveRoom(user._id, data.roomId);
            this.sendToUser(user._id, {
              type: 'left_room',
              roomId: data.roomId,
            });
          }
          break;
        case 'message':
          this.handleChatMessage(user, data);
          break;
        case 'typing':
          this.handleTyping(user, data);
          break;
        case 'read_receipt':
          this.handleReadReceipt(user, data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  handleChatMessage(sender, data) {
    // إرسال الرسالة إلى المستلم
    const { receiverId, content, chatRoomId } = data;
    
    // هنا يمكنك حفظ الرسالة في قاعدة البيانات
    // ثم إرسالها إلى المستلم إذا كان متصلاً
    
    const message = {
      type: 'new_message',
      from: sender._id,
      content,
      chatRoomId,
      timestamp: new Date()
    };

    this.sendToUser(receiverId, message);
  }

  handleTyping(user, data) {
    const { chatRoomId, isTyping } = data;
    if (!chatRoomId) return;
    
    // إرسال إشعار الكتابة إلى المشاركين الآخرين في الغرفة
    this.broadcastToRoom(chatRoomId, {
      type: 'user_typing',
      userId: user._id,
      userName: user.name,
      isTyping,
      chatRoomId,
    }, user._id.toString());
  }

  handleReadReceipt(user, data) {
    const { messageIds, chatRoomId } = data;
    // إشعار المشاركين الآخرين أن المستخدم قرأ الرسائل
    if (chatRoomId) {
      this.broadcastToRoom(chatRoomId, {
        type: 'messages_read',
        userId: user._id,
        messageIds,
        chatRoomId,
      }, user._id.toString());
    }
  }

  // Join a room
  joinRoom(userId, roomId) {
    const userIdStr = userId.toString();
    const roomIdStr = roomId.toString();
    
    if (!this.roomMembers.has(roomIdStr)) {
      this.roomMembers.set(roomIdStr, new Set());
    }
    this.roomMembers.get(roomIdStr).add(userIdStr);
    
    if (!this.userRooms.has(userIdStr)) {
      this.userRooms.set(userIdStr, new Set());
    }
    this.userRooms.get(userIdStr).add(roomIdStr);
  }

  // Leave a room
  leaveRoom(userId, roomId) {
    const userIdStr = userId.toString();
    const roomIdStr = roomId.toString();
    
    const roomMembers = this.roomMembers.get(roomIdStr);
    if (roomMembers) {
      roomMembers.delete(userIdStr);
      if (roomMembers.size === 0) {
        this.roomMembers.delete(roomIdStr);
      }
    }
    
    const userRoomSet = this.userRooms.get(userIdStr);
    if (userRoomSet) {
      userRoomSet.delete(roomIdStr);
      if (userRoomSet.size === 0) {
        this.userRooms.delete(userIdStr);
      }
    }
  }

  sendToUser(userId, message) {
    const client = this.clients.get(userId.toString());
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcastToRoom(roomId, message, excludeUserId = null) {
    const roomIdStr = roomId.toString();
    const roomMembers = this.roomMembers.get(roomIdStr);
    
    if (!roomMembers || roomMembers.size === 0) {
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    roomMembers.forEach(userId => {
      if (excludeUserId && userId === excludeUserId.toString()) {
        return; // Skip excluded user
      }

      const client = this.clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`Error sending message to user ${userId}:`, error);
        }
      }
    });

    return sentCount;
  }
}

// Singleton instance
let wssInstance = null;

// Initialize WebSocket server
const initWebSocketServer = (server) => {
  if (!wssInstance) {
    wssInstance = new WebSocketServer(server);
  }
  return wssInstance;
};

// Get WebSocket server instance
const getWebSocketServer = () => {
  if (!wssInstance) {
    throw new Error('WebSocket server not initialized. Call initWebSocketServer first.');
  }
  return wssInstance;
};

module.exports = WebSocketServer;
module.exports.initWebSocketServer = initWebSocketServer;
module.exports.getWebSocketServer = getWebSocketServer;
