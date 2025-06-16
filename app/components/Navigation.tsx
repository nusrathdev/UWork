import React, { useState, useEffect } from 'react';
import { Link, Form, useFetcher, useLocation } from '@remix-run/react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface NavigationProps {
  user: User | null;
  unreadNotificationCount?: number;
  recentNotifications?: any[];
}

export default function Navigation({ user, unreadNotificationCount = 0, recentNotifications = [] }: NavigationProps) {
  const location = useLocation();
  const [localNotifications, setLocalNotifications] = useState(recentNotifications);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(() => {
    // Initialize with dismissed notifications from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dismissedNotifications');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [badgeCleared, setBadgeCleared] = useState(false);
  const [currentUnreadCount, setCurrentUnreadCount] = useState(unreadNotificationCount);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fetcher = useFetcher();
  // Save dismissed notifications to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dismissedNotifications', JSON.stringify([...dismissedNotifications]));
      } catch (error) {
        console.error('Failed to save dismissed notifications:', error);
      }
    }
  }, [dismissedNotifications]);

  // Close dropdown when navigating to a different page
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;
    
    const pollNotifications = () => {
      fetcher.load('/api/notifications');
    };
    
    const interval = setInterval(pollNotifications, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [user, fetcher]);  // Update local state when fetcher returns new data
  useEffect(() => {
    if (fetcher.data) {
      const data = fetcher.data as { recentNotifications?: any[], unreadCount?: number };
      if (data.recentNotifications) {
        // Don't filter dismissed notifications here - keep all server data
        setLocalNotifications(data.recentNotifications);
        const newUnreadCount = data.unreadCount || 0;
        
        // Reset badge cleared state if we have more unread notifications than before
        if (newUnreadCount > currentUnreadCount) {
          setBadgeCleared(false);
        }
        
        setCurrentUnreadCount(newUnreadCount);
      }
    }
  }, [fetcher.data, currentUnreadCount]);// Update local notifications when props change, but filter out dismissed ones
  React.useEffect(() => {
    const filteredNotifications = recentNotifications.filter(
      notification => !dismissedNotifications.has(notification.id)
    );
    setLocalNotifications(filteredNotifications);
    
    // Reset badge cleared state if we have more unread notifications than before
    if (unreadNotificationCount > currentUnreadCount) {
      setBadgeCleared(false);
    }
    
    setCurrentUnreadCount(unreadNotificationCount);
  }, [recentNotifications, dismissedNotifications, unreadNotificationCount, currentUnreadCount]);// Handle individual notification removal from dropdown only (local)
  const handleDeleteNotification = (notificationId: string) => {
    // Remove from local dropdown state
    setLocalNotifications(prev => prev.filter(n => n.id !== notificationId));
    // Add to dismissed set to prevent it from reappearing
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
    // Don't close dropdown - keep it open
  };  // Handle clear all notifications from dropdown only (local)
  const handleClearAll = () => {
    // Get all current notification IDs and add them to dismissed set
    const currentNotificationIds = localNotifications.map(n => n.id);
    setDismissedNotifications(prev => new Set([...prev, ...currentNotificationIds]));
    
    // Clear local dropdown state but keep dropdown open
    setLocalNotifications([]);
    // Don't close dropdown - user can close it manually
  };// Calculate the actual unread count excluding dismissed notifications
  const actualUnreadCount = badgeCleared ? 0 : Math.max(
    currentUnreadCount - dismissedNotifications.size,
    localNotifications.filter(notification => !notification.read && !dismissedNotifications.has(notification.id)).length
  );
  // Handle clicking on notification bell (toggle dropdown and clear badge)
  const handleBellClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
    setBadgeCleared(true);
  };  // Handle clicking on individual notification link (clear badge and close dropdown)
  const handleNotificationClick = () => {
    setBadgeCleared(true);
    setDropdownOpen(false);
  };
  // Close dropdown when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking inside the notification dropdown
      if (!target.closest('[data-notification-dropdown]')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      // Use a small delay to ensure our click handlers run first
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [dropdownOpen]);
  // Helper function to get the link for a notification
  const getNotificationLink = (notification: any) => {
    let data = null;
    
    // Safely parse the data field
    try {
      if (notification.data) {
        if (typeof notification.data === 'string') {
          data = JSON.parse(notification.data);
        } else {
          data = notification.data;
        }
      }
    } catch (error) {
      console.error('Error parsing notification data:', error);
      data = null;
    }    switch (notification.type) {
      case 'APPLICATION_APPROVED':
      case 'APPLICATION_REJECTED':
        return data?.applicationId ? `/messages?chat=${data.applicationId}` : null;
      case 'NEW_APPLICATION':
        return data?.projectId ? `/projects/${data.projectId}` : null;
      case 'NEW_MESSAGE':
        return data?.applicationId ? `/messages?chat=${data.applicationId}` : null;
      case 'PROJECT_UPDATE':
        return data?.projectId ? `/projects/${data.projectId}` : null;
      default:
        return null;
    }
  };  // Helper function to render message with clickable project links
  const renderMessageWithLinks = (notification: any) => {
    const message = notification.message;
    let data = null;
    
    try {
      if (notification.data) {
        if (typeof notification.data === 'string') {
          data = JSON.parse(notification.data);
        } else {
          data = notification.data;
        }
      }
    } catch (error) {
      console.error('Error parsing notification data:', error);
      data = null;
    }    // Extract project name from message using regex
    const projectNameMatch = message.match(/[""]([^"""]+)[""]/) || message.match(/"([^"]+)"/);
    const projectName = projectNameMatch ? projectNameMatch[1] : null;
    
    if (projectName) {
      const beforeProject = message.substring(0, message.indexOf(projectNameMatch[0]));
      const afterProject = message.substring(message.indexOf(projectNameMatch[0]) + projectNameMatch[0].length);
      
      // Try to get project ID from multiple sources
      let projectLink = null;
      
      if (data?.projectId) {
        projectLink = `/projects/${data.projectId}`;
      } else if (data?.project?.id) {
        projectLink = `/projects/${data.project.id}`;
      } else if (data?.applicationId) {
        // If we have applicationId, link to chat but user wanted projects
        // Let's try to search for the project by name instead
        projectLink = `/projects?search=${encodeURIComponent(projectName)}`;
      } else {
        // Last resort: search for the project by name
        projectLink = `/projects?search=${encodeURIComponent(projectName)}`;
      }
      
      return (
        <span>
          {beforeProject}
          <Link 
            to={projectLink} 
            className="text-green-600 hover:text-green-700 underline font-medium"
            onClick={handleNotificationClick}
          >
            "{projectName}"
          </Link>
          {afterProject}
        </span>
      );
    }
    
    return message;
  };
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">U</span>
              </div>
              <span className="text-xl font-bold text-gray-900">UWork</span>
            </Link>
            {user && (
              <div className="ml-10 flex space-x-1">
                <Link
                  to="/projects"
                  className="text-gray-700 hover:text-green-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50"
                >
                  Find Work
                </Link>
                <Link
                  to="/projects/new"
                  className="text-gray-700 hover:text-green-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50"
                >
                  Post Job
                </Link>
                <Link
                  to="/messages"
                  className="text-gray-700 hover:text-green-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 relative flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Messages
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (              <div className="flex items-center space-x-3">                {/* Notification Bell - clickable to toggle dropdown */}
                <div className="relative" data-notification-dropdown>
                  <button 
                    onClick={handleBellClick}
                    className="text-gray-700 hover:text-green-600 p-2 rounded-lg transition-colors hover:bg-gray-50 relative"
                  >                    <svg className="w-5 h-5 relative" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                      {actualUnreadCount > 0 && (
                        <circle cx="18" cy="6" r="3" fill="#ef4444" />
                      )}
                    </svg>
                  </button>
                  
                  {/* Notification Dropdown */}
                  <div className={`absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-200 z-50 ${
                    dropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                  }`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        <Link
                          to="/notifications"
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          View all
                        </Link>
                      </div>                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {localNotifications.length > 0 ? (
                          localNotifications.slice(0, 5).map((notification: any) => {
                            const notificationLink = getNotificationLink(notification);
                            
                            return (                              <div
                                key={notification.id}
                                className={`relative group/notification p-3 rounded-lg border hover:bg-gray-100 transition-colors ${
                                  notification.read 
                                    ? 'bg-gray-50 border-gray-200' 
                                    : 'bg-blue-50 border-blue-200'
                                }`}
                              >{/* Delete button */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();
                                    handleDeleteNotification(notification.id);
                                  }}
                                  className="absolute top-2 right-2 opacity-0 group-hover/notification:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 z-10"
                                  title="Remove notification"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>{/* Notification content */}
                                {notificationLink ? (
                                  <Link to={notificationLink} className="block pr-6" onClick={handleNotificationClick}>                                    <h4 className={`font-medium text-sm ${
                                      notification.read ? 'text-gray-700' : 'text-blue-900'
                                    }`}>
                                      {notification.title}
                                    </h4>
                                    <p className={`text-xs mt-1 ${
                                      notification.read ? 'text-gray-600' : 'text-blue-800'
                                    }`}>
                                      {renderMessageWithLinks(notification)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                  </Link>
                                ) : (
                                  <div className="pr-6">                                    <h4 className={`font-medium text-sm ${
                                      notification.read ? 'text-gray-700' : 'text-blue-900'
                                    }`}>
                                      {notification.title}
                                    </h4>
                                    <p className={`text-xs mt-1 ${
                                      notification.read ? 'text-gray-600' : 'text-blue-800'
                                    }`}>
                                      {renderMessageWithLinks(notification)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-gray-500 text-center py-4">
                            No new notifications
                          </div>
                        )}
                      </div>                        {/* Clear All link */}
                      {localNotifications.length > 0 && (
                        <div className="border-t border-gray-200 mt-3 pt-3 text-center">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              handleClearAll();
                            }}
                            className="text-sm text-red-600 hover:text-red-700 underline transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Profile Dropdown */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium hidden sm:block">{user.name}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Profile Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Link
                        to="/dashboard/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </div>
                      </Link>
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Dashboard
                        </div>
                      </Link>
                      <Link
                        to="/payments"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          💳 Payments & Escrow
                        </div>
                      </Link>
                      <Link
                        to="/wallet"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          My Wallet
                        </div>
                      </Link>
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <Form method="post" action="/auth/clear-session">
                          <button
                            type="submit"
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                            onClick={(e) => {
                              try {
                                localStorage.clear();
                                sessionStorage.clear();
                              } catch (err) {
                                console.log("Storage clear failed:", err);
                              }
                            }}
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                          </button>
                        </Form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/auth/login"
                  className="text-gray-700 hover:text-green-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/auth/register"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>  
  );
}