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

  //30 sep attempting to save chats
  const [savedChats, setSavedChats] = useState<{
  id: string,
  title: string,
  messages: Message[],
  mapContext: string
}[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadChat = (id: string) => {
  const chat = savedChats.find(c => c.id === id);
  if (chat) {
    setMessages(chat.messages);
    setMapContext(chat.mapContext); // 👈 restore map
  }
};

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
    //console.log("Payload sent to API:", payload);

    //console.log("Payload JSON:", JSON.stringify({ messages: payload }, null, 2));

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
        content: `Reset Done! Hi there! I'm MapChats, an AI assistant that can help you chat with Maps`
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
        content: `Hi there! I'm MapChats, an AI assistant that can help you chat with Maps`
      }
    ]);
  }, []);

return (
  <>
    <Head>
      <title>AI Map Chat 111</title>
      <meta name="description" content="Chat with Maps using AI" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <Navbar onOpenSidebar={() => setSidebarOpen(true)} />

    <div className="flex">
      {/* Mobile overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: pinned on desktop, slides on mobile */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-white shadow-lg p-4 z-50
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          sm:translate-x-0 sm:static sm:block
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Saved Chats</h2>
        {savedChats.length === 0 ? (
          <p className="text-sm text-gray-500">No saved chats yet</p>
        ) : (
          <ul className="space-y-2">
            {savedChats.map((chat) => (
              <li key={chat.id}>
                <button
                  className="w-full text-left hover:bg-gray-200 p-2 rounded"
                  onClick={() => {
                    loadChat(chat.id);
                    setSidebarOpen(false);
                  }}
                >
                  {chat.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="flex flex-col lg:flex-row flex-1 mx-auto mt-4 sm:mt-12 gap-6 px-4 sm:px-8">
          {/* Map */}
          <div className="flex-[2]">
            <MapPane
  onContextChange={setMapContext}
  initialContext={mapContext}
/>
          </div>

          {/* Chat */}
          <div className="flex-[1] flex flex-col">
            <Chat
              messages={messages}
              loading={loading}
              onSend={handleSend}
              onReset={handleReset}
            />
            <button
  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
  onClick={() => {
    const id = Date.now().toString();
    const title = mapContext || `Chat ${savedChats.length + 1}`;
    setSavedChats([
      ...savedChats,
      { id, title, messages, mapContext },
    ]);
  }}
>
  Save Chat
</button>
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>
    </div>
  </>
);
}
