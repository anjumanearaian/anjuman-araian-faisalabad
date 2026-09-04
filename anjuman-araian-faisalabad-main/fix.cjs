const fs = require('fs');
let content = fs.readFileSync('e:/Projects/Anjuman-e-arain/anjumane-araien/src/app/pages/AdminPage.tsx', 'utf8');

// Use regex to remove useMemos
content = content.replace(/const filteredMessages = useMemo\(\(\) => \{[\s\S]*?\}, \[messages, messageFilter, messageStatusFilter\]\);\nconst paginatedMessages = useMemo\(\(\) => \{[\s\S]*?\}, \[filteredMessages, messagesPage\]\);/, '');

// Replace saveMessages button
content = content.replace(/<button onClick=\{saveMessages\} style=\{actionBtn\(GREEN\)\}>\s*<CheckCircle size=\{14\} \/> Save Messages\s*<\/button>/g, '');

// Replace saveMessages function
content = content.replace(/const saveMessages = async \(\) => \{[\s\S]*?alert\("Saved leadership and messages successfully\."\);[\s\S]*?\} catch \(err\) \{[\s\S]*?alert\("Failed to save\."\);[\s\S]*?\}\s*\};/g, '');

// Replace paginated usages
content = content.replace(/paginatedMessages\.data/g, 'messages');
content = content.replace(/paginatedMessages\.totalPages/g, 'messagesTotalPages');
content = content.replace(/!paginatedMessages\.hasMore/g, '(messagesPage >= messagesTotalPages)');
content = content.replace(/resolveMessage\(msg\.id\)/g, 'handleUpdateMessageStatus(msg.id, "resolved")');
content = content.replace(/unresolveMessage\(msg\.id\)/g, 'handleUpdateMessageStatus(msg.id, "unread")');

fs.writeFileSync('e:/Projects/Anjuman-e-arain/anjumane-araien/src/app/pages/AdminPage.tsx', content);
