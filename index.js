import OpenAI from "openai";
import fetch from "node-fetch";
import nodemailer from "nodemailer";
import {
  buildSection,
  buildTinySection,
  buildHtmlContent,
} from "./template.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

async function getTopGNews(category) {
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

    // Return the first 3 articles
    console.log(`Fetched ${category} news`);
    return articles.slice(0, 3);
  } catch (error) {
    console.error(error);
    return process.exit(1);
  }
}

async function summarizeWithGPT(article) {
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
    console.error(error);
    return process.exit(1);
  }
}

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
    console.error(error);
    return process.exit(1);
  }
}

async function main() {
  // Get news from various categories
  const technologyNews = await getTopGNews("technology"); // Top 3
  const scienceNews = await getTopGNews("science"); // Top 3
  const worldNews = await getTopGNews("world").slice(0, 2); // Top 2
  const usNews = await getTopGNews("nation").slice(0, 2); // Top 2
  const businessNews = await getTopGNews("business").slice(0, 2); // Top 2
  const generalNews = await getTopGNews("general"); // Top 3

  // Get summaries
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
}

main();
