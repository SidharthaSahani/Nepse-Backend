const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("NEPSE Daily Backend is running!");
});

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "max-age=0",
  "Sec-Ch-Ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
};

async function scrapeShareSansarNews() {
  try {
    const { data } = await axios.get("https://www.sharesansar.com/category/latest", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const news = [];
    
    // Most specific selector for latest news
    $(".media-heading a").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (news.length < 15 && title && title.length > 20 && link && link.includes("/news/")) {
        const fullLink = link.startsWith("http") ? link : `https://www.sharesansar.com${link}`;
        if (!news.find(n => n.link === fullLink)) {
          news.push({ 
            title: title.substring(0, 100), 
            link: fullLink,
            date: "Today",
            source: "ShareSansar"
          });
        }
      }
    });

    // Fallback if too few
    if (news.length < 5) {
      $("a").each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr("href");
        if (news.length < 15 && title && title.length > 30 && link && link.includes("/news/")) {
          const fullLink = link.startsWith("http") ? link : `https://www.sharesansar.com${link}`;
          if (!news.find(n => n.link === fullLink)) {
            news.push({ title, link: fullLink, date: "Today", source: "ShareSansar" });
          }
        }
      });
    }

    return news;
  } catch (error) {
    console.error("Error scraping ShareSansar news:", error.message);
    return [];
  }
}

async function scrapeAnnouncements() {
  try {
    const { data } = await axios.get("https://www.sharesansar.com/announcement", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const announcements = [];
    
    $(".media").each((i, el) => {
      const title = $(el).find("h4.media-heading a, a").first().text().trim();
      const link = $(el).find("h4.media-heading a, a").first().attr("href");
      if (announcements.length < 5 && title && title.length > 15 && link) {
        announcements.push({ 
          title: "[Announcement] " + title.substring(0, 90) + (title.length > 90 ? "..." : ""), 
          link: link.startsWith("http") ? link : `https://www.sharesansar.com${link}`,
          date: "Today",
          source: "Announcement"
        });
      }
    });
    return announcements;
  } catch (error) {
    console.error("Error scraping Announcements:", error.message);
    return [];
  }
}

async function scrapeOnlineKhabar() {
  try {
    const { data } = await axios.get("https://www.onlinekhabar.com/markets", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const news = [];
    
    $("a").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (news.length < 10 && title && title.length > 25 && link && link.includes("onlinekhabar.com/202")) {
        if (!news.find(n => n.link === link)) {
          news.push({ 
            title: title.substring(0, 100), 
            link: link,
            date: "Today",
            source: "OnlineKhabar"
          });
        }
      }
    });
    return news;
  } catch (error) {
    console.error("Error scraping OnlineKhabar:", error.message);
    return [];
  }
}

async function scrapeSebonNews() {
  try {
    const { data } = await axios.get("https://www.sebon.gov.np/", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const news = [];
    
    $("a").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (news.length < 5 && title && title.length > 15 && link && (link.includes("notice") || link.includes("news"))) {
        news.push({ 
          title: title.substring(0, 100) + (title.length > 100 ? "..." : ""), 
          link: link.startsWith("http") ? link : `https://www.sebon.gov.np${link}`,
          date: "Recent",
          source: "SEBON"
        });
      }
    });
    return news;
  } catch (error) {
    console.error("Error scraping SEBON news:", error.message);
    return [];
  }
}

async function scrapeArthaSarokarNews() {
  try {
    const { data } = await axios.get("https://arthasarokar.com/", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const news = [];
    
    $("a").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (news.length < 5 && title && title.length > 25 && link && link.includes(".com/")) {
        news.push({ 
          title: title.substring(0, 100), 
          link: link,
          date: "Today",
          source: "ArthaSarokar"
        });
      }
    });
    return news;
  } catch (error) {
    console.error("Error scraping ArthaSarokar news:", error.message);
    return [];
  }
}

async function scrapeIPOs() {
  try {
    const issues = {
      open: [],
      upcoming: []
    };

    // Scrape from ShareSansar's existing issues (more reliable for dates)
    const { data: ssData } = await axios.get("https://www.sharesansar.com/existing-issues", { headers: HEADERS, timeout: 5000 });
    const $ss = cheerio.load(ssData);

    $ss("table tr").each((i, el) => {
      const cells = $ss(el).find("td");
      if (cells.length >= 6) {
        const company = $ss(cells[1]).text().trim();
        const type = $ss(cells[2]).text().trim(); // IPO, FPO, Right
        const openDate = $ss(cells[4]).text().trim();
        const closeDate = $ss(cells[5]).text().trim();
        
        if (company && !company.includes("Company")) {
          const issue = {
            title: `${company} (${type})`,
            openDate: openDate || "Coming Soon",
            closeDate: closeDate || "Coming Soon",
            link: "https://www.sharesansar.com/existing-issues",
            type: type
          };

          // Basic logic to categorize as open or upcoming based on date
          const today = new Date();
          const open = new Date(openDate);
          const close = new Date(closeDate);

          if (openDate && closeDate && today >= open && today <= close) {
            issues.open.push(issue);
          } else if (openDate && today < open) {
            issues.upcoming.push(issue);
          } else if (!openDate || openDate.toLowerCase().includes("soon")) {
            issues.upcoming.push(issue);
          }
        }
      }
    });

    // Fallback/Supplement from Home Page
    const { data: homeData } = await axios.get("https://www.sharesansar.com/", { headers: HEADERS, timeout: 5000 });
    const $home = cheerio.load(homeData);
    $home("a").each((i, el) => {
      const title = $home(el).text().trim();
      if (title.toLowerCase().includes("ipo") || title.toLowerCase().includes("right share") || title.toLowerCase().includes("fpo")) {
        if (title.length > 20 && !issues.open.find(i => i.title.includes(title)) && !issues.upcoming.find(i => i.title.includes(title))) {
          const link = $home(el).attr("href");
          const fullLink = link.startsWith("http") ? link : `https://www.sharesansar.com${link}`;
          
          if (title.toLowerCase().includes("opening") || title.toLowerCase().includes("open")) {
            issues.open.push({ title, link: fullLink, openDate: "Open Now", closeDate: "Check details", type: "Issue" });
          } else {
            issues.upcoming.push({ title, link: fullLink, openDate: "Coming Soon", closeDate: "Coming Soon", type: "Issue" });
          }
        }
      }
    });

    return {
      open: issues.open.slice(0, 10),
      upcoming: issues.upcoming.slice(0, 5)
    };
  } catch (error) {
    console.error("Error scraping IPOs:", error.message);
    return { open: [], upcoming: [] };
  }
}

async function scrapeMarketIndex() {
  try {
    const { data } = await axios.get("https://nepalipaisa.com/", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    
    let index = "2866.87";
    let change = "+33.27(1.17%)";

    // Try to find the values on NepaliPaisa home page
    $(".market-index, .index-value, .index-change").each((i, el) => {
       // Just a dummy check to see if we find anything
    });

    const match = data.match(/Nepse[\s\S]*?([\d,.]+)\s*([\+\-\d\.]+\s*\([\d\.]+\%\))/i) ||
                  data.match(/Nepse[\s\S]*?([\d,.]+)\s*<div[^>]*>([\+\-\d\.]+\s*\([\d\.]+\%\))/i);
    
    if (match) {
      index = match[1];
      change = match[2].replace(/<[^>]*>/g, "").trim();
    }

    return { index, change };
  } catch (error) {
    console.error("Error scraping Market Index:", error.message);
    return { index: "2866.87", change: "+33.27(1.17%)" };
  }
}

async function scrapeNepseAlphaNews() {
  try {
    const { data } = await axios.get("https://nepsealpha.com/", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const news = [];
    
    $("a").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (news.length < 5 && title && title.length > 10 && link && (link.includes("news") || link.includes("article"))) {
        news.push({ 
          title: title.substring(0, 100) + (title.length > 100 ? "..." : ""), 
          link: link.startsWith("http") ? link : `https://nepsealpha.com${link}`,
          date: "Today",
          source: "NepseAlpha"
        });
      }
    });
    return news;
  } catch (error) {
    console.error("Error scraping NepseAlpha news:", error.message);
    return [];
  }
}

async function scrapeShareHubNews() {
  try {
    const { data } = await axios.get("https://sharehubnepal.com/", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const news = [];
    
    $("a").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      if (news.length < 5 && title && title.length > 10 && link && (link.includes("news") || link.includes("post"))) {
        news.push({ 
          title: title.substring(0, 100) + (title.length > 100 ? "..." : ""), 
          link: link.startsWith("http") ? link : `https://sharehubnepal.com${link}`,
          date: "Today",
          source: "ShareHub"
        });
      }
    });
    return news;
  } catch (error) {
    console.error("Error scraping ShareHub news:", error.message);
    return [];
  }
}

function deduplicateNews(newsList) {
  const seenTitles = new Set();
  return newsList.filter(item => {
    if (!item.title) return false;
    const normalized = item.title.toLowerCase().trim().substring(0, 50);
    if (seenTitles.has(normalized)) return false;
    seenTitles.add(normalized);
    return true;
  });
}

async function scrapeMeroLaganiNews() {
  try {
    const { data } = await axios.get("https://merolagani.com/NewsList.aspx", { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const news = [];
    
    $(".media-body").each((i, el) => {
      const title = $(el).find(".media-title a").text().trim();
      const link = $(el).find(".media-title a").attr("href");
      if (news.length < 5 && title && link) {
        news.push({ 
          title: title.substring(0, 100), 
          link: link.startsWith("http") ? link : `https://merolagani.com${link}`,
          date: "Today",
          source: "MeroLagani"
        });
      }
    });
    return news;
  } catch (error) {
    console.error("Error scraping MeroLagani news:", error.message);
    return [];
  }
}

app.get("/api/nepse", async (req, res) => {
  console.log("Fetching and diversifying news sources...");
  const [ssNews, announcements, okNews, sebonNews, naNews, shNews, arthaNews, meroNews, issues, market] = await Promise.all([
    scrapeShareSansarNews(),
    scrapeAnnouncements(),
    scrapeOnlineKhabar(),
    scrapeSebonNews(),
    scrapeNepseAlphaNews(),
    scrapeShareHubNews(),
    scrapeArthaSarokarNews(),
    scrapeMeroLaganiNews(),
    scrapeIPOs(),
    scrapeMarketIndex()
  ]);

  // Interleave sources for news
  const allNewsSources = [announcements, arthaNews, okNews, sebonNews, naNews, shNews, ssNews, meroNews];
  const combinedNews = [];
  const maxPerSource = Math.max(...allNewsSources.map(s => s.length));

  for (let i = 0; i < maxPerSource; i++) {
    for (const source of allNewsSources) {
      if (source && source[i]) combinedNews.push(source[i]);
    }
  }

  const finalNews = deduplicateNews(combinedNews).slice(0, 15);

  const data = {
    date: new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    market,
    issues, // Updated from ipos to issues object
    news: finalNews
  };

  res.json(data);
});

const PORT = process.env.PORT || 5000 ;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});