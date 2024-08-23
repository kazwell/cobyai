'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Send, Plus, Trash2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { streamMessage, ChatMessage, AIConfig, Chat } from '../actions/stream-message';
import { readStreamableValue } from 'ai/rsc';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    console.log("Loaded chats from localStorage:", savedChats);
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
        console.log("Set currentChatId to:", parsedChats[0].id);
      }
    } else {
      const initialChat: Chat = {
        id: Date.now().toString(),
        name: 'Chat 1',
        messages: [
          {
            id: Date.now(),
            role: 'assistant',
            content: 'Hello! How can I assist you today?',
          }
        ]
      };
      setChats([initialChat]);
      setCurrentChatId(initialChat.id);
      console.log("Created initial chat with id:", initialChat.id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    console.log("Chats state updated", chats);
  }, [chats]);

  useEffect(() => {
    console.log("Current chat ID updated", currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    console.log("Chats updated", chats);
  }, [chats]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chats]);

  const aiConfig: AIConfig = {
    maxTokens: 150,
    temperature: 0.7,
    presencePenalty: 0.6,
    frequencyPenalty: 0.5,
    safetySettings: {
      contentFilter: 'strict',
      ageAppropriate: 11,
    },
    systemPrompt: "You are a friendly and educational AI assistant for an 11-year-old child. Always provide age-appropriate responses and avoid any adult or sensitive topics. If asked about inappropriate subjects, kindly redirect the conversation to more suitable topics for children.",
    userName: "Coby",
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: `Chat ${chats.length + 1}`,
      messages: []
    };
    setChats(prevChats => [...prevChats, newChat]);
    setCurrentChatId(newChat.id);
    console.log("Created new chat with id:", newChat.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit triggered", { message, currentChatId });
    
    if (!currentChatId) {
      console.error("No chat selected");
      return;
    }

    if (message.trim()) {
      const newUserMessage: ChatMessage = {
        id: Date.now(),
        role: 'user',
        content: message,
      };
      
      console.log("Adding new user message", newUserMessage);
      
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...chat.messages, newUserMessage] }
            : chat
        );
        console.log("Updated chats", updatedChats);
        return updatedChats;
      });
      
      setMessage('');
      setIsStreaming(true);

      try {
        const currentChat = chats.find(chat => chat.id === currentChatId);
        console.log("Current chat before AI response", currentChat);
        
        if (!currentChat) throw new Error("Current chat not found");

        const { output } = await streamMessage([...currentChat.messages, newUserMessage], aiConfig);

        let aiResponse = '';
        for await (const delta of readStreamableValue(output)) {
          aiResponse += delta;
        }

        console.log("AI response received", aiResponse);

        setChats(prevChats => {
          const updatedChats = prevChats.map(chat => 
            chat.id === currentChatId 
              ? { 
                  ...chat, 
                  messages: [
                    ...chat.messages.filter(msg => msg.id !== newUserMessage.id), // Remove duplicate user message
                    newUserMessage,
                    {
                      id: Date.now(),
                      role: 'assistant',
                      content: aiResponse,
                    }
                  ] 
                }
              : chat
          );
          console.log("Final updated chats", updatedChats);
          return updatedChats;
        });
      } catch (error) {
        console.error("Error in handleSubmit:", error);
        setChats(prevChats => prevChats.map(chat => 
          chat.id === currentChatId 
            ? { 
                ...chat, 
                messages: [
                  ...chat.messages, 
                  newUserMessage,
                  {
                    id: Date.now(),
                    role: 'assistant',
                    content: 'Sorry, an error occurred. Please check the console for more details and try again.',
                  }
                ] 
              }
            : chat
        ));
      } finally {
        setIsStreaming(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatToDelete));
      if (currentChatId === chatToDelete) {
        setCurrentChatId(chats[0]?.id || null);
      }
      setChatToDelete(null);
    }
  };

  const currentChat = chats.find(chat => chat.id === currentChatId);

  return (
    <div className="bg-gray-900 text-white min-h-screen flex">
      {isSidebarOpen ? (
        <div className="w-72 bg-gray-800 p-4 relative">
          <button 
            className="absolute top-4 left-4 p-2 bg-gray-700 text-white"
            onClick={toggleSidebar}
          >
            <Menu size={24} />
          </button>
          <button
            className="absolute top-4 right-4 p-2 bg-gray-700 text-white"
            onClick={createNewChat}
          >
            <Plus size={24} />
          </button>
          <h2 className="text-2xl font-bold mt-16 mb-4">Chats</h2>
          <ul>
            {chats.slice().reverse().map(chat => (
              <li 
                key={chat.id} 
                className={`cursor-pointer p-2 rounded ${chat.id === currentChatId ? 'bg-gray-700' : 'hover:bg-gray-700'} group relative`}
                onClick={() => setCurrentChatId(chat.id)}
              >
                {chat.name}
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button 
          className="p-2 bg-gray-700 text-white fixed top-4 left-4 z-10"
          onClick={toggleSidebar}
        >
          <Menu size={24} />
        </button>
      )}
      <div className={`flex-1 p-4 ${isSidebarOpen ? 'ml-10' : ''} flex justify-center`}>
        <div className="w-full max-w-[800px] flex flex-col h-full">
          <h1 className="text-4xl font-bold mb-4 text-center">Coby's AI buddy</h1>
          <div className="flex-1 overflow-y-auto mb-4">
            {currentChat?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 p-3 rounded-lg ${
                  msg.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-gray-700'
                } max-w-[80%] inline-block ${
                  msg.role === 'user' ? 'float-right clear-both' : 'float-left clear-both'
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isStreaming && (
              <div className="mb-4 p-3 rounded-lg bg-gray-700 max-w-[80%] inline-block float-left clear-both">
                <span className="animate-pulse">AI is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} className="clear-both" />
          </div>
          <form onSubmit={handleSubmit} className="mt-4 relative">
            <TextareaAutosize
              className="w-full bg-gray-800 text-white rounded-lg p-2 pr-12 resize-none overflow-hidden"
              minRows={1}
              maxRows={5}
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="submit"
              className="absolute right-2 bottom-1.5 p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
      <AlertDialog open={chatToDelete !== null} onOpenChange={() => setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the chat and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteChat}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}