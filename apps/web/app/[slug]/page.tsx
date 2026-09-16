"use client";

import React from "react";
import { use } from "react";
import { WorkspaceDetailView } from "../../components/WorkspaceDetailView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function DynamicSpacePage({ params }: PageProps) {
  const { slug } = use(params);
  return <WorkspaceDetailView slug={slug} />;
}
