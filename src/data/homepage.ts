export type HomepageAsset = {
  readonly assetId: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly sizes: string;
  readonly loading: 'eager' | 'lazy';
  readonly mobile?: HomepageMobileAsset;
};

export type HomepageMobileAsset = {
  readonly assetId: string;
  readonly width: number;
  readonly height: number;
};

export type HomepageMotion = {
  readonly sourceMeasured: false;
  readonly pausesOnHover: false;
  readonly pausesOnFocus: false;
  readonly respectsReducedMotion: false;
};

export type OmittedHomepageCallToAction = {
  readonly id: 'fellow-directory';
  readonly sourceLabel: 'Fellows Directory';
  readonly disposition: 'omitted-no-approved-destination';
};

export type HomeHeroProps = {
  readonly sectionId: 'hero';
  readonly image: HomepageAsset;
  readonly title: string;
  readonly lead: string;
  readonly paragraphs: readonly string[];
  readonly stats: readonly string[];
  readonly callToAction: OmittedHomepageCallToAction;
  readonly motion: HomepageMotion;
};

export type ImpactOverviewItem = {
  readonly title: string;
  readonly copy: string;
};

export type ImpactOverviewProps = {
  readonly sectionId: 'impact-overview';
  readonly image: HomepageAsset;
  readonly items: readonly ImpactOverviewItem[];
  readonly motion: HomepageMotion;
};

export type HomepageData = {
  readonly hero: HomeHeroProps;
  readonly impactOverview: ImpactOverviewProps;
};

const noMeasuredMotion: HomepageMotion = {
  sourceMeasured: false,
  pausesOnHover: false,
  pausesOnFocus: false,
  respectsReducedMotion: false
};

export const homepage: HomepageData = {
  hero: {
    sectionId: 'hero',
    image: {
      assetId: 'asset-images-home-hero-webp',
      alt: '',
      width: 1366,
      height: 768,
      sizes: '100vw',
      loading: 'eager'
    },
    title: 'Edmund Hillary Fellowship (EHF) 2016 - 2026',
    lead: 'Created to give life to the Global Impact Visa, the Edmund Hillary Fellowship brought entrepreneurs, investors and innovators to Aotearoa New Zealand\nto find and build solutions to our toughest challenges.',
    paragraphs: [
      'Over a ten-year journey, Edmund Hillary Fellows helped create New Zealand jobs, invested millions into Kiwi businesses, supported regional communities, and developed innovative solutions and technology from our shores, delivering a realised benefit of $111 for every $1 of government funds invested. Many laid down deep roots here, with a\ncommitment to honouring Te Tiriti o Waitangi and the values and legacy of Sir Edmund Hillary.',
      "While the organisation has now closed, the legacy continues through the Fellows and the impact they continue to create. The EHF name and legacy are held by The Hillary Institute, EHF's parent organisation."
    ],
    stats: ['500+ Fellows', '50+ Nationalities', '$111 impact for every $1 invested by Govt'],
    callToAction: {
      id: 'fellow-directory',
      sourceLabel: 'Fellows Directory',
      disposition: 'omitted-no-approved-destination'
    },
    motion: noMeasuredMotion
  },
  impactOverview: {
    sectionId: 'impact-overview',
    image: {
      assetId: 'asset-images-home-organisation-webp',
      alt: '',
      width: 1440,
      height: 2690,
      sizes: '100vw',
      loading: 'eager',
      mobile: {
        assetId: 'asset-images-home-organisation-mobile-webp',
        width: 1440,
        height: 2690
      }
    },
    items: [
      {
        title: 'EHF - The Organisation',
        copy: 'As an organisation, EHF was created to attract and welcome entrepreneurs, investors and innovators from around the world\nwho shared a commitment to building meaningful change - with and from Aotearoa - as basecamp for global impact.'
      },
      {
        title: 'The Fellowship',
        copy: 'What began as a visa programme has evolved into a powerful and impact-focused community. Talented and connected innovators\nhave built deep connections with New Zealand communities, businesses, and innovation ecosystem, creating a positive global impact.'
      }
    ],
    motion: noMeasuredMotion
  }
};
