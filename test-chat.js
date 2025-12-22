const mongoose = require('mongoose');
const ProjectRoom = require('./models/projectRoomModel');
const ChatRoom = require('./models/chatRoomModel');
const Message = require('./models/messageModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hixa_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log('Testing chat system models...');

// Test creating a project room
async function testProjectRoom() {
  try {
    console.log('Creating a test project room...');
    
    const projectRoom = new ProjectRoom({
      project: new mongoose.Types.ObjectId(),
      projectTitle: 'Test Project Room',
    });
    
    const savedProjectRoom = await projectRoom.save();
    console.log('Project room created:', savedProjectRoom._id);
    
    // Test creating a chat room
    console.log('Creating a test chat room...');
    
    const chatRoom = new ChatRoom({
      project: savedProjectRoom.project,
      projectRoom: savedProjectRoom._id,
      type: 'admin-engineer',
      participants: [
        {
          user: new mongoose.Types.ObjectId(),
          role: 'engineer',
        }
      ],
    });
    
    const savedChatRoom = await chatRoom.save();
    console.log('Chat room created:', savedChatRoom._id);
    
    // Test creating a message
    console.log('Creating a test message...');
    
    const message = new Message({
      chatRoom: savedChatRoom._id,
      sender: new mongoose.Types.ObjectId(),
      content: 'Hello, this is a test message!',
    });
    
    const savedMessage = await message.save();
    console.log('Message created:', savedMessage._id);
    
    console.log('All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testProjectRoom();
