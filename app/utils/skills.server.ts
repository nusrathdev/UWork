export function parseSkills(skillsString: string | null): string[] {
  if (!skillsString) return [];
  try {
    const parsed = JSON.parse(skillsString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifySkills(skills: string[]): string {
  return JSON.stringify(skills);
}