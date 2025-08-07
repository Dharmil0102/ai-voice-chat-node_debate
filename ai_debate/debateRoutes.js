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
const axios = require('axios');

// Add this new endpoint to your server's routes
router.post('/speak', async (req, res) => {
  const { text, voiceId } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!text || !voiceId) {
    return res.status(400).json({ error: 'Text and Voice ID are required.' });
  }

  const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

  const headers = {
    'Accept': 'audio/mpeg',
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
  };

  const data = {
    text: text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  };

  try {
    const response = await axios({
      method: 'POST',
      url: elevenLabsUrl,
      data: data,
      headers: headers,
      responseType: 'stream',
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    response.data.pipe(res);

  } catch (error) {
    console.error("Error calling ElevenLabs API:", error.message);
    res.status(500).json({ error: 'Failed to generate speech from ElevenLabs.' });
  }
});

router.get('/voices', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const url = 'https://api.elevenlabs.io/v1/voices';

  try {
    const response = await axios.get(url, {
      headers: { 'xi-api-key': apiKey }
    });

    // We only need the name and voice_id for the frontend
    const simplifiedVoices = response.data.voices.map(voice => ({
      name: `${voice.name} (${voice.labels.accent || 'N/A'})`,
      voice_id: voice.voice_id
    }));

    res.json(simplifiedVoices);

  } catch (error) {
    console.error("Error fetching ElevenLabs voices:", error.message);
    res.status(500).json({ error: 'Failed to fetch voices.' });
  }
});

// Subtopics suggestion endpoint
router.post('/subtopics', async (req, res) => {
 const { topic, num_subtopics } = req.body; // Now accepts num_subtopics
 try {
  // Pass the number of subtopics to the service
  const subtopics = await debateService.generateSubtopics(topic, num_subtopics);
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
// router.post('/explain', async (req, res) => {
//  const { topic } = req.body;
//  try {
//   const explanation = await debateService.explainTopic(topic);
//   res.json({ explanation });
//  } catch (err) {
//   console.error('Error in /explain route:', err.message);
//   res.status(500).json({ error: 'An internal server error occurred.' });
//  }
// });

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