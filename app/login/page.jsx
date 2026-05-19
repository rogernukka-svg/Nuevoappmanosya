import { redirect } from 'next/navigation';

export default function LegacyLoginRedirect({ searchParams = {} }) {
  const query = new URLSearchParams(searchParams).toString();
  redirect(`/auth/login${query ? `?${query}` : ''}`);
}
