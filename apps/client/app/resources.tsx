import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

/**
 * The Freshman Guide: a one-stop link tree of everything a new CMU student
 * needs — accounts, academics, food, health, safety, money, getting around,
 * and getting involved. Public page, no sign-in required.
 *
 * Links point at canonical top-level CMU pages (most stable URLs). If one
 * breaks, tell us and we'll fix it.
 */

interface ResourceLink {
  title: string;
  description: string;
  url: string;
}

interface ResourceSection {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  blurb: string;
  links: ResourceLink[];
}

const SECTIONS: ResourceSection[] = [
  {
    id: 'start',
    title: 'Start here: your accounts',
    icon: 'key-outline',
    blurb: 'The logins everything else depends on.',
    links: [
      { title: 'Andrew Account & Email', description: 'Your CMU identity — email, WiFi, printing, everything uses it.', url: 'https://www.cmu.edu/computing/services/comm-collab/email-calendar/' },
      { title: 'SIO (Student Information Online)', description: 'Register for classes, view grades, pay bills, update info.', url: 'https://www.cmu.edu/hub/sio/' },
      { title: 'Canvas', description: 'Course materials, assignments, and grades for most classes.', url: 'https://canvas.cmu.edu' },
      { title: 'Stellic', description: 'Degree audit — track requirements and plan future semesters.', url: 'https://cmu.stellic.com' },
      { title: 'Workday', description: 'Campus job paperwork, payroll, and direct deposit.', url: 'https://www.cmu.edu/my-workday-toolkit/' },
      { title: 'Duo Two-Factor (2fa)', description: 'Required for almost every CMU login — set it up first.', url: 'https://www.cmu.edu/computing/services/security/identity-access/authentication/' },
    ],
  },
  {
    id: 'academics',
    title: 'Classes & academics',
    icon: 'school-outline',
    blurb: 'Registering, planning, and getting help when a course fights back.',
    links: [
      { title: 'Schedule of Classes', description: 'Every course offered, with times, rooms, and instructors.', url: 'https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search' },
      { title: 'Academic Calendar', description: 'Semester dates, add/drop deadlines, breaks, and finals.', url: 'https://www.cmu.edu/hub/calendar/' },
      { title: 'The HUB', description: 'Registration, financial aid, student accounts — the admin front door.', url: 'https://www.cmu.edu/hub/' },
      { title: 'Student Academic Success Center', description: 'Free tutoring, academic coaching, and communication support.', url: 'https://www.cmu.edu/student-success/' },
      { title: 'FCE (Course Evaluations)', description: 'What past students thought of a course before you take it.', url: 'https://www.cmu.edu/hub/fce/' },
      { title: 'University Libraries', description: 'Study spaces, research help, and course reserves at Hunt & Sorrells.', url: 'https://www.library.cmu.edu' },
      { title: 'ScottyLabs CMU Courses', description: 'Student-built course browser with FCE data and prereq maps.', url: 'https://cmucourses.com' },
      { title: 'Undergraduate Catalog', description: 'Official degree requirements and university policies.', url: 'https://www.cmu.edu/academic-catalog/' },
    ],
  },
  {
    id: 'tech',
    title: 'Tech & IT help',
    icon: 'laptop-outline',
    blurb: 'WiFi, printing, software, and who to call when none of it works.',
    links: [
      { title: 'Computing Services', description: 'The IT front door — help desk, guides, and status.', url: 'https://www.cmu.edu/computing/' },
      { title: 'WiFi Setup (CMU-SECURE)', description: 'Get your laptop and phone on the campus network.', url: 'https://www.cmu.edu/computing/services/endpoint/network-access/wireless/' },
      { title: 'Printing (andrew printing)', description: 'Print from anywhere; release at clusters around campus.', url: 'https://www.cmu.edu/computing/services/endpoint/printing/' },
      { title: 'Free & Discounted Software', description: 'MATLAB, Office, Adobe, and more with your Andrew ID.', url: 'https://www.cmu.edu/computing/software/' },
      { title: 'VPN Access', description: 'Reach campus-only resources from off campus.', url: 'https://www.cmu.edu/computing/services/endpoint/network-access/vpn/' },
      { title: 'Computer Labs & Clusters', description: 'Public machines with specialized software.', url: 'https://www.cmu.edu/computing/services/endpoint/computer-labs/' },
    ],
  },
  {
    id: 'food',
    title: 'Food & dining',
    icon: 'restaurant-outline',
    blurb: 'Where to eat and how meal blocks actually work.',
    links: [
      { title: 'Dining Services', description: 'Meal plans, locations, and how blocks + DineXtra work.', url: 'https://www.cmu.edu/dining/' },
      { title: 'Dining Hours & Menus', description: 'What is open right now and what they are serving.', url: 'https://www.cmu.edu/dining/locations/' },
      { title: 'CMUEats', description: 'Student-built live dashboard of what is open at a glance.', url: 'https://cmueats.com' },
    ],
  },
  {
    id: 'housing',
    title: 'Housing & living',
    icon: 'home-outline',
    blurb: 'Your room, your mail, and the people paid to help you settle in.',
    links: [
      { title: 'Housing Services', description: 'Room assignments, fixes, moving, and next-year selection.', url: 'https://www.cmu.edu/housing/' },
      { title: 'Residential Education', description: 'Your RA and Housefellow — community and support in the dorms.', url: 'https://www.cmu.edu/residential-education/' },
      { title: 'Mail Services', description: 'Your SMC mailbox — where packages actually go.', url: 'https://www.cmu.edu/mail-services/' },
      { title: 'FixIt (Maintenance Requests)', description: 'Broken heater? Leaky faucet? File it here.', url: 'https://www.cmu.edu/fmcs/service-requests/' },
    ],
  },
  {
    id: 'health',
    title: 'Health & wellbeing',
    icon: 'heart-outline',
    blurb: 'Physical health, mental health, and everything that keeps you running.',
    links: [
      { title: 'University Health Services (UHS)', description: 'Doctor visits, immunizations, and pharmacy on campus.', url: 'https://www.cmu.edu/health-services/' },
      { title: 'CaPS (Counseling & Psychological Services)', description: 'Free, confidential counseling for students.', url: 'https://www.cmu.edu/counseling/' },
      { title: 'TimelyCare', description: '24/7 virtual medical and mental health care, free for students.', url: 'https://www.cmu.edu/wellbeing/resources/timely-care.html' },
      { title: 'Cohon Fitness & GroupX', description: 'Gym, pool, climbing wall, and free group fitness classes.', url: 'https://athletics.cmu.edu/athletics/fitness/index' },
      { title: 'Student Wellbeing', description: 'Wellness programs, mindfulness room, and self-care resources.', url: 'https://www.cmu.edu/wellbeing/' },
      { title: 'Disability Resources', description: 'Academic accommodations and accessibility support.', url: 'https://www.cmu.edu/disability-resources/' },
      { title: 'CMU Food Pantry', description: 'Free groceries for any student who needs them, no questions.', url: 'https://www.cmu.edu/student-affairs/resources/cmu-pantry/' },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & emergencies',
    icon: 'shield-checkmark-outline',
    blurb: 'Numbers to save in your phone tonight.',
    links: [
      { title: 'CMU Police (412-268-2323)', description: 'Campus emergencies — save this number, 911 works too.', url: 'https://www.cmu.edu/police/' },
      { title: 'Safewalk & Shuttle/Escort', description: 'Free rides and walking escorts around campus at night.', url: 'https://www.cmu.edu/parking/transport/index.html' },
      { title: 'CMU Alert', description: 'Emergency text alerts — make sure your number is registered.', url: 'https://www.cmu.edu/alert/' },
      { title: 'Ethics & Compliance Reporting', description: 'Report concerns anonymously.', url: 'https://www.cmu.edu/hr/resources/ethics-reporting.html' },
    ],
  },
  {
    id: 'money',
    title: 'Money & jobs',
    icon: 'wallet-outline',
    blurb: 'Bills, aid, and getting paid.',
    links: [
      { title: 'Student Financial Services', description: 'Tuition bills, payment plans, and financial aid questions.', url: 'https://www.cmu.edu/sfs/' },
      { title: 'Handshake', description: 'Campus jobs, internships, and new-grad roles.', url: 'https://cmu.joinhandshake.com' },
      { title: 'Career & Professional Development Center', description: 'Resume reviews, mock interviews, and career fairs.', url: 'https://www.cmu.edu/career/' },
      { title: 'Emergency Support Funding', description: 'One-time help when something unexpected hits your wallet.', url: 'https://www.cmu.edu/student-affairs/dean/loans/' },
    ],
  },
  {
    id: 'transport',
    title: 'Getting around',
    icon: 'bus-outline',
    blurb: 'Your ID is a bus pass. Use it.',
    links: [
      { title: 'Free PRT Transit (with CMU ID)', description: 'All Pittsburgh buses and the incline — free with your card.', url: 'https://www.cmu.edu/parking/transport/prt/index.html' },
      { title: 'PRT Trip Planner', description: 'Routes and real-time arrivals for Pittsburgh transit.', url: 'https://www.rideprt.org' },
      { title: 'Campus Shuttles', description: 'CMU shuttle routes and schedules, including grocery runs.', url: 'https://www.cmu.edu/parking/transport/index.html' },
      { title: 'Interactive Campus Map', description: 'Find any building — and the bathrooms inside it.', url: 'https://www.cmu.edu/visit/map-interactive.html' },
    ],
  },
  {
    id: 'involvement',
    title: 'Clubs & getting involved',
    icon: 'people-outline',
    blurb: 'The part of college you will actually remember.',
    links: [
      { title: 'TartanConnect', description: 'Every student org, their events, and how to join.', url: 'https://tartanconnect.cmu.edu' },
      { title: 'SLICE', description: 'Student Leadership, Involvement, and Civic Engagement — org support and the activities fair.', url: 'https://www.cmu.edu/student-affairs/slice/' },
      { title: 'Athletics & Club Sports', description: 'Varsity schedules, intramurals, and club teams.', url: 'https://athletics.cmu.edu' },
      { title: 'Fraternity & Sorority Life', description: 'Greek chapters and recruitment.', url: 'https://www.cmu.edu/student-affairs/slice/fraternity-sorority-life/index.html' },
      { title: 'Center for Student Diversity & Inclusion', description: 'Identity-based communities, programs, and spaces.', url: 'https://www.cmu.edu/student-diversity/' },
      { title: 'The Tartan', description: 'Student newspaper — read it or join it.', url: 'https://thetartan.org' },
    ],
  },
  {
    id: 'help',
    title: 'When you don’t know who to ask',
    icon: 'help-buoy-outline',
    blurb: 'Stuck, overwhelmed, or facing something weird? These offices exist for exactly that.',
    links: [
      { title: 'Dean of Students Office', description: 'The catch-all: personal emergencies, absences, or "I don’t know who handles this."', url: 'https://www.cmu.edu/student-affairs/dean/' },
      { title: 'Your Academic Advisor', description: 'Course planning, requirements, and academic trouble — find yours in SIO.', url: 'https://www.cmu.edu/hub/sio/' },
      { title: 'The Word (Student Handbook)', description: 'Every policy, tradition, and rule in one place.', url: 'https://www.cmu.edu/student-affairs/theword/' },
      { title: 'Office of International Education', description: 'Visas, OPT/CPT, and support for international students.', url: 'https://www.cmu.edu/oie/' },
      { title: 'Graduation & Enrollment Verification', description: 'Enrollment letters for insurance, leases, and visas.', url: 'https://www.cmu.edu/hub/registrar/' },
      { title: 'First-Gen Community', description: 'Programs and mentorship for first-generation college students.', url: 'https://www.cmu.edu/student-success/programs/fgen.html' },
    ],
  },
];

export default function ResourcesScreen() {
  const { colors, fontScale } = useAppTheme();
  const { isDesktop } = useResponsive();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const [query, setQuery] = useState('');

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((section) => ({
      ...section,
      links: section.links.filter(
        (link) =>
          link.title.toLowerCase().includes(q) ||
          link.description.toLowerCase().includes(q) ||
          section.title.toLowerCase().includes(q)
      ),
    })).filter((section) => section.links.length > 0);
  }, [query]);

  const openLink = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.wordmark}>
          CMU<Text style={styles.wordmarkAccent}>nify</Text>
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.kickerPill}>
          <Text style={styles.kickerText}>THE FRESHMAN GUIDE</Text>
        </View>
        <Text style={styles.title}>Everything you need,{'\n'}one page</Text>
        <Text style={styles.subtitle}>
          Every account, office, and resource a new Tartan needs — so when you
          don&apos;t know how to do something or who to talk to, you start here.
        </Text>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search — try “tutoring”, “bus”, “laundry”, “counseling”…"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing matched &ldquo;{query}&rdquo;</Text>
          <Text style={styles.emptyBody}>
            Try a broader word — or ask the Dean of Students Office, whose whole
            job is questions that don&apos;t fit anywhere else.
          </Text>
        </View>
      ) : (
        filteredSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name={section.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionBlurb}>{section.blurb}</Text>
              </View>
            </View>
            <View style={[styles.linkGrid, isDesktop && styles.linkGridDesktop]}>
              {section.links.map((link) => (
                <TouchableOpacity
                  key={link.url + link.title}
                  style={[styles.linkCard, isDesktop && styles.linkCardDesktop]}
                  onPress={() => openLink(link.url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.linkCardText}>
                    <Text style={styles.linkTitle}>{link.title}</Text>
                    <Text style={styles.linkDescription}>{link.description}</Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}

      {/* Footer note */}
      <Text style={styles.footerNote}>
        Maintained by students. Spot a broken or missing link? Tell the CMUnify
        team and we&apos;ll fix it.
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 48,
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center',
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    wordmark: {
      fontSize: 18 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    wordmarkAccent: {
      color: colors.primary,
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 28,
    },
    kickerPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    kickerText: {
      fontSize: 11 * fontScale,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.primary,
    },
    title: {
      fontSize: 34 * fontScale,
      lineHeight: 39 * fontScale,
      fontWeight: '800',
      letterSpacing: -1,
      textAlign: 'center',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15 * fontScale,
      lineHeight: 23 * fontScale,
      textAlign: 'center',
      color: colors.textSecondary,
      maxWidth: 560,
      marginBottom: 24,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      maxWidth: 560,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15 * fontScale,
      color: colors.textPrimary,
    },
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyTitle: {
      fontSize: 17 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    emptyBody: {
      fontSize: 14 * fontScale,
      lineHeight: 21 * fontScale,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 420,
    },
    section: {
      paddingHorizontal: 20,
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    sectionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionHeaderText: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 19 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    sectionBlurb: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
      marginTop: 1,
    },
    linkGrid: {
      gap: 8,
    },
    linkGridDesktop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    linkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    linkCardDesktop: {
      flexBasis: '48%',
      flexGrow: 1,
    },
    linkCardText: {
      flex: 1,
    },
    linkTitle: {
      fontSize: 15 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    linkDescription: {
      fontSize: 13 * fontScale,
      lineHeight: 18 * fontScale,
      color: colors.textSecondary,
    },
    footerNote: {
      fontSize: 12 * fontScale,
      color: colors.textTertiary,
      textAlign: 'center',
      paddingHorizontal: 24,
      marginTop: 8,
    },
  });
