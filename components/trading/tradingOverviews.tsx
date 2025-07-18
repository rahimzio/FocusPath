import React from "react";
import MarketChart from "./marketChart";
import OrderBook from "./orderBooks";
import TradeHistory from "./tradeHistory";
import styled from "styled-components";
// ... restlicher Importcode

const TradingOverview = () => {
  return (
    <div className="">
      <h1 className="">Trading Dashboard</h1>
      <div className="">
        <div className="">
          <MarketChart />
        </div>
        <div className="">
          <OrderBook />
        </div>
      </div>
      <TradeHistory />
    </div>
  );
};

export default TradingOverview;
