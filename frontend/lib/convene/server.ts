import { createClient as createBrowserCompatClient } from '@/lib/convene/client';

export const createClient = async () => createBrowserCompatClient();
export const createServerClient = createClient;
