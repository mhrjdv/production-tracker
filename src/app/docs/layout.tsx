import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/app/source";
import { RootProvider } from "fumadocs-ui/provider/next";
import {
  AISearchProvider,
  AISearchTrigger,
  AISearchPanel,
} from "@/components/docs/ai-search";
import "fumadocs-ui/style.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <AISearchProvider>
        <DocsLayout
          tree={source.getPageTree()}
          nav={{
            title: <span className="font-semibold">Laserman Docs</span>,
            url: "/docs",
          }}
          links={[{ text: "Dashboard", url: "/" }]}
        >
          {children}
        </DocsLayout>
        <AISearchTrigger />
        <AISearchPanel />
      </AISearchProvider>
    </RootProvider>
  );
}
