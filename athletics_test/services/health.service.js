// health.service.js
const HealthData = require('../models/healthData.model');
const User = require('../models/user.model');
const redis = require('../config/redis');
const socketService = require('./socket.service');
const AlertService = require('./alert.service');

// Health thresholds for alerts
const HEALTH_THRESHOLDS = {
  heartRate: { min: 40, max: 180 },
  fatigue: { min: 0, max: 80 },
  recovery: { min: 0, max: 100 }
};

class HealthService {
  // Update health data from wearable or manual input
  async updateHealthData(userId, healthData) {
    try {
      // Create new health data entry
      const newHealthData = new HealthData({
        user: userId,
        ...healthData,
        timestamp: new Date()
      });
      
      await newHealthData.save();
      
      // Store current health status in Redis for real-time access
      await redis.hset(
        `health:${userId}`,
        {
          heartRate: healthData.heartRate || 0,
          fatigue: healthData.fatigue || 0,
          recovery: healthData.recovery || 0,
          lastUpdated: new Date().toISOString()
        }
      );
      
      // Check thresholds and send alerts if needed
      await this._checkHealthThresholds(userId, healthData);
      
      // Emit socket event for real-time updates
      socketService.emitToUser(userId, 'health-update', {
        ...healthData,
        timestamp: new Date()
      });
      
      return newHealthData;
    } catch (error) {
      throw error;
    }
  }
  
  // Get current health status (from Redis)
  async getCurrentHealthStatus(userId) {
    try {
      // Get from Redis
      const healthData = await redis.hgetall(`health:${userId}`);
      
      if (!healthData || Object.keys(healthData).length === 0) {
        // Fallback to latest from MongoDB if not in Redis
        const latestData = await HealthData.findOne({ user: userId })
          .sort({ timestamp: -1 });
        
        if (!latestData) {
          return {
            heartRate: 0,
            fatigue: 0,
            recovery: 0,
            lastUpdated: null
          };
        }
        
        // Update Redis with this data
        await redis.hset(
          `health:${userId}`,
          {
            heartRate: latestData.heartRate || 0,
            fatigue: latestData.fatigue || 0,
            recovery: latestData.recovery || 0,
            lastUpdated: latestData.timestamp.toISOString()
          }
        );
        
        return {
          heartRate: latestData.heartRate || 0,
          fatigue: latestData.fatigue || 0,
          recovery: latestData.recovery || 0,
          lastUpdated: latestData.timestamp
        };
      }
      
      // Convert string values to numbers
      return {
        heartRate: parseInt(healthData.heartRate) || 0,
        fatigue: parseInt(healthData.fatigue) || 0,
        recovery: parseInt(healthData.recovery) || 0,
        lastUpdated: healthData.lastUpdated ? new Date(healthData.lastUpdated) : null
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Get historical health data with pagination
  async getHealthHistory(userId, page = 1, limit = 20, startDate = null, endDate = null) {
    try {
      const skip = (page - 1) * limit;
      
      // Build query
      const query = { user: userId };
      
      if (startDate && endDate) {
        query.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      // Get paginated results
      const healthData = await HealthData.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const total = await HealthData.countDocuments(query);
      
      return {
        healthData,
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
  
  // Get health stats and trends
  async getHealthStats(userId, period = 'week') {
    try {
      let startDate;
      const endDate = new Date();
      
      // Determine period
      switch (period) {
        case 'day':
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'week':
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(endDate);
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        default:
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 7);
      }
      
      // Get health data within period
      const healthData = await HealthData.find({
        user: userId,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 });
      
      // Calculate averages and trends
      const stats = {
        averageHeartRate: 0,
        averageFatigue: 0,
        averageRecovery: 0,
        heartRateTrend: [],
        fatigueTrend: [],
        recoveryTrend: []
      };
      
      if (healthData.length > 0) {
        // Calculate averages
        stats.averageHeartRate = healthData.reduce((sum, data) => sum + (data.heartRate || 0), 0) / healthData.length;
        stats.averageFatigue = healthData.reduce((sum, data) => sum + (data.fatigue || 0), 0) / healthData.length;
        stats.averageRecovery = healthData.reduce((sum, data) => sum + (data.recovery || 0), 0) / healthData.length;
        
        // Create trend data
        stats.heartRateTrend = healthData.map(data => ({
          timestamp: data.timestamp,
          value: data.heartRate || 0
        }));
        
        stats.fatigueTrend = healthData.map(data => ({
          timestamp: data.timestamp,
          value: data.fatigue || 0
        }));
        
        stats.recoveryTrend = healthData.map(data => ({
          timestamp: data.timestamp,
          value: data.recovery || 0
        }));
      }
      
      return stats;
    } catch (error) {
      throw error;
    }
  }
  
  // Check health thresholds and send alerts if needed
  async _checkHealthThresholds(userId, healthData) {
    try {
      const alerts = [];
      
      // Check heart rate
      if (healthData.heartRate) {
        if (healthData.heartRate < HEALTH_THRESHOLDS.heartRate.min) {
          alerts.push({
            type: 'heart-rate-low',
            message: `Your heart rate is too low (${healthData.heartRate} bpm)`,
            value: healthData.heartRate,
            threshold: HEALTH_THRESHOLDS.heartRate.min,
            severity: 'warning'
          });
        } else if (healthData.heartRate > HEALTH_THRESHOLDS.heartRate.max) {
          alerts.push({
            type: 'heart-rate-high',
            message: `Your heart rate is too high (${healthData.heartRate} bpm)`,
            value: healthData.heartRate,
            threshold: HEALTH_THRESHOLDS.heartRate.max,
            severity: 'danger'
          });
        }
      }
      
      // Check fatigue
      if (healthData.fatigue && healthData.fatigue > HEALTH_THRESHOLDS.fatigue.max) {
        alerts.push({
          type: 'fatigue-high',
          message: `Your fatigue level is too high (${healthData.fatigue}%)`,
          value: healthData.fatigue,
          threshold: HEALTH_THRESHOLDS.fatigue.max,
          severity: 'warning'
        });
      }
      
      // Check recovery
      if (healthData.recovery && healthData.recovery < HEALTH_THRESHOLDS.recovery.min) {
        alerts.push({
          type: 'recovery-low',
          message: `Your recovery level is too low (${healthData.recovery}%)`,
          value: healthData.recovery,
          threshold: HEALTH_THRESHOLDS.recovery.min,
          severity: 'warning'
        });
      }
      
      // Send alerts if any
      if (alerts.length > 0) {
        for (const alert of alerts) {
          await AlertService.createAlert(userId, alert);
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Error checking health thresholds:', error);
      // Don't throw here to prevent disrupting the health data update
    }
  }
}

module.exports = new HealthService();