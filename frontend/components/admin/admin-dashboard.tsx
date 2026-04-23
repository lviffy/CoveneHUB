'use client';

import { Profile } from '@/types/database.types';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreateEventForm from './create-event-form';
import EventsList from './events-list';
import { Plus, Calendar, Settings, LogOut, Home, DollarSign, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/convene/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import ProfileModal from '@/components/ui/profile-modal';
import { Sidebar, SidebarBody } from '@/components/ui/sidebar';
import FinancialDashboard from './financial-dashboard';
import ReconciliationDashboard from './reconciliation-dashboard';

interface AdminDashboardProps {
  profile: Profile;
  userEmail?: string;
}

export default function AdminDashboard({ profile, userEmail }: AdminDashboardProps) {
  const searchParams = useSearchParams();
  const normalizeTab = (tab: string | null) => {
    const nextTab = tab || 'events';
    if (nextTab === 'teams') return 'events';
    return nextTab;
  };
  const initialTab = normalizeTab(searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Update active tab when URL changes
  useEffect(() => {
    const tab = normalizeTab(searchParams.get('tab'));
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const sidebarLinks = [
    {
      label: "Events",
      href: "#events",
      icon: <Calendar className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Create Event",
      href: "#create",
      icon: <Plus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Financial",
      href: "#financial",
      icon: <DollarSign className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Reconciliation",
      href: "#reconciliation",
      icon: <BarChart3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Home",
      href: "/",
      icon: <Home className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
  ];

  const handleNavigation = (href: string) => {
    if (href.startsWith('#')) {
      const tab = href.replace('#', '');
      setActiveTab(tab);
    } else {
      router.push(href);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full min-h-screen bg-white dark:bg-neutral-900">
      {/* Fixed Sidebar Wrapper */}
      <div className="md:fixed md:top-0 md:left-0 md:h-screen md:z-40">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-1 mb-4"
              >
                <Link
                  href="/"
                  className="font-normal flex items-center text-sm text-black dark:text-white py-1 relative z-20"
                >
                  <Logo uniColor={true} />
                </Link>
              </motion.div>

            {/* Navigation Links */}
            <div className="mt-4 flex flex-col gap-1">
              {sidebarLinks.map((link, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNavigation(link.href);
                  }}
                  className={cn(
                    "w-full cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left",
                    activeTab === link.href.replace('#', '') && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <div className="flex items-center justify-start gap-3 px-3 py-2.5 group/sidebar pointer-events-none">
                    <div className={cn(
                      "flex-shrink-0",
                      activeTab === link.href.replace('#', '') && "text-[#195ADC]"
                    )}>
                      {link.icon}
                    </div>
                    <motion.span
                      initial={false}
                      animate={{
                        width: sidebarOpen ? "auto" : 0,
                        opacity: sidebarOpen ? 1 : 0,
                      }}
                      transition={{
                        duration: 0.15,
                        ease: "easeInOut",
                      }}
                      className={cn(
                        "text-sm font-medium overflow-hidden whitespace-nowrap",
                        activeTab === link.href.replace('#', '') 
                          ? "text-[#195ADC] dark:text-blue-400" 
                          : "text-neutral-700 dark:text-neutral-200"
                      )}
                    >
                      {link.label}
                    </motion.span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* User Profile at Bottom */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <div
              onClick={() => setIsProfileModalOpen(true)}
              className={cn(
                "flex items-center group/sidebar py-2 cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors",
                sidebarOpen ? "gap-3" : "justify-center"
              )}
            >
              <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold transition-all duration-150">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <motion.div
                initial={false}
                animate={{
                  width: sidebarOpen ? "auto" : 0,
                  opacity: sidebarOpen ? 1 : 0,
                }}
                transition={{
                  duration: 0.15,
                  ease: "easeInOut",
                }}
                className="text-neutral-700 dark:text-neutral-200 text-sm overflow-hidden whitespace-nowrap min-w-0 flex-1"
              >
                <div className="font-medium truncate">{profile.full_name}</div>
                <div className="text-xs text-neutral-500 truncate">{profile.city}</div>
              </motion.div>
            </div>
            
            <div
              onClick={handleSignOut}
              className="cursor-pointer rounded-lg px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1"
            >
              <div className="flex items-center justify-start gap-3 group/sidebar">
                <LogOut className="text-neutral-700 dark:text-neutral-200 group-hover/sidebar:text-red-600 h-5 w-5 flex-shrink-0 transition-colors duration-200" />
                <motion.span
                  initial={false}
                  animate={{
                    width: sidebarOpen ? "auto" : 0,
                    opacity: sidebarOpen ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.15,
                    ease: "easeInOut",
                  }}
                  className="text-neutral-700 dark:text-neutral-200 group-hover/sidebar:text-red-600 text-sm font-medium transition-colors overflow-hidden whitespace-nowrap"
                >
                  Logout
                </motion.span>
              </div>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      </div>

      {/* Main Dashboard Content - Always has margin for the fixed sidebar on desktop */}
      <div className="flex-1 w-full overflow-auto md:ml-[70px]">
        <div className="min-h-screen bg-white relative">
          {/* Grid Background - Bottom 60% only */}
          <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, transparent 40%, #000 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, transparent 40%, #000 100%)",
            }}
          />

          {/* Main Content */}
          <main className="relative z-10 container mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-8 max-w-7xl">
            {/* Page Title */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6 sm:mb-8"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage events, bookings, and finances</p>
            </motion.div>

            {/* Quick Access Tabs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex justify-around p-1 bg-gray-100 rounded-lg w-full overflow-x-auto scrollbar-hide">
                {[
                  { value: 'events', label: 'Events', shortLabel: 'Events', icon: Calendar },
                  { value: 'create', label: 'Create Event', shortLabel: 'Create', icon: Plus },
                  { value: 'financial', label: 'Financial', shortLabel: 'Finance', icon: DollarSign },
                  { value: 'reconciliation', label: 'Reconciliation', shortLabel: 'Reconcile', icon: BarChart3 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  
                  return (
                    <button
                      type="button"
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        'relative flex-1 min-w-0 px-1 sm:px-6 py-2 sm:py-2.5 rounded-md text-sm font-medium transition-all duration-300 cursor-pointer',
                        'flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2',
                        isActive 
                          ? 'text-[#195ADC] bg-white shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      )}
                    >
                      <Icon className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0 pointer-events-none" />
                      <span className="hidden sm:inline whitespace-nowrap pointer-events-none">{tab.label}</span>
                      <span className="sm:hidden text-[10px] leading-tight text-center pointer-events-none">{tab.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Tab Content */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="space-y-6"
            >
              {activeTab === 'events' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                      <div>
                        <CardTitle className="text-xl">All Events</CardTitle>
                        <CardDescription className="mt-1">
                          Manage and monitor all events in the system
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <EventsList />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'create' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                      <div>
                        <CardTitle className="text-xl">Create New Event</CardTitle>
                        <CardDescription className="mt-1">
                          Add a new event for public registration and booking
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <CreateEventForm userId={profile.id} />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'financial' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <FinancialDashboard />
                </motion.div>
              )}

              {activeTab === 'reconciliation' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <ReconciliationDashboard />
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                      <div>
                        <CardTitle className="text-xl">Settings</CardTitle>
                        <CardDescription className="mt-1">
                          Configure your admin preferences
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                          <Settings className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                          Settings panel coming soon.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </main>

          {/* Profile Modal */}
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            userName={profile.full_name}
            userCity={profile.city}
            userEmail={userEmail}
            userPhone={profile.phone || ''}
            userRole={profile.role}
            joinedDate={new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            accentColor="#195ADC"
            onEditProfile={() => {
              // TODO: Implement edit profile functionality
            }}
          />
        </div>
      </div>
    </div>
  );
}
