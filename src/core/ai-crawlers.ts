// Katalog der KI-Crawler fuer die oeffentlichen Tools.
//
// Die fuenf mit `scored: true` sind dieselben, die in den GEO Score einfliessen
// (siehe AI_BOTS in technical-check/pure.ts). Die uebrigen zeigen die Tools
// zusaetzlich an, weil sie in echten robots.txt-Dateien vorkommen — sie
// veraendern aber keine Bewertung.

export type AiCrawler = {
  /** Exakter User-Agent-Token, wie er in der robots.txt steht. */
  token: string
  operator: string
  /** Ein Satz: wofuer der Bot liest. */
  note: { de: string; en: string }
  /** Fliesst in den GEO Score ein. */
  scored: boolean
  /** Vorauswahl im Generator: erlauben, wer Sichtbarkeit in KI-Antworten will. */
  allowByDefault: boolean
}

export const AI_CRAWLERS: AiCrawler[] = [
  {
    token: 'GPTBot',
    operator: 'OpenAI',
    note: {
      de: 'Liest Seiten für das Training von OpenAI-Modellen.',
      en: 'Reads pages to train OpenAI models.',
    },
    scored: true,
    allowByDefault: true,
  },
  {
    token: 'OAI-SearchBot',
    operator: 'OpenAI',
    note: {
      de: 'Baut den Index hinter der ChatGPT-Suche. Wer hier sperrt, erscheint dort nicht.',
      en: 'Builds the index behind ChatGPT search. Blocking it means not appearing there.',
    },
    scored: true,
    allowByDefault: true,
  },
  {
    token: 'ChatGPT-User',
    operator: 'OpenAI',
    note: {
      de: 'Ruft eine Seite ab, wenn ein Mensch im Chat auf den Link klickt.',
      en: 'Fetches a page when a person clicks the link inside a chat.',
    },
    scored: false,
    allowByDefault: true,
  },
  {
    token: 'ClaudeBot',
    operator: 'Anthropic',
    note: {
      de: 'Crawler von Anthropic für Claude — liest Seiten, die Claude später zitieren kann.',
      en: 'Anthropic crawler for Claude — reads pages Claude can later cite.',
    },
    scored: true,
    allowByDefault: true,
  },
  {
    token: 'PerplexityBot',
    operator: 'Perplexity',
    note: {
      de: 'Crawler für die Perplexity-Antworten und ihre Quellenangaben.',
      en: 'Crawler behind Perplexity answers and their source lists.',
    },
    scored: true,
    allowByDefault: true,
  },
  {
    token: 'Google-Extended',
    operator: 'Google',
    note: {
      de: 'Steuert die Nutzung durch Gemini und KI-Übersichten. Sperren entfernt dich NICHT aus der normalen Google-Suche — dafür ist Googlebot zuständig.',
      en: 'Controls use by Gemini and AI Overviews. Blocking it does NOT remove you from normal Google Search — that is Googlebot.',
    },
    scored: true,
    allowByDefault: true,
  },
  {
    token: 'Applebot-Extended',
    operator: 'Apple',
    note: {
      de: 'Steuert die Nutzung durch Apple Intelligence.',
      en: 'Controls use by Apple Intelligence.',
    },
    scored: false,
    allowByDefault: true,
  },
  {
    token: 'meta-externalagent',
    operator: 'Meta',
    note: {
      de: 'Crawler für Meta AI, den Assistenten in WhatsApp, Instagram und Facebook.',
      en: 'Crawler for Meta AI, the assistant inside WhatsApp, Instagram and Facebook.',
    },
    scored: false,
    allowByDefault: true,
  },
  {
    token: 'CCBot',
    operator: 'Common Crawl',
    note: {
      de: 'Offener Datensatz, aus dem viele Modelle ihre Trainingsdaten beziehen.',
      en: 'Open dataset many models draw their training data from.',
    },
    scored: false,
    allowByDefault: true,
  },
  {
    token: 'Amazonbot',
    operator: 'Amazon',
    note: {
      de: 'Crawler für Alexa und Amazons Assistenzdienste.',
      en: 'Crawler for Alexa and Amazon assistant services.',
    },
    scored: false,
    allowByDefault: true,
  },
  {
    token: 'Bytespider',
    operator: 'ByteDance',
    note: {
      de: 'Crawler von ByteDance. Ignoriert robots.txt nach Berichten teilweise — wer ihn sperrt, sollte zusätzlich auf Serverebene blocken.',
      en: 'ByteDance crawler. Reported to partly ignore robots.txt — if you block it, block at server level too.',
    },
    scored: false,
    allowByDefault: false,
  },
]

export const AI_CRAWLER_TOKENS = AI_CRAWLERS.map((crawler) => crawler.token)
