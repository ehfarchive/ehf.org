/**
 * Card copy for the /archive page.
 *
 * The source page does not reuse the titles, dates or thumbnails of the posts
 * it links. Six of its twenty-eight organisation cards carry a hand-edited
 * title ("Anna Kominik announced as new Board Chair" for an article titled
 * "Media release: Anna Kominik announced as new Board Chair"), six carry a date
 * line that disagrees with the article's own publishedAt (one reads "Submitted
 * on 27 January 2025" against a 2025-02-03 article), and thirty-one cards were
 * given their own thumbnail upload rather than the article's hero image. The
 * Archive's own strings are therefore the source of truth for this page.
 *
 * A card marked `ownThumbnail` is drawn with the Archive's localised thumbnail
 * at /assets/archive/cards/<route slug>.webp; every other card reuses the hero
 * image of the collection entry it links to, which is the same picture.
 */

export type ArchiveNewsCard = { href: string; title: string; date: string; thumbnail: string | null };
export type ArchiveSnapshotCard = { href: string; month: string; thumbnail: string | null };
export type ArchiveReportDocument = { label: string; href: string };
export type ArchiveReport = {
  year: string;
  cover: string;
  coverWidth: number;
  coverHeight: number;
  documents: readonly ArchiveReportDocument[];
};

type NewsRecord = [href: string, title: string, date: string, ownThumbnail?: true];
type SnapshotRecord = [href: string, month: string, ownThumbnail?: true];
type ReportRecord = [
  year: string,
  cover: [file: string, width: number, height: number],
  documents: readonly [label: string, file: string][]
];

function thumbnail(href: string, ownThumbnail?: true): string | null {
  return ownThumbnail ? `/assets/archive/cards/${href.slice(1).replaceAll('/', '-')}.webp` : null;
}

/** Source order of the EHF Organisation News Archive carousel: newest first. */
export const archiveNewsCards: readonly ArchiveNewsCard[] = ([
  ['/news-blog/media-release-new-executive-directors-to-lead-hillary-institute-amp-edmund-hillary-fellowshipnbsp', 'Media Release: New Executive Directors to Lead Hillary Institute & Edmund Hillary Fellowship', '2 July 2025', true],
  ['/news-blog/building-innovation-growth-through-global-talent', 'Building Innovation Growth through Global Talent', '5 June 2025'],
  ['/news-blog/fellow-led-board-established-with-four-fellows-appointed-as-new-directors', 'Fellow-Led Board established with Four Fellows Appointed as New Directors', '3 March 2025', true],
  ['/news-blog/building-a-basecamp-for-a-better-world-begins-at-2025-hillary-innovation-summit', 'Building a basecamp for a better world begins at 2025 Hillary Innovation Summit', '21 February 2025', true],
  ['/news-blog/the-hillary-institute-ehf-submission-on-amending-foreign-investment-funds-rules-for-migrants', 'The Hillary Institute & EHF Submission on Amending Foreign Investment Funds Rules for Migrants', 'Submitted on 27 January 2025'],
  ['/news-blog/the-hillary-institute-and-edmund-hillary-fellowship-submission-on-the-treaty-principles-bill', 'The Hillary Institute & EHF Submission on the Treaty Principles Bill', '7 January 2025'],
  ['/news-blog/a-year-of-impact-value-and-momentum-2023/24-annual-report', 'A Year of Impact, Value and Momentum - 2023/24 Annual Report', '17 October 2024'],
  ['/news-blog/media-statement-changes-needed-to-make-new-zealand-the-place-where-talent-wants-to-live-says-report', 'Media Statement: Changes needed to make New Zealand the place where talent wants to live, says report', '25 July 2024'],
  ['/news-blog/impact-springboard-showcases-leading-innovation-for-global-impact', 'Impact Springboard showcases leading innovation for global impact', '5 March 2024', true],
  ['/news-blog/reflections-this-waitangi-day-2024', 'Reflections this Waitangi Day (2024)', '6 February 2024', true],
  ['/news-blog/navigating-2024-with-stubborn-optimism-a-conversation-with-rosalie-nelson', 'Navigating 2024 with Stubborn Optimism:  A conversation with Rosalie Nelson', '15 January 2024'],
  ['/news-blog/2023-a-year-of-connections-impact-and-milestones', '2023: A year of connections, impact and milestones', 'December 21 2023', true],
  ['/news-blog/2022-2023-pilot-visa-programme-drives-economic-and-social-impact-for-aotearoa-nz', '2022/23 Annual Review shows pilot visa programme drives economic and social impact for Aotearoa NZ', 'October 3 2023', true],
  ['/news-blog/the-mission-studio-first-convening', 'Nature Restoration - First Mission Studio Convening', 'August 18 2023'],
  ['/news-blog/hillary-institute-and-edmund-hillary-fellowship-announce-new-board-members', 'Media Release: Hillary Institute and Edmund Hillary Fellowship Announce New Board Members', 'August 03 2023'],
  ['/news-blog/reflections-of-sir-edmund-hillarys-legacy-on-everest-day', 'Reflections of Sir Edmund Hillary’s Legacy on Everest Day', 'May 29 2023', true],
  ['/read/celebrating-achievements-and-values-this-everest-day', 'Celebrating Achievements and Values This Everest Day', 'May 29 2023'],
  ['/news-blog/ehfs-final-welcome-experience-sees-60-fellows-welcomed-to-the-fellowship-aotearoa', 'EHF’s final Welcome Experience sees 60 Fellows welcomed to the Fellowship & Aotearoa', 'May 17 2023', true],
  ['/news-blog/ehf-welcomes-95-fellows-in-march-welcome-experience', 'EHF Welcomes 95 Fellows in March Welcome Experience', 'Mar 24 2023', true],
  ['/news-blog/a-new-expedition-the-mission-studio', 'A New Expedition - The Mission Studio', 'Mar 01 2023', true],
  ['/news-blog/reflections-this-waitangi-day-2023', 'Reflections this Waitangi Day (2023)', 'Feb 06 2023'],
  ['/news-blog/ehf-welcomes-more-than-100-fellows-in-2022', 'EHF welcomes more than 100 Fellows in 2022', 'Dec 23 2022'],
  ['/news-blog/2021-2022-annual-report-shows-year-of-impact', '2021/2022 Annual Report shows year of impact', 'Nov 22 2022'],
  ['/news-blog/closer-alignment-between-hillary-institute-ehf-to-unlock-potential', 'Closer Alignment between Hillary Institute & EHF to unlock potential', 'Oct 10 2022'],
  ['/news-blog/media-release-anna-kominik-announced-as-new-board-chair', 'Anna Kominik announced as new Board Chair', 'Oct 28 2021'],
  ['/news-blog/farewell-thank-you-and-congratulations-to-paul-atkins', 'Farewell, thank you and congratulations to Paul Atkins', 'Aug 11 2021'],
  ['/news-blog/announcing-the-new-ceo-for-ehf', 'Announcing the new Chief Executive for EHF', 'Feb 03 2021'],
  ['/news-blog/new-hillary-institute-amp-edmund-hillary-fellowship-board-chair-elected', 'New Hillary Institute & Edmund Hillary Fellowship board chair elected', 'Dec 17 2020', true]
] as NewsRecord[]).map(([href, title, date, ownThumbnail]) => ({ href, title, date, thumbnail: thumbnail(href, ownThumbnail) }));

/**
 * Source order of the Fellows’ News Archive carousel. Thirty-one destinations
 * are Impact Snapshot pages; /summer-edition-2025 is the institutional page the
 * source lists alongside them under its own month label.
 */
export const archiveSnapshotCards: readonly ArchiveSnapshotCard[] = ([
  ['/june-2025', 'June 2025', true],
  ['/may-2025', 'May 2025', true],
  ['/april-2025', 'April 2025'],
  ['/march-2025', 'March 2025', true],
  ['/summer-edition-2025', 'Summer Edition 2025', true],
  ['/november-2024', 'November 2024'],
  ['/october-2024', 'October 2024', true],
  ['/september-2024', 'September 2024', true],
  ['/august-2024', 'August 2024'],
  ['/july-2024', 'July 2024'],
  ['/june-2024', 'June 2024'],
  ['/may-2024', 'May 2024'],
  ['/april-2024', 'April 2024', true],
  ['/march-2024', 'March 2024'],
  ['/february-2024', 'February 2024', true],
  ['/december-and-january-2024', 'December 2023 & January 2024'],
  ['/november-2023', 'November 2023'],
  ['/october-2023', 'October 2023', true],
  ['/september-2023', 'September 2023', true],
  ['/august-2023', 'August 2023'],
  ['/july-2023', 'July 2023', true],
  ['/june-2023', 'June 2023'],
  ['/may-2023', 'May 2023'],
  ['/april-2023', 'April 2023', true],
  ['/march-2023', 'March 2023', true],
  ['/february-2023', 'February 2023', true],
  ['/december22-january23', 'December 2022 & January 2023'],
  ['/november-2022', 'November 2022', true],
  ['/october-2022', 'October 2022', true],
  ['/september-2022', 'September 2022', true],
  ['/august-2022', 'August 2022', true],
  ['/july-2022', 'July 2022', true]
] as SnapshotRecord[]).map(([href, month, ownThumbnail]) => ({ href, month, thumbnail: thumbnail(href, ownThumbnail) }));

/**
 * The Annual Reports Archive links seven documents the source serves from its
 * own /s/ store. All seven are already localised byte-for-byte under
 * /assets/documents; the four cover images are Archive-only artwork and live
 * under /assets/archive.
 */
export const archiveReports: readonly ArchiveReport[] = ([
  ['2024/25', ['annual-report-2024-25-cover.webp', 750, 995], [
    ['View financial statements', 'the-hillary-institute-of-international-leadership-2025-performance-report-and-unqualified-audit-report.pdf']
  ]],
  ['2023/24', ['annual-report-2023-24-cover.webp', 750, 1060], [
    ['View annual report', 'ehf-hi-annual-report-2024.pdf'],
    ['View financial statements', 'the-hillary-institute-of-international-leadership-2024-authorised-performance-report-including-audit-report.pdf']
  ]],
  ['2022/23', ['annual-report-2022-23-cover.webp', 750, 1061], [
    ['View annual report', 'ehf-hi-annual-report-2023.pdf'],
    ['View financial statements', 'edmund-hillary-fellowship-limited-2023-financial-statements.pdf']
  ]],
  ['2021/22', ['annual-report-2021-22-cover.webp', 596, 842], [
    ['View annual report', 'hillary-institute-ehf-annual-report-2022.pdf'],
    ['View financial statements', 'certified-fs-hillary-institute-and-subsidiary-2022.pdf']
  ]]
] as ReportRecord[]).map(([year, [cover, coverWidth, coverHeight], documents]) => ({
  year,
  cover: `/assets/archive/${cover}`,
  coverWidth,
  coverHeight,
  documents: documents.map(([label, file]) => ({ label, href: `/assets/documents/${file}` }))
}));
