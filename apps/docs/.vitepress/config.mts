import { withMermaid } from "vitepress-plugin-mermaid";

const base = "/game-master-bell/docs/";
const siteUrl = "https://gatherloop.github.io/game-master-bell/docs/";
const description =
  "Docs for Game Master Bell — a QR-code bell for calling a game master at a board game cafe.";

export default withMermaid({
  title: "Game Master Bell",
  description,
  base,
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` }],
    ["meta", { name: "theme-color", content: "#f5b942" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "Game Master Bell — Docs" }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:url", content: siteUrl }],
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "twitter:title", content: "Game Master Bell — Docs" }],
    ["meta", { name: "twitter:description", content: description }],
  ],

  themeConfig: {
    logo: "/favicon.svg",

    nav: [
      { text: "Home", link: "/" },
      { text: "Product", link: "/product/overview" },
      { text: "Engineering", link: "/engineering/architecture" },
      { text: "Reference", link: "/reference/repository-map" },
    ],

    sidebar: [
      {
        text: "Product",
        items: [
          { text: "Overview", link: "/product/overview" },
          { text: "Features", link: "/product/features" },
        ],
      },
      {
        text: "Engineering",
        items: [
          { text: "Architecture", link: "/engineering/architecture" },
          { text: "Tech Stack", link: "/engineering/tech-stack" },
          {
            text: "Engineering Decisions",
            link: "/engineering/engineering-decisions",
          },
          { text: "Getting Started", link: "/engineering/getting-started" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Repository Map", link: "/reference/repository-map" },
          { text: "Links", link: "/reference/links" },
        ],
      },
    ],

    search: {
      provider: "local",
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/gatherloop/game-master-bell",
      },
    ],

    editLink: {
      pattern: "https://github.com/gatherloop/game-master-bell/edit/main/apps/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Docs for Game Master Bell, built with VitePress.",
      copyright: "Gatherloop Board Game Cafe",
    },
  },
});
