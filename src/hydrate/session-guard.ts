export type MeProfile = {
  id: string;
  email: string;
  name?: string | null;
  workspace: { id: string; name: string; slug: string };
};

export async function guardSession(): Promise<MeProfile | null> {
  const res = await fetch("/api/me");
  if (res.status === 401) {
    location.assign("/connexion");
    return null;
  }
  if (!res.ok) return null;
  return (await res.json()) as MeProfile;
}
