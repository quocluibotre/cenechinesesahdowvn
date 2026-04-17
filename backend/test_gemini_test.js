const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: 'application/json' } });
    const prompt = `Ban la tro ly ngon ngu hoc tieng Anh cho nguoi Viet.
Duoi day la mang cac cap cau phu de Anh-Viet.
Hay trich xuat tu 3 den 8 tu/cum tu (vocabulary/idiom/phrasal verb) quan trong trong moi nhom, uu tien tu co gia tri giao tiep.
Bat buoc tra ve JSON THUAN la mot array object voi dung 3 field: word, meaning, pinyin (pinyin mac dinh de trong hoac chua IPA).
Dau vao: [{"cn":"-Who doesn't love Anne Hathaway?","vi":"-Ai mà không yêu Anne Hathaway chứ?"}]`;

    try {
        const result = await model.generateContent(prompt);
        console.log('Result:', result.response.text());
    } catch(e) {
        console.log('Error:', e);
    }
}
test();
