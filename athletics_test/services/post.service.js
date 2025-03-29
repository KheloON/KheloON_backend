// post.service.js
const Post = require('../models/post.model');
const User = require('../models/user.model');
const MediaService = require('./media.service');
const socketService = require('./socket.service');

class PostService {
  // Create a new post
  async createPost(userId, postData, mediaFile) {
    try {
      let mediaUrl = null;
      
      // Upload media if provided
      if (mediaFile) {
        mediaUrl = await MediaService.uploadMedia(mediaFile);
      }
      
      // Create post
      const newPost = new Post({
        user: userId,
        content: postData.content,
        mediaUrl: mediaUrl,
        mediaType: mediaFile ? mediaFile.mimetype.split('/')[0] : null
      });
      
      await newPost.save();
      
      // Populate user data for the response
      await newPost.populate('user', 'name profileImage');
      
      // Emit socket event for real-time updates
      socketService.emitToFollowers(userId, 'new-post', newPost);
      
      return newPost;
    } catch (error) {
      throw error;
    }
  }
  
  // Get paginated posts (feed)
  async getPosts(page = 1, limit = 10, filter = {}) {
    try {
      const skip = (page - 1) * limit;
      
      // Find posts with pagination
      const posts = await Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name profileImage')
        .populate('likes', 'name profileImage')
        .populate({
          path: 'comments',
          populate: {
            path: 'user',
            select: 'name profileImage'
          }
        });
      
      // Get total count for pagination info
      const total = await Post.countDocuments(filter);
      
      return {
        posts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Get posts for a specific user
  async getUserPosts(userId, page = 1, limit = 10) {
    try {
      return await this.getPosts(page, limit, { user: userId });
    } catch (error) {
      throw error;
    }
  }
  
  // Like a post
  async likePost(postId, userId) {
    try {
      // Check for spam (rate limiting)
      const recentLikes = await Post.countDocuments({
        likes: userId,
        createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
      });
      
      if (recentLikes > 10) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      // Find post
      const post = await Post.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Check if already liked
      if (post.likes.includes(userId)) {
        throw new Error('Post already liked');
      }
      
      // Add like
      post.likes.push(userId);
      await post.save();
      
      // Emit socket event
      socketService.emitToUser(post.user, 'post-liked', {
        postId,
        userId,
        totalLikes: post.likes.length
      });
      
      return post;
    } catch (error) {
      throw error;
    }
  }
  
  // Unlike a post
  async unlikePost(postId, userId) {
    try {
      // Find post
      const post = await Post.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Check if not liked
      if (!post.likes.includes(userId)) {
        throw new Error('Post not liked yet');
      }
      
      // Remove like
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      await post.save();
      
      return post;
    } catch (error) {
      throw error;
    }
  }
  
  // Add comment to a post
  async addComment(postId, userId, content) {
    try {
      // Find post
      const post = await Post.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Add comment
      post.comments.push({
        user: userId,
        content
      });
      
      await post.save();
      
      // Get the new comment
      const newComment = post.comments[post.comments.length - 1];
      
      // Populate user data
      await post.populate({
        path: 'comments.user',
        select: 'name profileImage'
      });
      
      // Emit socket event
      socketService.emitToUser(post.user, 'post-commented', {
        postId,
        comment: post.comments.find(c => c._id.toString() === newComment._id.toString())
      });
      
      return post;
    } catch (error) {
      throw error;
    }
  }
  
  // Delete a post
  async deletePost(postId, userId) {
    try {
      // Find post
      const post = await Post.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Check ownership
      if (post.user.toString() !== userId.toString()) {
        throw new Error('Not authorized to delete this post');
      }
      
      // Delete media if exists
      if (post.mediaUrl) {
        await MediaService.deleteMedia(post.mediaUrl);
      }
      
      // Delete post
      await Post.findByIdAndDelete(postId);
      
      return { message: 'Post deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PostService();