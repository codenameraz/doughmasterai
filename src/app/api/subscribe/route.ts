import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Validate email with a more robust regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Debug information
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Email to subscribe:', email);

    // Check if Supabase credentials are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Initialize Supabase client with cookies for normal operations
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    try {
      // Check if email already exists with case-insensitive comparison
      const { data: existingSubscriber, error: selectError } = await supabase
        .from('subscribers')
        .select('id, email')
        .ilike('email', email)  // Case-insensitive comparison
        .maybeSingle();

      if (selectError) {
        console.error('Error checking for existing subscriber:', selectError);
        
        // If the error is related to RLS policy, we'll try to handle it below
        if (!selectError.message?.includes("row-level security") && 
            !selectError.message?.includes("policy")) {
          return NextResponse.json(
            { error: 'Database query error' },
            { status: 500 }
          );
        }
      }

      if (existingSubscriber) {
        return NextResponse.json(
          { error: 'Email already subscribed' },
          { status: 400 }
        );
      }

      // Since we've fixed the RLS policy, we'll try inserting directly first
      const { error: directInsertError } = await supabase
        .from('subscribers')
        .insert([
          { 
            email,
            subscribed_at: new Date().toISOString(),
            status: 'active'
          }
        ]);

      // If direct insert succeeds, we're done
      if (!directInsertError) {
        return NextResponse.json(
          { message: 'Successfully subscribed' },
          { status: 200 }
        );
      }
      
      // If direct insert failed but not due to RLS, log the error and return
      if (!directInsertError.message?.includes("row-level security") && 
          !directInsertError.message?.includes("policy") &&
          !directInsertError.code?.includes("23505")) {
        
        console.error('Direct insert error:', directInsertError);
        
        // Handle unique constraint violation specifically
        if (directInsertError.code === '23505' || directInsertError.message?.includes('duplicate key value')) {
          return NextResponse.json(
            { error: 'Email already subscribed' },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to subscribe: ' + directInsertError.message },
          { status: 500 }
        );
      }

      // If we're here, it's likely an RLS issue, so try with service role key
      console.log('Trying with service role key as fallback');
      
      // Get the service role key and fix any formatting issues
      let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      // Check and clean service role key if it starts with 'n' or unexpected characters
      if (serviceRoleKey && !serviceRoleKey.startsWith('eyJ')) {
        // Find where the JWT actually starts
        const jwtStart = serviceRoleKey.indexOf('eyJ');
        if (jwtStart !== -1) {
          serviceRoleKey = serviceRoleKey.substring(jwtStart);
          console.log('Cleaned service role key');
        }
      }
      
      if (!serviceRoleKey || !serviceRoleKey.startsWith('eyJ')) {
        console.error('Invalid or missing Supabase service role key');
        return NextResponse.json(
          { error: 'Server configuration incomplete' },
          { status: 500 }
        );
      }

      // Create a new supabase client with the service role key
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey
      );

      // Insert new subscriber with upsert option using admin privileges
      const { error: insertError } = await supabaseAdmin
        .from('subscribers')
        .upsert(
          [{ 
            email,
            subscribed_at: new Date().toISOString(),
            status: 'active'
          }],
          { 
            onConflict: 'email',
            ignoreDuplicates: true  // Don't throw error on duplicates
          }
        );

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        
        // Handle unique constraint violation specifically
        if (insertError.code === '23505' || insertError.message?.includes('duplicate key value')) {
          return NextResponse.json(
            { error: 'Email already subscribed' },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to subscribe: ' + insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Successfully subscribed' },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 