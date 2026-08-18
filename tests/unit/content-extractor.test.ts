import { expect, test } from 'vitest';
import { assetReferencesForContent, buildContentManifest, documentPathForSource, extractArticleContent, extractPageInput, hasForbiddenSourceHostRuntimeReference, validatePageRecord } from '../../scripts/migrate-content.mjs';

test('extracts article copy, heading, figure, caption, and link in document order', () => {
  const result = extractArticleContent(`
    <article>
      <h1>Clean energy</h1>
      <p class="summary">A concise summary.</p>
      <p>First <a href="https://example.org/story">reference</a>.</p>
      <figure><img src="https://assets.example.org/hero.jpg" alt="A turbine"><figcaption>Photo credit</figcaption></figure>
      <h2>Details</h2><p>Second paragraph.</p>
    </article>
  `);

  expect(result.title).toBe('Clean energy');
  expect(result.excerpt).toBe('A concise summary.');
  expect(result.body).toContain('First [reference](https://example.org/story).');
  expect(result.body).toContain('## Details');
  expect(result.body).toContain('![A turbine](https://assets.example.org/hero.jpg)');
  expect(result.body).toContain('*Photo credit*');
});

test('extracts lazily loaded gallery images from data-src', () => {
  const result = extractArticleContent(`
    <main>
      <article>
        <h1>Gallery</h1>
        <div class="sqs-gallery-block-grid">
          <img data-src="https://assets.example.org/one.jpg" alt="First image">
          <img data-src="https://assets.example.org/two.jpg" alt="Second image">
          <img data-src="https://assets.example.org/two.jpg" alt="Duplicate thumbnail">
        </div>
        <div class="author-avatar"><img src="https://assets.example.org/avatar.jpg" alt="Author avatar"></div>
      </article>
    </main>
  `);

  expect(result.images).toEqual([
    { src: 'https://assets.example.org/one.jpg', alt: 'First image' },
    { src: 'https://assets.example.org/two.jpg', alt: 'Second image' }
  ]);
  expect(result.body).toContain('![First image](https://assets.example.org/one.jpg)');
  expect(result.body).toContain('![Second image](https://assets.example.org/two.jpg)');
});

test('normalizes internal source links with trailing encoded or literal non-breaking spaces', () => {
  const result = extractArticleContent(`
    <article>
      <h1>Links</h1>
      <p><a href="https://www.ehf.org/privacy-policy%C2%A0">Privacy</a></p>
      <p><a href="/read/story?proof=t ">Proof</a></p>
      <p><a href="https://orb-parrotfish-n735.squarespace.com/fellow-directory">Directory</a></p>
    </article>
  `);

  expect(result.body).toContain('[Privacy](/privacy-policy)');
  expect(result.body).toContain('[Proof](/read/story?proof=t)');
  expect(result.body).toContain('[Directory](/fellow-directory)');
});

test('rejects internal source-host destinations but permits the same text as a link label', () => {
  expect(hasForbiddenSourceHostRuntimeReference('[EHF](https://www.ehf.org/events)')).toBe(true);
  expect(hasForbiddenSourceHostRuntimeReference('[https://www.ehf.org/events](/events)')).toBe(false);
});

test('retains generated homepage and Archive routes without local inputs', () => {
  const { manifest } = buildContentManifest({ routes: [
    { path: '/', kind: 'included', family: 'homepage' },
    { path: '/archive', kind: 'included', family: 'archive' }
  ] });

  expect(manifest.content).toEqual([
    { route: '/', template: 'homepage', localInput: null, contentHash: null },
    { route: '/archive', template: 'archive', localInput: null, contentHash: null }
  ]);
});

test('removes Edmund Hillary Fellowship site chrome from og title fallback without trimming genuine em-dash titles', () => {
  const result = extractArticleContent(`
    <html>
      <head><meta property="og:title" content="A genuine title — with a subtitle &mdash; Edmund Hillary Fellowship"></head>
      <body><article><p>Summary.</p></article></body>
    </html>
  `);

  expect(result.title).toBe('A genuine title — with a subtitle');
});

test('extracts the social image separately from article body images', () => {
  const result = extractArticleContent(`
    <html>
      <head><meta property="og:image" content="https://assets.example.org/listing.jpg"></head>
      <body><article><h1>Images</h1><figure><img src="https://assets.example.org/body.jpg" alt="Body image"></figure></article></body>
    </html>
  `);

  expect(result.socialImage).toEqual({
    src: 'https://assets.example.org/listing.jpg',
    alt: 'Images'
  });
  expect(result.images).toEqual([
    { src: 'https://assets.example.org/body.jpg', alt: 'Body image' }
  ]);
});
test('extracts an ISO source publication date from Squarespace itemprop metadata', () => {
  const result = extractArticleContent(`
    <html>
      <head><meta itemprop="datePublished" content="2024-06-14T09:30:00+12:00"></head>
      <body><article><h1>Published</h1><p>Summary.</p></article></body>
    </html>
  `);

  expect(result.publishedAt).toBe('2024-06-14');
});

test('preserves a declared external embed instead of dropping it', () => {
  const result = extractArticleContent('<article><h1>Video</h1><iframe src="https://video.example.org/embed"></iframe></article>');
  expect(result.body).toContain('[External service](https://video.example.org/embed)');
  expect(result.externalUrls).toEqual(['https://video.example.org/embed']);
});

test('extracts the typed page input without source lineage', () => {
  expect(extractPageInput('/about-ehf', '<main><h1>About EHF</h1><p>Our purpose.</p><a href="/journey">Our journey</a></main>'))
    .toEqual({
      route: '/about-ehf',
      title: 'About EHF',
      description: 'Our purpose.',
      heading: 'About EHF',
      body: ['Our purpose.'],
      heroImage: null,
      heroAlt: null,
      links: [{ label: 'Our journey', href: '/journey' }]
    });
});

test('requires source-faithful body copy for institutional and report page inputs', () => {
  const empty = {
    route: '/about-ehf',
    title: 'About EHF',
    description: '',
    heading: 'About EHF',
    body: [],
    heroImage: null,
    heroAlt: null,
    links: []
  };
  expect(validatePageRecord(empty, '/about-ehf', 'institutional')).toContain('page input needs non-empty description and body');
  expect(validatePageRecord({ ...empty, route: '/23-annual-report', description: 'Report', body: ['Read it.'] }, '/23-annual-report', 'annual-report-document'))
    .toContain('annual report page input needs at least one local document link');
});

test('rejects empty contact/media/donation records while preserving a sparse description', () => {
  const sparse = {
    route: '/contact-media',
    title: 'Media contact',
    description: '',
    heading: 'Media enquiries',
    body: ['Contact our team.'],
    heroImage: null,
    heroAlt: null,
    links: []
  };
  expect(validatePageRecord(sparse, '/contact-media', 'contact-media-donation')).toEqual([]);
  expect(validatePageRecord({ ...sparse, title: '', heading: '', body: [] }, '/contact-media', 'contact-media-donation'))
    .toContain('contact/media/donation page input needs non-empty title, heading, and body');
});

test('derives local and external asset route uses only from typed content references', () => {
  expect(assetReferencesForContent([
    { route: '/about-ehf', text: '[Guide](/assets/documents/guide.pdf)' },
    { route: '/watch', text: '[External service](https://video.example.org/embed)' },
    { route: '/other', text: 'No asset here.' }
  ])).toEqual({
    local: new Map([['/assets/documents/guide.pdf', new Set(['/about-ehf'])]]),
    external: new Map([['https://video.example.org/embed', new Set(['/watch'])]])
  });
});

test('uses manifest-safe local names for annual-report source documents', () => {
  expect(documentPathForSource('https://www.ehf.org/s/EHF-HI-Annual-Report-2023.pdf')).toBe('/assets/documents/ehf-hi-annual-report-2023.pdf');
  expect(documentPathForSource('https://www.ehf.org/s/Certified-FS-Hillary-Institute-and-Subsidiary-2022.pdf')).toBe('/assets/documents/certified-fs-hillary-institute-and-subsidiary-2022.pdf');
  expect(documentPathForSource('https://www.ehf.org/s/Hillary-Institute-EHF-Annual-Report-2022-Web.pdf')).toBe('/assets/documents/hillary-institute-ehf-annual-report-2022.pdf');
});

test('extracts source-page headings and metadata description from a main content region', () => {
  expect(extractPageInput('/about-ehf', `
    <head><meta name="description" content="EHF supports Fellows."></head>
    <article><h1>Empty template</h1></article>
    <main><h1>About EHF</h1><h4><strong>Source-faithful introduction.</strong></h4><h2>Our story</h2></main>
  `)).toMatchObject({
    title: 'About EHF',
    description: 'EHF supports Fellows.',
    body: ['#### **Source-faithful introduction.**', '## Our story']
  });
});

test('removes repeated EHF title chrome from source metadata', () => {
  expect(extractPageInput('/contact-media', `
    <head><meta property="og:title" content="Let's Chat (Media) | Edmund Hillary Fellowship — Edmund Hillary Fellowship"></head>
    <main><h3>Media Enquiry</h3></main>
  `).title).toBe("Let's Chat (Media)");
});
