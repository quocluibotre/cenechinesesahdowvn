const axios = require('axios');
require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL;
console.log('Using Key:', apiKey.slice(0,10) + '...', 'Model:', modelName);

const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
const prompt = 'Translate to Vietnamese: Hello world. Return ONLY a JSON array with one object containing vn_text. Example: [{"vn_text": "Xin chào thế giới"}]';

axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
}, {
    headers: { 'Content-Type': 'application/json' }
}).then(res => {
    console.log('SUCCESS!');
    console.log(res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
}).catch(err => {
    console.error('ERROR HTTP Status:', err.response?.status);
    console.error('ERROR Message:', err.response?.data?.error?.message || err.message);
});
