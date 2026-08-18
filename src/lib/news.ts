export const NEWS_ARTICLE_COUNT = 27;
export const NEWS_PAGE_SIZE = 20;

export type NewsListingPage = {
  number: number;
  newer: string | null;
  older: string | null;
};

export const NEWS_LISTING_PAGES: readonly NewsListingPage[] = [
  { number: 1, newer: null, older: '?offset=1675630776192' },
  { number: 2, newer: '?offset=1671747295026&reversePaginate=true', older: null }
];
