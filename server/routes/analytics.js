import express from 'express';
import { analyticsService } from '../services/analyticsService.js';

const router = express.Router();

// GET /api/analytics/overview - Fetch complete real-time dashboard data
router.get('/overview', (req, res) => {
  try {
    const io = req.app.get('io');
    let socketCount = 0;
    if (io && io.sockets && io.sockets.sockets) {
      socketCount = io.sockets.sockets.size || 0;
    }

    const data = analyticsService.getDashboardData(req.query.timeRange || 'all', socketCount);
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data
    });
  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({ error: 'Failed to retrieve analytics dashboard data.' });
  }
});

// POST /api/analytics/reset - Reset analytics statistics (Admin action)
router.post('/reset', (req, res) => {
  try {
    const resetData = analyticsService.resetAnalytics();
    res.json({
      success: true,
      message: 'Analytics data has been reset successfully.',
      data: resetData
    });
  } catch (err) {
    console.error('Error resetting analytics:', err);
    res.status(500).json({ error: 'Failed to reset analytics data.' });
  }
});

// GET /api/analytics/export - Export full JSON analytics report
router.get('/export', (req, res) => {
  try {
    const data = analyticsService.getDashboardData('all', 0);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=chatbot-analytics-report-${Date.now()}.json`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error exporting analytics:', err);
    res.status(500).json({ error: 'Failed to export analytics report.' });
  }
});

export default router;
