const categoryTitleMap = {
    "technology": "Technology News",
    "science": "Science News",
    "world": "World News",
    "nation": "US News",
    "business": "Business News",
    "general": "Other News",
};

function buildSection(category, summaryObjArr) {
    const sectionTitle = categoryTitleMap[category];
    const sectionHtml = summaryObjArr.map((summaryObj) => `
        <a href="${summaryObj.url}" target="_blank">
            <h3 style="color: #42F59E; text-decoration: underline; font-weight: bold;">${summaryObj.title}</h3>
        </a>
        <a href="${summaryObj.url}" target="_blank">
            ${summaryObj.image ? `<img src="${summaryObj.image}" alt="Image to ${summaryObj.title}" width="300">` : ''}
        </a>
        <p>${summaryObj.summary}</p>
        <br>
    `).join('');
    return `<h2>${sectionTitle}</h2>${sectionHtml}`;
};

function buildTinySection(category, summaryObjArr) {
    const sectionTitle = categoryTitleMap[category];
    const sectionHtml = summaryObjArr.map((summaryObj) => `
      <a href="${summaryObj.url}" target="_blank">
          <h3 style="color: #42F59E; text-decoration: underline; font-weight: bold;">${summaryObj.title}</h3>
      </a>
    `).join('');
    return `<h2>${sectionTitle}</h2>${sectionHtml}`;
};

const buildHtmlContent = (sectionsArr) => {
    const sectionsHtml = sectionsArr.join('');
    return `
        <h1>News GPT</h1>
        <h4>An AI-generated newsletter.</h4>
        <br>
        ${sectionsHtml}
        <br>
        <h4>That's all for now!</h4>
    `;
};

module.exports = {
    buildSection,
    buildTinySection,
    buildHtmlContent
};
