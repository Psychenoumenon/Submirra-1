import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'tr';

interface Translations {
  nav: {
    home: string;
    about: string;
    social: string;
    analyze: string;
    library: string;
    contact: string;
    dashboard: string;
    buy: string;
    freeTrial: string;
    signIn: string;
    signOut: string;
  };
    home: {
      title: string;
      subtitle: string;
      description: string;
      cta: string;
      getStarted: string;
      learnMore: string;
      feature1Title: string;
      feature1Desc: string;
      feature2Title: string;
      feature2Desc: string;
      feature3Title: string;
      feature3Desc: string;
    };
  about: {
    title: string;
    subtitle: string;
    missionTitle: string;
    missionDesc: string;
    howItWorksTitle: string;
    howItWorksDesc: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
    privacyTitle: string;
    privacyDesc: string;
    quote: string;
  };
  analyze: {
    title: string;
    subtitle: string;
    label: string;
    placeholder: string;
    characters: string;
    submit: string;
    saving: string;
    analysisTitle: string;
    visualizationTitle: string;
    analyzeAnother: string;
      confirmationMessage: string;
      savedMessage: string;
    trialBadge: string;
    privacyLabel: string;
    privacyPublic: string;
    privacyPrivate: string;
    privacyPublicDesc: string;
    privacyPrivateDesc: string;
  };
  library: {
    title: string;
    subtitle: string;
    empty: string;
    analyzeFirst: string;
    yourDream: string;
    analysis: string;
    pending: string;
    processingMessage: string;
  };
  social: {
    title: string;
    subtitle: string;
    searchDreams: string;
    searchUsers: string;
    searchDreamsPlaceholder: string;
    searchUsersPlaceholder: string;
    all: string;
    following: string;
    recent: string;
    popular: string;
    trending: string;
    pending: string;
    noDreams: string;
    shareFirst: string;
    likes: string;
    like: string;
    comments: string;
    comment: string;
    viewAll: string;
    noComments: string;
    writeComment: string;
    signInToComment: string;
    signIn: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    noUsersFound: string;
    anonymous: string;
    checkOutDream: string;
    linkCopied: string;
    deleteDream: string;
    deleteConfirm: string;
    dreamDeleted: string;
    deleteFailed: string;
    commentAdded: string;
    commentFailed: string;
    commentDeleted: string;
    commentDeleteFailed: string;
    deleteComment: string;
    endOfFeed: string;
    loadingMore: string;
  };
  profile: {
    title: string;
    manageAccount: string;
    userProfile: string;
    changeAvatar: string;
    uploading: string;
    publicDreams: string;
    likesReceived: string;
    comments: string;
    followers: string;
    following: string;
    email: string;
    memberSince: string;
    editProfile: string;
    saveChanges: string;
    cancel: string;
    follow: string;
    followingButton: string;
    message: string;
    publicDreamsTitle: string;
    noPublicDreams: string;
    profileSaved: string;
    profileSaveFailed: string;
    avatarUploaded: string;
    avatarUploadFailed: string;
    followSuccess: string;
    unfollowSuccess: string;
    followFailed: string;
    bioPlaceholder: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    totalDreams: string;
    completedAnalyses: string;
    pendingAnalyses: string;
    analyzeNewDream: string;
    analyzeNewDreamDesc: string;
    viewLibrary: string;
    viewLibraryDesc: string;
    recentDreams: string;
    viewAll: string;
    noDreams: string;
    analyzeFirstDream: string;
  };
  contact: {
    title: string;
    subtitle: string;
    emailSupport: string;
    liveChat: string;
    available: string;
    sendMessage: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    send: string;
    thankYou: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    subjectPlaceholder: string;
    messagePlaceholder: string;
  };
  auth: {
    welcomeBack: string;
    createAccount: string;
    continueExploring: string;
    startJourney: string;
    signIn: string;
    signUp: string;
    fullName: string;
    email: string;
    password: string;
    orContinueWith: string;
    googleSignIn: string;
    enterFullName: string;
    enterEmail: string;
    enterPassword: string;
    creatingAccount: string;
    signingIn: string;
    checkEmail: string;
    confirmationSent: string;
    validationRequired: string;
    validationEmail: string;
    emailAlreadyExists: string;
    invalidCredentials: string;
  };
  settings: {
    title: string;
    blockedUsers: string;
    privacy: string;
    notifications: string;
    blockedUsersDesc: string;
    noBlockedUsers: string;
    unblock: string;
    unblockConfirm: string;
    unblockSuccess: string;
    privacyDesc: string;
    profileVisibility: string;
    allowMessagesFrom: string;
    public: string;
    private: string;
    everyone: string;
    followingOnly: string;
    notificationsDesc: string;
    likesOnDreams: string;
    comments: string;
    newFollowers: string;
    directMessages: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    freeTrial: {
      title: string;
      price: string;
      description: string;
      feature1: string;
      feature2: string;
      feature3: string;
      cta: string;
      signUp: string;
    };
    standard: {
      title: string;
      price: string;
      period: string;
      description: string;
      feature1: string;
      feature2: string;
      feature3: string;
      feature4: string;
      feature5: string;
      cta: string;
    };
    premium: {
      badge: string;
      title: string;
      price: string;
      period: string;
      description: string;
      feature1: string;
      feature2: string;
      feature3: string;
      feature4: string;
      feature5: string;
      cta: string;
    };
    whySubmirra: {
      title: string;
      description: string;
    };
  };
  trial: {
    activateTitle: string;
    activateDesc: string;
    activateNow: string;
    activating: string;
    activated: string;
    activatedDesc: string;
    enjoy3Days: string;
    alreadyUsed: string;
    alreadyUsedDesc: string;
    viewPlans: string;
    whatsIncluded: string;
    feature1: string;
    feature2: string;
    feature3: string;
    duration: string;
    threeDays: string;
    analyses: string;
    threeAnalyses: string;
    features: string;
    fullAccess: string;
    startAnalyzing: string;
    trialExpired: string;
    trialExpiredDesc: string;
  };
}

const translations: Record<Language, Translations> = {
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      social: 'Social',
      analyze: 'Analyze',
      library: 'Library',
      contact: 'Contact',
      dashboard: 'Dashboard',
      buy: 'Buy',
      freeTrial: '3-Day Free Trial',
      signIn: 'Sign In',
      signOut: 'Sign Out',
    },
    home: {
      title: 'Submirra',
      subtitle: 'Unlock the Secrets of Your Subconscious',
      description: 'Experience the power of advanced dream analysis. Submirra combines sophisticated subconscious interpretation with stunning visual generation to help you understand the hidden meanings behind your dreams.',
      cta: 'Analyze Your Dream',
      getStarted: 'Get Started',
      learnMore: 'Learn More',
      feature1Title: 'Deep Analysis',
      feature1Desc: 'Advanced analysis techniques reveal hidden meanings in your dreams through sophisticated subconscious interpretation.',
      feature2Title: 'Visual Generation',
      feature2Desc: 'Transform your dreams into stunning surreal visualizations that capture their essence and emotion.',
      feature3Title: 'Personal Library',
      feature3Desc: 'Build your personal dream journal with all your analyses and visualizations in one place.',
    },
    about: {
      title: 'About Submirra',
      subtitle: 'Bridging the conscious and subconscious',
      missionTitle: 'Our Mission',
      missionDesc: 'Submirra is dedicated to helping you understand the hidden messages within your dreams. Using advanced analysis technology, we analyze your dreams to reveal insights about your subconscious mind, emotional state, and inner desires.',
      howItWorksTitle: 'How It Works',
      howItWorksDesc: 'Our platform combines the power of advanced analysis with artistic visualization:',
      step1: 'Share your dream in up to 5000 characters',
      step2: 'Our system processes your dream through advanced analysis',
      step3: 'Receive a detailed subconscious analysis',
      step4: 'Get a unique surreal visualization of your dream',
      step5: 'Build your personal dream library over time',
      privacyTitle: 'Privacy & Security',
      privacyDesc: 'Your dreams are deeply personal, and we treat them with the utmost respect. All dream entries are encrypted and stored securely. Only you can access your dream library, and we never share your data with third parties. Your subconscious secrets are safe with us.',
      quote: '"Dreams are the royal road to the unconscious" - Sigmund Freud',
    },
    analyze: {
      title: 'Analyze Your Dream',
      subtitle: 'Describe your dream in detail and discover its hidden meanings',
      label: 'Tell us about your dream',
      placeholder: 'I was walking through a forest filled with glowing trees...',
      characters: 'characters',
      submit: 'Analyze Dream',
      saving: 'Saving...',
      analysisTitle: 'Analysis',
      visualizationTitle: 'Dream Visualization',
      analyzeAnother: 'Analyze Another Dream',
      confirmationMessage: 'Your dream has been saved and will be analyzed shortly.',
      savedMessage: 'Your dream has been saved and will be analyzed shortly.',
      trialBadge: '3-Day Free Trial',
      privacyLabel: 'Privacy',
      privacyPublic: 'Public',
      privacyPrivate: 'Private',
      privacyPublicDesc: 'Share with the community',
      privacyPrivateDesc: 'Only visible to you',
    },
    library: {
      title: 'Your Dream Library',
      subtitle: 'Explore your collection of analyzed dreams and visualizations',
      empty: 'Your library is empty',
      analyzeFirst: 'Analyze Your First Dream',
      yourDream: 'Your Dream',
      analysis: 'Analysis',
      pending: 'Pending Analysis',
      processingMessage: 'Analysis is being processed',
    },
    social: {
      title: 'Social Feed',
      subtitle: 'Explore public dream analyses from the community',
      searchDreams: 'Search Dreams',
      searchUsers: 'Search Users',
      searchDreamsPlaceholder: 'Search dreams...',
      searchUsersPlaceholder: 'Search users by name or username...',
      all: 'All',
      following: 'Following',
      recent: 'Recent',
      popular: 'Popular',
      trending: 'Trending',
      pending: 'Pending',
      noDreams: 'No public dreams yet',
      shareFirst: 'Share Your First Dream',
      likes: 'likes',
      like: 'like',
      comments: 'comments',
      comment: 'comment',
      viewAll: 'View all',
      noComments: 'No comments yet',
      writeComment: 'Write a comment...',
      signInToComment: 'Sign in to comment',
      signIn: 'Sign In',
      justNow: 'Just now',
      minutesAgo: 'm ago',
      hoursAgo: 'h ago',
      daysAgo: 'd ago',
      noUsersFound: 'No users found',
      anonymous: 'Anonymous',
      checkOutDream: 'Check out this dream',
      linkCopied: 'Link copied to clipboard',
      deleteDream: 'Delete your dream',
      deleteConfirm: 'Are you sure you want to delete this dream? This will also delete all likes and comments.',
      dreamDeleted: 'Dream deleted successfully',
      deleteFailed: 'Failed to delete dream. You can only delete your own dreams.',
      commentAdded: 'Comment added',
      commentFailed: 'Failed to add comment',
      commentDeleted: 'Comment deleted',
      commentDeleteFailed: 'Failed to delete comment',
      deleteComment: 'Delete comment',
      endOfFeed: "You've reached the end of the feed",
      loadingMore: 'Loading more...',
    },
    profile: {
      title: 'Profile',
      manageAccount: 'Manage your account settings',
      userProfile: 'User Profile',
      changeAvatar: 'Change avatar',
      uploading: 'Uploading...',
      publicDreams: 'Public Dreams',
      likesReceived: 'Likes Received',
      comments: 'Comments',
      followers: 'Followers',
      following: 'Following',
      email: 'Email',
      memberSince: 'Member Since',
      editProfile: 'Edit Profile',
      saveChanges: 'Save Changes',
      cancel: 'Cancel',
      follow: 'Follow',
      followingButton: 'Following',
      message: 'Message',
      publicDreamsTitle: 'Public Dreams',
      noPublicDreams: 'No public dreams yet',
      profileSaved: 'Profile saved successfully',
      profileSaveFailed: 'Failed to save profile',
      avatarUploaded: 'Avatar uploaded successfully',
      avatarUploadFailed: 'Failed to upload avatar',
      followSuccess: 'Now following this user',
      unfollowSuccess: 'Unfollowed this user',
      followFailed: 'Failed to update follow status',
      bioPlaceholder: 'Write a bio...',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of your dream analysis journey',
      totalDreams: 'Total Dreams',
      completedAnalyses: 'Completed Analyses',
      pendingAnalyses: 'Pending Analyses',
      analyzeNewDream: 'Analyze New Dream',
      analyzeNewDreamDesc: 'Start analyzing a new dream to discover its hidden meanings',
      viewLibrary: 'View Library',
      viewLibraryDesc: 'Browse your complete collection of analyzed dreams',
      recentDreams: 'Recent Dreams',
      viewAll: 'View All',
      noDreams: 'No dreams yet',
      analyzeFirstDream: 'Analyze Your First Dream',
    },
    contact: {
      title: 'Contact Us',
      subtitle: "Have questions? We'd love to hear from you",
      emailSupport: 'Email Support',
      liveChat: 'Live Chat',
      available: 'Available 24/7 for assistance',
      sendMessage: 'Send us a Message',
      name: 'Name',
      email: 'Email',
      subject: 'Subject',
      message: 'Message',
      send: 'Send Message',
      thankYou: "Thank you for your message! We'll get back to you soon.",
      namePlaceholder: 'Your name',
      emailPlaceholder: 'your@email.com',
      subjectPlaceholder: "What's this about?",
      messagePlaceholder: 'Tell us more...',
    },
    auth: {
      welcomeBack: 'Welcome Back',
      createAccount: 'Create Account',
      continueExploring: 'Continue exploring your dreams',
      startJourney: 'Start your journey into the subconscious',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      fullName: 'Full Name',
      email: 'Email',
      password: 'Password',
      orContinueWith: 'Or continue with',
      googleSignIn: 'Sign in with Google',
      enterFullName: 'Enter your full name',
      enterEmail: 'your@email.com',
      enterPassword: 'Enter your password',
      creatingAccount: 'Creating account...',
      signingIn: 'Signing in...',
      checkEmail: 'Check your email',
      confirmationSent: 'We sent you a confirmation link. Please check your email to verify your account.',
      validationRequired: 'Please fill out this field',
      validationEmail: 'Please enter a valid email address',
      emailAlreadyExists: 'This email is already registered. Please sign in or use a different email.',
      invalidCredentials: 'Invalid email or password. Please try again.',
    },
    settings: {
      title: 'Settings',
      blockedUsers: 'Blocked Users',
      privacy: 'Privacy',
      notifications: 'Notifications',
      blockedUsersDesc: "Users you've blocked won't be able to send you messages or interact with your content.",
      noBlockedUsers: 'No blocked users',
      unblock: 'Unblock',
      unblockConfirm: 'Are you sure you want to unblock',
      unblockSuccess: 'has been unblocked',
      privacyDesc: 'Control who can see your content and interact with you.',
      profileVisibility: 'Profile Visibility',
      allowMessagesFrom: 'Allow Messages From',
      public: 'Public',
      private: 'Private',
      everyone: 'Everyone',
      followingOnly: 'Following Only',
      notificationsDesc: 'Choose what notifications you want to receive.',
      likesOnDreams: 'Likes on Dreams',
      comments: 'Comments',
      newFollowers: 'New Followers',
      directMessages: 'Direct Messages',
    },
    pricing: {
      title: 'Simple, Transparent Pricing',
      subtitle: 'Choose the perfect plan for your dream analysis journey',
      freeTrial: {
        title: 'Free Trial',
        price: 'Free',
        description: 'Perfect for exploring what Submirra can do',
        feature1: '3 days of access',
        feature2: '3 dream analyses total',
        feature3: '',
        cta: 'Start Free Trial',
        signUp: 'Sign Up Free',
      },
      standard: {
        title: 'Standard',
        price: '$15',
        period: 'month',
        description: 'Great for regular dream journaling and insights',
        feature1: '5 dream analyses per day',
        feature2: '1 visualization per analysis',
        feature3: 'Save up to 10 analyses monthly',
        feature4: 'Advanced analysis',
        feature5: 'Storage refreshes each month',
        cta: 'Get Standard',
      },
      premium: {
        badge: 'Most Popular',
        title: 'Premium',
        price: '$30',
        period: 'month',
        description: 'Unlock your subconscious completely with unlimited library and multiple visualizations',
        feature1: '10 dream analyses per day',
        feature2: '3 visualizations per analysis',
        feature3: 'Unlimited library storage',
        feature4: 'Priority analysis',
        feature5: 'Never lose your dream history',
        cta: 'Go Premium',
      },
      whySubmirra: {
        title: 'Why Choose Submirra?',
        description: 'Submirra uses cutting-edge analysis technology to decode your dreams, revealing hidden meanings about your subconscious mind, emotional state, and inner desires. Each analysis comes with unique surreal visualizations that capture the essence of your dream.',
      },
    },
    trial: {
      activateTitle: 'Activate Your 3-Day Free Trial',
      activateDesc: 'Experience the full power of Submirra with unlimited access for 3 days',
      activateNow: 'Activate Free Trial',
      activating: 'Activating...',
      activated: 'Trial Activated!',
      activatedDesc: 'Your 3-day free trial has been successfully activated.',
      enjoy3Days: 'Enjoy 3 days of unlimited dream analysis and insights!',
      alreadyUsed: 'Trial Already Used',
      alreadyUsedDesc: 'You have already used your free trial. Upgrade to a paid plan to continue enjoying Submirra.',
      viewPlans: 'View Plans',
      whatsIncluded: 'What\'s Included:',
      feature1: '3 days of full access to all features',
      feature2: '3 dream analyses with AI-powered insights',
      feature3: 'Beautiful visualizations for your dreams',
      duration: 'Duration',
      threeDays: '3 Days',
      analyses: 'Analyses',
      threeAnalyses: '3 Dreams',
      features: 'Features',
      fullAccess: 'Full Access',
      startAnalyzing: 'Start Analyzing Dreams',
      trialExpired: 'Trial Expired',
      trialExpiredDesc: 'Your 3-day free trial has expired. Upgrade to continue.',
    },
  },
  tr: {
    nav: {
      home: 'Ana Sayfa',
      about: 'Hakkında',
      social: 'Sosyal',
      analyze: 'Analiz Et',
      library: 'Kütüphane',
      contact: 'İletişim',
      dashboard: 'Dashboard',
      buy: 'Satın Al',
      freeTrial: '3 Günlük Deneme',
      signIn: 'Giriş Yap',
      signOut: 'Çıkış Yap',
    },
    home: {
      title: 'Submirra',
      subtitle: 'Bilinçaltınızın Sırlarını Keşfedin',
      description: 'Gelişmiş rüya analizi gücünü deneyimleyin. Submirra, sofistike bilinçaltı yorumlama ve etkileyici görsel üretimi birleştirerek rüyalarınızın gizli anlamlarını anlamanıza yardımcı olur.',
      cta: 'Rüyanı Analiz Et',
      getStarted: 'Başlayın',
      learnMore: 'Daha Fazla Bilgi',
      feature1Title: 'Derin Analiz',
      feature1Desc: 'Gelişmiş analiz teknikleri, sofistike bilinçaltı yorumlama yoluyla rüyalarınızdaki gizli anlamları ortaya çıkarır.',
      feature2Title: 'Görsel Üretimi',
      feature2Desc: 'Rüyalarınızı, özünü ve duygusunu yakalayan muhteşem sürreal görselleştirmelere dönüştürün.',
      feature3Title: 'Kişisel Kütüphane',
      feature3Desc: 'Tüm analizleriniz ve görselleştirmelerinizle kişisel rüya günlüğünüzü tek bir yerde oluşturun.',
    },
    about: {
      title: 'Submirra Hakkında',
      subtitle: 'Bilinç ve bilinçaltı arasında köprü',
      missionTitle: 'Misyonumuz',
      missionDesc: 'Submirra, rüyalarınızdaki gizli mesajları anlamanıza yardımcı olmaya adanmıştır. Gelişmiş analiz teknolojisi kullanarak, bilinçaltı zihniniz, duygusal durumunuz ve iç arzularınız hakkında içgörüler ortaya çıkarmak için rüyalarınızı analiz ediyoruz.',
      howItWorksTitle: 'Nasıl Çalışır',
      howItWorksDesc: 'Platformumuz, gelişmiş analiz gücünü sanatsal görselleştirme ile birleştirir:',
      step1: 'Rüyanızı 5000 karaktere kadar paylaşın',
      step2: 'Sistemimiz rüyanızı gelişmiş analiz yöntemleriyle işler',
      step3: 'Detaylı bir bilinçaltı analizi alın',
      step4: 'Rüyanızın benzersiz sürreal bir görselleştirmesini elde edin',
      step5: 'Zamanla kişisel rüya kütüphanenizi oluşturun',
      privacyTitle: 'Gizlilik ve Güvenlik',
      privacyDesc: 'Rüyalarınız son derece kişiseldir ve onlara büyük bir saygıyla yaklaşıyoruz. Tüm rüya girişleri şifrelenir ve güvenli bir şekilde saklanır. Yalnızca siz rüya kütüphanenize erişebilirsiniz ve verilerinizi asla üçüncü taraflarla paylaşmayız. Bilinçaltı sırlarınız bizimle güvendedir.',
      quote: '"Rüyalar bilinçdışına açılan kraliyet yoludur" - Sigmund Freud',
    },
    analyze: {
      title: 'Rüyanızı Analiz Edin',
      subtitle: 'Rüyanızı detaylı bir şekilde anlatın ve gizli anlamlarını keşfedin',
      label: 'Rüyanız hakkında bize bilgi verin',
      placeholder: 'Parlayan ağaçlarla dolu bir ormanda yürüyordum...',
      characters: 'karakter',
      submit: 'Rüyayı Analiz Et',
      saving: 'Kaydediliyor...',
      analysisTitle: 'Analiz',
      visualizationTitle: 'Rüya Görselleştirmesi',
      analyzeAnother: 'Başka Bir Rüya Analiz Et',
      confirmationMessage: 'Rüyanız kaydedildi ve kısa süre içinde analiz edilecek.',
      savedMessage: 'Rüyanız kaydedildi ve kısa süre içinde analiz edilecek.',
      trialBadge: '3 Günlük Ücretsiz Deneme',
      privacyLabel: 'Gizlilik',
      privacyPublic: 'Herkese Açık',
      privacyPrivate: 'Özel',
      privacyPublicDesc: 'Toplulukla paylaş',
      privacyPrivateDesc: 'Sadece size özel',
    },
    library: {
      title: 'Rüya Kütüphaneniz',
      subtitle: 'Analiz edilmiş rüyalarınızı ve görselleştirmelerinizi keşfedin',
      empty: 'Kütüphaneniz boş',
      analyzeFirst: 'İlk Rüyanızı Analiz Edin',
      yourDream: 'Rüyanız',
      analysis: 'Analiz',
      pending: 'Analiz Bekleniyor',
      processingMessage: 'Analiz işleniyor',
    },
    social: {
      title: 'Sosyal Akış',
      subtitle: 'Topluluktan herkese açık rüya analizlerini keşfedin',
      searchDreams: 'Rüyaları Ara',
      searchUsers: 'Kullanıcıları Ara',
      searchDreamsPlaceholder: 'Rüyaları ara...',
      searchUsersPlaceholder: 'İsim veya kullanıcı adına göre kullanıcı ara...',
      all: 'Tümü',
      following: 'Takip Edilenler',
      recent: 'Yeni',
      popular: 'Popüler',
      trending: 'Trend',
      pending: 'Beklemede',
      noDreams: 'Henüz herkese açık rüya yok',
      shareFirst: 'İlk Rüyanızı Paylaşın',
      likes: 'beğeni',
      like: 'beğeni',
      comments: 'yorum',
      comment: 'yorum',
      viewAll: 'Tümünü gör',
      noComments: 'Henüz yorum yok',
      writeComment: 'Yorum yaz...',
      signInToComment: 'Yorum yapmak için giriş yapın',
      signIn: 'Giriş Yap',
      justNow: 'Az önce',
      minutesAgo: ' dk önce',
      hoursAgo: ' sa önce',
      daysAgo: ' gün önce',
      noUsersFound: 'Kullanıcı bulunamadı',
      anonymous: 'Anonim',
      checkOutDream: 'Bu rüyaya göz at',
      linkCopied: 'Link panoya kopyalandı',
      deleteDream: 'Rüyanızı silin',
      deleteConfirm: 'Bu rüyayı silmek istediğinizden emin misiniz? Bu işlem tüm beğenileri ve yorumları da silecektir.',
      dreamDeleted: 'Rüya başarıyla silindi',
      deleteFailed: 'Rüya silinemedi. Sadece kendi rüyalarınızı silebilirsiniz.',
      commentAdded: 'Yorum eklendi',
      commentFailed: 'Yorum eklenemedi',
      commentDeleted: 'Yorum silindi',
      commentDeleteFailed: 'Yorum silinemedi',
      deleteComment: 'Yorumu sil',
      endOfFeed: 'Akışın sonuna ulaştınız',
      loadingMore: 'Daha fazla yükleniyor...',
    },
    profile: {
      title: 'Profil',
      manageAccount: 'Hesap ayarlarınızı yönetin',
      userProfile: 'Kullanıcı Profili',
      changeAvatar: 'Avatar değiştir',
      uploading: 'Yükleniyor...',
      publicDreams: 'Herkese Açık Rüyalar',
      likesReceived: 'Alınan Beğeniler',
      comments: 'Yorumlar',
      followers: 'Takipçiler',
      following: 'Takip Edilenler',
      email: 'E-posta',
      memberSince: 'Üyelik Tarihi',
      editProfile: 'Profili Düzenle',
      saveChanges: 'Değişiklikleri Kaydet',
      cancel: 'İptal',
      follow: 'Takip Et',
      followingButton: 'Takip Ediliyor',
      message: 'Mesaj',
      publicDreamsTitle: 'Herkese Açık Rüyalar',
      noPublicDreams: 'Henüz herkese açık rüya yok',
      profileSaved: 'Profil başarıyla kaydedildi',
      profileSaveFailed: 'Profil kaydedilemedi',
      avatarUploaded: 'Avatar başarıyla yüklendi',
      avatarUploadFailed: 'Avatar yüklenemedi',
      followSuccess: 'Bu kullanıcıyı takip ediyorsunuz',
      unfollowSuccess: 'Bu kullanıcıyı takipten çıktınız',
      followFailed: 'Takip durumu güncellenemedi',
      bioPlaceholder: 'Bir biyografi yazın...',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Rüya analizi yolculuğunuzun genel bakışı',
      totalDreams: 'Toplam Rüya',
      completedAnalyses: 'Tamamlanan Analizler',
      pendingAnalyses: 'Bekleyen Analizler',
      analyzeNewDream: 'Yeni Rüya Analiz Et',
      analyzeNewDreamDesc: 'Gizli anlamlarını keşfetmek için yeni bir rüya analiz etmeye başlayın',
      viewLibrary: 'Kütüphaneyi Görüntüle',
      viewLibraryDesc: 'Analiz edilmiş rüyalarınızın tam koleksiyonunu gözden geçirin',
      recentDreams: 'Son Rüyalar',
      viewAll: 'Tümünü Gör',
      noDreams: 'Henüz rüya yok',
      analyzeFirstDream: 'İlk Rüyanızı Analiz Edin',
    },
    contact: {
      title: 'İletişim',
      subtitle: 'Sorularınız mı var? Sizden haber almak isteriz',
      emailSupport: 'E-posta Desteği',
      liveChat: 'Canlı Sohbet',
      available: 'Yardım için 7/24 ulaşılabilir',
      sendMessage: 'Bize Mesaj Gönderin',
      name: 'İsim',
      email: 'E-posta',
      subject: 'Konu',
      message: 'Mesaj',
      send: 'Mesaj Gönder',
      thankYou: 'Mesajınız için teşekkür ederiz! En kısa sürede size geri döneceğiz.',
      namePlaceholder: 'İsminiz',
      emailPlaceholder: 'eposta@ornek.com',
      subjectPlaceholder: 'Bu ne hakkında?',
      messagePlaceholder: 'Bize daha fazla bilgi verin...',
    },
    auth: {
      welcomeBack: 'Tekrar Hoş Geldiniz',
      createAccount: 'Hesap Oluştur',
      continueExploring: 'Rüyalarınızı keşfetmeye devam edin',
      startJourney: 'Bilinçaltına yolculuğunuza başlayın',
      signIn: 'Giriş Yap',
      signUp: 'Kaydol',
      fullName: 'Ad Soyad',
      email: 'E-posta',
      password: 'Şifre',
      orContinueWith: 'Veya şununla devam et',
      googleSignIn: 'Google ile giriş yap',
      enterFullName: 'Ad soyadınızı girin',
      enterEmail: 'eposta@ornek.com',
      enterPassword: 'Şifrenizi girin',
      creatingAccount: 'Hesap oluşturuluyor...',
      signingIn: 'Giriş yapılıyor...',
      checkEmail: 'E-postanızı kontrol edin',
      confirmationSent: 'Size bir onay linki gönderdik. Hesabınızı doğrulamak için lütfen e-postanızı kontrol edin.',
      validationRequired: 'Lütfen bu alanı doldurun',
      validationEmail: 'Lütfen geçerli bir e-posta adresi girin',
      emailAlreadyExists: 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya farklı bir e-posta kullanın.',
      invalidCredentials: 'Geçersiz e-posta veya şifre. Lütfen tekrar deneyin.',
    },
    settings: {
      title: 'Ayarlar',
      blockedUsers: 'Engellenen Kullanıcılar',
      privacy: 'Gizlilik',
      notifications: 'Bildirimler',
      blockedUsersDesc: 'Engellediğiniz kullanıcılar size mesaj gönderemez veya içeriğinizle etkileşime geçemez.',
      noBlockedUsers: 'Engellenen kullanıcı yok',
      unblock: 'Engeli Kaldır',
      unblockConfirm: 'Engelini kaldırmak istediğinizden emin misiniz',
      unblockSuccess: 'engelinden çıkarıldı',
      privacyDesc: 'İçeriğinizi kimlerin görebileceğini ve sizinle etkileşime girebileceğini kontrol edin.',
      profileVisibility: 'Profil Görünürlüğü',
      allowMessagesFrom: 'Mesaj Gönderebilecekler',
      public: 'Herkese Açık',
      private: 'Özel',
      everyone: 'Herkes',
      followingOnly: 'Sadece Takip Ettiklerim',
      notificationsDesc: 'Almak istediğiniz bildirimleri seçin.',
      likesOnDreams: 'Rüya Beğenileri',
      comments: 'Yorumlar',
      newFollowers: 'Yeni Takipçiler',
      directMessages: 'Doğrudan Mesajlar',
    },
    pricing: {
      title: 'Basit ve Şeffaf Fiyatlandırma',
      subtitle: 'Rüya analizi yolculuğunuz için mükemmel planı seçin',
      freeTrial: {
        title: 'Ücretsiz Deneme',
        price: 'Ücretsiz',
        description: 'Submirra\'nın neler yapabileceğini keşfetmek için mükemmel',
        feature1: '3 gün erişim',
        feature2: 'Toplam 3 rüya analizi',
        feature3: '',
        cta: 'Ücretsiz Deneyin',
        signUp: 'Ücretsiz Kaydol',
      },
      standard: {
        title: 'Standart',
        price: '₺450',
        period: 'ay',
        description: 'Düzenli rüya günlüğü ve içgörüler için harika',
        feature1: 'Günde 5 rüya analizi',
        feature2: 'Analiz başına 1 görselleştirme',
        feature3: 'Aylık 10 analiz kaydetme',
        feature4: 'Gelişmiş analiz',
        feature5: 'Her ay yeni depolama alanı',
        cta: 'Standart Al',
      },
      premium: {
        badge: 'En Popüler',
        title: 'Premium',
        price: '₺900',
        period: 'ay',
        description: 'Sınırsız kütüphane ve çoklu görselleştirmelerle bilinçaltınızın kilidini tamamen açın',
        feature1: 'Günde 10 rüya analizi',
        feature2: 'Analiz başına 3 görselleştirme',
        feature3: 'Sınırsız kütüphane depolama',
        feature4: 'Öncelikli analiz',
        feature5: 'Rüya geçmişinizi asla kaybetmeyin',
        cta: 'Premium Ol',
      },
      whySubmirra: {
        title: 'Neden Submirra?',
        description: 'Submirra, bilinçaltı zihniniz, duygusal durumunuz ve iç arzularınız hakkında gizli anlamları ortaya çıkarmak için son teknoloji analiz teknolojisini kullanır. Her analiz, rüyanızın özünü yakalayan benzersiz sürreal görselleştirmeler ile gelir.',
      },
    },
    trial: {
      activateTitle: '3 Günlük Ücretsiz Denemenizi Etkinleştirin',
      activateDesc: 'Submirra\'nın tüm gücünü 3 gün boyunca sınırsız erişimle deneyimleyin',
      activateNow: 'Ücretsiz Denemeyi Başlat',
      activating: 'Etkinleştiriliyor...',
      activated: 'Deneme Etkinleştirildi!',
      activatedDesc: '3 günlük ücretsiz denemeniz başarıyla etkinleştirildi.',
      enjoy3Days: '3 gün boyunca sınırsız rüya analizi ve içgörülerin tadını çıkarın!',
      alreadyUsed: 'Deneme Zaten Kullanıldı',
      alreadyUsedDesc: 'Ücretsiz denemenizi zaten kullandınız. Submirra\'nın keyfini çıkarmaya devam etmek için ücretli bir plana yükseltin.',
      viewPlans: 'Planları Görüntüle',
      whatsIncluded: 'Neler Dahil:',
      feature1: 'Tüm özelliklere 3 gün tam erişim',
      feature2: 'Yapay zeka destekli 3 rüya analizi',
      feature3: 'Rüyalarınız için güzel görselleştirmeler',
      duration: 'Süre',
      threeDays: '3 Gün',
      analyses: 'Analizler',
      threeAnalyses: '3 Rüya',
      features: 'Özellikler',
      fullAccess: 'Tam Erişim',
      startAnalyzing: 'Rüya Analizine Başla',
      trialExpired: 'Deneme Süresi Doldu',
      trialExpiredDesc: '3 günlük ücretsiz denemeniz sona erdi. Devam etmek için yükseltin.',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
