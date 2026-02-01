const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/userModel");
const ChatRoom = require("./models/chatRoomModel");

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"],
    },
  });

  // Authentication Middleware for Socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
      
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      if (!process.env.JWT_SECRET) {
        console.warn("JWT_SECRET is not defined, skipping socket auth verification (DEV MODE ONLY)");
       // return next(); // Uncomment for dev without exact env
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // JWT uses 'sub' field for user ID (as per authController.js)
      const userId = decoded.sub || decoded.id;
      const user = await User.findById(userId);

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error("Socket authentication failed:", err.message);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user._id})`);

    // Automatically join user's personal room for notifications
    const userId = socket.user._id.toString();
    socket.join(userId);
    console.log(`✅ User ${socket.user.name} auto-joined personal room: ${userId}`);

    // Determine rooms to join based on user role?
    // Or client explicitly joins rooms.
    // Client-side event: socket.emit('join_room', roomId);
    
    socket.on("join_room", async (roomId) => {
      try {
        const chatRoom = await ChatRoom.findById(roomId).select("participants engineer type");
        if (!chatRoom) {
          return socket.emit("error", { message: "غرفة الدردشة غير موجودة" });
        }
        const userId = socket.user._id.toString();
        const isParticipant = chatRoom.participants.some(
          (p) => p.user.toString() === userId
        );
        const isEngineerInRoom =
          chatRoom.engineer && chatRoom.engineer.toString() === userId;
        const isAdmin = socket.user.role === "admin";
        if (!isParticipant && !isEngineerInRoom && !isAdmin) {
          return socket.emit("error", { message: "غير مسموح لك بالانضمام لهذه الغرفة" });
        }
        socket.join(roomId);
        console.log(`✅ User ${socket.user.name} (${socket.user._id}) joined room: ${roomId}`);
      } catch (err) {
        console.error("join_room error:", err);
        socket.emit("error", { message: "خطأ في التحقق من الصلاحية" });
      }
    });

    socket.on("leave_room", (roomId) => {
      console.log(`User ${socket.user.name} left room: ${roomId}`);
      socket.leave(roomId);
    });
    
    // Typing indicator
    socket.on("typing", ({ roomId, chatRoomId, isTyping }) => {
      const targetRoom = chatRoomId || roomId; // Support both for backward compatibility
      socket.to(targetRoom).emit("user_typing", {
        userId: socket.user._id,
        userName: socket.user.name,
        chatRoomId: targetRoom,
        isTyping
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };
