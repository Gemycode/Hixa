const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('@models/userModel');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map();
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
        this.clients.set(user._id.toString(), ws);

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
          this.clients.delete(user._id.toString());
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
    // إرسال إشعار الكتابة إلى المشاركين الآخرين في الغرفة
    // ...
  }

  handleReadReceipt(user, data) {
    const { messageIds, chatRoomId } = data;
    // تحديث حالة القراءة للرسائل
    // ...
  }

  sendToUser(userId, message) {
    const client = this.clients.get(userId.toString());
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcastToRoom(roomId, message, excludeUserId = null) {
    // إرسال رسالة لجميع المشاركين في الغرفة
    // ...
  }
}

module.exports = WebSocketServer;
