import { resolve } from 'node:path';
import assetManifestInput from '../../source-evidence/asset-manifest.json';
import routeManifestInput from '../../source-evidence/route-manifest.json';
import { resolveLocalAsset, type AssetManifest } from '../lib/assets';
import { loadRouteManifest } from '../lib/route-manifest';

export type SiteLink =
  | { label: string; kind: 'internal'; href: string }
  | { label: string; kind: 'external'; href: string };
export type SiteNavigationItem = SiteLink & { children?: readonly SiteLink[] };

const routes = loadRouteManifest(routeManifestInput);
const assets = assetManifestInput as AssetManifest;

function internal(label: string, href: string): SiteLink {
  const route = routes.routes.find((candidate) => candidate.path === href);
  if (!route || (route.kind !== 'included' && route.kind !== 'redirect')) {
    throw new Error(`site link is not an included or redirect route: ${href}`);
  }
  return { label, kind: 'internal', href };
}

function external(label: string, href: string): SiteLink {
  if (new URL(href).protocol !== 'https:') throw new Error(`site external link must use HTTPS: ${href}`);
  return { label, kind: 'external', href };
}

export const site = {
  name: 'Edmund Hillary Fellowship',
  description: 'The public archive of the Edmund Hillary Fellowship.',
  newsletter: {
    mode: 'display-only' as const,
    message: 'Newsletter updates are not available.'
  }
} as const;

export const primaryNavigation: readonly SiteNavigationItem[] = [
  {
    ...internal('About', '/about-ehf'),
    children: [
      internal('About Us', '/about-ehf'),
      internal('Journey', '/journey'),
      internal('Our Values', '/our-values')
    ]
  },
  {
    ...internal('Impact', '/impact-in-action'),
    children: [
      internal('Read and Watch', '/impact-in-action'),
      external('Impact Snapshots', 'https://www.ehf.org/news#fellows'),
      internal('EHF Community Collective', '/communitycollective'),
      // EHF Fellows Articles is intentionally absent because the route manifest excludes it.
    ]
  },
  internal('Archive', '/archive')
] as const;

export const footerNavigation: readonly SiteLink[] = [
  internal('About', '/about-ehf'),
  internal('Impact', '/impact-in-action'),
  internal('Archive', '/archive'),
  external('Closure Statement', 'https://www.ehf.org/closure-statement'),
  internal('Privacy', '/privacy-policy')
] as const;

export function resolveSiteAsset(assetId: string): string {
  return resolveLocalAsset(assetId, assets, resolve(process.cwd(), 'public/assets'));
}

export function assetIdForLocalPath(localPath: string): string {
  const record = assets.assets.find((asset) => asset.classification === 'local' && asset.localPath === localPath);
  if (!record) throw new Error(`missing manifest asset for path: ${localPath}`);
  return record.id;
}
