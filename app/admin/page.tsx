'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // New Announcement Form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Feedback Modal State for Verification
  const [feedbackModalUser, setFeedbackModalUser] = useState<any | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const fetchAdminData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (currentProfile?.is_admin) {
      setIsAdmin(true);

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('total_spent', { ascending: false });
      if (allProfiles) setProfiles(allProfiles);

      const { data: allAnnouncements } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (allAnnouncements) setAnnouncements(allAnnouncements);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Verification Actions (£250+ Whales)
  const handleApproveVIP = async (userId: string) => {
    await supabase
      .from('profiles')
      .update({ verification_status: 'approved', admin_feedback: '' })
      .eq('id', userId);
    fetchAdminData();
  };

  const handleRejectVIP = async () => {
    if (!feedbackModalUser || !feedbackText.trim()) return;
    await supabase
      .from('profiles')
      .update({
        verification_status: 'rejected',
        admin_feedback: feedbackText.trim()
      })
      .eq('id', feedbackModalUser.id);
    
    setFeedbackModalUser(null);
    setFeedbackText('');
    fetchAdminData();
  };

  // Announcement Actions
  const handleCreateAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      setStatusMsg('❌ Title and Content are required.');
      return;
    }
    setPosting(true);
    setStatusMsg('');
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          title: newTitle.trim(),
          content: newContent.trim(),
          is_active: true
        }]);

      if (error) throw error;
      setNewTitle('');
      setNewContent('');
      setStatusMsg('✅ Announcement posted to feed!');
      fetchAdminData();
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setPosting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('announcements')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchAdminData();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement permanently?')) return;
    await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    fetchAdminData();
  };

  // Moderation Actions
  const handleWipeContent = async (userId: string, name: string) => {
    if (!confirm(`Wipe bio and links for "${name}"?`)) return;
    await supabase
      .from('profiles')
      .update({
        approved_bio: '[Content removed by Admin]',
        approved_url: '',
        flex_links: [],
      })
      .eq('id', userId);
    fetchAdminData();
  };

  const handleResetSpend = async (userId: string, name: string) => {
    if (!confirm(`Reset spend to £0.00 for "${name}"? This removes them from the board.`)) return;
    await supabase
      .from('profiles')
      .update({ total_spent: 0 })
      .eq('id', userId);
    fetchAdminData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center font-sans font-bold">
        Checking admin privileges...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <h1 className="text-4xl font-black text-red-500 mb-4">🛑 ACCESS DENIED</h1>
        <p className="text-gray-400 mb-8 text-lg">You do not have permission to view the moderation dashboard.</p>
        <Link href="/" className="glass bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105">
          ← Return to Leaderboard
        </Link>
      </div>
    );
  }

  // Filter whales spending >= £250 (25000 pence)
  const vipWhales = profiles.filter((p) => (p.total_spent || 0) >= 25000);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-6 md:p-10 font-sans relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="flex justify-between items-center mb-12 pb-8 border-b border-white/10">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-400 tracking-tight">🛡️ ADMIN COMMAND CENTER</h1>
            <p className="text-sm text-gray-400 font-bold mt-2">Logged in as Dumbunlucki • VIP Verification & Moderation</p>
          </div>
          <Link href="/" className="glass bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-all duration-300 hover:scale-105">
            ← Back to App
          </Link>
        </header>

        {/* SECTION 1: VIP VERIFICATION QUEUE (£250+) */}
        <section className="glass-strong bg-yellow-500/5 border-yellow-500/30 p-8 rounded-3xl mb-12 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-yellow-400">⚖️ VIP Verification Queue (£250+ Whales)</h2>
              <p className="text-sm text-gray-400 mt-1">Review and verify links for high-spending members.</p>
            </div>
            <span className="text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-black px-4 py-2 rounded-full">
              {vipWhales.length} VIP Users
            </span>
          </div>

          <div className="space-y-4">
            {vipWhales.length === 0 ? (
              <p className="text-base text-gray-500 py-8 text-center glass bg-black/30 border border-white/10 rounded-2xl">No users have reached the £250 threshold yet.</p>
            ) : (
              vipWhales.map((p) => {
                const spentGBP = ((p.total_spent || 0) / 100).toFixed(2);
                const isPending = p.verification_status === 'pending';
                const isRejected = p.verification_status === 'rejected';

                return (
                  <div key={p.id} className="glass bg-black/30 border border-white/10 p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <img
                        src={p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.display_name}`}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full bg-gray-800 object-cover border border-white/20 shadow-lg"
                      />
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-white text-lg">{p.display_name}</span>
                          <span className="text-sm font-bold text-emerald-400">£{spentGBP}</span>
                        </div>
                        <p className="text-sm text-gray-400 truncate max-w-sm mt-1">"{p.approved_bio || 'No bio'}"</p>
                        <div className="flex gap-2 mt-2">
                          {(p.flex_links || []).map((link: string, idx: number) => (
                            <span key={idx} className="text-xs bg-white/5 text-cyan-400 px-2 py-1 rounded-lg border border-white/10 truncate max-w-[150px]">
                              {link}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-black px-3 py-1.5 rounded-lg border ${
                        p.verification_status === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : isRejected 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {p.verification_status?.toUpperCase() || 'APPROVED'}
                      </span>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproveVIP(p.id)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-sm font-black px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setFeedbackModalUser(p);
                            setFeedbackText(p.admin_feedback || '');
                          }}
                          className="glass bg-white/5 hover:bg-white/10 text-yellow-400 border border-white/10 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105"
                        >
                          Request Changes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* SECTION 2: POST NEW ANNOUNCEMENT */}
        <section className="glass-strong bg-white/5 border-white/10 p-8 rounded-3xl mb-12 shadow-2xl">
          <h2 className="text-2xl font-black mb-6">📢 Post New Announcement</h2>
          
          {statusMsg && (
            <div className="text-sm font-bold mb-6 p-4 rounded-2xl glass bg-black/30 border border-white/10">
              {statusMsg}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (e.g. 👑 Season 1 Rewards Released!)"
              className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white text-base focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 font-bold transition-all duration-300"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Detailed announcement content..."
              className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white text-base focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 h-28 resize-none transition-all duration-300"
            />
            <button
              onClick={handleCreateAnnouncement}
              disabled={posting}
              className="bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-black px-8 py-4 rounded-2xl text-base transition-all duration-300 disabled:opacity-50 hover:scale-105 shadow-lg"
            >
              {posting ? 'Posting...' : 'Publish Announcement'}
            </button>
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Past & Current Announcements ({announcements.length})</h3>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="glass bg-black/30 border border-white/10 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-white/20 transition-all duration-300">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-base">{a.title}</span>
                      <span className={`text-xs font-black px-3 py-1 rounded-lg ${a.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                        {a.is_active ? 'ACTIVE BANNER' : 'ARCHIVED'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">{a.content}</p>
                    <span className="text-xs text-gray-600 block mt-2">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => handleToggleActive(a.id, a.is_active)}
                      className="glass bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      {a.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="glass bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: GENERAL USER MODERATION TABLE */}
        <section className="glass-strong bg-white/5 border-white/10 p-8 rounded-3xl shadow-2xl overflow-hidden">
          <h2 className="text-2xl font-black mb-6">👥 User Moderation Table ({profiles.length})</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-4">User</th>
                  <th className="py-4 px-4">Spent</th>
                  <th className="py-4 px-4">Bio / Links</th>
                  <th className="py-4 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {profiles.map((p) => {
                  const links = (p.flex_links && p.flex_links.length > 0) ? p.flex_links : (p.approved_url ? [p.approved_url] : []);
                  const spentGBP = ((p.total_spent || 0) / 100).toFixed(2);

                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition">
                      <td className="py-4 px-4 font-bold">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.display_name}`}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full bg-gray-800 object-cover border border-white/20 shadow-lg"
                          />
                          <div>
                            <span className="block text-white text-base">{p.display_name}</span>
                            {p.is_admin && <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-1 rounded-lg font-black">ADMIN</span>}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-black text-emerald-400 text-base">
                        £{spentGBP}
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-sm text-gray-300 italic truncate mb-2">"{p.approved_bio || 'No bio'}"</p>
                        <div className="flex gap-2 flex-wrap">
                          {links.map((url: string, i: number) => (
                            <span key={i} className="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded-lg border border-white/10 truncate max-w-[120px]">
                              {url}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleWipeContent(p.id, p.display_name)}
                            className="glass bg-white/5 hover:bg-white/10 text-yellow-400 border border-white/10 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105"
                          >
                            Wipe Bio/Links
                          </button>
                          <button
                            onClick={() => handleResetSpend(p.id, p.display_name)}
                            className="glass bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105"
                          >
                            Reset £0
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* FEEDBACK MODAL (REQUEST CHANGES) */}
      {feedbackModalUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-2xl font-black text-white mb-3">Request VIP Link Changes</h3>
            <p className="text-sm text-gray-400 mb-6">
              Tell <strong className="text-white">{feedbackModalUser.display_name}</strong> what they need to fix to get their £250+ links verified.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Link #2 is broken, or please remove the shortened URL."
              className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 h-28 resize-none mb-6 transition-all duration-300"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setFeedbackModalUser(null)}
                className="glass bg-white/5 hover:bg-white/10 text-gray-300 font-bold px-6 py-3 rounded-2xl text-sm transition-all duration-300 hover:scale-105"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectVIP}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-950 font-black px-6 py-3 rounded-2xl text-sm transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Send Feedback & Require Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}