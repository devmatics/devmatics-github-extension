import '../img/icon-128.png'
import '../img/icon-34.png'

chrome.runtime.onMessage.addListener(function(message) {
    switch (message.action) {
        case "openOptionsPage":
            chrome.runtime.openOptionsPage();
            break;
        default:
            break;
    }
});

const issuesUrlMatch = /https?:\/\/github\.com\/.+\/.+\/issues\/[0-9]+/gi;
const issuesRegex = new RegExp(issuesUrlMatch);

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
    if (details && details.url && details.tabId)
    {
        let url = details.url;
        debugger;
        if (url.match(issuesRegex)) {
            chrome.tabs.executeScript(details.tabId, {file: "issues.bundle.js", runAt: 'document_end' }, () => {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                }
            });
        }
    }
}, {
    url: [
        {hostEquals: 'github.com'}
    ]
});