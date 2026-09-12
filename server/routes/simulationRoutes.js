const express = require('express');
const router = express.Router();
const { stressTest, resetTestData } = require('../controllers/simulationController');

router.post('/stress-test', stressTest);
router.post('/reset', resetTestData);

module.exports = router;
