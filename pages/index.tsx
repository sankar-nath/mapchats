import { Chat } from "@/components/Chat/Chat";
import { Footer } from "@/components/Layout/Footer";
import { Navbar } from "@/components/Layout/Navbar";
import { Message } from "@/types";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import MapPane from '@/components/MapPane';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mapContext, setMapContext] = useState<string>(""); // <-- NEW

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (message: Message) => {
    const updatedMessages = [...messages, message];

    setMessages(updatedMessages);
    setLoading(true);

      // Grab whatever is in the map's textbox
  const mapInfoEl = document.getElementById("map-info-text") as HTMLTextAreaElement | null;
  const mapContext = mapInfoEl?.value || "";

   // Build payload with map context
const payload = mapContext
  ? [
      { role: "system", content: `Map context:\n${mapContext}` } as Message,
      ...updatedMessages
    ]
  : updatedMessages;

    // 👇 Log it so you can inspect in browser DevTools
    console.log("Payload sent to API:", payload);

    console.log("Payload JSON:", JSON.stringify({ messages: payload }, null, 2));

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: payload
      })
    });

    if (!response.ok) {
      setLoading(false);
      throw new Error(response.statusText);
    }

    const data = response.body;

    if (!data) {
      return;
    }

    setLoading(false);

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let isFirst = true;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);

      if (isFirst) {
        isFirst = false;
        setMessages((messages) => [
          ...messages,
          {
            role: "assistant",
            content: chunkValue
          }
        ]);
      } else {
        setMessages((messages) => {
          const lastMessage = messages[messages.length - 1];
          const updatedMessage = {
            ...lastMessage,
            content: lastMessage.content + chunkValue
          };
          return [...messages.slice(0, -1), updatedMessage];
        });
      }
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: `Hi there! I'm Vidya AI, an AI assistant. I can help you with things like answering questions, providing information, and helping with tasks. How can I help you?`
      }
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Hi there! I'm Chatbot UI, an AI assistant. I can help you with things like answering questions, providing information, and helping with tasks. How can I help you?`
      }
    ]);
  }, []);

  return (
    <>
      <Head>
        <title>AI Map Chat</title>
        <meta
          name="description"
          content="Chat with Maps using AI"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>

      <div className="flex flex-col h-screen">
        <Navbar />

      <div className="max-w-[1200px] mx-auto mt-4 sm:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Map */}
  <MapPane onContextChange={setMapContext} />   {/* <-- pass callback */}



  {/* Chat */}
  <div className="flex flex-col">
    <Chat
      messages={messages}
      loading={loading}
      onSend={handleSend}
      onReset={handleReset}
    />
    <div ref={messagesEndRef} />
  </div>
</div>
        <Footer />
      </div>
    </>
  );
}
