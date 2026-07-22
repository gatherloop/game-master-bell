import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid({
  title: "Game Master Bell",
  description:
    "Docs for Game Master Bell — a QR-code bell for calling a game master at a board game cafe.",
  base: "/game-master-bell/docs/",
  cleanUrls: true,
  lastUpdated: true,

  themeConfig: {
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
  },
});
