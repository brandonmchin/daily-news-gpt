const OpenAI = require("openai");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const functions = require('@google-cloud/functions-framework');

const {
  buildSection,
  buildTinySection,
  buildHtmlContent,
} = require("./template.js");

const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtl.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_SENDER_USER, // Sender gmail address
    pass: process.env.GMAIL_SENDER_APP_PASSWORD, // Sender gmail app password
  },
});

function delay(ms) {
  console.log(`Waiting ${ms} ms...`);
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function getTopGNews(category) {
  await delay(2000); // Wait 2s (2000 ms) for rate-limiting

  const url =
    "https://gnews.io/api/v4/top-headlines?category=" +
    category +
    "&lang=en&country=us&max=10&apikey=" +
    process.env.GNEWS_API_KEY;

  try {
    // Call the GNews API
    const gnews = await fetch(url);
    const gnewsData = await gnews.json();
    const articles = gnewsData.articles;

    console.log(`Fetched ${category} news`);

    if (Array.isArray(articles) && articles.length >= 3) {
      return articles.slice(0, 3); // Return the first 3 articles
    } else {
      return articles;
    }
  } catch (error) {
    console.error("Oh no... ", error);
    return process.exit(1);
  }
};

async function summarizeWithGPT(article) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const prompt = "Can you summarize this article? " + article["url"];

  try {
    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    // Get completion content
    const completionContent = completion.choices[0].message.content;

    // Create an object with Title, Image, Summary, and URL
    const summary = {
      title: article["title"],
      image: article["image"],
      summary: completionContent,
      url: article["url"],
    };

    console.log(`Summarized article "${article.url}"`);
    return summary;
  } catch (error) {
    console.error("Oh no... ", error);
    return process.exit(1);
  }
};

async function sendMail(sections) {
  try {
    const response = await transporter.sendMail({
      from: {
        name: "News GPT",
        address: process.env.GMAIL_SENDER_USER,
      },
      to: [process.env.GMAIL_RECEIVER_USER],
      subject: "Today's news summarized just for you!",
      html: buildHtmlContent(sections),
    });
    console.log("Message sent: %s", response.messageId);
  } catch (error) {
    console.error("Oh no... ", error);
    return process.exit(1);
  }
};

functions.http("main", async (req, res) => {
  // Get top articles from a few categories
  const technologyNews = await getTopGNews("technology");
  const scienceNews = await getTopGNews("science");
  const worldNews = await getTopGNews("world");
  const usNews = await getTopGNews("nation");
  const businessNews = await getTopGNews("business");
  const generalNews = await getTopGNews("general");

  // Get summaries for each article in each category
  const technologyNewsSummaries = await Promise.all(
    technologyNews.map((article) => summarizeWithGPT(article)));
  const scienceNewsSummaries = await Promise.all(
    scienceNews.map((article) => summarizeWithGPT(article)));
  const worldNewsSummaries = await Promise.all(
    worldNews.map((article) => summarizeWithGPT(article)));
  const usNewsSummaries = await Promise.all(
    usNews.map((article) => summarizeWithGPT(article)));
  const businessNewsSummaries = await Promise.all(
    businessNews.map((article) => summarizeWithGPT(article)));
  const generalNewsSummaries = await Promise.all(
    generalNews.map((article) => summarizeWithGPT(article)));

  // Construct HTML sections
  const technologyNewsSection = buildSection("technology", technologyNewsSummaries);
  const scienceNewsSection = buildSection("science", scienceNewsSummaries);
  const worldNewsSection = buildSection("world", worldNewsSummaries);
  const usNewsSection = buildSection("nation", usNewsSummaries);
  const businessNewsSection = buildSection("business", businessNewsSummaries);
  const generalNewsSection = buildTinySection("general", generalNewsSummaries); // no images and summaries

  // Send email
  await sendMail([
    technologyNewsSection,
    scienceNewsSection,
    worldNewsSection,
    usNewsSection,
    businessNewsSection,
    generalNewsSection,
  ]);

  console.log("Message has been processed");
  res.end();
});
