const express = require('express');
const router = express.Router();
const debateService = require('./debateService');

// Route to render the debate topic form
router.get('/form', (req, res) => {
  res.render('ai_debate/form');
});

// Step-by-step debate API
router.post('/step', async (req, res) => {
  const { topic, history, step, alphaName, betaName, rounds } = req.body;
  try {
    const result = await debateService.getDebateStep(topic, history, step, alphaName, betaName, rounds);
    res.json(result);
  } catch (err) {
    console.error('Error in /step route:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Subtopics suggestion endpoint
router.post('/subtopics', async (req, res) => {
  const { topic } = req.body;
  try {
    const subtopics = await debateService.generateSubtopics(topic);
    res.json({ subtopics });
  } catch (err) {
    console.error('Error in /subtopics route:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Judge debate winner
router.post('/judge', async (req, res) => {
  const { alphaName, betaName, transcript, topic } = req.body;
  try {
    const result = await debateService.judgeDebate(alphaName, betaName, transcript, topic);
    res.json(result);
  } catch (err) {
    console.error('Error in /judge route:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Topic explanation endpoint
router.post('/explain', async (req, res) => {
  const { topic } = req.body;
  try {
    const explanation = await debateService.explainTopic(topic);
    res.json({ explanation });
  } catch (err) {
    console.error('Error in /explain route:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Live debate UI
router.get('/live', (req, res) => {
  const topic = req.query.topic || '';
  res.render('ai_debate/live', { topic });
});

router.get('/betaView', (req, res) => {
  res.render('ai_debate/betaView');
});

router.get('/alphaView', (req, res) => {
  res.render('ai_debate/alphaView');
});

module.exports = router;