import React from "react";
import useWebSocket from "../utils/websocketService";

const NewsStrip: React.FC = () => {
  const stocks = useWebSocket();

  const stocksArray = Object.entries(stocks).map(([symbol, data]) => ({
    symbol,
    changePercent: (data as { changePercent: number }).changePercent
  }));

  return (
    <div className="w-full bg-gradient-to-r text-black p-2 text-center overflow-hidden relative">
      <div className="whitespace-nowrap animate-scroll">
        <p>
          Scrolling Stocks - {stocksArray.map((stock, index) => (
            <span key={stock.symbol}>
              {stock.symbol} {stock.changePercent >= 0 ? '↑' : '↓'} {Math.abs(stock.changePercent).toFixed(2)}%
              {index < stocksArray.length - 1 ? ' | ' : ''}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};

export default NewsStrip;
