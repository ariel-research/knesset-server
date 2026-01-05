const fetchData = async (url) => {
    try {
      const response = await fetch(url);
      console.log("Response status:", response.status);
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const text = await response.text();
  
      if (!text || text.trim() === "") {
        console.error("No data returned from server");
        return null;
      }
  
      console.log("Response content:", text.substring(0, 500)); // מדפיס חלק מהתוכן
  
      return text;
    } catch (err) {
      console.error("Fetch error:", err.message);
      return null;
    }
  };
  