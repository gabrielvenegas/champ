import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'ged.venegas@gmail.com';
const DEFAULT_PASSWORD = 'champs123';
const APP_URL = 'https://champ-lovat.vercel.app';
const PLAYER_LOGIN_DOMAIN = 'champ-lovat.vercel.app';

interface CreatePlayerRequest {
  name?: string;
  login?: string;
}

const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key}`);
  }
  return value;
};

const normalizeLogin = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const buildSyntheticEmail = (login: string) => `${login}@${PLAYER_LOGIN_DOMAIN}`;

const buildAccessMessage = (name: string, login: string) =>
  `Hey ${name}, your Friends Championship access is ready.\n\nOpen: ${APP_URL}\nLogin: ${login}\nPassword: ${DEFAULT_PASSWORD}\n\nAdd the app to your home screen after logging in.`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || user?.email !== ADMIN_EMAIL) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreatePlayerRequest;
    const name = body.name?.trim();
    const login = normalizeLogin(body.login || '');

    if (!name) {
      return Response.json({ error: 'Player name is required.' }, { status: 400 });
    }

    if (!login) {
      return Response.json({ error: 'Player login is required.' }, { status: 400 });
    }

    const email = buildSyntheticEmail(login);

    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const adminSupabase = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: existingProfile, error: profileLookupError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    let userId = existingProfile?.id;

    if (!userId) {
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: name,
        },
      });

      if (authError) {
        throw authError;
      }

      userId = authData.user.id;
    }

    const { data: player, error: playerError } = await adminSupabase
      .from('players')
      .insert({
        name,
        email,
        user_id: userId,
      })
      .select()
      .single();

    if (playerError) {
      throw playerError;
    }

    return Response.json({
      player,
      accessMessage: buildAccessMessage(name, login),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creating player login.';
    const status = message.startsWith('Missing ') ? 500 : 400;
    return Response.json({ error: message }, { status });
  }
}
