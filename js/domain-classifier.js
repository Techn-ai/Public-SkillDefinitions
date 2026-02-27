/**
 * domain-classifier.js — Client-side domain classification
 * Assigns skills to one of 19 domain categories based on name + description.
 * Mirrors the logic in build-index.js (kept in sync).
 */

window.DomainClassifier = (function () {
  const RULES = [
    { domain: 'AI & Machine Learning', keywords: ['ai ', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'nlp', 'natural language', 'llm', 'large language', 'generative ai', 'computer vision', 'transformer', 'rag ', 'retrieval augmented', 'prompt engineering', 'reinforcement learning', 'ai agent', 'mlops', 'ai ethics', 'foundation model', 'openai', 'chatgpt', 'claude', 'embedding', 'vector'] },
    { domain: 'Data & Analytics', keywords: ['data science', 'data analysis', 'analytics', 'business intelligence', 'data warehouse', 'etl', 'data pipeline', 'data modeling', 'sql', 'nosql', 'data engineer', 'data quality', 'data governance', 'data strategy', 'visualization', 'tableau', 'power bi', 'databricks', 'spark', 'hadoop', 'kafka', 'dbt', 'airflow', 'statistics', 'data lake'] },
    { domain: 'Software Development', keywords: ['java', 'python', 'javascript', 'typescript', 'kotlin', 'golang', 'rust', 'c++', 'c#', '.net', 'spring', 'react', 'angular', 'vue', 'node.js', 'api design', 'rest', 'graphql', 'microservice', 'software engineer', 'programming', 'coding', 'development', 'backend', 'frontend', 'fullstack', 'git', 'agile', 'scrum', 'testing', 'tdd', 'junit', 'maven', 'gradle'] },
    { domain: 'Cloud & Infrastructure', keywords: ['aws', 'azure', 'gcp', 'google cloud', 'cloud native', 'kubernetes', 'docker', 'container', 'terraform', 'infrastructure as code', 'serverless', 'lambda', 'cloud architect', 'cloud migration', 'saas', 'paas', 'iaas', 'cloud security', 'load balancing', 'cdn', 'cloud computing'] },
    { domain: 'DevOps & Platform Engineering', keywords: ['devops', 'ci/cd', 'github actions', 'jenkins', 'pipeline', 'deployment', 'monitoring', 'observability', 'logging', 'alerting', 'site reliability', 'sre', 'platform engineering', 'helm', 'gitops', 'ansible', 'puppet', 'chef', 'configuration management'] },
    { domain: 'Security & Cybersecurity', keywords: ['security', 'cybersecurity', 'gdpr', 'compliance', 'vulnerability', 'penetration testing', 'encryption', 'authentication', 'authorization', 'zero trust', 'nis2', 'iso 27001', 'soc2', 'identity', 'access management', 'iam', 'siem', 'threat', 'incident response', 'cyber', 'devsecops', 'ai security', 'privacy'] },
    { domain: 'Networking & IoT', keywords: ['network', 'tcp/ip', 'dns', 'http', 'vpn', 'firewall', 'iot', 'internet of things', 'mqtt', 'edge computing', 'wireless', 'bluetooth', 'zigbee', 'protocol', 'bandwidth', 'routing', 'switching', '5g', 'embedded', 'firmware'] },
    { domain: 'Architecture & Design', keywords: ['architecture', 'system design', 'distributed system', 'event-driven', 'domain-driven', 'ddd', 'cqrs', 'event sourcing', 'design pattern', 'solid principles', 'clean architecture', 'hexagonal', 'software architect', 'enterprise architect', 'solution architect', 'integration', 'middleware', 'message queue'] },
    { domain: 'Leadership & Executive', keywords: ['leadership', 'management', 'cto', 'ceo', 'executive', 'strategy', 'vision', 'stakeholder', 'board', 'governance', 'organizational change', 'transformation', 'decision making', 'team lead', 'coaching', 'mentoring', 'people management', 'performance management', 'culture', 'organizational design'] },
    { domain: 'Project & Product Management', keywords: ['project management', 'product management', 'product owner', 'roadmap', 'sprint', 'backlog', 'agile', 'kanban', 'jira', 'confluence', 'requirements', 'user story', 'mvp', 'product strategy', 'okr', 'kpi', 'delivery', 'timeline', 'stakeholder management'] },
    { domain: 'Finance & Accounting', keywords: ['finance', 'accounting', 'budget', 'financial analysis', 'investment', 'valuation', 'roi', 'p&l', 'revenue', 'cost', 'audit', 'tax', 'ifrs', 'gaap', 'treasury', 'capital', 'equity', 'venture capital', 'fundraising', 'raise capital', 'financial model', 'saas metrics', 'arr', 'mrr'] },
    { domain: 'ESG & Sustainability', keywords: ['sustainability', 'esg', 'carbon', 'climate', 'renewable energy', 'circular economy', 'green', 'environmental', 'social impact', 'reporting', 'csrd', 'tcfd', 'scope 1', 'scope 2', 'scope 3', 'net zero', 'decarbonization', 'biodiversity'] },
    { domain: 'Blockchain & Web3', keywords: ['blockchain', 'web3', 'cryptocurrency', 'bitcoin', 'ethereum', 'smart contract', 'defi', 'nft', 'token', 'dao', 'solidity', 'web3.js', 'dapp', 'consensus', 'distributed ledger'] },
    { domain: 'Governance & Compliance', keywords: ['governance', 'regulatory', 'regulatory', 'compliance', 'policy', 'legal', 'contract', 'sox', 'iso', 'regulation', 'framework', 'standard'] },
    { domain: 'Testing & Quality', keywords: ['testing', 'quality assurance', 'qa', 'test automation', 'unit test', 'integration test', 'e2e', 'selenium', 'cypress', 'jest', 'performance test', 'load test', 'quality management', 'code review'] },
    { domain: 'Design & UX', keywords: ['ux', 'ui design', 'user experience', 'user interface', 'figma', 'design thinking', 'prototyping', 'wireframe', 'accessibility', 'usability', 'human-computer', 'interaction design', 'service design', 'design system'] },
    { domain: 'HR & People', keywords: ['hr', 'human resources', 'recruitment', 'talent', 'onboarding', 'learning and development', 'employee', 'workforce', 'compensation', 'benefits', 'competence management', 'skill gap', 'training', 'performance review'] },
    { domain: 'Communication & Soft Skills', keywords: ['communication', 'presentation', 'public speaking', 'writing', 'negotiation', 'conflict resolution', 'collaboration', 'teamwork', 'emotional intelligence', 'empathy', 'facilitation', 'storytelling', 'influence'] },
  ];

  function classify(name, description) {
    const text = `${name || ''} ${description || ''}`.toLowerCase();
    for (const rule of RULES) {
      for (const kw of rule.keywords) {
        if (text.includes(kw)) return rule.domain;
      }
    }
    return null;
  }

  function getDomains() {
    return RULES.map(r => r.domain);
  }

  return { classify, getDomains };
})();
