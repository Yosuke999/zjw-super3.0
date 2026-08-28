import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
const displayName = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "System Owner";

if (!url || !key || !email || password.length < 14) {
  throw new Error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_BOOTSTRAP_EMAIL and an ADMIN_BOOTSTRAP_PASSWORD of at least 14 characters.");
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const owners = await client.from("admin_profiles").select("id,email").eq("role", "owner").eq("active", true).limit(1);
if (owners.error) throw owners.error;
if (owners.data?.length) throw new Error(`An active owner already exists (${owners.data[0].email}); bootstrap is disabled.`);

const listed = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;
let user = listed.data.users.find((entry) => entry.email?.toLowerCase() === email);
if (user) throw new Error(`Auth user ${email} already exists. Refusing to promote an existing account during bootstrap; use a new address or remove the unused Auth user first.`);
const created = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
if (created.error || !created.data.user) throw created.error ?? new Error("Unable to create the bootstrap Auth user.");
user = created.data.user;

const profile = await client.from("admin_profiles").insert({
  id: user.id, email, display_name: displayName.slice(0, 100), role: "owner", active: true, mfa_required: true,
});
if (profile.error) {
  await client.auth.admin.deleteUser(user.id).catch(() => undefined);
  throw profile.error;
}
const audit = await client.from("admin_audit_logs").insert({
  actor_id: user.id, actor_email: email, action: "admin.bootstrap", target_type: "admin_user", target_id: user.id,
  metadata: { mfa_required: true },
});
if (audit.error) throw audit.error;

console.log(`Bootstrap owner ready: ${email}. MFA enrollment will be required on first login.`);
