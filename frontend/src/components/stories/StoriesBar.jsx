import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { getInitials, stringToColor } from '../../utils/helpers';
import StoryViewer from './StoryViewer';
import CreateStory from './CreateStory';


export default function StoriesBar() {
  const [groups, setGroups] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [creating, setCreating] = useState(false);
  const user = useAuthStore((s) => s.user);

  const loadStories = async () => {
    try {
      const res = await api.get('/stories');
      setGroups(res.data.stories || []);
    } catch (_) {}
  };

  useEffect(() => { loadStories(); }, []);

  const myGroup = groups.find(g => g.user._id === user?._id);
  const otherGroups = groups.filter(g => g.user._id !== user?._id);
  const allGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups;

  return (
    <>
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>

          {/* My story */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div style={{ position: 'relative', width: 62, height: 62 }}>
              {/* Ring */}
              <div
                onClick={() => myGroup ? setViewing({ groupIndex: 0, groups: allGroups }) : setCreating(true)}
                style={{
                  width: 62, height: 62,
                  borderRadius: 18,
                  border: `2.5px solid ${myGroup ? '#6366f1' : 'var(--border)'}`,
                  padding: 2,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '100%', height: '100%',
                  borderRadius: 13,
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: user?.avatar ? undefined : stringToColor(user?._id || ''),
                  color: 'white', fontWeight: 'bold', fontSize: 14,
                }}>
                  {user?.avatar
                    ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(user?.displayName || '')}
                </div>
              </div>
              {/* + button */}
              <button
                onClick={(e) => { e.stopPropagation(); setCreating(true); }}
                style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 20, height: 20,
                  borderRadius: '50%',
                  background: '#4f46e5',
                  border: '2px solid var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 10,
                }}
              >
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 62, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {myGroup ? 'My Story' : 'Add Story'}
            </span>
          </div>

          {/* Friends' stories */}
          {otherGroups.map((group) => {
            const allViewed = group.stories.every(s => s.viewed);
            return (
              <div key={group.user._id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  onClick={() => setViewing({ groupIndex: allGroups.indexOf(group), groups: allGroups })}
                  style={{
                    width: 62, height: 62,
                    borderRadius: 18,
                    border: `2.5px solid ${allViewed ? 'var(--border)' : '#6366f1'}`,
                    padding: 2,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: '100%', height: '100%',
                    borderRadius: 13,
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: group.user.avatar ? undefined : stringToColor(group.user._id),
                    color: 'white', fontWeight: 'bold', fontSize: 14,
                  }}>
                    {group.user.avatar
                      ? <img src={group.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(group.user.displayName)}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: allViewed ? 'var(--text-muted)' : 'var(--text)', width: 62, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {group.user.displayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {viewing && <StoryViewer {...viewing} onClose={() => { setViewing(null); loadStories(); }} />}
      {creating && <CreateStory onClose={() => { setCreating(false); loadStories(); }} />}
    </>
  );
}