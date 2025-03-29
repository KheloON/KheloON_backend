// socket.service.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
// const redis = require('../config/redis');

class SocketService {
  constructor() {
    this.io = null;
    this.userSocketMap = new Map(); // Map userId to socketId
  }
  
  // Initialize socket.io server
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    // Setup middleware for authentication
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user to socket
        socket.userId = decoded.userId;
        
        // Check if user exists
        const user = await User.findById(decoded.userId);
        if (!user) {
          return next(new Error('User not found'));
        }
        
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
    
    // Handle connections
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);
      
      // Store socket mapping
      this.userSocketMap.set(socket.userId, socket.id);
      
      // Store in Redis for distributed systems
      // redis.set(`socket:${socket.userId}`, socket.id, 'EX', 86400); // 24 hours
      
      // Join user to their own room
      socket.join(`user:${socket.userId}`);
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.userSocketMap.delete(socket.userId);
        // redis.del(`socket:${socket.userId}`);
      });
    });
    
    return this.io;
  }
  
  // Emit event to a specific user
  async emitToUser(userId, event, data) {
    if (!this.io) return;
    
    // Get socket ID
    let socketId = this.userSocketMap.get(userId);
    
    // If not in memory, try Redis
    if (!socketId) {
      // socketId = await redis.get(`socket:${userId}`);
      console.log("raddis call");
      
    }
    
    if (socketId) {
      // Emit to specific socket
      this.io.to(socketId).emit(event, data);
    } else {
      // Emit to user room (useful for multiple connections from same user)
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }
  
  // Emit event to followers of a user
  async emitToFollowers(userId, event, data) {
    if (!this.io) return;
    
    try {
      // Get user's followers
      const user = await User.findById(userId).select('followers');
      
      if (user && user.followers) {
        // Emit to each follower
        for (const followerId of user.followers) {
          await this.emitToUser(followerId, event, data);
        }
      }
    } catch (error) {
      console.error('Error emitting to followers:', error);
    }
  }
  
  // Emit event to all connected clients
  emitToAll(event, data) {
    if (!this.io) return;
    
    this.io.emit(event, data);
  }
}

module.exports = new SocketService();