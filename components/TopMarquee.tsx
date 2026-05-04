import { Fragment } from "react"

export default function TopMarquee({ cmsData }: { cmsData?: any }) {
  const getItems = () => {
    const customItems = cmsData?.marqueeItems?.filter((i: string) => typeof i === 'string' && i.trim() !== "");
    if (customItems?.length > 0) {
      const repeatedItems = [];
      while (repeatedItems.length < 20) {
        repeatedItems.push(...customItems);
      }
      return repeatedItems;
    }
    if (cmsData?.marqueeText?.trim()) {
      return Array(20).fill(cmsData.marqueeText);
    }
    return Array(20).fill("Welcome To Ziply5");
  };

  const items = getItems();
  const elements = items.map((item: string, idx: number) => (
    <Fragment key={idx}>
      <span className="marquee-item">{item}</span>
      <span className="marquee-dot">•</span>
    </Fragment>
  ));

  return (
    <div className="bg-yellow-400 py-2.5 overflow-hidden">
      <style>{`
        @keyframes seamless-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-seamless-marquee {
          animation: seamless-marquee 25s linear infinite;
          will-change: transform;
        }
        .animate-seamless-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="marquee-container flex whitespace-nowrap animate-seamless-marquee" style={{ width: 'max-content' }}>
        <div className="marquee-content flex shrink-0 items-center" style={{ animation: 'none' }}>
          {elements}
        </div>
        <div className="marquee-content flex shrink-0 items-center" aria-hidden="true" style={{ animation: 'none' }}>
          {elements}
        </div>
      </div>
    </div>
  )
}