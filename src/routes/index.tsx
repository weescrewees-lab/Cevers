import { createFileRoute } from "@tanstack/react-router";
import CasinoApp from "@/components/casino/CasinoApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CasinoApp />;
}
