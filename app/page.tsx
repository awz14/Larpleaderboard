'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const BAD_WORDS = ['admin', 'mod', 'support', 'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'faggot', 'retard'];

const ACCESSORIES_CATALOG = {
  titles: [
    { id: 'title_rookie', name: 'ROOKIE', threshold: 0, style: 'text-gray-400 bg-gray-900 border-gray-800 font-semibold tracking-wider text-[9px]' },
    { id: 'title_verified', name: 'VERIFIED', threshold: 5000, style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-bold tracking-wider text-[9px]' },
    { id: 'title_roller', name: 'HIGH ROLLER', threshold: 10000, style: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 font-bold tracking-wider text-[9px]' },
    { id: 'title_master', name: 'FLEX MASTER', threshold: 25000, style: 'text-purple-400 bg-purple-500/10 border-purple-500/20 font-bold tracking-wider text-[9px]' },
    { id: 'title_pro', name: 'PRO LARPER', threshold: 50000, style: 'text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold tracking-wider text-[9px]' },
    { id: 'title_illuminati', name: 'ILLUMINATI', threshold: 100000, style: 'text-rose-400 bg-rose-500/10 border-rose-500/20 font-extrabold tracking-wider text-[9px]' },
  ],
  borders: [
    { id: 'border_standard', name: 'Classic Dark', threshold: 0, style: 'border-gray-800/80 bg-gray-900/60 backdrop-blur' },
    { id: 'border_emerald', name: 'Emerald Glow', threshold: 5000, style: 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)] bg-gradient-to-r from-gray-900 via-gray-900 to-emerald-950/20' },
    { id: 'border_blue', name: 'Electric Cyan', threshold: 15000, style: 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.1)] bg-gradient-to-r from-gray-900 via-gray-900 to-cyan-950/20' },
    { id: 'border_gold', name: 'Solar Gold', threshold: 50000, style: 'border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.15)] bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/20' },
  ],
};

export default function Leaderboard() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [amount, setAmount] = useState('50'); 
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userSpent, setUserSpent] = useState(0);

  // Identity Tracking
  const [hasDiscordLinked, setHasDiscordLinked] = useState(false);
  const [discordTag, setDiscordTag] = useState('');

  // Admin & Announcements States
  const [isAdmin, setIsAdmin] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeBanner, setActiveBanner] = useState<any | null>(null);

  // Modal States
  const [isEditing, setIsEditing] = useState(false);
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);

  // Edit Profile Form
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLinks, setEditLinks] = useState<string[]>(['']);
  const [editShowDiscord, setEditShowDiscord] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // Equipped Accessories
  const [equippedTitleId, setEquippedTitleId] = useState('title_rookie');
  const [equippedBorderId, setEquippedBorderId] = useState('border_standard');

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .gt('total_spent', 0)
      .order('total_spent', { ascending: false })
      .limit(100);
    
    if (data) setProfiles(data);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setAnnouncements(data);
      const active = data.find(a => a.is_active);
      setActiveBanner(active || null);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchAnnouncements();

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const discordIdentity = currentUser.identities?.find((id: any) => id.provider === 'discord');
        const isDiscordLinked = !!discordIdentity;
        setHasDiscordLinked(isDiscordLinked);

        let dTag = '';
        if (isDiscordLinked && discordIdentity?.identity_data) {
          dTag = discordIdentity.identity_data.full_name || discordIdentity.identity_data.name || currentUser.user_metadata?.full_name || 'DiscordUser';
          setDiscordTag(dTag);
        }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
          
        if (data) {
          setUserProfile(data);
          setUserSpent(data.total_spent || 0);
          if (data.equipped_title) setEquippedTitleId(data.equipped_title);
          if (data.equipped_border) setEquippedBorderId(data.equipped_border);
          setIsAdmin(data.is_admin || false);
          if (data.discord_tag) setDiscordTag(data.discord_tag);
        } else if (isDiscordLinked && dTag) {
          await supabase.from('profiles').upsert({ id: currentUser.id, discord_tag: dTag });
        }
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (currentUser) {
          const discordIdentity = currentUser.identities?.find((id: any) => id.provider === 'discord');
          setHasDiscordLinked(!!discordIdentity);
          if (discordIdentity?.identity_data) {
            setDiscordTag(discordIdentity.identity_data.full_name || discordIdentity.identity_data.name || 'DiscordUser');
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleOAuthLogin = async (providerName: 'google' | 'discord') => {
    await supabase.auth.signInWithOAuth({
      provider: providerName,
      options: { redirectTo: window.location.origin },
    });
  };

  const handleLinkDiscord = async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'discord',
      options: { redirectTo: window.location.origin },
    });
    if (error) alert(`Could not link Discord: ${error.message}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setIsAdmin(false);
    setHasDiscordLinked(false);
  };

  const openEditModal = async () => {
    setSaveError('');
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setEditName(data.display_name || user.user_metadata?.full_name || 'Larper');
      setEditAvatar(data.avatar_url || user.user_metadata?.avatar_url || '');
      setEditBio(data.approved_bio || '');
      const links = (data.flex_links && data.flex_links.length > 0) ? data.flex_links : (data.approved_url ? [data.approved_url] : ['']);
      setEditLinks(links);
      setEditShowDiscord(data.show_discord || false);
      if (data.discord_tag) setDiscordTag(data.discord_tag);
      setUserSpent(data.total_spent || 0);
      if (data.equipped_title) setEquippedTitleId(data.equipped_title);
      if (data.equipped_border) setEquippedBorderId(data.equipped_border);
    } else {
      setEditName(user.user_metadata?.full_name || 'Larper');
      setEditAvatar(user.user_metadata?.avatar_url || '');
      setEditBio('');
      setEditLinks(['']);
      setEditShowDiscord(false);
    }
    setIsEditing(true);
  };

  const handleEquipAccessory = async (type: 'title' | 'border', id: string) => {
    if (!user) return;
    
    const updateData = type === 'title' ? { equipped_title: id } : { equipped_border: id };
    if (type === 'title') setEquippedTitleId(id);
    if (type === 'border') setEquippedBorderId(id);

    await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    fetchLeaderboard();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}-${Date.now()}.${fileExt}`;

    setUploadingImage(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditAvatar(publicUrl);
    } catch (err: any) {
      setSaveError(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLinkChange = (index: number, val: string) => {
    const updated = [...editLinks];
    updated[index] = val;
    setEditLinks(updated);
  };

  const addLinkField = () => {
    if (editLinks.length < 5) setEditLinks([...editLinks, '']);
  };

  const removeLinkField = (index: number) => {
    const updated = editLinks.filter((_, i) => i !== index);
    setEditLinks(updated.length > 0 ? updated : ['']);
  };

  const handleSaveProfile = async () => {
    setSaveError('');
    const cleanName = editName.trim();

    if (!cleanName) {
      setSaveError('Username cannot be empty.');
      return;
    }

    const containsBadWord = BAD_WORDS.some(word => 
      cleanName.toLowerCase().includes(word)
    );
    if (containsBadWord) {
      setSaveError('That username is not allowed. Keep it clean!');
      return;
    }

    setSaving(true);
    try {
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id')
        .ilike('display_name', cleanName)
        .neq('id', user.id);

      if (existingUsers && existingUsers.length > 0) {
        setSaveError('That username is already taken by another Larper!');
        setSaving(false);
        return;
      }

      const cleanLinks = editLinks
        .map(link => link.trim())
        .filter(link => link !== '');

      const newStatus = userSpent >= 25000 ? 'pending' : 'approved';

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: cleanName,
        avatar_url: editAvatar.trim(),
        approved_bio: editBio.trim(),
        approved_url: cleanLinks[0] || '',
        flex_links: cleanLinks,
        discord_tag: discordTag,
        show_discord: editShowDiscord,
        verification_status: newStatus,
        admin_feedback: '',
      });

      if (error) throw error;

      setIsEditing(false);
      setUserProfile((prev: any) => ({
        ...prev,
        discord_tag: discordTag,
        show_discord: editShowDiscord,
        verification_status: newStatus,
        admin_feedback: ''
      }));
      fetchLeaderboard();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      alert('Please sign in first so we can attach the spot to your profile!');
      return;
    }

    setLoading(true);
    try {
      const amountInCents = parseInt(amount) * 100;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInCents, userId: user.id }),
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAmount = (val: number) => {
    const current = parseInt(amount) || 0;
    setAmount((current + val).toString());
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-12 font-sans selection:bg-green-500 selection:text-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      
      {/* ACTIVE ANNOUNCEMENT BANNER */}
      {activeBanner && (
        <div 
          onClick={() => setIsNewsOpen(true)}
          className="max-w-3xl mx-auto mb-6 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-xl text-center text-xs md:text-sm font-semibold text-emerald-300 cursor-pointer hover:border-emerald-500/50 transition shadow-lg backdrop-blur"
        >
          <span className="font-bold text-emerald-400 uppercase tracking-wider mr-2">[ ANNOUNCEMENT ]</span>
          <span className="underline">{activeBanner.title}</span> — {activeBanner.content} <span className="text-[11px] opacity-75 font-normal">(Click for news history)</span>
        </div>
      )}

      {/* USER VIP VERIFICATION STATUS BANNER (£250+) */}
      {userProfile && userSpent >= 25000 && (
        <div className="max-w-3xl mx-auto mb-6">
          {userProfile.verification_status === 'pending' && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3.5 rounded-xl text-center text-xs font-semibold shadow-md">
              Your £250+ VIP account links are currently pending Admin verification.
            </div>
          )}
          {userProfile.verification_status === 'rejected' && (
            <div 
              onClick={openEditModal}
              className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-center text-xs font-semibold cursor-pointer hover:bg-rose-500/20 transition shadow-md"
            >
              Action Required on VIP Links: {userProfile.admin_feedback || 'Please update your links.'} <span className="underline font-bold">(Click here to edit & resubmit)</span>
            </div>
          )}
          {userProfile.verification_status === 'approved' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-center text-xs font-medium shadow-md">
              VIP £250+ Account & Links Fully Verified
            </div>
          )}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        
        {/* TOP NAVBAR */}
        <header className="flex justify-between items-center mb-12 pb-6 border-b border-gray-800/80">
          <div className="text-xl font-black tracking-widest text-green-400">
            LARP<span className="text-white">BOARD</span>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-2 md:gap-3 bg-gray-900/90 border border-gray-800 px-3.5 py-1.5 rounded-full shadow-xl backdrop-blur">
                <img 
                  src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} 
                  alt="Avatar" 
                  className="w-7 h-7 rounded-full object-cover border border-gray-700"
                />
                <span className="text-xs md:text-sm font-semibold text-gray-200 hidden sm:inline">
                  {user.user_metadata?.full_name || user.email}
                </span>

                {isAdmin && (
                  <a 
                    href="/admin"
                    className="text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full border border-rose-500/30 transition font-bold tracking-wide"
                  >
                    Admin
                  </a>
                )}

                <button 
                  onClick={() => setIsNewsOpen(true)}
                  className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full border border-gray-700 transition font-medium"
                >
                  News
                </button>
                
                <button 
                  onClick={() => setIsLockerOpen(true)}
                  className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 transition font-bold"
                >
                  Accessories
                </button>

                <button 
                  onClick={openEditModal}
                  className="text-[11px] bg-gray-800 hover:bg-gray-700 text-green-400 px-3 py-1 rounded-full border border-gray-700 transition font-bold"
                >
                  Edit Profile
                </button>

                <button 
                  onClick={handleSignOut}
                  className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-3 py-1 rounded-full transition font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleOAuthLogin('google')}
                  className="bg-white hover:bg-gray-200 text-gray-950 font-bold text-xs px-4 py-2 rounded-full transition shadow-md"
                >
                  Google
                </button>
                <button 
                  onClick={() => handleOAuthLogin('discord')}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs px-4 py-2 rounded-full transition shadow-md"
                >
                  Discord
                </button>
              </div>
            )}
          </div>
        </header>

        {/* HERO TITLE */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-black mb-3 text-green-400 uppercase tracking-tight">
            LarpLeaderboard
          </h1>
          <p className="text-sm md:text-base text-gray-400 font-medium">Buy your spot. Flex your link.</p>
        </div>
        
        {/* CHECKOUT SECTION */}
        <div className="bg-gray-900/60 border border-gray-800/80 p-6 md:p-8 rounded-2xl mb-12 flex flex-col items-center shadow-2xl backdrop-blur">
          <h2 className="text-lg font-bold mb-4 text-gray-200">Claim Your Spot</h2>
          
          <div className="flex gap-3 w-full max-w-sm mb-4">
            <div className="relative w-full">
              <span className="absolute left-4 top-3.5 text-gray-400 font-bold">£</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl py-3 pl-8 pr-4 font-bold focus:outline-none focus:border-green-400 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="1"
              />
            </div>
            <button 
              onClick={handleCheckout}
              disabled={loading}
              className="bg-green-500 hover:bg-green-400 text-gray-950 font-extrabold px-6 py-3 rounded-xl transition shadow-lg whitespace-nowrap disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Pay Now'}
            </button>
          </div>

          <div className="flex gap-2 text-xs font-bold flex-wrap justify-center">
            <button onClick={() => addAmount(10)} className="bg-gray-800/80 hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700/60 transition text-gray-300">
              +£10
            </button>
            <button onClick={() => addAmount(50)} className="bg-gray-800/80 hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700/60 transition text-gray-300">
              +£50
            </button>
            <button onClick={() => addAmount(100)} className="bg-gray-800/80 hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700/60 transition text-gray-300">
              +£100
            </button>
            <button onClick={() => addAmount(500)} className="bg-gray-800/80 hover:bg-gray-800 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/30 transition">
              +£500 WHALE
            </button>
          </div>
        </div>

        {/* THE LEADERBOARD */}
        <div className="flex flex-col gap-3">
          {profiles.length === 0 ? (
            <div className="text-center text-gray-500 font-semibold p-12 border border-dashed border-gray-800 rounded-2xl bg-gray-900/20">
              No one is on the board yet. Be the first.
            </div>
          ) : (
            profiles.map((profile, index) => {
              const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.display_name || 'anon')}`;
              
              const currentTitle = ACCESSORIES_CATALOG.titles.find(t => t.id === profile.equipped_title) || ACCESSORIES_CATALOG.titles[0];
              const currentBorder = ACCESSORIES_CATALOG.borders.find(b => b.id === profile.equipped_border) || ACCESSORIES_CATALOG.borders[0];

              return (
                <div 
                  key={profile.id} 
                  onClick={() => setSelectedProfile(profile)}
                  className={`p-4 rounded-xl border flex justify-between items-center transition-all cursor-pointer group hover:border-gray-600 ${currentBorder.style}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xl md:text-2xl font-black w-8 text-center ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                      #{index + 1}
                    </span>
                    
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700 object-cover shadow-md"
                    />

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base md:text-lg font-bold text-gray-100 group-hover:text-green-400 transition-colors">
                          {profile.is_anonymous ? 'Anonymous' : profile.display_name}
                        </h2>
                        <span className={`px-2 py-0.5 rounded border uppercase tracking-wider ${currentTitle.style}`}>
                          {currentTitle.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 font-normal">
                        {profile.approved_bio || 'No bio set yet.'}
                      </p>
                    </div>
                  </div>

                  <span className="text-lg md:text-xl font-black text-white tracking-tight">
                    £{((profile.total_spent || 0) / 100).toFixed(2)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ANNOUNCEMENT NEWS FEED MODAL */}
      {isNewsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Announcements Feed</h3>
                <p className="text-xs text-gray-400 font-medium">Past and current updates from administration.</p>
              </div>
              <button onClick={() => setIsNewsOpen(false)} className="text-gray-400 hover:text-white font-bold p-1">✕</button>
            </div>

            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-6">No announcements posted yet.</div>
              ) : (
                announcements.map((item) => (
                  <div key={item.id} className="bg-gray-950/80 border border-gray-800/80 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="font-bold text-white text-sm">{item.title}</h4>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-normal">{item.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACCESSORIES LOCKER MODAL */}
      {isLockerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Accessories Locker</h3>
                <p className="text-xs text-gray-400 font-medium">Total Spent: £{(userSpent / 100).toFixed(2)}</p>
              </div>
              <button onClick={() => setIsLockerOpen(false)} className="text-gray-400 hover:text-white font-bold p-1">✕</button>
            </div>

            {/* SECTION 1: TITLE BADGES */}
            <div className="mb-6">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Title Badges</h4>
              <div className="space-y-2">
                {ACCESSORIES_CATALOG.titles.map((item) => {
                  const isUnlocked = userSpent >= item.threshold;
                  const neededGBP = ((item.threshold - userSpent) / 100).toFixed(2);
                  const isEquipped = equippedTitleId === item.id;

                  return (
                    <div key={item.id} className="bg-gray-950/80 border border-gray-800/80 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className={`px-2.5 py-1 rounded border uppercase tracking-wider ${item.style}`}>
                          {item.name}
                        </span>
                        <span className="block text-[11px] text-gray-500 font-medium mt-1.5">
                          {isUnlocked ? 'Unlocked' : `Spend £${neededGBP} more to unlock`}
                        </span>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => handleEquipAccessory('title', item.id)}
                          disabled={isEquipped}
                          className={`text-xs font-bold px-4 py-2 rounded-lg transition ${
                            isEquipped 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default' 
                              : 'bg-gray-800 hover:bg-gray-700 text-white'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600 font-semibold px-3">Locked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: NAMEPLATE BORDERS */}
            <div>
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Nameplate Borders</h4>
              <div className="space-y-2">
                {ACCESSORIES_CATALOG.borders.map((item) => {
                  const isUnlocked = userSpent >= item.threshold;
                  const neededGBP = ((item.threshold - userSpent) / 100).toFixed(2);
                  const isEquipped = equippedBorderId === item.id;

                  return (
                    <div key={item.id} className={`p-3 rounded-xl border flex items-center justify-between ${item.style}`}>
                      <div>
                        <span className="text-sm font-semibold text-white">
                          {item.name}
                        </span>
                        <span className="block text-[11px] text-gray-400 font-medium mt-1">
                          {isUnlocked ? 'Unlocked' : `Spend £${neededGBP} more to unlock`}
                        </span>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => handleEquipAccessory('border', item.id)}
                          disabled={isEquipped}
                          className={`text-xs font-bold px-4 py-2 rounded-lg transition ${
                            isEquipped 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default' 
                              : 'bg-gray-800 hover:bg-gray-700 text-white'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600 font-semibold px-3">Locked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h3 className="text-lg font-black text-white">Edit Larp Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white font-bold p-1">✕</button>
            </div>

            {saveError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl mb-4 font-semibold">
                {saveError}
              </div>
            )}

            <div className="space-y-4">
              
              {/* DISCORD LINK & VISIBILITY TOGGLE */}
              <div className="bg-gray-950/80 border border-gray-800/80 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Discord</span>
                    <span className="text-xs font-semibold text-cyan-400 mt-0.5 block">{discordTag || 'Not Connected'}</span>
                  </div>
                  {!hasDiscordLinked && (
                    <button 
                      onClick={handleLinkDiscord}
                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-md"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {hasDiscordLinked && (
                  <div className="pt-2.5 border-t border-gray-800/80 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Show Discord on Profile</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editShowDiscord} 
                        onChange={(e) => setEditShowDiscord(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5865F2]"></div>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  Display Name *
                </label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={25}
                  placeholder="e.g. Larp King"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-green-400 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  Avatar Photo
                </label>
                <div className="flex items-center gap-3">
                  {editAvatar && (
                    <img src={editAvatar} alt="Preview" className="w-10 h-10 rounded-full object-cover border border-gray-700 shadow-sm" />
                  )}
                  <label className="flex-1 bg-gray-950 hover:bg-gray-800/80 border border-gray-800 text-gray-300 text-xs font-semibold py-3 px-4 rounded-xl cursor-pointer text-center transition">
                    {uploadingImage ? 'Uploading...' : 'Choose File'}
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploadingImage} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  Flex Links (Up to 5)
                </label>
                <div className="space-y-2">
                  {editLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="url" 
                        value={link}
                        onChange={(e) => handleLinkChange(idx, e.target.value)}
                        placeholder={`https://link-${idx + 1}.com`}
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-green-400 transition"
                      />
                      {editLinks.length > 1 && (
                        <button 
                          onClick={() => removeLinkField(idx)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-3 rounded-xl font-bold transition"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {editLinks.length < 5 && (
                    <button 
                      onClick={addLinkField}
                      className="w-full bg-gray-950 hover:bg-gray-800/80 border border-dashed border-gray-800 text-gray-400 text-xs font-semibold py-2 rounded-xl transition"
                    >
                      + Add Another Link ({editLinks.length}/5)
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  Bio / Flex Quote
                </label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={100}
                  placeholder="I bought this spot just to flex."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-green-400 transition h-20 resize-none"
                />
              </div>

              <button 
                onClick={handleSaveProfile}
                disabled={saving || uploadingImage}
                className="w-full bg-green-500 hover:bg-green-400 text-gray-950 font-extrabold py-3 rounded-xl transition disabled:opacity-50 mt-4 shadow-lg text-sm"
              >
                {saving ? 'Saving Profile...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCORD-STYLE PROFILE MODAL (WITH CLICK ANALYTICS) */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            
            <div className="h-24 bg-gradient-to-r from-green-600 to-emerald-900 relative">
              <button 
                onClick={() => setSelectedProfile(null)}
                className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold transition text-xs"
              >
                ✕
              </button>
            </div>

            <div className="px-6 relative -mt-12 mb-3 flex justify-between items-end">
              <img 
                src={selectedProfile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedProfile.display_name || 'anon')}`} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full bg-gray-950 border-4 border-gray-900 object-cover shadow-xl"
              />
              <div className="flex flex-col items-end gap-1 mb-2">
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 font-black px-3.5 py-1 rounded-full text-xs tracking-wide">
                  £{((selectedProfile.total_spent || 0) / 100).toFixed(2)} SPENT
                </div>
                {/* Total Click Analytics Badge */}
                <span className="text-[11px] font-semibold text-gray-400 px-2">
                  📊 {selectedProfile.total_clicks || 0} Total Clicks
                </span>
              </div>
            </div>

            <div className="p-6 pt-2">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h3 className="text-xl md:text-2xl font-black text-white">
                  {selectedProfile.is_anonymous ? 'Anonymous' : selectedProfile.display_name}
                </h3>
                {(() => {
                  const currentTitle = ACCESSORIES_CATALOG.titles.find(t => t.id === selectedProfile.equipped_title) || ACCESSORIES_CATALOG.titles[0];
                  return (
                    <span className={`px-2.5 py-0.5 rounded border uppercase tracking-wider ${currentTitle.style}`}>
                      {currentTitle.name}
                    </span>
                  );
                })()}
              </div>

              {selectedProfile.show_discord && selectedProfile.discord_tag && (
                <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 my-3 shadow-inner">
                  <span>Discord:</span>
                  <span className="text-white font-mono">@{selectedProfile.discord_tag}</span>
                </div>
              )}

              <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 my-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  About Me
                </span>
                <p className="text-gray-200 text-xs italic font-normal">
                  "{selectedProfile.approved_bio || 'I bought this spot just to flex.'}"
                </p>
              </div>

              <div className="space-y-2">
                {(() => {
                  const links = (selectedProfile.flex_links && selectedProfile.flex_links.length > 0)
                    ? selectedProfile.flex_links
                    : (selectedProfile.approved_url ? [selectedProfile.approved_url] : []);

                  if (links.length === 0) {
                    return (
                      <div className="text-center text-gray-500 text-xs py-3 border border-dashed border-gray-800 rounded-xl">
                        No URLs linked yet
                      </div>
                    );
                  }

                  return links.map((linkUrl: string, idx: number) => (
                    <a 
                      key={idx}
                      href={`/api/click?to=${encodeURIComponent(linkUrl)}&id=${selectedProfile.id}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="block w-full text-center bg-gray-800/80 hover:bg-gray-800 border border-gray-700/80 hover:border-green-500/50 text-white font-bold py-2.5 rounded-xl transition text-xs truncate px-4 shadow-sm"
                    >
                      {linkUrl.replace(/^https?:\/\//, '')} ↗
                    </a>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}