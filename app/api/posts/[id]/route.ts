import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";

import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/options";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing post id" }, { status: 400 });
  }

  const post = await prisma.post.findFirst({
    where: { id, folder: { userId: session.user.id } },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
