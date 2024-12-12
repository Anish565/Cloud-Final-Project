import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_SERVER_URL = "http://ec2-54-145-233-59.compute-1.amazonaws.com:3000"; // Backend server URL

export default function useWebSocket() {
  const [stocks, setStocks] = useState({}); // State to store stock data as a dictionary

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL); // Connect to WebSocket server

    // Listen for 'stock-update' events
    socket.on("stock-update", (data) => {
      // console.log("Stock Update:", data); // Log the data received from the server

      if (data && data.symbol) { // Ensure `data` is a valid stock object with a symbol
        setStocks((prevStocks) => ({
          ...prevStocks,
          [data.symbol]: data, // Update the stock data for the specific symbol
        }));
      } else {
        console.error("Received data is not in the expected format:", data);
      }
    });

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // console.log(stocks); // Log the accumulated stock data for debugging
  return stocks; // Return the accumulated stock data
}
