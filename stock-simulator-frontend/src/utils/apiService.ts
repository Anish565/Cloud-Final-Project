import axios from "axios";

const apiEndpoint = import.meta.env.VITE_API_ENDPOINT;
console.log("API Endpoint:", apiEndpoint);

export const registerUser = async (username: string, email: string, password: string, DOB: string, firstName: string, lastName: string) => {
    try {
        console.log("Registering user:", { username, email, password, DOB, firstName, lastName });
        const response = await axios.post(
            `${apiEndpoint}/register`,
            { username, email, password, DOB, firstName, lastName },
        );
        console.log("User registered successfully:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error registering user:", error);
        throw error;
    }
};

export const loginUser = async (username: string, password: string) => {
    try {
        const response = await axios.post(
            `${apiEndpoint}/login`,
            { username, password },
        );
        console.log("User logged in successfully:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error logging in user:", error);
        throw error;
    }
}

export const fetchQRCode = async (session: string, appName: string, username: string) => {
    try {
      const response = await axios.post(`${apiEndpoint}/auth/qrcode`, {
        session,
        app_name: appName,
        username,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching QR code:", error);
      throw error;
    }
  };

  export const verifyMFA = async (session: string, userCode: string, username: string) => {
    try {
      const response = await axios.post(`${apiEndpoint}/auth/code`, {
        session,
        userCode,
        username,
      });
      return response.data;
    } catch (error) {
      console.error("Error verifying MFA:", error);
      throw error;
    }
  };

  export const completeLoginWithMFA = async (session: string, clientId: string, username: string, mfaCode: string) => {
    try {
      const response = await axios.post(`${apiEndpoint}/auth/tokens`, {
            session,
            clientId,
            username,
            mfaCode,
      });
      return response.data;
    } catch (error) {
      console.error("Error completing MFA login:", error);
      throw error;
    }
  };

export const fetchStockData = async (symbol: string, interval: string) => {
  try {
    const response = await axios.get(
      `${apiEndpoint}/fetch/stocks?symbol=${symbol}&interval=${interval}`
    );
    // Transform the data to ensure dates are Date objects
    const parsedData = response.data.map((item: any) => ({
      ...item,
      date: new Date(item.date),
    }));
    return parsedData;
  } catch (error) {
    console.error("Error fetching stock data:", error);
    throw error;
  }
};

export const fetchStockMetaData = async (symbol: string) => {
  try {
    const response = await axios.get(
      `${apiEndpoint}/fetch/stocks?symbol=${symbol}&interval=meta`
    );

    return response;
  } catch (error) {
    console.error("Error fetching stock data:", error);
    throw error;
  }
};

export const fetchNewsDataFromAPI = async () => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    const response = await axios.get(
      `${apiEndpoint}/news/get`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching news:", error);
    throw error;
  }
};

export const createSession = async (name: string, startAmount: number, targetAmount: number, duration: string, userId: string) => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    if (!userToken) {
      throw new Error("No access token found in session storage");
    }
    
    console.log("Token being used:", userToken);
    console.log("Creating session:", { name, startAmount, targetAmount, duration, userId });
    const response = await axios.post(
      `${apiEndpoint}/session/create`,
      { name, startAmount, targetAmount, duration, userId },
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );
    console.log("Session created successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
};

export const fetchSessions = async (userId: string, inProgress: boolean) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }
    const userToken = sessionStorage.getItem("accessToken");
    // console.log("Fetching sessions API Call:", { userId, inProgress });
    const response = await axios.get(`${apiEndpoint}/session?userId=${userId}&inProgress=${inProgress}`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );
    console.log("Get sessions API Response:", response);
    
    // Check if the response indicates no sessions found
    if (response.data.statusCode === 404) {
      console.log("No sessions found:", response.data.message);
      return [];
    }
    
    // The response.data contains the parsed object with sessions array
    const { sessions } = response.data;
    
    console.log("Fetched sessions from API:", sessions);
    
    // Transform the DynamoDB format to a simpler object structure
    return sessions.map((session: any) => ({
      id: session.sessionId,
      name: session.name,
      startAmount: Number(session.startAmount),
      targetAmount: Number(session.targetAmount),
      finishingFunds: Number(session.finishingFunds),
      endDate: session.endDate,
      inProgress: session.inProgress
    }));
  } catch (error) {
    console.error("Error fetching sessions:", error);
    // If the error is from axios and contains the 404 response
    if (axios.isAxiosError(error) && error.response?.data?.statusCode === 404) {
      console.log("No sessions found:", error.response.data.message);
      return [];
    }
    throw error;
  }
};

export const deleteSession = async (sessionId: string) => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    const response = await axios.delete(
      `${apiEndpoint}/session/delete?sessionId=${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
};

export const fetchSessionOrders = async (sessionId: string) => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    console.log("Fetching session orders API Call:", { sessionId });
    const response = await axios.get(
      `${apiEndpoint}/session/get/info?sessionId=${sessionId}&sortKey=orders`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );
    console.log("Get orders API Response:", response.data);
    return response.data.data.orders;
  } catch (error) {
    console.error("Error fetching session orders:", error);
    throw error;
  }
};

export const fetchSessionPortfolio = async (sessionId: string) => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    console.log("Fetching session portfolio API Call:",  sessionId );
    const response = await axios.get(
      `${apiEndpoint}/session/get/info?sessionId=${sessionId}&sortKey=portfolio`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );
    console.log("Get portfolio API Response:", response.data);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching session portfolio:", error);
    throw error;
  }
};

export const fetchSessionWatchlist = async (sessionId: string) => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    console.log("Fetching session watchlist API Call:", sessionId);
    const response = await axios.get(
      `${apiEndpoint}/session/get/info?sessionId=${sessionId}&sortKey=watchlist`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );
    console.log("Get watchlist API Response:", response.data);
    return response.data.data.watchlist;
  } catch (error) {
    console.error("Error fetching session watchlist:", error);
    throw error;
  }
};

export const fetchSessionInfo = async (sessionId: string) => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    console.log("Fetching session info API Call:", sessionId);
    const response = await axios.get(`${apiEndpoint}/session/get/info?sessionId=${sessionId}`,
    {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    });
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response format from API');
    }

    // Ensure we have the required data
    const sessionInfo = response.data.data[0];
    const stockInfo = response.data.data[2];

    if (!stockInfo || !sessionInfo) {
      throw new Error('Missing required session or stock information');
    }

    return {
      stockInfo: {
        totalStockValue: Number(stockInfo.totalStockValue || 0),
        currentWorth: Number(stockInfo.currentWorth || 0),
        walletBalance: Number(stockInfo.walletBalance || 0)
      },
      sessionInfo: {
        startAmount: Number(sessionInfo.startAmount),
        sessionId: sessionInfo.sessionId,
        sortKey: sessionInfo.sortKey,
        targetAmount: Number(sessionInfo.targetAmount),
        userId: sessionInfo.userId,
        inProgress: sessionInfo.inProgress,
        duration: sessionInfo.duration,
        name: sessionInfo.name
      }
    };
  } catch (error) {
    console.error("Error fetching session info:", error);
    throw error;
  }
};

export const sellStock = async (sessionId: string, symbol: string, quantity: number, price: number) => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    const response = await axios.post(`${apiEndpoint}/trade/sell`, { sessionId, symbol, quantity, price },
    {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error selling stock:", error);
    throw error;
  }
};

export const buyStock = async (sessionId: string, symbol: string, quantity: number, price: number, volume: number) => {
  try {
    const userToken = sessionStorage.getItem("accessToken");
    console.log("Buying stock API Call:", { sessionId, symbol, quantity, price });
    const response = await axios.post(`${apiEndpoint}/trade/buy`, {
      sessionId,
      symbol,
      quantity,
      price,
      current_market_vol: 20000000 // Dummy value as requested
    },
    {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    });
    console.log("Buy stock API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error buying stock:", error);
    throw error;
  }
};

export const completeSession = async (sessionId: string, stockData: unknown) => {
  try {
    console.log("Completing session API Call:", { sessionId, stockData });
    const userToken = sessionStorage.getItem("accessToken");
    console.log("Completing session API Call:", { sessionId });
    const response = await axios.post(`${apiEndpoint}/session/complete`, 
      { 
        sessionId: sessionId,
        stockData: stockData
      }, 
      {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error completing session:", error);
    throw error;
  }
};