import dynamic from "next/dynamic";
const RecapPage = dynamic(() => import("@/components/trading/RecapPage"), { ssr: false });

export default function TradingRecap() {
  return <RecapPage />;
}