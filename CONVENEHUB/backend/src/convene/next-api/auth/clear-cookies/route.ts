import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Get all cookies and delete the Supabase ones
    const allCookies = cookieStore.getAll();
    
    allCookies.forEach((cookie) => {
      if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
        cookieStore.delete(cookie.name);
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'All Supabase cookies cleared' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
