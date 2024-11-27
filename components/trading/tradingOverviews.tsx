import React from "react";
import MarketChart from "./marketChart";
import OrderBook from "./orderBooks";
import TradeHistory from "./tradeHistory";
import styled from "styled-components";
import styles from "@/pages/TradingOverview.module.css";
// ... restlicher Importcode

const TradingOverview = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Trading Dashboard</h1>
      <div className={styles.content}>
        <div className={styles.main}>
          <MarketChart />
        </div>
        <div className={styles.sidebar}>
          <OrderBook />
        </div>
      </div>
      <TradeHistory />
    </div>
  );
};

export default TradingOverview;
