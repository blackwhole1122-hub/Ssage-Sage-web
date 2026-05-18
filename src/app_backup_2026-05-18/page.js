import { redirect } from 'next/navigation';
import { DEFAULT_PUBLIC_LANDING } from '@/lib/siteSections';

export default function HomePage() {
  redirect(DEFAULT_PUBLIC_LANDING);
}
