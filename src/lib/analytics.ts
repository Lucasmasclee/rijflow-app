import { track } from '@vercel/analytics';

// Analytics utility functions
export const analytics = {
  // Track landing page visit
  trackLandingPageVisit: () => {
    track('landing_page_visit', {
      page: 'landing',
      timestamp: new Date().toISOString()
    });
  },

  // Track YouTube video click
  trackYouTubeVideoClick: (videoId: string) => {
    track('youtube_video_click', {
      video_id: videoId,
      page: 'landing',
      timestamp: new Date().toISOString()
    });
  },

  // Track YouTube video play time
  trackYouTubeVideoPlayTime: (videoId: string, playTimeSeconds: number) => {
    track('youtube_video_play_time', {
      video_id: videoId,
      play_time_seconds: playTimeSeconds,
      page: 'landing',
      timestamp: new Date().toISOString()
    });
  },

  // Track login page visit
  trackLoginPageVisit: () => {
    track('login_page_visit', {
      page: 'login',
      timestamp: new Date().toISOString()
    });
  },

  // Track signup page visit
  trackSignupPageVisit: () => {
    track('signup_page_visit', {
      page: 'signup',
      timestamp: new Date().toISOString()
    });
  },

  // Track time spent on landing page
  trackLandingPageTimeSpent: (timeSpentSeconds: number) => {
    track('landing_page_time_spent', {
      time_spent_seconds: timeSpentSeconds,
      page: 'landing',
      timestamp: new Date().toISOString()
    });
  },

  // Track page view with custom properties
  trackPageView: (page: string, properties?: Record<string, any>) => {
    track('page_view', {
      page,
      ...properties,
      timestamp: new Date().toISOString()
    });
  }
};
