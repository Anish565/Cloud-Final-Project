import React, { useState, useEffect } from 'react';
import { fetchSessionPortfolio, sellStock } from '../../utils/apiService';
import { useParams } from 'react-router-dom';
import useWebSocket from '../../utils/websocketService';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface Stock {
  symbol: string;
  quantity: number;
  price: number;
  currentPrice?: number;
}

interface PortfolioData {
  portfolio: Stock[];
  walletBalance: number;
  totalStockValue: number;
}

const formatMoney = (amount: number): string => {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

// Add new interface for sell modal
interface SellModalProps {
  stock: Stock;
  isOpen: boolean;
  onClose: () => void;
  stocks: any;
}

// const handleSell = (symbol: string, quantity: number) => {
//   console.log(`Selling ${quantity} shares of ${symbol}`);
// };

// Add SellModal component
const SellModal: React.FC<SellModalProps> = ({ stock, isOpen, onClose, stocks }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const { id: sessionId } = useParams<{ id: string }>();

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    // Ensure the value stays within valid range
    if (value >= 1 && value <= stock.quantity) {
      setQuantity(value);
    }
  };

  const incrementQuantity = () => {
    if (quantity < stock.quantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleSell = () => {
    if (quantity > 0 && quantity <= stock.quantity && sessionId) {
      console.log(`Selling ${quantity} shares of ${stock.symbol}`);
      sellStock(sessionId, stock.symbol, quantity, stocks[stock.symbol]?.price || 0);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-[40%]">
        <h3 className="text-lg font-semibold mb-4 text-black">Sell {stock.symbol}</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Available: {stock.quantity} shares</p>
          <p className="text-sm text-gray-600 mb-2">Current Price: {formatMoney(stocks[stock.symbol]?.price || 0)}</p>
          
          {/* Updated quantity selector with +/- buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={decrementQuantity}
                className="px-3 py-1 border rounded hover:bg-gray-100 text-black cursor-pointer"
                disabled={quantity <= 1}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={stock.quantity}
                value={quantity}
                onChange={handleQuantityChange}
                className="w-20 p-2 border rounded text-center text-black"
              />
              <button
                onClick={incrementQuantity}
                className="px-3 py-1 border rounded hover:bg-gray-100 text-black cursor-pointer"
                disabled={quantity >= stock.quantity}
              >
                +
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Total Value: {formatMoney(quantity * stocks[stock.symbol]?.price || 0)}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSell}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={quantity < 1 || quantity > stock.quantity}
          >
            Sell
          </button>
        </div>
      </div>
    </div>
  );
};

const Portfolio: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const { id: sessionId } = useParams<{ id: string }>();
  const stocks = useWebSocket();
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setLoading(true);
        const data = await fetchSessionPortfolio(sessionId || '');
        setPortfolioData(data);
      } catch (err) {
        setError('Failed to load portfolio data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [sessionId]);

  // calculate the profit/loss value
  const plValue = (value: number, currentPrice: number, quantity: number) => {
    return formatMoney(quantity *  currentPrice - value);
  }

  const plPercent = (value: number, currentPrice: number, quantity: number) => {
    return formatMoney((quantity *  currentPrice - value) / (quantity *  currentPrice) * 100);
  }

  if (loading) {
    return <div className="text-center p-4">Loading portfolio data...</div>;
  }

  if (error || !portfolioData) {
    return <div className="text-center text-red-500 p-4">{error || 'Failed to load portfolio'}</div>;
  }

  // Calculate total invested amount based on current holdings
  const totalInvested = portfolioData.portfolio.reduce((total, stock) => 
    total + (stock.quantity * stock.price), 0);

  // For now, using purchase price as current price since API doesn't provide current prices
  const portfolioValue = portfolioData.portfolio.reduce((total, stock) => 
    total + (stock.quantity * stocks[stock.symbol]?.price || 0), 0); // This should be updated when current prices are available

  // Calculate total profit/loss (will be 0 until we have current prices)
  const totalProfitLoss = portfolioValue - totalInvested;
  const profitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  return (
    <div className="p-6">
      {/* Portfolio Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-600 rounded-lg shadow-md p-6">
          <h3 className="text-gray-200 text-sm font-medium mb-2">Wallet Balance</h3>
          <p className="text-2xl font-bold">{formatMoney(portfolioData.walletBalance)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-600 rounded-lg shadow-md p-6">
          <h3 className="text-gray-200 text-sm font-medium mb-2">Total Invested</h3>
          <p className="text-2xl font-bold">{formatMoney(totalInvested)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-600 rounded-lg shadow-md p-6">
          <h3 className="text-gray-200 text-sm font-medium mb-2">Total P/L</h3>
          <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoney(totalProfitLoss)}
            <span className="text-sm ml-1 opacity-75">
              ({profitLossPercent.toFixed(2)}%)
            </span>
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-600 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Your Holdings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-300 font-bold">Stock</th>
                <th className="text-left py-3 px-4 text-gray-300 font-bold">Quantity</th>
                <th className="text-left py-3 px-4 text-gray-300 font-bold">Avg. Buy Price</th>
                <th className="text-left py-3 px-4 text-gray-300 font-bold">Current Price</th>
                <th className="text-left py-3 px-4 text-gray-300 font-bold">Total Value</th>
                <th className="text-left py-3 px-4 text-gray-300 font-bold">P/L</th>
                <th className="text-left py-3 px-4 text-gray-300 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {portfolioData.portfolio.map((stock) => {
                const value = stock.quantity * stock.price;
                // Profit/loss calculation will be added when we have current prices
                
                return (
                  <tr key={stock.symbol} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium">{stock.symbol}</td>
                    <td className="py-3 px-4">{stock.quantity}</td>
                    <td className="py-3 px-4">{formatMoney(stock.price)}</td>
                    <td className="py-3 px-4">{formatMoney(stocks[stock.symbol]?.price || 0)}</td>
                    <td className="py-3 px-4">{formatMoney(value)}</td>
                    <td className={`py-3 px-4 ${value - (stocks[stock.symbol]?.price || 0) * stock.quantity >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {(stocks[stock.symbol]?.price || 0) * stock.quantity - value >= 0 ? (
                        <FaArrowUp className="inline mr-1" />
                      ) : (
                        <FaArrowDown className="inline mr-1" />
                      )}
                      {plValue(value, stocks[stock.symbol]?.price || 0, stock.quantity)} (
                      {plPercent(value, stocks[stock.symbol]?.price || 0, stock.quantity)}%)
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedStock(stock);
                          setIsSellModalOpen(true);
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sell Modal */}
      {selectedStock && (
        <SellModal
          stocks={stocks}
          stock={selectedStock}
          isOpen={isSellModalOpen}
          onClose={() => {
            setIsSellModalOpen(false);
            setSelectedStock(null);
          }}
        />
      )}
    </div>
  );
};

export default Portfolio;
