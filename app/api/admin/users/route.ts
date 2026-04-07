import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function createSessionClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          const cookieHeader = req.headers.get("cookie") ?? "";
          return cookieHeader.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll: () => {},
      },
    }
  );
}

async function requireAdmin(req: NextRequest) {
  const sessionClient = createSessionClient(req);
  const {
    data: { session },
  } = await sessionClient.auth.getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Niet ingelogd" }, { status: 401 }) };
  }

  const supabase = createSupabaseServerClient();
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();

  if (roleRow?.role !== "admin") {
    return { error: NextResponse.json({ error: "Geen toegang" }, { status: 403 }) };
  }

  return { supabase, session };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const { supabase } = auth;

  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role, naam");

  const rolesMap = Object.fromEntries(
    (roles ?? []).map((r) => [r.user_id, r])
  );

  const result = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    naam: rolesMap[u.id]?.naam ?? null,
    role: rolesMap[u.id]?.role ?? "lezer",
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const { supabase } = auth;

  const { email, naam, role } = await req.json();

  if (!email || !role) {
    return NextResponse.json({ error: "email en role zijn verplicht" }, { status: 400 });
  }

  const { data: invited, error: invErr } =
    await supabase.auth.admin.inviteUserByEmail(email);

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 400 });
  }

  await supabase
    .from("user_roles")
    .upsert({ user_id: invited.user.id, role, naam }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const { supabase } = auth;

  const { user_id, role } = await req.json();

  if (!user_id || !role) {
    return NextResponse.json({ error: "user_id en role zijn verplicht" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id, role }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");

  if (!user_id) {
    return NextResponse.json({ error: "user_id is verplicht" }, { status: 400 });
  }

  const { error: deleteAuthErr } = await supabase.auth.admin.deleteUser(user_id);

  if (deleteAuthErr) {
    return NextResponse.json({ error: deleteAuthErr.message }, { status: 500 });
  }

  // user_roles row is removed automatically via ON DELETE CASCADE
  return NextResponse.json({ ok: true });
}
