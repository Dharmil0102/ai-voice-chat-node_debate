const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Base prompts with general instructions
const proSystemPrompt = (name, topic) => `You are a debater named ${name}, who always argues in favor of the following topic: "${topic}". Your role is PRO. Never repeat any previous arguments, and always provide a new, one-sentence point. Be logical, persuasive, and concise. Do not use the word 'AI' in your response.`;

const conSystemPrompt = (name, topic) => `You are a debater named ${name}, who always argues against the following topic: "${topic}". Your role is CON. Never repeat any previous arguments, and always provide a new, one-sentence point. Be logical, persuasive, and concise. Do not use the word 'AI' in your response.`;


async function getOpenAIResponse(systemPrompt, history) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        // Changed to a valid and cost-effective model
        model: 'gpt-4o-mini', 
        messages: [
          { role: 'system', content: systemPrompt },
          ...history
        ],
        max_tokens: 150,
        temperature: 1.0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling OpenAI API:', error.response?.data || error.message);
    // Gracefully handle API errors to prevent server crashes
    return 'An error occurred. I cannot respond right now.';
  }
}

async function generateSubtopics(topic) {
  const prompt = `Generate 5 short and distinct subtopics or follow-up questions that are interesting and debatable, related to the main topic: "${topic}". Respond only as a JSON array of strings.`;

  const response = await getOpenAIResponse(prompt, []);
  try {
    const match = response.match(/\[.*\]/s); 
    if (match) {
      const subtopics = JSON.parse(match[0]);
      if (Array.isArray(subtopics)) return subtopics.slice(0, 5);
    }
  } catch (e) {
    console.error('Error parsing subtopics JSON:', e);
  }
  return [];
}

async function getDebateStep(topic, history, step, alphaName = 'Alpha', betaName = 'Beta', rounds = 3) {
  const maxSteps = rounds * 2;
  if (step >= maxSteps) {
    return { speaker: '', text: '' };
  }

  // Determine the current speaker and their prompt
  const isAlpha = step % 2 === 0;
  const currentName = isAlpha ? alphaName : betaName;
  const systemPrompt = isAlpha ? proSystemPrompt(currentName, topic) : conSystemPrompt(currentName, topic);

  // Get response from the model
  const msg = await getOpenAIResponse(systemPrompt, history);
  return { speaker: currentName, text: msg };
}

async function judgeDebate(alphaName, betaName, transcript, topic) {
  const prompt = `You are an impartial debate judge. Here is a debate on the topic: "${topic}"\n\nDebater 1: ${alphaName}\nDebater 2: ${betaName}\n\nTranscript:\n${transcript.map((t, i) => `${i % 2 === 0 ? alphaName : betaName}: ${t}`).join('\n')}\n\nPlease answer in the following JSON format:\n{\n  \"winner\": \"(winner's name)\",\n  \"reason\": \"(one-sentence reason why they won)\",\n  \"ratings\": { \"${alphaName}\": \"x/5\", \"${betaName}\": \"y/5\" }\n}\nWho made the stronger case overall?`;
  
  const response = await getOpenAIResponse(prompt, []);
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      return obj;
    }
  } catch (e) {
    console.error('Error parsing judge JSON:', e);
  }

  // Fallback if parsing fails
  if (response.includes(alphaName)) return { winner: alphaName, reason: '', ratings: { [alphaName]: '', [betaName]: '' } };
  if (response.includes(betaName)) return { winner: betaName, reason: '', ratings: { [alphaName]: '', [betaName]: '' } };
  return { winner: '', reason: '', ratings: { [alphaName]: '', [betaName]: '' } };
}

async function explainTopic(topic) {
  const prompt = `Explain the following debate topic in 1 short, simple sentence for a general audience.\n\nTopic: ${topic}\n\nExplanation:`;
  const response = await getOpenAIResponse(prompt, []);
  return response;
}

module.exports = { getDebateStep, judgeDebate, explainTopic, generateSubtopics };