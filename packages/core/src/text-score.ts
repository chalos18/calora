const tokenise = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * How much of the query a food's name accounts for, 0..1.
 *
 * Deliberately simple, and deliberately the *weakest* of the three ranking
 * signals: what someone has eaten before predicts their search far better than
 * word overlap does. Postgres trigram similarity can replace this later without
 * the ranking logic changing.
 */
export const textMatchScore = (name: string, query: string): number => {
  const queryTokens = tokenise(query);
  if (queryTokens.length === 0) return 0;

  const nameTokens = tokenise(name);

  const matched = queryTokens.filter((token) =>
    nameTokens.some((nameToken) => nameToken.startsWith(token)),
  ).length;

  return matched / queryTokens.length;
};
