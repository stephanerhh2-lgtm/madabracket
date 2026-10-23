import { MadaBracketApp } from "@/components/MadaBracketApp";
import { getFullArenaState } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialState = await getFullArenaState();
  return <MadaBracketApp initialState={initialState} />;
}
