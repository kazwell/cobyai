"use server";

import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";

export type ChatMessage = {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type Chat = {
  id: string;
  name: string;
  messages: ChatMessage[];
};

export type AIConfig = {
  maxTokens: number;
  temperature: number;
  presencePenalty: number;
  frequencyPenalty: number;
  safetySettings: {
    contentFilter: string;
    ageAppropriate: number;
  };
  systemPrompt: string;
  userName: string;
};

export async function streamMessage(messages: ChatMessage[], config: AIConfig) {
  const stream = createStreamableValue("");

  (async () => {
    try {
      console.log("Starting streamMessage function");
      const { textStream } = await streamText({
        model: openai("gpt-4o-mini"),
        messages: [
          { role: "system", content: `${config.systemPrompt} The user's name is ${config.userName}. Address them by name occasionally when it feels natural and appropriate.` },
          ...messages.map(({ role, content }) => ({ role, content }))
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        presence_penalty: config.presencePenalty,
        frequency_penalty: config.frequencyPenalty,
        // Note: The safety settings might need to be implemented differently
        // depending on the specific OpenAI API you're using
        // You may need to consult the OpenAI documentation for the correct way to
        // implement content filtering for your specific API version
      });

      console.log("textStream created successfully");

      for await (const delta of textStream) {
        stream.update(delta);
      }

      console.log("Stream completed successfully");
    } catch (error) {
      console.error("Detailed error in streamMessage:", error);
      stream.update("[Error: Unable to generate response. Please check the server logs for more details.]");
    } finally {
      stream.done();
    }
  })();

  return { output: stream.value };
}