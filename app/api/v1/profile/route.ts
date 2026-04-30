import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase/admin";

async function getAuthenticatedUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  // The client passes the userId in the x-user-id header based on your current implementation
  return req.headers.get("x-user-id"); 
}

export async function GET(request: NextRequest) {
  const authUserId = await getAuthenticatedUserId(request);
  if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const userId = request.nextUrl.searchParams.get("userId")?.trim() ?? "";
  if (!userId) return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });

  try {
    const client = getSupabaseAdmin();
    const { data: user, error: userError } = await client
      .from("User")
      .select("id,name,email")
      .eq("id", userId)
      .maybeSingle();
    if (userError) throw userError;

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const { data: profile, error: profileError } = await client
      .from("UserProfile")
      .select("*")
      .eq("userId", userId)
      .maybeSingle();
    if (profileError) throw profileError;

    const { data: addresses, error: addressesError } = await client
      .from("UserAddress")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });
    if (addressesError) throw addressesError;

    return NextResponse.json({ success: true, data: { ...user, profile: profile ?? null, addresses: addresses ?? [] } });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authUserId = await getAuthenticatedUserId(request);
  if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const userId = request.nextUrl.searchParams.get("userId")?.trim() ?? "";
  if (!userId) return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });

  try {
    const client = getSupabaseAdmin();
    const body = await request.json();
    const { name, bio, phone, avatarUrl } = body as { 
      name?: string; 
      bio?: string; 
      phone?: string; 
      avatarUrl?: string 
    };

    const { data: user, error: userError } = await client
      .from("User")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (userError) throw userError;

    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found" }, { status: 404 });
    }

    if (name !== undefined) {
      const { error } = await client.from("User").update({ name }).eq("id", userId);
      if (error) throw error;
    }

    const { data: existingProfile, error: profileReadError } = await client
      .from("UserProfile")
      .select("id,userId")
      .eq("userId", userId)
      .maybeSingle();
    if (profileReadError) throw profileReadError;

    let updatedProfile: any = null;
    if (existingProfile?.id) {
      const { data, error } = await client
        .from("UserProfile")
        .update({
          ...(bio !== undefined ? { bio } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        })
        .eq("id", existingProfile.id)
        .select("*")
        .single();
      if (error) throw error;
      updatedProfile = data;
    } else {
      const { data, error } = await client
        .from("UserProfile")
        .insert({
          userId,
          bio: bio ?? null,
          phone: phone ?? null,
          avatarUrl: avatarUrl ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      updatedProfile = data;
    }

    return NextResponse.json({ success: true, data: updatedProfile, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authUserId = await getAuthenticatedUserId(request);
  if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const userId = request.nextUrl.searchParams.get("userId")?.trim() ?? "";
  if (!userId) return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });

  try {
    const { error } = await getSupabaseAdmin()
      .from("UserProfile")
      .update({ bio: null, phone: null, avatarUrl: null })
      .eq("userId", userId);
    if (error) throw error;
    return NextResponse.json({ success: true, message: "Profile data cleared" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}