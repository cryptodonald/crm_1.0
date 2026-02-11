import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/postgres';

/**
 * GET /api/users
 * 
 * Returns all active users from the system
 * Used to populate assignee select in forms
 */
export async function GET() {
  try {
    // Fetch only active users (sorted by name)
    const users = await getUsers();

    // Transform to lookup format for performance
    const usersLookup: Record<string, {
      id: string;
      name: string;
      email?: string;
      role: string;
      avatarUrl?: string;
      phone?: string;
    }> = {};

    users.forEach((user) => {
      usersLookup[user.id] = {
        id: user.id,
        name: user.name || '',
        email: user.email || undefined,
        role: user.role,
        avatarUrl: user.avatar_url || undefined,
        phone: user.phone || undefined,
      };
    });

    return NextResponse.json({
      success: true,
      users: usersLookup,
      count: users.length,
    });
  } catch (error: unknown) {
    console.error('[API] /api/users error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        users: {},
        count: 0,
      },
      { status: 500 }
    );
  }
}
