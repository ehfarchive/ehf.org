export type ArchivePost = {
  title: string;
  href: string;
  image: string;
  focal: string;
  landscape?: boolean;
};

type ArchivePostRecord = [title: string, href: string, image: string, focal: string, landscape?: boolean];

export const impactArchive: ArchivePost[] = ([
  ['How Chemergy is Changing the Game in Waste-to-Energy', '/read/how-chemergy-is-changing-the-game-in-waste-to-energy', 'chemergy.webp', '72.0238% 34.8214%'],
  ["Harnessing Pine Pollen's Power to Transform Wellbeing", '/read/harnessing-pine-pollens-power-to-transform-wellbeing', 'biogold.webp', '49.4048% 25.8929%'],
  ['Globalising Kiwi Innovation', '/read/globalising-kiwi-innovation', 'anthony-lee.webp', '54.7619% 31.25%'],
  ['Helping to Solve the Unsolvable Challenges', '/read/helping-to-solve-the-unsolvable-challenges', 'atypical.webp', '58.3333% 33.0357%'],
  ['Championing Māori and Indigenous Enterprise and Cultural Values', '/read/championing-maori-and-indigenous-enterprise-and-cultural-values', 'mea.webp', '56.5476% 36.0119%'],
  ['Unlocking the Potential of Offshore Wind', '/read/unlocking-the-potential-of-offshore-wind', 'energybank.webp', '58.3333% 18.1548%'],
  ['Building Climate Resilience in the Pacific & Aotearoa', '/read/building-climate-resilience-in-the-pacific-aotearoa', 'amy.webp', '52.381% 18.1548%'],
  ['Leading the Metaverse Revolution from Aotearoa NZ', '/read/leading-the-metaverse-revolution-from-aotearoa-nz', 'futureverse.webp', '49.4048% 37.2024%'],
  ['Solving the Ocean Plastics Problem', '/read/solving-the-ocean-plastics-problem', 'oceanworks.webp', '50% 50%'],
  ['Nature-Inspired Solutions for Global Environmental Health', '/read/nature-inspired-solutions-for-global-environmental-health', 'humble-bee.webp', '50% 50%'],
  ['Catalysing Environmental Action for a Sustainable Future', '/read/catalysing-environmental-action-for-a-sustainable-future', 'earthshare.webp', '50% 50%'],
  ['Tackling Global Textile Waste through Innovative Solutions', '/read/tackling-global-textile-waste-through-innovative-solutions', 'usedfully.webp', '50% 50%'],
  ['The Awa/River Story Inspiring Connection & Action', '/read/the-awa/river-story-inspiring-connection-action', 'i-am-the-river.webp', '50% 50%', true],
  ['Te Pā o Rākaihautū: From Vision to Reality', '/read/te-pa-o-rakaihautu-from-vision-to-reality', 'te-pa.webp', '50% 50%'],
  ['Creating opportunities for Māori & Pasifika talent in gaming', '/read/creating-opportunities-for-maori-pasifika-talent-in-gaming', 'james-mielke.webp', '50% 50%'],
  ["Activating Generational Change for Aotearoa NZ's Wellbeing", '/read/activating-generational-change-for-aotearoa-nzs-wellbeing', 'hauora.webp', '50.5952% 60.7143%'],
  ['Transforming lives in Niue by eliminating Hepatitis', '/read/transforming-lives-in-niue-by-eliminating-hepatitis', 'hazel-niue.webp', '50% 50%'],
  ['Cultivating Indigenous Entrepreneurship', '/read/cultivating-indigenous-entrepreneurship', 'tolaga.webp', '52.381% 62.5%'],
  ["Accessible Tech that's Breaking Down Barriers", '/read/accessible-tech-thats-breaking-down-barriers', 'sonnar.webp', '52.381% 63.0952%'],
  ['Opening doors for rangatahi (young people) in tech', '/read/opening-doors-for-rangatahi-young-people-in-tech', 'nikora.webp', '48.8095% 63.0952%']
] as ArchivePostRecord[]).map(([title, href, image, focal, landscape]) => ({ title, href, image: `/assets/images/cards/${image}`, focal, landscape }));
