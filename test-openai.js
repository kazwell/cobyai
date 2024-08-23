require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

console.log("Starting OpenAI API test...");

const apiKey = process.env.OPENAI_API_KEY;
console.log("API Key loaded:", apiKey ? "Yes (length: " + apiKey.length + ")" : "No");

const openai = new OpenAI({
  apiKey: apiKey,
});

async function testOpenAI() {
  console.log("Attempting to call OpenAI API...");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello, are you working?" }],
    });
    console.log("API Key is valid. Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error testing OpenAI API:", error);
  }
}

testOpenAI().then(() => {
  console.log("Test completed.");
}).catch((error) => {
  console.error("Unexpected error:", error);
});

console.log("Script execution completed. If you don't see a test completion message, the async call may have failed.");