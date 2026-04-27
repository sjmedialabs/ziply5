import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db/prisma";

async function getAuthenticatedUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  // The client passes the userId in the x-user-id header based on your current implementation
  return req.headers.get("x-user-id"); 
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, addresses: true },
    });

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    if (!user.profile) {
      const newProfile = await prisma.userProfile.create({
        data: { userId: user.id },
      });
      return NextResponse.json({ success: true, data: { ...user, profile: newProfile } });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, bio, phone, avatarUrl } = body as { 
      name?: string; 
      bio?: string; 
      phone?: string; 
      avatarUrl?: string 
    };

    // 1. Verify the user exists first
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found" }, { status: 404 });
    }

    // 2. Update user name if provided
    if (name !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    // 3. Upsert Profile: Creates if missing, updates if exists
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      create: { 
        userId, 
        bio: bio ?? null, 
        phone: phone ?? null, 
        avatarUrl: avatarUrl ?? null 
      },
      update: { 
        // Only update fields that were actually passed in the request body
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    return NextResponse.json({ success: true, data: updatedProfile, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    // Clear specific profile fields rather than deleting the user account
    await prisma.userProfile.update({
      where: { userId },
      data: { bio: null, phone: null, avatarUrl: null }
    });
    return NextResponse.json({ success: true, message: "Profile data cleared" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}