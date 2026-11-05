const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { previewSchedule, generateSchedule } = require('../services/scheduleService');
const router = express.Router();
router.use(authenticate, requireAdmin);
router.post('/preview', async (req, res, next) => {
    try { res.json({ success: true, data: await previewSchedule(req.body, req.app.locals.config.timeZone) }); } catch (error) { next(error); }
});
router.post('/generate', async (req, res, next) => {
    try { res.status(201).json({ success: true, count: await generateSchedule(req.body, req.app.locals.config.timeZone) }); } catch (error) { next(error); }
});
module.exports = router;
