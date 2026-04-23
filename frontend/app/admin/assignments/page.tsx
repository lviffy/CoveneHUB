import { redirect } from 'next/navigation';

export default function AdminAssignmentsRedirectPage() {
  redirect('/admin?tab=events');
}
