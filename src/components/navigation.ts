export type NavigationChild = { label: string; href: string };
export type NavigationItem = { label: string; href: string; children?: NavigationChild[] };

export const navigationItems: NavigationItem[] = [
  {
    label: 'About',
    href: '/about-ehf',
    children: [
      { label: 'About Us', href: '/about-ehf' },
      { label: 'Journey', href: '/journey' },
      { label: 'Our Values', href: '/our-values' }
    ]
  },
  {
    label: 'Impact',
    href: '/impact-in-action',
    children: [
      { label: 'Read and Watch', href: '/impact-in-action' },
      { label: 'Impact Snapshots', href: 'https://www.ehf.org/news#fellows' },
      { label: 'EHF Community Collective', href: '/ehf-community-collective' },
      { label: 'EHF Fellows Articles', href: '/ehf-fellows-articles' }
    ]
  },
  { label: 'Archive', href: '/archive' }
];

export const fellowDirectory = { label: 'Fellow Directory', href: '/fellow-directory-advanced-search' };
