import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    messages: string;
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
      feature1Details: string;
      feature2Title: string;
      feature2Desc: string;
      feature2Details: string;
      feature3Title: string;
      feature3Desc: string;
      feature3Details: string;
      feature4Title: string;
      feature4Desc: string;
      feature4Details: string;
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
      socialTitle: string;
      socialDesc: string;
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
    pendingMessage: string;
    goToLibrary: string;
    processingTitle: string;
    pendingDreamWarning: string;
    dailyLimitExceeded: string;
    analysisTypeLabel: string;
    analysisTypeBasic: string;
    analysisTypeAdvanced: string;
      analysisTypeVisual: string;
      analysisTypeVideo: string;
      analysisTypeBasicDesc: string;
      analysisTypeAdvancedDesc: string;
      analysisTypeVisualDesc: string;
      analysisTypeVideoDesc: string;
      comingSoon: string;
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
    creating: string;
    searchPlaceholder: string;
    noDreamsFound: string;
    download: string;
    makePrivate: string;
    makePublic: string;
    addToFavorites: string;
    removeFromFavorites: string;
    delete: string;
    totalDreams: string;
    publicDreams: string;
    privateDreams: string;
    maxDreamLimit: string;
    all: string;
    favorites: string;
    completed: string;
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
      visualAnalyses: string;
      textAnalyses: string;
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
    previousImage: string;
    nextImage: string;
    close: string;
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
    message: string;
    reportCount: string;
    reports: string;
    dangerLow: string;
    dangerMedium: string;
    dangerHigh: string;
      dangerCritical: string;
      noFollowers: string;
      noFollowing: string;
      developer: string;
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
    acceptTerms: string;
    acceptPrivacy: string;
    mustAcceptTerms: string;
    mustAcceptPrivacy: string;
    readTerms: string;
    readPrivacy: string;
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
    favorites: string;
    favoritesDesc: string;
    noFavorites: string;
    remove: string;
    showReadReceipts: string;
    showReadReceiptsDesc: string;
    readReceiptsEnabled: string;
    readReceiptsDisabled: string;
    readReceiptsUpdateError: string;
  };
  messages: {
    title: string;
    searchPlaceholder: string;
    noMessages: string;
    searchToStart: string;
    typePlaceholder: string;
    loading: string;
    loadingUser: string;
    searchResults: string;
    searching: string;
    deleteConversation: string;
  };
  notifications: {
    title: string;
    deleteAll: string;
    deleteAllConfirm: string;
    deleteAllSuccess: string;
    deleteAllError: string;
    markAllRead: string;
    markAllReadSuccess: string;
    markAllReadError: string;
    deleteError: string;
    noNotifications: string;
    dreamCompleted: string;
    dreamCompletedToast: string;
    trialExpired: string;
    someoneLiked: string;
    someoneCommented: string;
    someoneFollowed: string;
    someone: string;
    newNotification: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    close: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    freePlan: {
      title: string;
      price: string;
      description: string;
      feature1: string;
      feature2: string;
      feature3: string;
      cta: string;
    };
    freeTrial: {
      title: string;
      price: string;
      description: string;
      feature1: string;
      feature2: string;
      feature3: string;
      feature4: string;
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
      feature6: string;
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
      feature6: string;
      feature7: string;
      cta: string;
    };
    ruyagezer: {
      title: string;
      badge: string;
      popularBadge: string;
      description: string;
      feature1: string;
      feature2: string;
      feature3: string;
      feature4: string;
      feature5: string;
      feature6: string;
      feature7: string;
      feature9: string;
      feature10: string;
    };
      whySubmirra: {
        title: string;
        description: string;
      };
      ruyagezer: {
        title: string;
        badge: string;
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
    ipAlreadyUsed: string;
    ipCheckFailed: string;
  };
  footer: {
    termsOfService: string;
    privacyPolicy: string;
    feedback: string;
  };
  terms: {
    title: string;
    lastUpdated: string;
    acceptanceTitle: string;
    acceptanceText: string;
    serviceTitle: string;
    serviceText: string;
    serviceFeature1: string;
    serviceFeature2: string;
    serviceFeature3: string;
    userAccountTitle: string;
    userAccountText: string;
    userAccountFeature1: string;
    userAccountFeature2: string;
    userAccountFeature3: string;
    contentTitle: string;
    contentText: string;
    contentFeature1: string;
    contentFeature2: string;
    contentFeature3: string;
    privacyTitle: string;
    privacyText: string;
    paymentTitle: string;
    paymentText: string;
    paymentFeature1: string;
    paymentFeature2: string;
    paymentFeature3: string;
    terminationTitle: string;
    terminationText: string;
    contactTitle: string;
    contactText: string;
    contactLink: string;
  };
  feedback: {
    title: string;
    subtitle: string;
    categoryLabel: string;
    categoryBug: string;
    categoryFeature: string;
    categoryImprovement: string;
    categoryOther: string;
    messageLabel: string;
    placeholder: string;
    submitButton: string;
    submitting: string;
    successMessage: string;
    errorMessage: string;
    emptyError: string;
    thankYou: string;
    thankYouMessage: string;
    privacyNote: string;
  };
  privacy: {
    title: string;
    lastUpdated: string;
    introductionTitle: string;
    introductionText: string;
    dataCollectionTitle: string;
    dataCollectionText: string;
    dataCollectionItem1: string;
    dataCollectionItem2: string;
    dataCollectionItem3: string;
    dataCollectionItem4: string;
    dataUsageTitle: string;
    dataUsageText: string;
    dataUsageItem1: string;
    dataUsageItem2: string;
    dataUsageItem3: string;
    dataUsageItem4: string;
    dataStorageTitle: string;
    dataStorageText: string;
    dataSecurityTitle: string;
    dataSecurityText: string;
    dataSecurityItem1: string;
    dataSecurityItem2: string;
    dataSecurityItem3: string;
    userRightsTitle: string;
    userRightsText: string;
    userRightsItem1: string;
    userRightsItem2: string;
    userRightsItem3: string;
    userRightsItem4: string;
    cookiesTitle: string;
    cookiesText: string;
    thirdPartyTitle: string;
    thirdPartyText: string;
    changesTitle: string;
    changesText: string;
    contactTitle: string;
    contactText: string;
    contactLink: string;
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
      freeTrial: '7-Day Free Trial',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      messages: 'Messages',
    },
    home: {
      title: 'Submirra',
      subtitle: 'Unlock the Secrets of Your Subconscious',
      description: 'Discover the hidden meanings in your dreams. Submirra analyzes your dreams and creates beautiful visualizations to help you understand your subconscious mind.',
      cta: 'Analyze Your Dream',
      getStarted: 'Get Started',
      learnMore: 'Learn More',
      feature1Title: 'Deep Analysis',
      feature1Desc: 'Get detailed insights about your dreams. We analyze symbols, emotions, and patterns to help you understand what your dreams mean.',
      feature1Details: 'Deep Analysis • Symbols • Emotions • Patterns',
      feature2Title: 'Visual Generation',
      feature2Desc: 'See your dreams come to life with beautiful images. We create unique visualizations that capture the feeling and meaning of your dreams.',
      feature2Details: 'Dream Images • Beautiful Art • High Quality • Personalized',
      feature3Title: 'Personal Library',
      feature3Desc: 'Keep all your dreams in one place. Save your analyses and images, track patterns, and see how your dreams change over time.',
      feature3Details: 'Dream Journal • Save Dreams • Track Patterns • Your History',
      feature4Title: 'Social Community',
      feature4Desc: 'Join a community of dream explorers. Share your dreams, see what others dream about, and connect with people who love exploring dreams.',
      feature4Details: 'Community • Share Dreams • See Others • Connect',
    },
    about: {
      title: 'About Submirra',
      subtitle: 'Bridging the conscious and subconscious',
      missionTitle: 'Our Mission',
      missionDesc: 'We help you understand your dreams. We analyze your dreams to show you what they might mean and how they connect to your feelings and thoughts.',
      howItWorksTitle: 'How It Works',
      howItWorksDesc: 'It is simple and easy:',
      step1: 'Write your dream (up to 5000 characters)',
      step2: 'We analyze your dream',
      step3: 'Get a detailed analysis of what it means',
      step4: 'Receive a beautiful image of your dream',
      step5: 'Save everything in your personal library',
      privacyTitle: 'Privacy & Security',
      privacyDesc: 'Your dreams are private and personal. We keep them safe and secure. Only you can see your dreams unless you choose to share them. We never share your data with anyone else.',
      socialTitle: 'Social Community',
      socialDesc: 'Join our community of dream explorers. Share your dreams with others, see what others dream about, and learn from different perspectives. Your privacy is important - only dreams you choose to share are visible to others.',
      quote: 'Our website is currently under construction. Your valuable feedback and suggestions are very important to us as we work to provide you with the best experience.',
    },
    analyze: {
      title: 'Analyze Your Dream',
      subtitle: 'Write your dream and discover what it means',
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
      trialBadge: '7-Day Free Trial',
      privacyLabel: 'Privacy',
      privacyPublic: 'Public',
      privacyPrivate: 'Private',
      privacyPublicDesc: 'Share with the community',
      privacyPrivateDesc: 'Only visible to you',
      pendingMessage: 'Your dream will be analyzed and visualized shortly. Please wait. Once completed, you will receive a notification. You can check the status of your dream in your library.',
      goToLibrary: 'Go to Library',
      processingTitle: 'Dream Analysis in Progress',
      pendingDreamWarning: 'Please wait for your current dream analysis to complete first. You can analyze a new dream after the current analysis is finished.',
      dailyLimitExceeded: 'Your daily analysis limit has been reached. You have used {used}/{limit} analyses today. Limits will reset in 24 hours.',
      analysisTypeLabel: 'Analysis Type',
      analysisTypeBasic: 'Basic Analysis',
      analysisTypeAdvanced: 'Advanced Analysis',
      analysisTypeVisual: 'Visual Analysis',
      analysisTypeVideo: 'Video Analysis',
      analysisTypeBasicDesc: 'Basic dream meaning',
      analysisTypeAdvancedDesc: 'Detailed dream analysis',
      analysisTypeVisualDesc: 'With dream visualization',
      analysisTypeVideoDesc: 'Animated dream video',
      comingSoon: 'Coming Soon',
    },
    library: {
      title: 'Your Dream Library',
      subtitle: 'Explore your collection of analyzed dreams and visualizations',
      empty: 'Your library is empty',
      analyzeFirst: 'Analyze Your First Dream',
      yourDream: 'Your Dream',
      analysis: 'Analysis',
      processingMessage: 'Analysis is being processed',
      creating: 'Creating...',
      searchPlaceholder: 'Search your dreams...',
      noDreamsFound: 'No dreams found matching your search',
      download: 'Download',
      makePrivate: 'Make Private',
      makePublic: 'Make Public',
      addToFavorites: 'Add to Favorites',
      removeFromFavorites: 'Remove from Favorites',
      delete: 'Delete',
      downloadSuccess: 'Image downloaded successfully',
      downloadError: 'Failed to download image',
      imageNotFound: 'Image not found',
      privacyUpdated: 'Privacy setting updated',
      privacyUpdateError: 'Failed to update privacy setting',
      totalDreams: 'Total Dreams',
      publicDreams: 'Public Dreams',
      privateDreams: 'Private Dreams',
      maxDreamLimit: 'Max Dream Limit',
      all: 'All',
      favorites: 'Favorites',
      completed: 'Completed',
      pending: 'Pending',
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
      visualAnalyses: 'Visual Analyses',
      textAnalyses: 'Text Analyses',
      recent: 'Recent',
      popular: 'Popular',
      trending: 'Trending',
      pending: 'Pending',
      noDreams: 'No public dreams yet',
      shareFirst: 'Share Your First Dream',
      likes: 'likes',
      like: 'like',
      comments: 'Comments',
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
      previousImage: 'Previous image',
      nextImage: 'Next image',
      close: 'Close',
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
      message: 'Message',
      reportCount: 'Reports Received',
      reports: 'reports',
      dangerLow: 'Low Risk',
      dangerMedium: 'Medium Risk',
      dangerHigh: 'High Risk',
      dangerCritical: 'Critical Risk',
      noFollowers: 'No followers yet',
      noFollowing: 'Not following anyone yet',
      developer: 'Developer',
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
      messageSubmirra: 'Message Submirra',
      viaWebsite: 'Via Website',
      pleaseSignInToMessage: 'Please sign in to message Submirra.',
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
      acceptTerms: 'I accept the Terms of Service',
      acceptPrivacy: 'I accept the Privacy Policy',
      mustAcceptTerms: 'You must accept the Terms of Service to create an account',
      mustAcceptPrivacy: 'You must accept the Privacy Policy to create an account',
      readTerms: 'Read Terms of Service',
      readPrivacy: 'Read Privacy Policy',
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
      favorites: 'Favorites',
      favoritesDesc: 'Your favorite friends. Their dreams will be shown with priority.',
      noFavorites: 'No favorite friends yet',
      remove: 'Remove',
    },
    messages: {
      title: 'Messages',
      searchPlaceholder: 'Search users...',
      noMessages: 'No messages yet',
      searchToStart: 'Search for users to start chatting',
      typePlaceholder: 'Type a message...',
      loading: 'Loading...',
      loadingUser: 'Loading user...',
      searchResults: 'Search Results',
      searching: 'Searching...',
      deleteConversation: 'Delete Conversation',
      reply: 'Reply',
      replyPlaceholder: 'Type your reply...',
    },
    notifications: {
      title: 'Notifications',
      deleteAll: 'Delete All',
      deleteAllConfirm: 'Are you sure you want to delete all notifications?',
      deleteAllSuccess: 'All notifications deleted',
      deleteAllError: 'Failed to delete all notifications',
      markAllRead: 'Mark all read',
      markAllReadSuccess: 'All notifications marked as read',
      markAllReadError: 'Failed to mark all as read',
      deleteError: 'Failed to delete notification',
      noNotifications: 'No notifications yet',
      dreamCompleted: 'Your dream analysis is ready! Click to view in your library.',
      dreamCompletedToast: 'Your dream analysis is ready!',
      trialExpired: 'Your 7-day free trial has expired. Upgrade to continue using Submirra!',
      someoneLiked: 'liked your dream',
      someoneCommented: 'commented on your dream',
      someoneFollowed: 'started following you',
      someone: 'Someone',
      newNotification: 'New notification',
      justNow: 'Just now',
      minutesAgo: 'm ago',
      hoursAgo: 'h ago',
      daysAgo: 'd ago',
    },
    pricing: {
      title: 'Simple, Transparent Pricing',
      subtitle: 'Choose the perfect plan for your dream analysis journey',
      freePlan: {
        title: 'Free Plan',
        price: 'Free',
        description: 'Perfect for unlimited basic dream analysis',
        feature1: 'Unlimited basic dream analysis',
        feature2: '30 dreams storage limit in library',
        feature3: 'Access to social features',
        cta: 'Get Free Plan',
      },
      freeTrial: {
        title: 'Free Trial',
        price: 'Free',
        description: 'Perfect for exploring what Submirra can do',
        feature1: '7 days of access',
        feature2: '7 advanced/visual dream analyses total',
        feature3: '',
        feature4: 'Beautiful visualizations for your dreams',
        cta: 'Start Free Trial',
        signUp: 'Sign Up Free',
      },
      standard: {
        title: 'Standard',
        price: '$7',
        period: 'month',
        description: 'Great for regular dream journaling and insights',
        feature1: 'Access to social features',
        feature2: '60 dreams storage limit in library',
        feature3: 'Advanced analysis unlocked',
        feature4: 'Unlimited detailed and advanced analysis',
        feature5: 'Visual analysis unlocked',
        feature6: '3 visual analyses per day',
        feature7: '1 image per analysis',
        cta: 'Get Standard',
      },
      premium: {
        badge: 'Most Popular',
        title: 'Premium',
        price: '$14',
        period: 'month',
        description: 'Unlock your subconscious completely with unlimited library and multiple visualizations',
        feature1: 'Access to social features',
        feature2: '90 dreams storage limit in library',
        feature3: 'Advanced analysis unlocked',
        feature4: 'Unlimited, advanced and priority analysis',
        feature5: 'Visual analysis unlocked',
        feature6: '5 visual analyses per day',
        feature7: '3 images per analysis',
        cta: 'Go Premium',
      },
      whySubmirra: {
        title: 'Why Choose Submirra?',
        description: 'Submirra uses cutting-edge analysis technology to decode your dreams, revealing hidden meanings about your subconscious mind, emotional state, and inner desires. Each analysis comes with unique surreal visualizations that capture the essence of your dream.',
      },
      ruyagezer: {
        title: 'Dreamwalker',
        badge: 'Coming Soon',
        popularBadge: 'Most Popular',
        description: 'Experience the most comprehensive dream analysis with unlimited access to all premium features, advanced visualizations, and exclusive video analysis capabilities.',
        feature1: 'Access to social features',
        feature2: 'Unlimited dreams storage limit in library',
        feature3: 'Advanced analysis unlocked',
        feature4: 'Unlimited, advanced and priority analysis',
        feature5: 'Visual analysis unlocked',
        feature6: '7 visual analyses per day',
        feature7: '3 images per analysis',
        feature9: 'Video analysis unlocked',
        feature10: '1 video analysis per day',
      },
    },
    trial: {
      activateTitle: 'Activate Your 7-Day Free Trial',
      activateDesc: 'Experience the full power of Submirra with unlimited access for 7 days',
      activateNow: 'Activate Free Trial',
      activating: 'Activating...',
      activated: 'Trial Activated!',
      activatedDesc: 'Your 7-day free trial has been successfully activated.',
      enjoy3Days: 'Enjoy 7 days of unlimited dream analysis and insights!',
      alreadyUsed: 'Trial Already Used',
      alreadyUsedDesc: 'You have already used your free trial. Upgrade to a paid plan to continue enjoying Submirra.',
      viewPlans: 'View Plans',
      whatsIncluded: 'What\'s Included:',
      feature1: '7 days of full access to all features',
      feature2: '7 advanced/visual dream analyses total',
      feature3: 'Beautiful visualizations for your dreams',
      duration: 'Duration',
      threeDays: '7 Days',
      analyses: 'Analyses',
      threeAnalyses: '7 Dreams',
      features: 'Features',
      fullAccess: 'Full Access',
      startAnalyzing: 'Start Analyzing Dreams',
      trialExpired: 'Trial Expired',
      trialExpiredDesc: 'Your 7-day free trial has expired. Upgrade to continue.',
      ipAlreadyUsed: 'This IP address has already used a free trial. Each person can only get one free trial.',
      ipCheckFailed: 'Could not verify eligibility. Please try again.',
    },
    footer: {
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      feedback: 'Feedback',
    },
    terms: {
      title: 'Terms of Service',
      lastUpdated: 'Last updated: December 2024',
      acceptanceTitle: '1. Acceptance of Terms',
      acceptanceText: 'Welcome to Submirra! By accessing and using our platform, you agree to follow these terms. We\'re committed to providing you with a safe and enjoyable experience. If you have any concerns, please contact us.',
      serviceTitle: '2. Description of Service',
      serviceText: 'Submirra provides an advanced dream analysis and visualization platform. Our services include:',
      serviceFeature1: 'Advanced dream analysis and interpretation',
      serviceFeature2: 'Dream visualization generation',
      serviceFeature3: 'Social sharing and community features',
      userAccountTitle: '3. User Accounts',
      userAccountText: 'To access certain features, you must register for an account. You agree to:',
      userAccountFeature1: 'Provide accurate and complete information',
      userAccountFeature2: 'Maintain the security of your account credentials',
      userAccountFeature3: 'Notify us immediately of any unauthorized use',
      contentTitle: '4. User Content',
      contentText: 'You retain ownership of content you submit. By submitting content, you grant us a license to:',
      contentFeature1: 'Use, display, and distribute your content on the platform',
      contentFeature2: 'Process and analyze your dreams using our advanced technology',
      contentFeature3: 'Generate visualizations based on your dream content',
      privacyTitle: '5. Privacy',
      privacyText: 'Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices.',
      paymentTitle: '6. Payment and Subscription',
      paymentText: 'We offer flexible subscription plans to suit your needs:',
      paymentFeature1: 'Monthly subscriptions can be cancelled at any time',
      paymentFeature2: 'You\'ll be notified 7 days before your subscription renews',
      paymentFeature3: 'We offer a 5-day free trial so you can explore all features risk-free',
      terminationTitle: '7. Account Termination',
      terminationText: 'We may suspend accounts that violate our community guidelines or engage in harmful behavior. We always aim to resolve issues fairly and will notify you if any action is taken on your account.',
      contactTitle: '8. Contact Information',
      contactText: 'If you have any questions about these Terms of Service, please visit our',
      contactLink: 'contact page',
    },
    feedback: {
      title: 'Feedback',
      subtitle: 'We value your opinion! Help us improve Submirra',
      categoryLabel: 'Category',
      categoryBug: 'Bug Report',
      categoryFeature: 'Feature Request',
      categoryImprovement: 'Improvement Suggestion',
      categoryOther: 'Other',
      messageLabel: 'Your Feedback',
      placeholder: 'Tell us what you think...',
      submitButton: 'Submit Feedback',
      submitting: 'Submitting...',
      successMessage: 'Thank you for your feedback!',
      errorMessage: 'Failed to submit feedback. Please try again.',
      emptyError: 'Please enter your feedback before submitting.',
      thankYou: 'Thank You!',
      thankYouMessage: 'Your feedback has been received and will be reviewed by our team.',
      privacyNote: 'Your feedback is private and will only be viewed by the Submirra team.',
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: December 2024',
      introductionTitle: '1. Introduction',
      introductionText: 'At Submirra, we take your privacy seriously. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our dream analysis platform. We are committed to maintaining the highest standards of data protection and transparency.',
      dataCollectionTitle: '2. Information We Collect',
      dataCollectionText: 'We collect information that is necessary to provide you with our services:',
      dataCollectionItem1: 'Account information: email address, username, and password (encrypted)',
      dataCollectionItem2: 'Profile information: full name, bio, and avatar (optional)',
      dataCollectionItem3: 'Dream content: your dream descriptions and analysis results',
      dataCollectionItem4: 'Usage data: subscription information, preferences, and interaction history',
      dataUsageTitle: '3. How We Use Your Information',
      dataUsageText: 'We use your information solely to provide and improve our services:',
      dataUsageItem1: 'To process and analyze your dreams using our advanced technology',
      dataUsageItem2: 'To generate personalized visualizations based on your dream content',
      dataUsageItem3: 'To manage your account, subscriptions, and preferences',
      dataUsageItem4: 'To communicate with you about your account, updates, and important notices',
      dataStorageTitle: '4. Data Storage and Retention',
      dataStorageText: 'Your data is stored securely with industry-standard encryption. We retain your information for as long as your account is active or as needed to provide our services. You can delete your account and all associated data at any time from your profile settings.',
      dataSecurityTitle: '5. Data Security',
      dataSecurityText: 'We implement robust security measures to protect your information:',
      dataSecurityItem1: 'All data is encrypted in transit and at rest using advanced encryption protocols',
      dataSecurityItem2: 'Access to your data is restricted to authorized personnel only',
      dataSecurityItem3: 'We regularly monitor our systems for security vulnerabilities and update our security practices',
      userRightsTitle: '6. Your Rights and Choices',
      userRightsText: 'You have full control over your personal information:',
      userRightsItem1: 'Access: You can view and download your data at any time',
      userRightsItem2: 'Modify: You can update your profile information, username, and password',
      userRightsItem3: 'Delete: You can delete your account and all associated data permanently',
      userRightsItem4: 'Privacy: You can control the visibility of your dreams (public or private)',
      cookiesTitle: '7. Cookies and Tracking',
      cookiesText: 'We use essential cookies to maintain your session and provide core functionality. We do not use tracking cookies or third-party analytics that collect personal information without your consent.',
      thirdPartyTitle: '8. Third-Party Services',
      thirdPartyText: 'We use secure third-party services for data storage, authentication, and dream analysis processing. These services are bound by strict privacy agreements and only process your data as necessary to provide our services. We do not sell or share your personal information with any other third parties.',
      changesTitle: '9. Changes to This Policy',
      changesText: 'We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any significant changes by posting the updated policy on this page and updating the "Last updated" date.',
      contactTitle: '10. Contact Us',
      contactText: 'If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please visit our',
      contactLink: 'contact page',
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
      dashboard: 'Kontrol Paneli',
      buy: 'Satın Al',
      freeTrial: '7 Günlük Deneme',
      signIn: 'Giriş Yap',
      signOut: 'Çıkış Yap',
      messages: 'Mesajlar',
    },
    home: {
      title: 'Submirra',
      subtitle: 'Bilinçaltınızın Sırlarını Keşfedin',
      description: 'Rüyalarınızdaki gizli anlamları keşfedin. Submirra rüyalarınızı analiz eder ve güzel görseller oluşturarak bilinçaltınızı anlamanıza yardımcı olur.',
      cta: 'Rüyanı Analiz Et',
      getStarted: 'Başlayın',
      learnMore: 'Daha Fazla Bilgi',
      feature1Title: 'Derin Analiz',
      feature1Desc: 'Rüyalarınız hakkında detaylı bilgi alın. Sembolleri, duyguları ve kalıpları analiz ederek rüyalarınızın ne anlama geldiğini anlamanıza yardımcı oluyoruz.',
      feature1Details: 'Derin Analiz • Semboller • Duygular • Kalıplar',
      feature2Title: 'Görsel Üretimi',
      feature2Desc: 'Rüyalarınızı güzel görsellerle görün. Rüyalarınızın hissini ve anlamını yakalayan özel görseller oluşturuyoruz.',
      feature2Details: 'Rüya Görselleri • Güzel Sanat • Yüksek Kalite • Kişiselleştirilmiş',
      feature3Title: 'Kişisel Kütüphane',
      feature3Desc: 'Tüm rüyalarınızı tek bir yerde saklayın. Analizlerinizi ve görsellerinizi kaydedin, kalıpları takip edin ve rüyalarınızın zamanla nasıl değiştiğini görün.',
      feature3Details: 'Rüya Günlüğü • Rüya Kaydet • Kalıp Takip • Geçmişiniz',
      feature4Title: 'Sosyal Topluluk',
      feature4Desc: 'Rüya keşifçileri topluluğuna katılın. Rüyalarınızı paylaşın, başkalarının rüyalarını görün ve rüyaları seven insanlarla bağlantı kurun.',
      feature4Details: 'Topluluk • Rüya Paylaş • Başkalarını Gör • Bağlan',
    },
    about: {
      title: 'Submirra Hakkında',
      subtitle: 'Bilinç ve bilinçaltı arasında köprü',
      missionTitle: 'Misyonumuz',
      missionDesc: 'Rüyalarınızı anlamanıza yardımcı oluyoruz. Rüyalarınızı analiz ederek ne anlama geldiklerini ve duygularınız ve düşüncelerinizle nasıl bağlantılı olduklarını gösteriyoruz.',
      howItWorksTitle: 'Nasıl Çalışır',
      howItWorksDesc: 'Çok basit ve kolay:',
      step1: 'Rüyanızı yazın (5000 karaktere kadar)',
      step2: 'Rüyanızı analiz ediyoruz',
      step3: 'Ne anlama geldiğine dair detaylı analiz alın',
      step4: 'Rüyanızın güzel bir görselini alın',
      step5: 'Her şeyi kişisel kütüphanenizde saklayın',
      privacyTitle: 'Gizlilik ve Güvenlik',
      privacyDesc: 'Rüyalarınız özel ve kişiseldir. Onları güvenli bir şekilde saklıyoruz. Paylaşmayı seçmediğiniz sürece rüyalarınızı sadece siz görebilirsiniz. Verilerinizi başka kimseyle paylaşmıyoruz.',
      socialTitle: 'Sosyal Topluluk',
      socialDesc: 'Rüya keşifçileri topluluğumuza katılın. Rüyalarınızı başkalarıyla paylaşın, başkalarının rüyalarını görün ve farklı bakış açılarından öğrenin. Gizliliğiniz önemlidir - sadece paylaşmayı seçtiğiniz rüyalar başkaları tarafından görülebilir.',
      quote: 'Sitemiz henüz yapım aşamasındadır. Siz değerli kullanıcılarımızı memnun etmek için geri bildirimleriniz ve eleştirileriniz bizim için çok önemlidir.',
    },
    analyze: {
      title: 'Rüyanızı Analiz Edin',
      subtitle: 'Rüyanızı yazın ve ne anlama geldiğini keşfedin',
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
      trialBadge: '7 Günlük Ücretsiz Deneme',
      privacyLabel: 'Gizlilik',
      privacyPublic: 'Herkese Açık',
      privacyPrivate: 'Özel',
      privacyPublicDesc: 'Toplulukla paylaş',
      privacyPrivateDesc: 'Sadece size özel',
      pendingMessage: 'Rüyanız kısa süre içinde analiz edilip görselleştirilecektir. Lütfen bekleyiniz. Tamamlandıktan sonra size bildirim gelecektir, kütüphanenizden rüyanızın durumunu kontrol edebilirsiniz.',
      goToLibrary: 'Kütüphaneye Git',
      processingTitle: 'Rüya Analizi Devam Ediyor',
      pendingDreamWarning: 'Lütfen önce mevcut rüya analizinizin tamamlanmasını bekleyin. Analiz tamamlandıktan sonra yeni bir rüya analiz edebilirsiniz.',
      dailyLimitExceeded: 'Günlük analiz limitiniz tükendi. Bugün {used}/{limit} analiz yaptınız. Limitler 24 saat sonra yenilenecektir.',
      analysisTypeLabel: 'Analiz Tipi',
      analysisTypeBasic: 'Temel Analiz',
      analysisTypeAdvanced: 'Gelişmiş Analiz',
      analysisTypeVisual: 'Görselli Analiz',
      analysisTypeVideo: 'Videolu Analiz',
      analysisTypeBasicDesc: 'Temel rüya anlamı',
      analysisTypeAdvancedDesc: 'Detaylı rüya analizi',
      analysisTypeVisualDesc: 'Rüya görselleştirmesi ile',
      analysisTypeVideoDesc: 'Animasyonlu rüya videosu',
      comingSoon: 'Yakında',
    },
    library: {
      title: 'Rüya Kütüphaneniz',
      subtitle: 'Analiz edilmiş rüyalarınızı ve görselleştirmelerinizi keşfedin',
      empty: 'Kütüphaneniz boş',
      analyzeFirst: 'İlk Rüyanızı Analiz Edin',
      yourDream: 'Rüyanız',
      analysis: 'Analiz',
      processingMessage: 'Analiz işleniyor',
      creating: 'Oluşturuluyor...',
      searchPlaceholder: 'Rüyalarınızda arayın...',
      noDreamsFound: 'Aramanızla eşleşen rüya bulunamadı',
      download: 'İndir',
      makePrivate: 'Özel Yap',
      makePublic: 'Herkese Aç',
      addToFavorites: 'Favorilere Ekle',
      removeFromFavorites: 'Favorilerden Çıkar',
      delete: 'Sil',
      downloadSuccess: 'Görsel başarıyla indirildi',
      downloadError: 'Görsel indirilemedi',
      imageNotFound: 'Görsel bulunamadı',
      privacyUpdated: 'Gizlilik ayarı güncellendi',
      privacyUpdateError: 'Gizlilik ayarı değiştirilemedi',
      totalDreams: 'Toplam Rüya',
      publicDreams: 'Herkese Açık Rüyalar',
      privateDreams: 'Özel Rüyalar',
      maxDreamLimit: 'Maksimum Rüya Limiti',
      all: 'Tümü',
      favorites: 'Favoriler',
      completed: 'Tamamlanan',
      pending: 'Beklemede',
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
      visualAnalyses: 'Görselli Analizler',
      textAnalyses: 'Yazılı Analizler',
      recent: 'Yeni',
      popular: 'Popüler',
      trending: 'Trend',
      pending: 'Beklemede',
      noDreams: 'Henüz herkese açık rüya yok',
      shareFirst: 'İlk Rüyanızı Paylaşın',
      likes: 'beğeni',
      like: 'beğeni',
      comments: 'Yorumlar',
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
      previousImage: 'Önceki görsel',
      nextImage: 'Sonraki görsel',
      close: 'Kapat',
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
      message: 'Mesaj',
      reportCount: 'Alınan Şikayetler',
      reports: 'şikayet',
      dangerLow: 'Düşük Risk',
      dangerMedium: 'Orta Risk',
      dangerHigh: 'Yüksek Risk',
      dangerCritical: 'Kritik Risk',
      noFollowers: 'Henüz takipçi yok',
      noFollowing: 'Henüz kimseyi takip etmiyor',
      developer: 'Developer',
    },
    dashboard: {
      title: 'Kontrol Paneli',
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
      messageSubmirra: 'Mesajlaş',
      viaWebsite: 'Site üzerinden',
      pleaseSignInToMessage: 'Mesajlaşmak için lütfen giriş yapın.',
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
      fullName: 'Adınız',
      email: 'E-posta',
      password: 'Şifre',
      orContinueWith: 'Veya şununla devam et',
      googleSignIn: 'Google ile giriş yap',
      enterFullName: 'Adınızı girin',
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
      acceptTerms: 'Hizmet Şartlarını kabul ediyorum',
      acceptPrivacy: 'Gizlilik Politikasını kabul ediyorum',
      mustAcceptTerms: 'Hesap oluşturmak için Hizmet Şartlarını kabul etmelisiniz',
      mustAcceptPrivacy: 'Hesap oluşturmak için Gizlilik Politikasını kabul etmelisiniz',
      readTerms: 'Hizmet Şartlarını Oku',
      readPrivacy: 'Gizlilik Politikasını Oku',
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
      favorites: 'Favoriler',
      favoritesDesc: 'Favori arkadaşlarınız. Bu kullanıcıların rüyaları öncelikli olarak gösterilir.',
      noFavorites: 'Henüz favori arkadaşınız yok',
      remove: 'Çıkar',
      showReadReceipts: 'Görüldü Bilgisi',
      showReadReceiptsDesc: 'Diğer kullanıcıların mesajlarınızı görüp görmediğini bilmelerine izin verin',
      readReceiptsEnabled: 'Görüldü bilgisi açıldı',
      readReceiptsDisabled: 'Görüldü bilgisi kapatıldı',
      readReceiptsUpdateError: 'Görüldü bilgisi ayarı güncellenemedi',
    },
    messages: {
      title: 'Mesajlar',
      searchPlaceholder: 'Kullanıcı ara...',
      noMessages: 'Henüz mesaj yok',
      searchToStart: 'Sohbet başlatmak için kullanıcı arayın',
      typePlaceholder: 'Mesaj yazın...',
      loading: 'Yükleniyor...',
      loadingUser: 'Kullanıcı yükleniyor...',
      searchResults: 'Arama Sonuçları',
      searching: 'Aranıyor...',
      deleteConversation: 'Sohbeti Sil',
    },
    notifications: {
      title: 'Bildirimler',
      deleteAll: 'Bütün Bildirimleri Sil',
      deleteAllConfirm: 'Tüm bildirimleri silmek istediğinizden emin misiniz?',
      deleteAllSuccess: 'Tüm bildirimler silindi',
      deleteAllError: 'Bildirimler silinemedi',
      markAllRead: 'Tümünü okundu işaretle',
      markAllReadSuccess: 'Tüm bildirimler okundu olarak işaretlendi',
      markAllReadError: 'Tümünü okundu işaretleme başarısız',
      deleteError: 'Bildirim silinemedi',
      noNotifications: 'Henüz bildirim yok',
      dreamCompleted: 'Rüya analiziniz hazır! Kütüphanenizde görüntülemek için tıklayın.',
      dreamCompletedToast: 'Rüya analiziniz hazır!',
      trialExpired: '7 günlük ücretsiz denemeniz sona erdi. Submirra\'yı kullanmaya devam etmek için yükseltin!',
      someoneLiked: 'rüyanızı beğendi',
      someoneCommented: 'rüyanıza yorum yaptı',
      someoneFollowed: 'sizi takip etmeye başladı',
      someone: 'Birisi',
      newNotification: 'Yeni bildirim',
      justNow: 'Az önce',
      minutesAgo: 'dakika önce',
      hoursAgo: 'saat önce',
      daysAgo: 'gün önce',
      close: 'Kapat',
    },
    pricing: {
      title: 'Basit ve Şeffaf Fiyatlandırma',
      subtitle: 'Rüya analizi yolculuğunuz için mükemmel planı seçin',
      freePlan: {
        title: 'Bedava Plan',
        price: 'Ücretsiz',
        description: 'Sınırsız temel rüya analizi için mükemmel',
        feature1: 'Sınırsız bedava temel rüya analizi',
        feature2: 'Kütüphanede 30 rüyaya kadar saklama limiti',
        feature3: 'Sosyal kısmına erişim hakkı',
        cta: 'Bedava Planı Al',
      },
      freeTrial: {
        title: 'Ücretsiz Deneme',
        price: 'Ücretsiz',
        description: 'Submirra\'nın neler yapabileceğini keşfetmek için mükemmel',
        feature1: '7 gün erişim',
        feature2: 'Toplam 7 gelişmiş/görselli rüya analizi',
        feature3: '',
        feature4: 'Rüyalarınız için güzel görselleştirmeler',
        cta: 'Ücretsiz Deneyin',
        signUp: 'Ücretsiz Kaydol',
      },
      standard: {
        title: 'Standart',
        price: '₺300',
        period: 'ay',
        description: 'Düzenli rüya günlüğü ve içgörüler için harika',
        feature1: 'Sosyal kısmına erişim hakkı',
        feature2: 'Kütüphanede 60 adet rüyaya kadar saklama limiti',
        feature3: 'Gelişmiş analiz kilidi açılır',
        feature4: 'Sınırsız, daha detaylı ve gelişmiş analiz',
        feature5: 'Görselli analiz kilidi açılır',
        feature6: 'Günde 3 rüyaya kadar görselli analiz hakkı',
        feature7: 'Analiz başına 1 görsel',
        cta: 'Standart Al',
      },
      premium: {
        badge: 'En Popüler',
        title: 'Premium',
        price: '₺600',
        period: 'ay',
        description: 'Sınırsız kütüphane ve çoklu görselleştirmelerle bilinçaltınızın kilidini tamamen açın',
        feature1: 'Sosyal kısmına erişim hakkı',
        feature2: 'Kütüphanede 90 adet rüyaya kadar saklama limiti',
        feature3: 'Gelişmiş analiz kilidi açılır',
        feature4: 'Sınırsız, gelişmiş ve öncelikli analiz hakkı',
        feature5: 'Görselli analiz kilidi açılır',
        feature6: 'Günde 5 defaya kadar görselli analiz hakkı',
        feature7: 'Analiz başına 3 görsel',
        cta: 'Premium Ol',
      },
      whySubmirra: {
        title: 'Neden Submirra?',
        description: 'Submirra, bilinçaltı zihniniz, duygusal durumunuz ve iç arzularınız hakkında gizli anlamları ortaya çıkarmak için son teknoloji analiz teknolojisini kullanır. Her analiz, rüyanızın özünü yakalayan benzersiz sürreal görselleştirmeler ile gelir.',
      },
      ruyagezer: {
        title: 'Rüyagezer',
        badge: 'Yakında',
        popularBadge: 'En Popüler',
        description: 'Tüm premium özelliklere, gelişmiş görselleştirmelere ve özel videolu analiz yeteneklerine sınırsız erişimle en kapsamlı rüya analizi deneyimini yaşayın.',
        feature1: 'Sosyal kısmına erişim hakkı',
        feature2: 'Kütüphanede sınırsız rüyaya kadar saklama limiti',
        feature3: 'Gelişmiş analiz kilidi açılır',
        feature4: 'Sınırsız, gelişmiş ve öncelikli analiz hakkı',
        feature5: 'Analiz sayfasında görselli analiz kilidi açılır',
        feature6: 'Günde 7 defaya kadar görselli analiz hakkı',
        feature7: 'Analiz sayfasında görselli analiz seçilirse, analiz başına 3 görsel',
        feature9: 'Videolu analiz kilidi açılır',
        feature10: 'Günde 1 defaya kadar videolu analiz hakkı',
      },
    },
    trial: {
      activateTitle: '7 Günlük Ücretsiz Denemenizi Etkinleştirin',
      activateDesc: 'Submirra\'nın tüm gücünü 7 gün boyunca sınırsız erişimle deneyimleyin',
      activateNow: 'Ücretsiz Denemeyi Başlat',
      activating: 'Etkinleştiriliyor...',
      activated: 'Deneme Etkinleştirildi!',
      activatedDesc: '7 günlük ücretsiz denemeniz başarıyla etkinleştirildi.',
      enjoy3Days: '7 gün boyunca sınırsız rüya analizi ve içgörülerin tadını çıkarın!',
      alreadyUsed: 'Deneme Zaten Kullanıldı',
      alreadyUsedDesc: 'Ücretsiz denemenizi zaten kullandınız. Submirra\'nın keyfini çıkarmaya devam etmek için ücretli bir plana yükseltin.',
      viewPlans: 'Planları Görüntüle',
      whatsIncluded: 'Neler Dahil:',
      feature1: 'Tüm özelliklere 7 gün tam erişim',
      feature2: 'Toplam 7 gelişmiş/görselli rüya analizi',
      feature3: 'Rüyalarınız için güzel görselleştirmeler',
      duration: 'Süre',
      threeDays: '7 Gün',
      analyses: 'Analizler',
      threeAnalyses: '7 Rüya',
      features: 'Özellikler',
      fullAccess: 'Tam Erişim',
      startAnalyzing: 'Rüya Analizine Başla',
      trialExpired: 'Deneme Süresi Doldu',
      trialExpiredDesc: '7 günlük ücretsiz denemeniz sona erdi. Devam etmek için yükseltin.',
      ipAlreadyUsed: 'Bu IP adresinden daha önce ücretsiz deneme kullanılmış. Her kişi yalnızca bir kez ücretsiz deneme alabilir.',
      ipCheckFailed: 'Uygunluk kontrolü yapılamadı. Lütfen tekrar deneyin.',
    },
    footer: {
      termsOfService: 'Hizmet Şartları',
      privacyPolicy: 'Gizlilik Politikası',
      feedback: 'Geri Bildirim',
    },
    terms: {
      title: 'Hizmet Şartları',
      lastUpdated: 'Son güncelleme: Aralık 2024',
      acceptanceTitle: '1. Şartların Kabulü',
      acceptanceText: 'Submirra\'ya hoş geldiniz! Platformumuzu kullanarak bu şartları kabul etmiş olursunuz. Size güvenli ve keyifli bir deneyim sunmaya kararlıyız. Herhangi bir sorunuz varsa, lütfen bizimle iletişime geçin.',
      serviceTitle: '2. Hizmet Açıklaması',
      serviceText: 'Submirra, gelişmiş rüya analizi ve görselleştirme platformu sağlar. Hizmetlerimiz şunları içerir:',
      serviceFeature1: 'Gelişmiş rüya analizi ve yorumlama',
      serviceFeature2: 'Rüya görselleştirme üretimi',
      serviceFeature3: 'Sosyal paylaşım ve topluluk özellikleri',
      userAccountTitle: '3. Kullanıcı Hesapları',
      userAccountText: 'Belirli özelliklere erişmek için bir hesap oluşturmanız gerekir. Şunları kabul edersiniz:',
      userAccountFeature1: 'Doğru ve eksiksiz bilgi sağlamak',
      userAccountFeature2: 'Hesap bilgilerinizin güvenliğini korumak',
      userAccountFeature3: 'Yetkisiz kullanım durumunda derhal bizi bilgilendirmek',
      contentTitle: '4. Kullanıcı İçeriği',
      contentText: 'Gönderdiğiniz içeriğin sahipliği size aittir. İçerik göndererek, bize şu lisansı verirsiniz:',
      contentFeature1: 'İçeriğinizi platformda kullanma, gösterme ve dağıtma',
      contentFeature2: 'Gelişmiş teknolojimizi kullanarak rüyalarınızı işleme ve analiz etme',
      contentFeature3: 'Rüya içeriğinize dayalı görselleştirmeler oluşturma',
      privacyTitle: '5. Gizlilik',
      privacyText: 'Gizliliğiniz bizim için önemlidir. Uygulamalarımızı anlamak için lütfen hizmetin kullanımınızı da yöneten Gizlilik Politikamızı inceleyin.',
      paymentTitle: '6. Ödeme ve Abonelik',
      paymentText: 'İhtiyaçlarınıza uygun esnek abonelik planları sunuyoruz:',
      paymentFeature1: 'Aylık abonelikler istediğiniz zaman iptal edilebilir',
      paymentFeature2: 'Aboneliğiniz yenilenmeden 7 gün önce bilgilendirileceksiniz',
      paymentFeature3: 'Tüm özellikleri risk almadan keşfetmeniz için 5 günlük ücretsiz deneme sunuyoruz',
      terminationTitle: '7. Hesap Sonlandırma',
      terminationText: 'Topluluk kurallarımızı ihlal eden veya zararlı davranışlarda bulunan hesapları askıya alabiliriz. Sorunları adil bir şekilde çözmeyi hedefliyoruz ve hesabınızda herhangi bir işlem yapılırsa sizi bilgilendireceğiz.',
      contactTitle: '8. İletişim Bilgileri',
      contactText: 'Bu Hizmet Şartları hakkında sorularınız varsa, lütfen',
      contactLink: 'iletişim sayfamızı',
    },
    feedback: {
      title: 'Geri Bildirim',
      subtitle: 'Görüşünüz bizim için değerli! Submirra\'yı geliştirmemize yardımcı olun',
      categoryLabel: 'Kategori',
      categoryBug: 'Hata Bildirimi',
      categoryFeature: 'Özellik İsteği',
      categoryImprovement: 'İyileştirme Önerisi',
      categoryOther: 'Diğer',
      messageLabel: 'Geri Bildiriminiz',
      placeholder: 'Düşüncelerinizi paylaşın...',
      submitButton: 'Geri Bildirim Gönder',
      submitting: 'Gönderiliyor...',
      successMessage: 'Geri bildiriminiz için teşekkür ederiz!',
      errorMessage: 'Geri bildirim gönderilemedi. Lütfen tekrar deneyin.',
      emptyError: 'Göndermeden önce lütfen geri bildiriminizi girin.',
      thankYou: 'Teşekkürler!',
      thankYouMessage: 'Geri bildiriminiz alındı ve ekibimiz tarafından incelenecektir.',
      privacyNote: 'Geri bildiriminiz gizlidir ve yalnızca Submirra ekibi tarafından görüntülenecektir.',
    },
    privacy: {
      title: 'Gizlilik Politikası',
      lastUpdated: 'Son güncelleme: Aralık 2024',
      introductionTitle: '1. Giriş',
      introductionText: 'Submirra\'da gizliliğinize önem veriyoruz. Bu Gizlilik Politikası, rüya analizi platformumuzu kullandığınızda kişisel bilgilerinizi nasıl topladığımızı, kullandığımızı, sakladığımızı ve koruduğumuzu açıklar. En yüksek veri koruma ve şeffaflık standartlarını sürdürmeye kararlıyız.',
      dataCollectionTitle: '2. Topladığımız Bilgiler',
      dataCollectionText: 'Size hizmetlerimizi sunmak için gerekli bilgileri topluyoruz:',
      dataCollectionItem1: 'Hesap bilgileri: e-posta adresi, kullanıcı adı ve şifre (şifrelenmiş)',
      dataCollectionItem2: 'Profil bilgileri: ad soyad, biyografi ve avatar (isteğe bağlı)',
      dataCollectionItem3: 'Rüya içeriği: rüya açıklamalarınız ve analiz sonuçları',
      dataCollectionItem4: 'Kullanım verileri: abonelik bilgileri, tercihler ve etkileşim geçmişi',
      dataUsageTitle: '3. Bilgilerinizi Nasıl Kullanıyoruz',
      dataUsageText: 'Bilgilerinizi yalnızca hizmetlerimizi sunmak ve iyileştirmek için kullanıyoruz:',
      dataUsageItem1: 'Gelişmiş teknolojimizi kullanarak rüyalarınızı işlemek ve analiz etmek',
      dataUsageItem2: 'Rüya içeriğinize dayalı kişiselleştirilmiş görselleştirmeler oluşturmak',
      dataUsageItem3: 'Hesabınızı, aboneliklerinizi ve tercihlerinizi yönetmek',
      dataUsageItem4: 'Hesabınız, güncellemeler ve önemli bildirimler hakkında sizinle iletişim kurmak',
      dataStorageTitle: '4. Veri Depolama ve Saklama',
      dataStorageText: 'Verileriniz endüstri standardı şifreleme ile Supabase sunucularında güvenli bir şekilde saklanır. Hesabınız aktif olduğu sürece veya hizmetlerimizi sunmak için gerekli olduğu sürece bilgilerinizi saklarız. Hesabınızı ve tüm ilişkili verileri istediğiniz zaman profil ayarlarınızdan silebilirsiniz.',
      dataSecurityTitle: '5. Veri Güvenliği',
      dataSecurityText: 'Bilgilerinizi korumak için güçlü güvenlik önlemleri uyguluyoruz:',
      dataSecurityItem1: 'Tüm veriler, gelişmiş şifreleme protokolleri kullanılarak aktarım sırasında ve beklerken şifrelenir',
      dataSecurityItem2: 'Verilerinize erişim yalnızca yetkili personelle sınırlıdır',
      dataSecurityItem3: 'Sistemlerimizi düzenli olarak güvenlik açıkları için izliyor ve güvenlik uygulamalarımızı güncelliyoruz',
      userRightsTitle: '6. Haklarınız ve Seçenekleriniz',
      userRightsText: 'Kişisel bilgileriniz üzerinde tam kontrolünüz var:',
      userRightsItem1: 'Erişim: Verilerinizi istediğiniz zaman görüntüleyebilir ve indirebilirsiniz',
      userRightsItem2: 'Değiştirme: Profil bilgilerinizi, kullanıcı adınızı ve şifrenizi güncelleyebilirsiniz',
      userRightsItem3: 'Silme: Hesabınızı ve tüm ilişkili verileri kalıcı olarak silebilirsiniz',
      userRightsItem4: 'Gizlilik: Rüyalarınızın görünürlüğünü kontrol edebilirsiniz (herkese açık veya özel)',
      cookiesTitle: '7. Çerezler ve İzleme',
      cookiesText: 'Oturumunuzu sürdürmek ve temel işlevselliği sağlamak için gerekli çerezleri kullanıyoruz. Kişisel bilgi toplayan izleme çerezleri veya üçüncü taraf analitik araçları kullanmıyoruz.',
      thirdPartyTitle: '8. Üçüncü Taraf Hizmetler',
      thirdPartyText: 'Güvenli veri depolama, kimlik doğrulama ve rüya analizi işleme için güvenilir üçüncü taraf hizmetler kullanıyoruz. Bu hizmetler katı gizlilik anlaşmalarıyla bağlıdır ve verilerinizi yalnızca hizmetlerimizi sunmak için gerekli olduğu şekilde işler. Kişisel bilgilerinizi başka hiçbir üçüncü taraf ile satmıyor veya paylaşmıyoruz.',
      changesTitle: '9. Bu Politikanın Değişiklikleri',
      changesText: 'Uygulamalarımızdaki veya yasal gerekliliklerdeki değişiklikleri yansıtmak için bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Önemli değişikliklerden, güncellenmiş politikayı bu sayfada yayınlayarak ve "Son güncelleme" tarihini güncelleyerek sizi bilgilendireceğiz.',
      contactTitle: '10. Bize Ulaşın',
      contactText: 'Bu Gizlilik Politikası veya kişisel bilgileriniz hakkında herhangi bir sorunuz, endişeniz veya talebiniz varsa, lütfen',
      contactLink: 'iletişim sayfamızı',
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
  // Initialize with default language, will be updated from localStorage in useEffect
  const [language, setLanguage] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('submirra_language');
    if (stored === 'tr' || stored === 'en') {
      setLanguage(stored);
    }
  }, []);

  // Save language to localStorage when it changes
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('submirra_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: translations[language] }}>
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
