import React from "react";
import MarketChart from "./marketChart";
import OrderBook from "./orderBooks";
import TradeHistory from "./tradeHistory";
import styled from "styled-components";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
const TradingOverview = () => {
  return (
  <div className="space-y-4">
      <h1 className="text-2xl font-bold">Trading Dashboard</h1>
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="orderbook">Orderbook</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="chart">
          <MarketChart />
       </TabsContent>
        <TabsContent value="orderbook">
          <OrderBook />
              </TabsContent>
        <TabsContent value="history">
          <TradeHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingOverview;
