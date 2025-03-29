// routes/index.js
// two times comment on the router

const express = require('express');
const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const postRoutes = require('./post.routes');
const healthRoutes = require('./health.routes');
const notificationRoutes = require('./notification.routes');
const achievementRoutes = require('./achievement.routes');

const router = express.Router();

// API versioning
router.use('/v1/auth', authRoutes);
router.use('/v1/profile', profileRoutes);
router.use('/v1/posts', postRoutes);
router.use('/v1/health', healthRoutes);
router.use('/v1/notifications', notificationRoutes);
router.use('/v1/achievements', achievementRoutes);

module.exports = router;

// routes/post.routes.js
const express = require('express');
const PostController = require('../controllers/post.controller');
const AuthMiddleware = require('../middlewares/auth.middleware');
const RateLimitMiddleware = require('../middlewares/rateLimit.middleware');
const multer = require('multer');

// const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all routes
router.use(AuthMiddleware.authenticate);

// Get posts feed (with pagination)
router.get('/', PostController.getPosts);

// Get user posts
router.get('/user/:userId', PostController.getUserPosts);

// Create new post
router.post(
  '/',
  RateLimitMiddleware.limit({ windowMs: 60000, max: 5 }), // 5 posts per minute
  upload.single('media'),
  PostController.createPost
);

// Like a post
router.post(
  '/:postId/like',
  RateLimitMiddleware.limit({ windowMs: 60000, max: 20 }), // 20 likes per minute
  PostController.likePost
);

// Unlike a post
router.delete('/:postId/like', PostController.unlikePost);

// Comment on a post
router.post(
  '/:postId/comment',
  RateLimitMiddleware.limit({ windowMs: 60000, max: 10 }), // 10 comments per minute
  PostController.addComment
);

// Delete a post
router.delete('/:postId', PostController.deletePost);

module.exports = router;

// routes/health.routes.js
const express = require('express');
const HealthController = require('../controllers/health.controller');
const AuthMiddleware = require('../middlewares/auth.middleware');

// const router = express.Router();

// Apply auth middleware to all routes
router.use(AuthMiddleware.authenticate);

// Update health data
router.post('/', HealthController.updateHealthData);

// Get current health status
router.get('/current', HealthController.getCurrentHealthStatus);

// Get health history
router.get('/history', HealthController.getHealthHistory);

// Get health stats and trends
router.get('/stats', HealthController.getHealthStats);

module.exports = router;