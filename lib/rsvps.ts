import { createClient } from './supabase';

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export interface OutingRsvp {
  id: string;
  outing_id: string;
  user_id: string;
  status: RsvpStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export async function getOutingRsvps(outingId: string): Promise<OutingRsvp[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('outing_rsvps')
    .select(`
      *,
      user:users!user_id (
        id,
        display_name,
        full_name,
        avatar_url
      )
    `)
    .eq('outing_id', outingId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching outing RSVPs:', error);
    return [];
  }

  return data as OutingRsvp[];
}

export async function getUserRsvp(outingId: string): Promise<OutingRsvp | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('outing_rsvps')
    .select('*')
    .eq('outing_id', outingId)
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user RSVP:', error);
    return null;
  }

  return data as OutingRsvp | null;
}

export async function setRsvp(
  outingId: string,
  status: RsvpStatus,
  notes?: string
): Promise<{ success: boolean; error?: string; rsvp?: OutingRsvp }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if RSVP already exists
  const { data: existing } = await supabase
    .from('outing_rsvps')
    .select('id')
    .eq('outing_id', outingId)
    .eq('user_id', user.id)
    .single();

  let result;
  if (existing) {
    // Update existing RSVP
    result = await supabase
      .from('outing_rsvps')
      .update({ status, notes: notes || null })
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    // Create new RSVP
    result = await supabase
      .from('outing_rsvps')
      .insert({
        outing_id: outingId,
        user_id: user.id,
        status,
        notes: notes || null,
      })
      .select()
      .single();
  }

  if (result.error) {
    console.error('Error setting RSVP:', result.error);
    return { success: false, error: result.error.message };
  }

  return { success: true, rsvp: result.data as OutingRsvp };
}

export async function deleteRsvp(outingId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('outing_rsvps')
    .delete()
    .eq('outing_id', outingId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting RSVP:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export function getRsvpCounts(rsvps: OutingRsvp[]) {
  const going = rsvps.filter(r => r.status === 'going').length;
  const maybe = rsvps.filter(r => r.status === 'maybe').length;
  const notGoing = rsvps.filter(r => r.status === 'not_going').length;

  return { going, maybe, notGoing, total: rsvps.length };
}
