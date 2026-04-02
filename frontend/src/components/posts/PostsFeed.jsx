import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import StoriesBar from '../stories/StoriesBar';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import SuggestedFriendsWidget from '../friends/SuggestedFriendsWidget';

export default function PostsFeed() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('feed'); // 'feed' | 'create'

  const loadPosts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/posts/feed?page=${p}`);
      if (p === 1) setPosts(res.data.posts || []);
      else setPosts(prev => [...prev, ...(res.data.posts || [])]);
      setHasMore(res.data.hasMore);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(1); }, [loadPosts]);

  const handleCreated = (post) => {
    setPosts(prev => [post, ...prev]);
    setView('feed');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-[var(--text)]">
          {view === 'create' ? 'Create Post' : 'Feed'}
        </h1>
        {view === 'feed' ? (
          <button onClick={() => setView('create')}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </button>
        ) : (
          <button onClick={() => setView('feed')}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] text-sm px-3 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === 'create' ? (
          /* ── Create Post Section ── */
          <div className="px-4 pt-2 pb-20 sm:pb-4">
            <CreatePost onCreated={handleCreated} />
          </div>
        ) : (
          /* ── Feed Section ── */
          <>
            {/* Stories bar at top of feed */}
            <StoriesBar />

            {/* Suggested Friends */}
            {!loading && page === 1 && (
              <SuggestedFriendsWidget />
            )}

            <div className="px-4 pt-4 pb-20 sm:pb-4">
              {posts.length === 0 && !loading && (
                <div className="text-center py-16 text-[var(--text-muted)]">
                  <div className="text-5xl mb-4">📝</div>
                  <p className="font-semibold text-[var(--text)]">No posts yet</p>
                  <p className="text-sm mt-1">Share something or add some friends!</p>
                  <button onClick={() => setView('create')} className="mt-4 btn-primary px-6 py-2 text-sm">
                    Create First Post
                  </button>
                </div>
              )}

              {posts.map(post => (
                <PostCard key={post._id} post={post}
                  onDelete={(id) => setPosts(prev => prev.filter(p => p._id !== id))} />
              ))}

              {hasMore && (
                <button onClick={() => { const next = page + 1; setPage(next); loadPosts(next); }}
                  disabled={loading}
                  className="w-full py-3 text-sm text-brand-500 font-medium flex items-center justify-center gap-2">
                  {loading && <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />}
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              )}

              {loading && posts.length === 0 && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 animate-pulse">
                      <div className="flex gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-[var(--surface-2)] rounded-full w-1/3" />
                          <div className="h-2 bg-[var(--surface-2)] rounded-full w-1/4" />
                        </div>
                      </div>
                      <div className="h-48 bg-[var(--surface-2)] rounded-xl" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}