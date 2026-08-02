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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans font-bold">
        Checking admin privileges...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <h1 className="text-3xl font-black text-red-500 mb-2">🛑 ACCESS DENIED</h1>
        <p className="text-gray-400 mb-6">You do not have permission to view the moderation dashboard.</p>
        <Link href="/" className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-xl transition">
          ← Return to Leaderboard
        </Link>
      </div>
    );
  }

  // Filter whales spending >= £250 (25000 pence)
  const vipWhales = profiles.filter((p) => (p.total_spent || 0) >= 25000);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-gray-800">
          <div>
            <h1 className="text-3xl font-black text-red-500 tracking-tight">🛡️ ADMIN COMMAND CENTER</h1>
            <p className="text-xs text-gray-400 font-bold mt-1">Logged in as Dumbunlucki • VIP Verification & Moderation</p>
          </div>
          <Link href="/" className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
            ← Back to App
          </Link>
        </header>

        {/* SECTION 1: VIP VERIFICATION QUEUE (£250+) */}
        <section className="bg-gray-900 border border-yellow-500/30 p-6 rounded-2xl mb-10 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-black text-yellow-400">⚖️ VIP Verification Queue (£250+ Whales)</h2>
              <p className="text-xs text-gray-400">Review and verify links for high-spending members.</p>
            </div>
            <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-black px-3 py-1 rounded-full">
              {vipWhales.length} VIP Users
            </span>
          </div>

          <div className="space-y-3">
            {vipWhales.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No users have reached the £250 threshold yet.</p>
            ) : (
              vipWhales.map((p) => {
                const spentGBP = ((p.total_spent || 0) / 100).toFixed(2);
                const isPending = p.verification_status === 'pending';
                const isRejected = p.verification_status === 'rejected';

                return (
                  <div key={p.id} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.display_name}`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full bg-gray-800 object-cover border border-gray-700"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white">{p.display_name}</span>
                          <span className="text-xs font-bold text-green-400">£{spentGBP}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate max-w-sm">"{p.approved_bio || 'No bio'}"</p>
                        <div className="flex gap-1 mt-1">
                          {(p.flex_links || []).map((link: string, idx: number) => (
                            <span key={idx} className="text-[10px] bg-gray-800 text-cyan-400 px-1.5 py-0.5 rounded border border-gray-700 truncate max-w-[150px]">
                              {link}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black px-2.5 py-1 rounded border ${
                        p.verification_status === 'approved' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                          : isRejected 
                          ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {p.verification_status?.toUpperCase() || 'APPROVED'}
                      </span>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveVIP(p.id)}
                          className="bg-green-500 hover:bg-green-400 text-gray-950 text-xs font-black px-3 py-1.5 rounded-lg transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setFeedbackModalUser(p);
                            setFeedbackText(p.admin_feedback || '');
                          }}
                          className="bg-gray-800 hover:bg-gray-700 text-yellow-400 border border-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"
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
        <section className="bg-gray-900 border border-gray-800 p-6 rounded-2xl mb-10 shadow-xl">
          <h2 className="text-lg font-black mb-4">📢 Post New Announcement</h2>
          
          {statusMsg && (
            <div className="text-xs font-bold mb-4 p-3 rounded-xl bg-gray-950 border border-gray-800">
              {statusMsg}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (e.g. 👑 Season 1 Rewards Released!)"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500 font-bold"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Detailed announcement content..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500 h-20 resize-none"
            />
            <button
              onClick={handleCreateAnnouncement}
              disabled={posting}
              className="bg-red-600 hover:bg-red-500 text-white font-black px-6 py-3 rounded-xl text-sm transition disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Publish Announcement'}
            </button>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Past & Current Announcements ({announcements.length})</h3>
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{a.title}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${a.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-gray-800 text-gray-500'}`}>
                        {a.is_active ? 'ACTIVE BANNER' : 'ARCHIVED'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{a.content}</p>
                    <span className="text-[10px] text-gray-600 block mt-1">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(a.id, a.is_active)}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      {a.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-1.5 rounded-lg transition"
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
        <section className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl overflow-hidden">
          <h2 className="text-lg font-black mb-4">👥 User Moderation Table ({profiles.length})</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Spent</th>
                  <th className="py-3 px-4">Bio / Links</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-sm">
                {profiles.map((p) => {
                  const links = (p.flex_links && p.flex_links.length > 0) ? p.flex_links : (p.approved_url ? [p.approved_url] : []);
                  const spentGBP = ((p.total_spent || 0) / 100).toFixed(2);

                  return (
                    <tr key={p.id} className="hover:bg-gray-950/40 transition">
                      <td className="py-4 px-4 font-bold">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.display_name}`}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full bg-gray-800 object-cover border border-gray-700"
                          />
                          <div>
                            <span className="block text-white">{p.display_name}</span>
                            {p.is_admin && <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-black">ADMIN</span>}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-black text-green-400">
                        £{spentGBP}
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-xs text-gray-300 italic truncate mb-1">"{p.approved_bio || 'No bio'}"</p>
                        <div className="flex gap-1 flex-wrap">
                          {links.map((url: string, i: number) => (
                            <span key={i} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 truncate max-w-[120px]">
                              {url}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleWipeContent(p.id, p.display_name)}
                            className="bg-gray-800 hover:bg-gray-700 text-yellow-400 border border-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            Wipe Bio/Links
                          </button>
                          <button
                            onClick={() => handleResetSpend(p.id, p.display_name)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-1.5 rounded-lg transition"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-2">Request VIP Link Changes</h3>
            <p className="text-xs text-gray-400 mb-4">
              Tell <strong className="text-white">{feedbackModalUser.display_name}</strong> what they need to fix to get their £250+ links verified.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Link #2 is broken, or please remove the shortened URL."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-yellow-400 h-24 resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFeedbackModalUser(null)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectVIP}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black px-5 py-2 rounded-xl text-xs"
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