'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const BAD_WORDS = ['admin', 'mod', 'support', 'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'faggot', 'retard'];

const ACCESSORIES_CATALOG = {
  titles: [
    { id: 'title_rookie', name: 'ROOKIE', threshold: 0, style: 'text-gray-400 bg-white/5 border-white/10 font-semibold tracking-wider text-[10px] backdrop-blur-sm' },
    { id: 'title_verified', name: 'VERIFIED', threshold: 5000, style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-bold tracking-wider text-[10px] backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
    { id: 'title_roller', name: 'HIGH ROLLER', threshold: 10000, style: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 font-bold tracking-wider text-[10px] backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.15)]' },
    { id: 'title_master', name: 'FLEX MASTER', threshold: 25000, style: 'text-purple-400 bg-purple-500/10 border-purple-500/20 font-bold tracking-wider text-[10px] backdrop-blur-sm shadow-[0_0_15px_rgba(168,85,247,0.15)]' },
    { id: 'title_pro', name: 'PRO LARPER', threshold: 50000, style: 'text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold tracking-wider text-[10px] backdrop-blur-sm shadow-[0_0_15px_rgba(245,158,11,0.15)]' },
    { id: 'title_illuminati', name: 'ILLUMINATI', threshold: 100000, style: 'text-rose-400 bg-rose-500/10 border-rose-500/20 font-extrabold tracking-wider text-[10px] backdrop-blur-sm shadow-[0_0_20px_rgba(244,63,94,0.2)]' },
  ],
  borders: [
    { id: 'border_standard', name: 'Classic Dark', threshold: 0, style: 'border-white/10 bg-white/5 backdrop-blur-xl' },
    { id: 'border_emerald', name: 'Emerald Glow', threshold: 5000, style: 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-gradient-to-r from-emerald-950/20 via-transparent to-emerald-950/20 backdrop-blur-xl' },
    { id: 'border_blue', name: 'Electric Cyan', threshold: 15000, style: 'border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-gradient-to-r from-cyan-950/20 via-transparent to-cyan-950/20 backdrop-blur-xl' },
    { id: 'border_gold', name: 'Solar Gold', threshold: 50000, style: 'border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.2)] bg-gradient-to-r from-amber-950/20 via-transparent to-amber-950/20 backdrop-blur-xl' },
  ],
};

export default function Leaderboard() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [totalLarped, setTotalLarped] = useState(0);
  const [amount, setAmount] = useState('50'); 
  const [loading, setLoading] = useState(false);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userSpent, setUserSpent] = useState(0);

  const [hasDiscordLinked, setHasDiscordLinked] = useState(false);
  const [discordTag, setDiscordTag] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeBanner, setActiveBanner] = useState<any | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);

  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLinks, setEditLinks] = useState<string[]>(['']);
  const [editShowDiscord, setEditShowDiscord] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [equippedTitleId, setEquippedTitleId] = useState('title_rookie');
  const [equippedBorderId, setEquippedBorderId] = useState('border_standard');

  const fetchLeaderboard = async () => {
    const { data: totalData } = await supabase
      .from('profiles')
      .select('total_spent')
      .gt('total_spent', 0);
      
    if (totalData) {
      const grandTotal = totalData.reduce((sum, profile) => sum + (profile.total_spent || 0), 0);
      setTotalLarped(grandTotal);
    }

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

    const profilesChannel = supabase
      .channel('live-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

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
      supabase.removeChannel(profilesChannel); 
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
      alert('Authentication required: Please sign in to attach this transaction to your profile.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 2.50) {
      alert('The minimum spot claim amount is £2.50');
      return;
    }

    setLoading(true);
    try {
      const amountInCents = Math.round(parsedAmount * 100);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInCents, userId: user.id }),
      });
      
      let data;
      try { data = await res.json(); } catch(e) { throw new Error("Failed to parse response"); }
      
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout session');

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid gateway response');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoCheckout = async () => {
    if (!user) {
      alert('Authentication required: Please sign in to attach this transaction to your profile.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 2.50) {
      alert('The minimum spot claim amount is £2.50');
      return;
    }

    setCryptoLoading(true);
    try {
      const amountInCents = Math.round(parsedAmount * 100);
      const res = await fetch('/api/crypto-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInCents, userId: user.id }),
      });
      
      let data;
      try { 
        data = await res.json(); 
      } catch(e) { 
        throw new Error("Failed to parse backend response"); 
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize crypto checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid gateway response: No URL returned');
      }
    } catch (error: any) {
      console.error('Crypto checkout error:', error);
      alert(`Gateway Error: ${error.message}`);
    } finally {
      setCryptoLoading(false);
    }
  };

  const addAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 sm:p-6 md:p-12 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative overflow-x-hidden">
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      {activeBanner && (
        <div 
          onClick={() => setIsNewsOpen(true)}
          className="max-w-4xl mx-auto mb-8 glass-strong bg-gradient-to-r from-emerald-500/15 via-transparent to-emerald-500/15 border-emerald-500/30 px-5 py-4 rounded-2xl text-center text-sm md:text-base font-semibold text-emerald-300 cursor-pointer hover:border-emerald-500/50 transition-all duration-300 hover:scale-[1.01] shadow-2xl animate-gradient"
        >
          <span className="font-bold text-emerald-400 uppercase tracking-widest mr-2 text-xs block sm:inline mb-1 sm:mb-0">📢 Announcement</span>
          <span className="underline decoration-emerald-500/50 underline-offset-4">{activeBanner.title}</span> — {activeBanner.content} <span className="text-xs opacity-70 font-normal ml-2 block sm:inline mt-1 sm:mt-0">(Click for news history)</span>
        </div>
      )}

      {userProfile && userSpent >= 25000 && (
        <div className="max-w-4xl mx-auto mb-8">
          {userProfile.verification_status === 'pending' && (
            <div className="glass bg-amber-500/10 border-amber-500/30 text-amber-300 p-4 rounded-2xl text-center text-sm font-semibold shadow-xl">
              ⏳ Your £250+ VIP account links are currently pending Admin verification.
            </div>
          )}
          {userProfile.verification_status === 'rejected' && (
            <div 
              onClick={openEditModal}
              className="glass bg-rose-500/10 border-rose-500/30 text-rose-300 p-4 rounded-2xl text-center text-sm font-semibold cursor-pointer hover:bg-rose-500/20 transition-all duration-300 hover:scale-[1.01] shadow-xl"
            >
              ⚠️ Action Required on VIP Links: {userProfile.admin_feedback || 'Please update your links.'} <span className="underline decoration-rose-500/50 underline-offset-4 font-bold">(Click here to edit & resubmit)</span>
            </div>
          )}
          {userProfile.verification_status === 'approved' && (
            <div className="glass bg-emerald-500/10 border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-center text-sm font-medium shadow-xl animate-pulse-glow">
              ✅ VIP £250+ Account & Links Fully Verified
            </div>
          )}
        </div>
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* RESPONSIVE HEADER FIX */}
        <header className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-10 md:mb-16 pb-6 md:pb-8 border-b border-white/10 w-full">
          <div className="text-2xl md:text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 text-center">
            LARP<span className="text-white">BOARD</span>
          </div>

          <div className="w-full lg:w-auto flex justify-center">
            {user ? (
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 glass-strong px-4 py-3 rounded-3xl shadow-2xl w-full max-w-md lg:max-w-none">
                
                <div className="flex items-center gap-2 mr-2">
                  <img 
                    src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-lg"
                  />
                  <span className="text-sm font-semibold text-gray-200">
                    {userProfile?.display_name || user.user_metadata?.full_name || 'Larper'}
                  </span>
                </div>

                {isAdmin && (
                  <a 
                    href="/admin"
                    className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-full border border-rose-500/30 transition-all duration-300 font-bold tracking-wide"
                  >
                    Admin
                  </a>
                )}

                <button 
                  onClick={() => setIsNewsOpen(true)}
                  className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-full border border-white/10 transition-all duration-300 font-medium"
                >
                  News
                </button>
                
                <button 
                  onClick={() => setIsLockerOpen(true)}
                  className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/30 transition-all duration-300 font-bold"
                >
                  Accessories
                </button>

                <button 
                  onClick={openEditModal}
                  className="text-xs bg-white/5 hover:bg-white/10 text-emerald-400 px-3 py-1.5 rounded-full border border-white/10 transition-all duration-300 font-bold"
                >
                  Edit Profile
                </button>

                <button 
                  onClick={handleSignOut}
                  className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-full border border-white/10 transition-all duration-300 font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center items-center gap-3">
                <button 
                  onClick={() => handleOAuthLogin('google')}
                  className="bg-white hover:bg-gray-100 text-gray-950 font-bold text-xs px-6 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Google
                </button>
                <button 
                  onClick={() => handleOAuthLogin('discord')}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs px-6 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Discord
                </button>
              </div>
            )}
          </div>
        </header>

        {/* RESPONSIVE TITLE FIX */}
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 uppercase tracking-tight animate-gradient break-words px-2">
            LarpLeaderboard
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-400 font-medium tracking-wide mb-8">Buy your spot. Flex your link.</p>
          
          <div className="inline-block glass-strong bg-emerald-500/10 border border-emerald-500/30 px-6 sm:px-8 py-4 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-pulse-glow">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">Total Money Larped</span>
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">£{((totalLarped || 0) / 100).toFixed(2)}</span>
          </div>
        </div>
        
        <div className="glass-strong p-6 sm:p-8 md:p-10 rounded-3xl mb-12 md:mb-16 flex flex-col items-center shadow-2xl animate-gradient w-full">
          <h2 className="text-lg md:text-xl font-bold mb-6 text-gray-200 tracking-wide text-center">Claim Your Spot</h2>
          
          <div className="w-full max-w-md mb-6 space-y-4">
            <div className="relative w-full">
              <span className="absolute left-5 top-4 text-gray-400 font-bold text-lg">£</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/30 border border-white/10 text-white rounded-2xl py-4 pl-10 pr-5 font-bold text-lg focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="2.50"
                step="0.10"
              />
            </div>
            
            {/* RESPONSIVE BUTTON GRID FIX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={handleCheckout}
                disabled={loading || cryptoLoading}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-gray-950 font-extrabold py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] text-sm flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : 'Pay with Card'}
              </button>
              <button 
                onClick={handleCryptoCheckout}
                disabled={loading || cryptoLoading}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-gray-950 font-extrabold py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] text-sm flex items-center justify-center gap-2"
              >
                {cryptoLoading ? 'Processing...' : 'Pay with Crypto'}
              </button>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 text-xs font-bold flex-wrap justify-center">
            <button onClick={() => addAmount(10)} className="bg-white/5 hover:bg-white/10 px-3 py-2 sm:px-4 sm:py-2 rounded-xl border border-white/10 transition-all duration-300 text-gray-300 hover:text-white hover:scale-105">
              +£10
            </button>
            <button onClick={() => addAmount(50)} className="bg-white/5 hover:bg-white/10 px-3 py-2 sm:px-4 sm:py-2 rounded-xl border border-white/10 transition-all duration-300 text-gray-300 hover:text-white hover:scale-105">
              +£50
            </button>
            <button onClick={() => addAmount(100)} className="bg-white/5 hover:bg-white/10 px-3 py-2 sm:px-4 sm:py-2 rounded-xl border border-white/10 transition-all duration-300 text-gray-300 hover:text-white hover:scale-105">
              +£100
            </button>
            <button onClick={() => addAmount(500)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-2 sm:px-4 sm:py-2 rounded-xl border border-amber-500/30 transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              +£500
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {profiles.length === 0 ? (
            <div className="glass text-center text-gray-500 font-semibold p-12 sm:p-16 border border-dashed border-white/10 rounded-3xl mx-2 sm:mx-0">
              <div className="text-4xl mb-4">🏆</div>
              <div className="text-lg">No one is on the board yet.</div>
              <div className="text-sm text-gray-600 mt-2">Be the first to claim your spot.</div>
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
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-2xl mx-2 sm:mx-0 ${currentBorder.style}`}
                >
                  <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto">
                    <span className={`text-xl sm:text-2xl md:text-3xl font-black w-8 sm:w-10 text-center shrink-0 ${index === 0 ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                      #{index + 1}
                    </span>
                    
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/30 border border-white/20 object-cover shadow-xl group-hover:shadow-2xl transition-all duration-300 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-100 group-hover:text-emerald-400 transition-colors truncate">
                          {profile.is_anonymous ? 'Anonymous' : profile.display_name}
                        </h2>
                        <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-lg border uppercase tracking-wider text-[8px] sm:text-[10px] shrink-0 ${currentTitle.style}`}>
                          {currentTitle.name}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 line-clamp-1 mt-1 font-normal w-full pr-2">
                        {profile.approved_bio || 'No bio set yet.'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto text-right sm:text-left pr-2 sm:pr-0">
                    <span className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                      £{((profile.total_spent || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isNewsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-strong w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-white/10 pb-4 sm:pb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">Announcements Feed</h3>
                <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">Past and current updates from administration.</p>
              </div>
              <button onClick={() => setIsNewsOpen(false)} className="text-gray-400 hover:text-white font-bold p-2 text-xl transition-colors">✕</button>
            </div>

            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">No announcements posted yet.</div>
              ) : (
                announcements.map((item) => (
                  <div key={item.id} className="glass bg-black/30 border border-white/10 p-4 sm:p-5 rounded-2xl hover:border-white/20 transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1 sm:gap-0">
                      <h4 className="font-bold text-white text-sm sm:text-base">{item.title}</h4>
                      <span className="text-[10px] sm:text-xs text-gray-500 font-semibold">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">{item.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isLockerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-strong w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-white/10 pb-4 sm:pb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">Accessories Locker</h3>
                <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">Total Spent: £{(userSpent / 100).toFixed(2)}</p>
              </div>
              <button onClick={() => setIsLockerOpen(false)} className="text-gray-400 hover:text-white font-bold p-2 text-xl transition-colors">✕</button>
            </div>

            <div className="mb-8">
              <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Title Badges</h4>
              <div className="space-y-3">
                {ACCESSORIES_CATALOG.titles.map((item) => {
                  const isUnlocked = userSpent >= item.threshold;
                  const neededGBP = ((item.threshold - userSpent) / 100).toFixed(2);
                  const isEquipped = equippedTitleId === item.id;

                  return (
                    <div key={item.id} className="glass bg-black/30 border border-white/10 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 hover:border-white/20 transition-all duration-300">
                      <div>
                        <span className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border uppercase tracking-wider text-[10px] sm:text-[10px] ${item.style}`}>
                          {item.name}
                        </span>
                        <span className="block text-[10px] sm:text-xs text-gray-500 font-medium mt-2">
                          {isUnlocked ? '✅ Unlocked' : `🔒 Spend £${neededGBP} more to unlock`}
                        </span>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => handleEquipAccessory('title', item.id)}
                          disabled={isEquipped}
                          className={`text-xs sm:text-sm font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto ${
                            isEquipped 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default' 
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:scale-105'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-600 font-semibold px-2 sm:px-4 hidden sm:block">Locked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Nameplate Borders</h4>
              <div className="space-y-3">
                {ACCESSORIES_CATALOG.borders.map((item) => {
                  const isUnlocked = userSpent >= item.threshold;
                  const neededGBP = ((item.threshold - userSpent) / 100).toFixed(2);
                  const isEquipped = equippedBorderId === item.id;

                  return (
                    <div key={item.id} className={`p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 hover:scale-[1.01] transition-all duration-300 ${item.style}`}>
                      <div>
                        <span className="text-sm sm:text-base font-semibold text-white">
                          {item.name}
                        </span>
                        <span className="block text-[10px] sm:text-xs text-gray-400 font-medium mt-2">
                          {isUnlocked ? '✅ Unlocked' : `🔒 Spend £${neededGBP} more to unlock`}
                        </span>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => handleEquipAccessory('border', item.id)}
                          disabled={isEquipped}
                          className={`text-xs sm:text-sm font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto ${
                            isEquipped 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default' 
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:scale-105'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-600 font-semibold px-2 sm:px-4 hidden sm:block">Locked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-strong w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-white/10 pb-4 sm:pb-6">
              <h3 className="text-xl sm:text-2xl font-black text-white">Edit Larp Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white font-bold p-2 text-xl transition-colors">✕</button>
            </div>

            {saveError && (
              <div className="glass bg-rose-500/10 border-rose-500/30 text-rose-400 text-xs sm:text-sm p-4 rounded-2xl mb-6 font-semibold">
                {saveError}
              </div>
            )}

            <div className="space-y-5 sm:space-y-6">
              
              <div className="glass bg-black/30 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block">Discord</span>
                    <span className="text-xs sm:text-sm font-semibold text-cyan-400 mt-1 block truncate">{discordTag || 'Not Connected'}</span>
                  </div>
                  {!hasDiscordLinked && (
                    <button 
                      onClick={handleLinkDiscord}
                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 w-full sm:w-auto"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {hasDiscordLinked && (
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-gray-300">Show Discord on Profile</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editShowDiscord} 
                        onChange={(e) => setEditShowDiscord(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2] shadow-inner"></div>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Display Name *
                </label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={25}
                  placeholder="e.g. Larp King"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl p-3 sm:p-4 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-300"
                />
              </div>

              <div>
                <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Avatar Photo
                </label>
                <div className="flex items-center gap-3 sm:gap-4">
                  {editAvatar && (
                    <img src={editAvatar} alt="Preview" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-white/20 shadow-lg shrink-0" />
                  )}
                  <label className="flex-1 bg-black/30 hover:bg-white/5 border border-white/10 text-gray-300 text-xs sm:text-sm font-semibold py-3 px-4 sm:px-5 rounded-2xl cursor-pointer text-center transition-all duration-300 hover:border-white/20">
                    {uploadingImage ? 'Uploading...' : 'Choose File'}
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploadingImage} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Flex Links (Up to 5)
                </label>
                <div className="space-y-3">
                  {editLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2 sm:gap-3">
                      <input 
                        type="url" 
                        value={link}
                        onChange={(e) => handleLinkChange(idx, e.target.value)}
                        placeholder={`https://link-${idx + 1}.com`}
                        className="flex-1 bg-black/30 border border-white/10 rounded-2xl p-3 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-300 min-w-0"
                      />
                      {editLinks.length > 1 && (
                        <button 
                          onClick={() => removeLinkField(idx)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-3 sm:px-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {editLinks.length < 5 && (
                    <button 
                      onClick={addLinkField}
                      className="w-full bg-black/30 hover:bg-white/5 border border-dashed border-white/10 text-gray-400 text-xs sm:text-sm font-semibold py-3 rounded-2xl transition-all duration-300 hover:border-white/20"
                    >
                      + Add Another Link ({editLinks.length}/5)
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Bio / Flex Quote
                </label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={100}
                  placeholder="I bought this spot just to flex."
                  className="w-full bg-black/30 border border-white/10 rounded-2xl p-3 sm:p-4 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-300 h-20 sm:h-24 resize-none"
                />
              </div>

              <button 
                onClick={handleSaveProfile}
                disabled={saving || uploadingImage}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-gray-950 font-extrabold py-3 sm:py-4 rounded-2xl transition-all duration-300 disabled:opacity-50 mt-4 sm:mt-6 shadow-lg hover:shadow-emerald-500/25 text-xs sm:text-sm hover:scale-[1.02]"
              >
                {saving ? 'Saving Profile...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-strong w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            
            <div className="h-28 sm:h-32 bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 relative animate-gradient">
              <button 
                onClick={() => setSelectedProfile(null)}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 text-sm hover:scale-110"
              >
                ✕
              </button>
            </div>

            <div className="px-6 sm:px-8 relative -mt-14 sm:-mt-16 mb-4 flex justify-between items-end">
              <img 
                src={selectedProfile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedProfile.display_name || 'anon')}`} 
                alt="Avatar" 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-950 border-4 border-gray-900 object-cover shadow-2xl"
              />
              <div className="flex flex-col items-end gap-1 sm:gap-2 mb-2 sm:mb-3">
                <div className="glass bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  £{((selectedProfile.total_spent || 0) / 100).toFixed(2)} SPENT
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-gray-400 px-2 sm:px-3">
                  📊 {selectedProfile.total_clicks || 0} Total Clicks
                </span>
              </div>
            </div>

            <div className="p-6 pt-2 sm:p-8 sm:pt-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white truncate max-w-[70%]">
                  {selectedProfile.is_anonymous ? 'Anonymous' : selectedProfile.display_name}
                </h3>
                {(() => {
                  const currentTitle = ACCESSORIES_CATALOG.titles.find(t => t.id === selectedProfile.equipped_title) || ACCESSORIES_CATALOG.titles[0];
                  return (
                    <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-lg border uppercase tracking-wider text-[8px] sm:text-[10px] shrink-0 ${currentTitle.style}`}>
                      {currentTitle.name}
                    </span>
                  );
                })()}
              </div>

              {selectedProfile.show_discord && selectedProfile.discord_tag && (
                <div className="glass bg-[#5865F2]/10 border-[#5865F2]/30 text-[#5865F2] px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-semibold text-xs sm:text-sm flex items-center gap-2 my-3 sm:my-4 shadow-inner">
                  <span>Discord:</span>
                  <span className="text-white font-mono truncate">@{selectedProfile.discord_tag}</span>
                </div>
              )}

              <div className="glass bg-black/30 p-4 sm:p-5 rounded-2xl border border-white/10 my-4 sm:my-5">
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  About Me
                </span>
                <p className="text-gray-200 text-xs sm:text-sm italic font-normal leading-relaxed">
                  "{selectedProfile.approved_bio || 'I bought this spot just to flex.'}"
                </p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {(() => {
                  const links = (selectedProfile.flex_links && selectedProfile.flex_links.length > 0)
                    ? selectedProfile.flex_links
                    : (selectedProfile.approved_url ? [selectedProfile.approved_url] : []);

                  if (links.length === 0) {
                    return (
                      <div className="text-center text-gray-500 text-xs sm:text-sm py-3 sm:py-4 border border-dashed border-white/10 rounded-2xl glass">
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
                      className="block w-full text-center glass bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 text-white font-bold py-2.5 sm:py-3 rounded-2xl transition-all duration-300 text-xs sm:text-sm truncate px-4 sm:px-5 hover:scale-[1.02] hover:shadow-lg"
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