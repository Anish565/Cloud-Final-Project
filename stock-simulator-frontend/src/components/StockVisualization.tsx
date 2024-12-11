import { useEffect, useState } from "react";
import { Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { fetchStockData } from "../utils/apiService";
import { BiLoaderAlt } from "react-icons/bi";

const sampleData = {
  meta: {
    symbol: "AAPL",
    longName: "Apple Inc.",
    regularMarketPrice: 242.945,
    regularMarketDayHigh: 244.105,
    regularMarketDayLow: 241.25,
    currency: "USD",
  },
};

const timeRanges = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"];


const rangeIntervals: { [key: string]: string } = {
    "1D": "1 minute",
    "5D": "30 minutes",
    "1M": "1 day",
    "6M": "1 day",
    "YTD": "1 day",
    "1Y": "1 day",
    "5Y": "1 week",
  };

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="font-medium">USD ${data.close.toFixed(2)}</div>
        <div className="text-sm text-gray-500">
          {format(new Date(data.date), "MMM d, yyyy")}
        </div>
        <div className="text-sm text-gray-500">Volume: {data.volume}</div>
      </div>
    );
  }
  return null;
};

interface StockVisualizationProps {
  selectedStock: {
    symbol: string;
    name: string;
  };
}

const loaderStyles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .loader {
    animation: spin 1s linear infinite;
  }
`;

export default function StockVisualization({ selectedStock }: StockVisualizationProps) {
  const [selectedRange, setSelectedRange] = useState("1Y");
  const { meta } = sampleData;
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const currentPrice = meta.regularMarketPrice;
  const dayHigh = meta.regularMarketDayHigh;
  const dayLow = meta.regularMarketDayLow;
  const longName = selectedStock.name;
  const stockSymbol = selectedStock.symbol;

  const fetchStockDataFromAPI = async () => {
    try {
      console.log(`Fetching stock data for ${stockSymbol} with interval ${selectedRange}`);
      setLoading(true);
      const data = await fetchStockData(stockSymbol, selectedRange);
      setQuotes(data);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockDataFromAPI();
  }, [selectedRange, selectedStock.symbol]);

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (selectedRange) {
      case "1D":
        return format(date, "HH:mm");
      case "5D":
        return format(date, "MMM d");
      case "1M":
      case "6M":
      case "YTD":
      case "1Y":
        return format(date, "MMM d");
      case "5Y":
        return format(date, "yyyy");
      default:
        return format(date, "MMM d");
    }
  };

  const calculateTicks = () => {
    if (quotes.length === 0) return [];
    const intervalSteps = {
      "1D": 12, // every 5 minutes for 1-minute data
      "5D": 24, // every 2 hours for 30-minute data
      "1M": Math.floor(quotes.length / 10), // ~10 ticks for 1-day data
      "6M": Math.floor(quotes.length / 10), // ~10 ticks for 1-day data
      "YTD": Math.floor(quotes.length / 12), // ~12 ticks for 1-day data
      "1Y": Math.floor(quotes.length / 12), // ~12 ticks for 1-day data
      "5Y": Math.floor(quotes.length / 10), // ~10 ticks for 1-week data
    };
    const step = intervalSteps[selectedRange as keyof typeof intervalSteps] || Math.floor(quotes.length / 10);
  
    // Filter and map ticks, ensuring unique years for the 5Y range
    const filteredTicks = quotes
      .filter((_, index) => index % step === 0)
      .map((tick) => tick.date);
  
    // For 5Y, ensure only unique years
    if (selectedRange === "5Y") {
      const uniqueYears = new Set<string>();
      return filteredTicks.filter((date) => {
        const year = new Date(date).getFullYear();
        if (uniqueYears.has(year.toString())) {
          return false;
        }
        uniqueYears.add(year.toString());
        return true;
      });
    }
  
    return filteredTicks;
  };
  

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-4xl font-semibold">{selectedStock.symbol}</h2>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-4xl font-bold">
            {loading ? (
              <span className="flex items-center gap-2">
                <BiLoaderAlt className="loader w-8 h-8 text-blue-600" />
                Loading...
              </span>
            ) : (
              `$${quotes.length > 0 ? quotes[quotes.length - 1].close.toFixed(2) : "—"}`
            )}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1 rounded ${
                selectedRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px]">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-full gap-4">
            <BiLoaderAlt className="loader w-12 h-12 text-blue-600" />
            <div className="text-gray-600">Loading stock data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={quotes} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={formatXAxis}
                ticks={calculateTicks()}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#2563eb" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <style>{loaderStyles}</style>
    </div>
  );
}
