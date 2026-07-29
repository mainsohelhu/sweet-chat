import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import useChatStore from '../store/chatStore';
import useSocket from '../hooks/useSocket';
import Sidebar from '../components/layout/Sidebar';
import MobileNav from '../components/layout/MobileNav';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import EmptyState from '../components/chat/EmptyState';
import ProfilePanel from '../components/layout/ProfilePanel';
import ContactsPanel from '../components/contacts/ContactsPanel';
import FriendsPanel from '../components/friends/FriendsPanel';
import NotificationsPanel from '../components/notifications/NotificationsPanel';
import PostsFeed from '../components/posts/PostsFeed';
import CallManager from '../components/calls/CallManager';
import IncomingCallModal from '../components/calls/IncomingCallModal';

import StarredMessagesPanel from '../components/chat/StarredMessagesPanel';

export default function ChatPage() {
  const socketRef = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [panel, setPanel] = useState('chats');

  // Reactive — updates every time URL changes
  const isChatOpen = location.pathname.startsWith('/chat/');

  useEffect(() => {
    useChatStore.getState().fetchChats();
  }, []);

  const handleChatSelect = (chat) => {
    if (!chat?._id) return;
    useChatStore.getState().setActiveChat(chat);
    navigate(`/chat/${chat._id}`);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="h-[100dvh] flex bg-transparent overflow-hidden">

      {/* Desktop sidebar — only on large screens */}
      <div className="hidden lg:flex">
        <Sidebar active={panel} onChange={setPanel} />
      </div>

      {/* Left panel */}
      <div className={`
        flex-col border-r border-[var(--border)] glass z-10 shadow-lg
        w-full lg:w-80 xl:w-96 flex-shrink-0
        ${isChatOpen ? 'hidden lg:flex' : 'flex'}
      `}>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-16 lg:pb-0">
          {panel === 'chats'    && <><ChatList onSelect={handleChatSelect} /></>}
          {panel === 'feed'          && <PostsFeed />}
          {panel === 'notifications'  && <NotificationsPanel />}
          {panel === 'friends'  && <FriendsPanel />}
          {panel === 'contacts' && <ContactsPanel onSelect={handleChatSelect} />}
          {panel === 'profile'  && <ProfilePanel />}
          {panel === 'starred'  && <StarredMessagesPanel />}
        </div>
      </div>

      {/* Chat area */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${isChatOpen ? 'flex' : 'hidden lg:flex'}
      `}>
        <Routes>
          <Route path="/" element={<EmptyState />} />
          <Route path="/chat/:chatId" element={
            <ChatWindow onBack={handleBack} socketRef={socketRef} />
          } />
        </Routes>
      </div>

      {/* Mobile + tablet bottom nav */}
      {!isChatOpen && (
        <MobileNav active={panel} onChange={setPanel} showList={true} />
      )}

      <CallManager socketRef={socketRef} />
      <IncomingCallModal />
    </div>
  );
}