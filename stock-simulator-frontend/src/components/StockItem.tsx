import React, { useState } from "react";
import { toast, ToastContainer } from 'react-toastify';
import { buyStock } from '../utils/apiService';
import { useParams } from "react-router-dom";
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface StockItemProps {
  symbol: string;
  name: string;
  price: number;
  volume?: number;
  changePercentage: number;
  onSelect: () => void;
  showBuyButton?: boolean;
  onBuy?: (quantity: number) => void;
  sessionId?: string;
}

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  stockName: string;
  stockPrice: number;
}

const QuantityModal: React.FC<QuantityModalProps> = ({ isOpen, onClose, onConfirm, stockName, stockPrice }) => {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuantityChange = (value: string) => {
    const newQuantity = parseInt(value) || 1;
    setQuantity(Math.max(1, newQuantity));
  };

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleConfirmClick = async () => {
    setIsLoading(true);
    await onConfirm(quantity);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-96 rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-semibold text-gray-200">{stockName}</h3>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-gray-300">Price per share:</span>
          <span className="text-gray-200">${stockPrice.toFixed(2)}</span>
        </div>
        <div className="mb-6">
          <label className="mb-2 block text-sm text-gray-300">Quantity:</label>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDecrement}
              className="rounded bg-gray-700 px-3 py-2 text-gray-200 hover:bg-gray-600"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-20 rounded bg-gray-700 px-3 py-2 text-center text-gray-200"
            />
            <button
              onClick={handleIncrement}
              className="rounded bg-gray-700 px-3 py-2 text-gray-200 hover:bg-gray-600"
            >
              +
            </button>
          </div>
        </div>
        <div className="mb-6 flex items-center justify-between border-t border-gray-700 pt-4">
          <span className="text-gray-300">Total:</span>
          <span className="text-lg font-semibold text-gray-200">
            ${(quantity * stockPrice).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="rounded bg-gray-700 px-4 py-2 text-gray-200 hover:bg-gray-600"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isLoading}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <AiOutlineLoading3Quarters className="animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Purchase'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const StockItem: React.FC<StockItemProps> = ({ 
  symbol, 
  name, 
  price,
  volume,
  changePercentage, 
  onSelect, 
  showBuyButton
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { id: sessionId } = useParams<{ id: string }>();

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleConfirmPurchase = async (quantity: number) => {
    try {
      console.log(`Buying ${quantity} shares of ${symbol} at $${price} with volume ${volume}`);
      const response = await buyStock(
        sessionId || 'session123', 
        symbol, 
        quantity as number, 
        price as number,
        volume as number
      );

      console.log("this is the returned response", response);
      if (!response.statusCode) {
        throw new Error('Invalid response from server');
      }

      switch (response.statusCode) {
        case 200:
          toast.success(`Successfully purchased ${quantity} shares of ${symbol}!`);
          break;
        case 400:
          toast.error(`Invalid request: ${response.message}`);
          break;
        case 401:
          console.log("this is the 401 response", response);
          toast.error(`Insufficient funds to purchase ${symbol}`);
          break;
        case 403:
          toast.error(`You don't have permission to make this purchase.`);
          break;
        case 422:
          toast.error(`You are requesting more shares than are available.`);
          break;
        case 500:
          toast.error(`Server error: ${response.message || 'Unknown error'}`);
          break;
        default:
          toast.error(`Failed to purchase ${symbol}: ${response.message || 'Unknown error'}`);
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(`Failed to purchase ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const isPositive = changePercentage >= 0;

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gray-100 rounded shadow hover:bg-gray-200 transition-colors duration-150">
        <div 
          onClick={onSelect}
          className="flex flex-1 cursor-pointer"
        >
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800">{symbol}  <span className={`ml-auto text-lg font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? "+" : ""}
            {changePercentage.toFixed(2)}%
          </span></span>
            <span className="text-gray-600">${price.toFixed(2)}</span>
          </div>
         
        </div>
        
        {showBuyButton && (
          <button
            onClick={handleBuyClick}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500"
          >
            Buy
          </button>
        )}
      </div>
      <QuantityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmPurchase}
        stockName={name}
        stockPrice={price}
      />
    </>
  );
};

export default StockItem;
