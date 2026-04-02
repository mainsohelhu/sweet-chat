import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { getInitials, stringToColor } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';

export default function SuggestedFriendsWidget() {
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await api.get('/users/suggestions');
        if (res.data.success) {
          setSuggestions(res.data.suggestions || []);
        }
      } catch (err) {
        console.error('Failed to load suggestions', err);
      }
    };
    fetchSuggestions();
  }, []);

  const handleAddFriend = async (userId) => {
    try {
      await api.post(`/friends/request/${userId}`);
      toast.success('Friend Request sent!');
      setSuggestions(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      toast.error('Failed to send request');
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="py-4 border-b border-[var(--border)] overflow-hidden">
      <h3 className="px-4 text-sm font-bold text-[var(--text)] mb-3">Suggested Friends</h3>
      <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar pb-2">
        {suggestions.map((user) => (
          <div key={user._id} className="flex-shrink-0 w-36 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center">
            <div 
              className="w-16 h-16 rounded-full mt-2 mb-3 overflow-hidden flex items-center justify-center text-white text-lg font-bold"
              style={{ background: user.avatar ? undefined : stringToColor(user._id) }}
              onClick={() => navigate(`/profile/${user._id}`)}
            >
              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : getInitials(user.displayName)}
            </div>
            <p className="font-semibold text-sm text-[var(--text)] text-center truncate w-full cursor-pointer" onClick={() => navigate(`/profile/${user._id}`)}>
              {user.displayName}
            </p>
            <p className="text-xs text-[var(--text-muted)] text-center truncate w-full mb-3">
              @{user.username || user.displayName.toLowerCase().replace(/\s/g, '')}
            </p>
            <button 
              onClick={() => handleAddFriend(user._id)}
              className="mt-auto w-full py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
