import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { admin, anon, must } from "../supabase";
import { appUrl } from "../env";
import { requireUser, requireAdmin, assertSelfOrAdmin, Profile } from "../auth";
import { HttpError, Ctx, json, readJson, isStr, isUuid, rateLimit } from "../http";
import { signToken } from "../token";
import { issueOtp, consumeOtp } from "../otp";
import { sendEmail, otpEmail, resetEmail } from "../email";
import { toUser } from "../mappers";

const normEmail = (e: string) => e.trim().toLowerCase();
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

async function findProfileByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await admin().from("profiles").select("*").eq("email", email).maybeSingle();
  if (error) throw error;
  return (data as Profile) || null;
}

async function isConfirmed(userId: string): Promise<boolean> {
  const { data } = await admin().auth.admin.getUserById(userId);
  return !!data?.user?.email_confirmed_at;
}

const sessionUser = (p: Profile) => ({
  _id: p.id, firstName: p.first_name, lastName: p.last_name, email: p.email, role: p.role,
  phoneNumber: p.phone_number, referralCode: p.referral_code, referralId: p.referred_by,
  twoFactorEnabled: p.two_factor_enabled,
});

// ------------------------------------------------------------------ register
export async function register(req: NextRequest) {
  rateLimit(req, "auth", 20);
  const b = await readJson(req);
  const { firstName, lastName, email, password, country, phoneNumber, referralCode } = b;
  if (![firstName, lastName, email, password, country, phoneNumber].every((v) => isStr(v) && v.trim()))
    throw new HttpError(400, "All fields are required");
  if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters long");

  const mail = normEmail(email);
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(mail)) throw new HttpError(400, "Please enter a valid email address");
  if (phoneNumber.trim().length < 6) throw new HttpError(400, "Phone number must be at least 6 characters long");
  if (await findProfileByEmail(mail)) throw new HttpError(400, "User already exists");

  let referrerId: string | null = null;
  if (referralCode !== undefined && referralCode !== null && referralCode !== "") {
    if (!isStr(referralCode)) throw new HttpError(400, "Invalid referral code");
    const data = must(await admin().from("profiles").select("id").eq("referral_code", referralCode).maybeSingle());
    if (!data) throw new HttpError(400, "Invalid referral code");
    referrerId = data.id;
  }

  const created = await admin().auth.admin.createUser({ email: mail, password, email_confirm: false });
  if (created.error || !created.data.user) {
    const already = (created.error as any)?.code === "email_exists" || /already|registered/i.test(created.error?.message || "");
    throw new HttpError(400, already ? "User already exists" : "Could not create account");
  }
  const userId = created.data.user.id;

  const { error } = await admin().from("profiles").insert({
    id: userId, first_name: firstName.trim(), last_name: lastName.trim(), email: mail,
    phone_number: phoneNumber.trim(), country: country.trim(), referred_by: referrerId,
    referral_code: `${firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}-${crypto.randomBytes(4).toString("hex")}`,
  });
  if (error) {
    await admin().auth.admin.deleteUser(userId); // never leave an orphan credential
    throw error;
  }

  const code = await issueOtp(userId, "signup");
  try {
    await sendEmail(mail, "Your Verification OTP", otpEmail(code, "signup"));
  } catch (e) {
    console.error("[register] email failed", e);
    throw new HttpError(500, "Account created but the verification email could not be sent. Please use 'resend code'.");
  }
  return json({ message: "OTP sent to your email. Please verify to complete registration.", email: mail });
}

export async function verifyOtp(req: NextRequest) {
  rateLimit(req, "otp", 15);
  const { email, otp } = await readJson(req);
  if (!isStr(email) || !isStr(otp)) throw new HttpError(400, "Email and OTP are required");

  const profile = await findProfileByEmail(normEmail(email));
  if (!profile) throw new HttpError(400, "Invalid OTP");
  if (await isConfirmed(profile.id)) throw new HttpError(400, "Email already verified");

  await consumeOtp(profile.id, "signup", otp.trim());
  const upd = await admin().auth.admin.updateUserById(profile.id, { email_confirm: true });
  if (upd.error) throw upd.error;

  return json({ message: "Email verification successful.", user: sessionUser(profile), token: await signToken(profile.id) });
}

export async function resendOtp(req: NextRequest) {
  rateLimit(req, "otp", 15);
  const { email } = await readJson(req);
  if (!isStr(email) || !email) throw new HttpError(400, "Email is required");
  const generic = { message: "If the account exists, a new verification code has been sent." };

  const profile = await findProfileByEmail(normEmail(email));
  if (!profile || (await isConfirmed(profile.id))) return json(generic);

  const code = await issueOtp(profile.id, "signup");
  try {
    await sendEmail(profile.email, "Your Verification OTP", otpEmail(code, "signup"));
  } catch (e) {
    console.error("[resend-otp] email failed", e);
    throw new HttpError(500, "Failed to resend verification code.");
  }
  return json(generic);
}

// --------------------------------------------------------------------- login
export async function login(req: NextRequest) {
  rateLimit(req, "auth", 20);
  const { email, password } = await readJson(req);
  if (!isStr(email) || !isStr(password) || !email || !password) throw new HttpError(400, "All fields are required");

  const mail = normEmail(email);
  const { data, error } = await anon().auth.signInWithPassword({ email: mail, password });
  if (error || !data.user) {
    if ((error as any)?.code === "email_not_confirmed") throw new HttpError(401, "Please verify your email before login.");
    throw new HttpError(400, "Invalid email or password");
  }
  const profile = await findProfileByEmail(mail);
  if (!profile) throw new HttpError(400, "Invalid email or password");

  if (profile.two_factor_enabled) {
    const code = await issueOtp(profile.id, "login");
    try {
      await sendEmail(profile.email, "Your Verification OTP", otpEmail(code, "login"));
    } catch (e) {
      console.error("[login] 2FA email failed", e);
      throw new HttpError(500, "Failed to send 2FA code. Please try again.");
    }
    return json({ success: true, requires2FA: true, message: "2FA code sent to your email.", userId: profile.id, email: profile.email });
  }

  return json({
    success: true, requires2FA: false, message: "Login successful",
    user: sessionUser(profile), token: await signToken(profile.id),
  });
}

export async function verifyLoginOtp(req: NextRequest) {
  rateLimit(req, "otp", 15);
  const { userId, otp } = await readJson(req);
  if (!isUuid(userId) || !isStr(otp) || !otp) throw new HttpError(400, "User ID and OTP are required");

  const data = must(await admin().from("profiles").select("*").eq("id", userId).maybeSingle());
  if (!data || !data.two_factor_enabled) throw new HttpError(400, "Invalid request");

  await consumeOtp(userId, "login", otp.trim());
  return json({ success: true, message: "2FA verification successful", user: sessionUser(data as Profile), token: await signToken(userId) });
}

export async function resendLoginOtp(req: NextRequest) {
  rateLimit(req, "otp", 15);
  const { email } = await readJson(req);
  if (!isStr(email) || !email) throw new HttpError(400, "Email is required");
  const generic = { message: "If 2FA is enabled, a new code has been sent." };

  const profile = await findProfileByEmail(normEmail(email));
  if (!profile || !profile.two_factor_enabled) return json(generic);
  const code = await issueOtp(profile.id, "login");
  try {
    await sendEmail(profile.email, "Your Verification OTP", otpEmail(code, "login"));
  } catch {
    throw new HttpError(500, "Failed to send OTP. Please try again.");
  }
  return json(generic);
}

export async function logout() {
  // Tokens are stateless and held by the client; nothing to revoke server-side.
  return json({ message: "User logged out successfully" });
}

// ------------------------------------------------------------- current user
export async function me(req: NextRequest) {
  const user = await requireUser(req);
  const bal = must(await admin().from("balances").select("total_balance").eq("user_id", user.id).maybeSingle());
  return json(toUser(user, { mainBalance: Number(bal?.total_balance ?? 0) }));
}

export async function profile(req: NextRequest) {
  const user = await requireUser(req);
  return json({ name: `${user.first_name} ${user.last_name}`, email: user.email, role: user.role });
}

export async function updateProfile(req: NextRequest) {
  const user = await requireUser(req);
  const { firstName, lastName, country, phoneNumber } = await readJson(req);
  const patch: Record<string, string> = {};
  if (isStr(firstName) && firstName.trim()) patch.first_name = firstName.trim();
  if (isStr(lastName) && lastName.trim()) patch.last_name = lastName.trim();
  if (isStr(country) && country.trim()) patch.country = country.trim();
  if (isStr(phoneNumber) && phoneNumber.trim().length >= 6) patch.phone_number = phoneNumber.trim();

  const { data, error } = await admin().from("profiles").update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", user.id).select("*").single();
  if (error) throw error;
  return json(toUser(data));
}

export async function toggleTwoFactor(req: NextRequest) {
  const user = await requireUser(req);
  const { enabled } = await readJson(req);
  const value = enabled === true || enabled === "true";
  const { error } = await admin().from("profiles").update({ two_factor_enabled: value }).eq("id", user.id);
  if (error) throw error;
  return json({ success: true, message: `Two-factor authentication ${value ? "enabled" : "disabled"}.` });
}

export async function changePassword(req: NextRequest) {
  const user = await requireUser(req);
  rateLimit(req, "auth", 20);
  const { currentPassword, newPassword } = await readJson(req);
  if (!isStr(currentPassword) || !isStr(newPassword) || !currentPassword || !newPassword) throw new HttpError(400, "All fields are required");
  if (newPassword.length < 6) throw new HttpError(400, "Password must be at least 6 characters long");

  const check = await anon().auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (check.error) throw new HttpError(400, "Current password is incorrect");
  const upd = await admin().auth.admin.updateUserById(user.id, { password: newPassword });
  if (upd.error) throw new HttpError(400, "Could not update password");
  return json({ message: "Password updated successfully" });
}

export async function verifyPassword(req: NextRequest) {
  const user = await requireUser(req);
  rateLimit(req, "auth", 20);
  const { password } = await readJson(req);
  if (!isStr(password) || !password) throw new HttpError(400, "Password is required");
  const check = await anon().auth.signInWithPassword({ email: user.email, password });
  if (check.error) throw new HttpError(400, "Invalid password");
  return json({ message: "Password verified successfully" });
}

// ------------------------------------------------------------ password reset
export async function forgotPassword(req: NextRequest) {
  rateLimit(req, "auth", 20);
  const { email } = await readJson(req);
  if (!isStr(email) || !email) throw new HttpError(400, "Email is required");
  const generic = { message: "If an account exists for that email, a reset link has been sent." };

  const profile = await findProfileByEmail(normEmail(email));
  if (!profile) return json(generic);

  await admin().from("password_resets").delete().lt("expires_at", new Date().toISOString()); // tidy up
  const token = crypto.randomBytes(32).toString("hex");
  const { error } = await admin().from("password_resets").insert({
    token_hash: sha256(token), user_id: profile.id, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw error;

  const url = `${appUrl()}/auth/reset-password/${token}`;
  try {
    await sendEmail(profile.email, "Password Reset", resetEmail(`${profile.first_name} ${profile.last_name}`.trim(), url));
  } catch (e) {
    console.error("[forgot-password] email failed", e);
    throw new HttpError(500, "Could not send the reset email. Please try again.");
  }
  return json(generic);
}

export async function resetPassword(req: NextRequest, { params }: Ctx) {
  rateLimit(req, "auth", 20);
  const { password } = await readJson(req);
  if (!isStr(password) || !password) throw new HttpError(400, "Password is required");
  if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters long");

  const hash = sha256(String(params.token));
  // Single-use: the delete returns the row only to the first caller.
  const data = must(await admin().from("password_resets").delete().eq("token_hash", hash)
    .gt("expires_at", new Date().toISOString()).select("user_id").maybeSingle());
  if (!data) throw new HttpError(400, "Invalid or expired token");

  const upd = await admin().auth.admin.updateUserById(data.user_id, { password, email_confirm: true });
  if (upd.error) throw new HttpError(400, "Could not reset password");
  await admin().from("otp_codes").delete().eq("user_id", data.user_id);
  await admin().from("password_resets").delete().eq("user_id", data.user_id);
  return json({ message: "Password reset successful" });
}

// ------------------------------------------------------------------- admin
export async function getAllUsers(req: NextRequest) {
  await requireAdmin(req);
  const { data, error } = await admin().from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return json((data || []).map((p) => toUser(p)));
}

export async function deleteUser(req: NextRequest, { params }: Ctx) {
  const adminUser = await requireAdmin(req);
  if (!isUuid(params.id)) throw new HttpError(404, "User not found");
  if (adminUser.id === params.id) throw new HttpError(400, "You cannot delete your own account");
  const data = must(await admin().from("profiles").select("id").eq("id", params.id).maybeSingle());
  if (!data) throw new HttpError(404, "User not found");
  const del = await admin().auth.admin.deleteUser(params.id); // cascades to profile and owned rows
  if (del.error) throw new HttpError(500, "Cannot Delete User");
  return json({ message: "User deleted successfully" });
}

export async function getMyReferrals(req: NextRequest, { params }: Ctx) {
  const user = await requireUser(req);
  assertSelfOrAdmin(user, params.userId);
  const { data, error } = await admin().from("profiles")
    .select("id, first_name, last_name, email, created_at, deposit_count, discount, referral_status")
    .eq("referred_by", params.userId);
  if (error) throw error;
  const users = (data || []).map((r) => ({
    _id: r.id, firstName: r.first_name, lastName: r.last_name, email: r.email, createdAt: r.created_at,
    deposit_count: r.deposit_count, discount: Number(r.discount || 0).toFixed(2), referralStatus: r.referral_status,
  }));
  return json({ success: true, total: users.length, users });
}

export async function getAdminStats(req: NextRequest) {
  await requireAdmin(req);
  const db = admin();
  const count = async (t: string) => (await db.from(t).select("*", { count: "exact", head: true })).count || 0;
  const [totalUsers, totalMachines, contacts] = await Promise.all([count("profiles"), count("mining_machines"), count("contacts")]);

  const agg = async (type: string) => {
    const { data, error } = await db.from("transactions").select("amount").eq("type", type).eq("status", "approved");
    if (error) throw error;
    return { n: data.length, sum: data.reduce((s, r) => s + Number(r.amount), 0) };
  };
  const [dep, wd] = await Promise.all([agg("ADMIN_ADD"), agg("withdrawal")]);
  return json({
    success: true,
    stats: { totalUsers, totalMachines, contacts, totalDeposits: dep.n, totalWithdrawals: wd.n,
             totalDepositAmount: dep.sum, totalWithdrawalAmount: wd.sum },
  });
}
