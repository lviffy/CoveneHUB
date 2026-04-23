export type UserRole = 'admin' | 'organizer' | 'promoter' | 'attendee';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
