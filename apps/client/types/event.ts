export type EventCategory = 
  | 'Career' 
  | 'Food' 
  | 'Fun' 
  | 'Afternoon' 
  | 'Events' 
  | 'Academic' 
  | 'Networking' 
  | 'Social' 
  | 'Sports' 
  | 'Arts' 
  | 'Tech' 
  | 'Wellness';

export type RSVPStatus = 'going' | 'maybe' | 'not-going' | null;

export interface RSVPCounts {
  going: number;
  maybe: number;
  notGoing: number;
}

export interface Attendee {
  userId: string;
  status: RSVPStatus;
  timestamp: string;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: string;
  daysOfWeek?: number[]; // 0-6, Sunday-Saturday
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  location: string;
  categories: EventCategory[];
  organizer: {
    id: string;
    name: string;
    type: 'club' | 'individual';
  };
  color: string; // Hex color code
  rsvpEnabled: boolean;
  rsvpCounts: RSVPCounts;
  attendees: Attendee[];
  attendeeVisibility: 'public' | 'private';
  isClubEvent: boolean;
  isSocialEvent: boolean;
  capacity?: number;
  recurring?: RecurringPattern;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  categories: EventCategory[];
  isClubEvent: boolean;
  isSocialEvent: boolean;
  capacity?: number;
  rsvpEnabled: boolean;
  attendeeVisibility: 'public' | 'private';
  color: string;
  tags: string[];
  recurring?: RecurringPattern;
}

