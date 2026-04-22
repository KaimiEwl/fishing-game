import {
  FISH_DATA,
  type CollectionBookState,
  type CollectionPageState,
  type CollectionSpeciesState,
} from '@/types/game';

export interface CollectionPageDefinition {
  id: string;
  title: string;
  description: string;
  fishIds: string[];
}

export const COLLECTION_BOOK_PAGES: ReadonlyArray<CollectionPageDefinition> = [
  {
    id: 'lake_basics',
    title: 'Lake Basics',
    description: 'Build your first page with the everyday lake species.',
    fishIds: ['carp', 'perch', 'bream'],
  },
  {
    id: 'deepwater_odds',
    title: 'Deepwater Odds',
    description: 'Track the heavier and stranger catches from deeper waters.',
    fishIds: ['catfish', 'goldfish', 'mutant'],
  },
  {
    id: 'trophy_legends',
    title: 'Trophy Legends',
    description: 'The rarest monsters that define a lucky fisher.',
    fishIds: ['pike', 'leviathan'],
  },
] as const;

const createSpeciesState = (fishId: string): CollectionSpeciesState => ({
  fishId,
  discovered: false,
  catches: 0,
  firstCaughtAt: null,
  lastCaughtAt: null,
  firstCatchBonusClaimed: false,
});

const createPageState = (pageId: string): CollectionPageState => ({
  pageId,
  completed: false,
  claimed: false,
});

const countDiscoveredSpecies = (species: Record<string, CollectionSpeciesState>) => (
  Object.values(species).filter((entry) => entry.discovered).length
);

const countClaimedBonuses = (species: Record<string, CollectionSpeciesState>) => (
  Object.values(species).filter((entry) => entry.firstCatchBonusClaimed).length
);

export const createEmptyCollectionBook = (): CollectionBookState => {
  const species = Object.fromEntries(
    FISH_DATA.map((fish) => [fish.id, createSpeciesState(fish.id)]),
  );

  return {
    species,
    pages: COLLECTION_BOOK_PAGES.map((page) => createPageState(page.id)),
    totalSpeciesCaught: 0,
    totalFirstCatchBonusesClaimed: 0,
  };
};

export const ensureCollectionBook = (book?: CollectionBookState | null): CollectionBookState => {
  const base = createEmptyCollectionBook();
  if (!book) return base;

  const species = Object.fromEntries(
    FISH_DATA.map((fish) => {
      const current = book.species?.[fish.id];
      return [fish.id, {
        ...createSpeciesState(fish.id),
        ...current,
        fishId: fish.id,
        catches: Math.max(0, current?.catches ?? 0),
      }];
    }),
  );

  const pages = COLLECTION_BOOK_PAGES.map((page) => {
    const existing = book.pages?.find((item) => item.pageId === page.id);
    const completed = page.fishIds.every((fishId) => species[fishId]?.discovered);
    return {
      ...createPageState(page.id),
      ...existing,
      pageId: page.id,
      completed: existing?.completed || completed,
      claimed: existing?.claimed || false,
    };
  });

  return {
    species,
    pages,
    totalSpeciesCaught: countDiscoveredSpecies(species),
    totalFirstCatchBonusesClaimed: countClaimedBonuses(species),
  };
};

export const mergeCollectionBooks = (
  serverBook?: CollectionBookState | null,
  localBook?: CollectionBookState | null,
): CollectionBookState | null => {
  if (!serverBook && !localBook) return null;

  const normalizedServer = ensureCollectionBook(serverBook);
  const normalizedLocal = ensureCollectionBook(localBook);

  const species = Object.fromEntries(
    FISH_DATA.map((fish) => {
      const serverSpecies = normalizedServer.species[fish.id];
      const localSpecies = normalizedLocal.species[fish.id];
      const discovered = serverSpecies.discovered || localSpecies.discovered;
      const catches = Math.max(serverSpecies.catches, localSpecies.catches);
      const firstCaughtAt = serverSpecies.firstCaughtAt && localSpecies.firstCaughtAt
        ? (new Date(serverSpecies.firstCaughtAt).getTime() <= new Date(localSpecies.firstCaughtAt).getTime()
          ? serverSpecies.firstCaughtAt
          : localSpecies.firstCaughtAt)
        : serverSpecies.firstCaughtAt ?? localSpecies.firstCaughtAt ?? null;
      const lastCaughtAt = serverSpecies.lastCaughtAt && localSpecies.lastCaughtAt
        ? (new Date(serverSpecies.lastCaughtAt).getTime() >= new Date(localSpecies.lastCaughtAt).getTime()
          ? serverSpecies.lastCaughtAt
          : localSpecies.lastCaughtAt)
        : serverSpecies.lastCaughtAt ?? localSpecies.lastCaughtAt ?? null;

      return [fish.id, {
        fishId: fish.id,
        discovered,
        catches,
        firstCaughtAt,
        lastCaughtAt,
        firstCatchBonusClaimed: serverSpecies.firstCatchBonusClaimed || localSpecies.firstCatchBonusClaimed,
      }];
    }),
  );

  const pages = COLLECTION_BOOK_PAGES.map((page) => {
    const serverPage = normalizedServer.pages.find((item) => item.pageId === page.id);
    const localPage = normalizedLocal.pages.find((item) => item.pageId === page.id);
    const completed = page.fishIds.every((fishId) => species[fishId]?.discovered);

    return {
      pageId: page.id,
      completed: completed || serverPage?.completed || localPage?.completed || false,
      claimed: serverPage?.claimed || localPage?.claimed || false,
    };
  });

  return {
    species,
    pages,
    totalSpeciesCaught: countDiscoveredSpecies(species),
    totalFirstCatchBonusesClaimed: countClaimedBonuses(species),
  };
};

export const recordCollectionCatch = (
  collectionBook: CollectionBookState | null | undefined,
  fishId: string,
  caughtAt = new Date(),
) => {
  const normalizedBook = ensureCollectionBook(collectionBook);
  const existingSpecies = normalizedBook.species[fishId] ?? createSpeciesState(fishId);
  const isFirstCatch = !existingSpecies.discovered;
  const caughtAtIso = caughtAt.toISOString();

  const species = {
    ...normalizedBook.species,
    [fishId]: {
      ...existingSpecies,
      discovered: true,
      catches: existingSpecies.catches + 1,
      firstCaughtAt: existingSpecies.firstCaughtAt ?? caughtAtIso,
      lastCaughtAt: caughtAtIso,
      firstCatchBonusClaimed: existingSpecies.firstCatchBonusClaimed || isFirstCatch,
    },
  };

  const pageCompletedIds: string[] = [];
  const pages = COLLECTION_BOOK_PAGES.map((page) => {
    const wasCompleted = normalizedBook.pages.find((item) => item.pageId === page.id)?.completed ?? false;
    const completed = page.fishIds.every((pageFishId) => species[pageFishId]?.discovered);

    if (!wasCompleted && completed) {
      pageCompletedIds.push(page.id);
    }

    return {
      pageId: page.id,
      completed,
      claimed: normalizedBook.pages.find((item) => item.pageId === page.id)?.claimed ?? false,
    };
  });

  const nextBook: CollectionBookState = {
    species,
    pages,
    totalSpeciesCaught: countDiscoveredSpecies(species),
    totalFirstCatchBonusesClaimed: countClaimedBonuses(species),
  };

  return {
    nextBook,
    isFirstCatch,
    pageCompletedIds,
  };
};
