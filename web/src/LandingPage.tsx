import { Link } from "react-router-dom";

type Technology = {
  name: string;
  logo?: string;
  mark?: string;
  tone: string;
};

type Flow = {
  title: string;
  tone: "blue" | "green" | "violet";
  nodes: { name: string; description: string; mark: string }[];
};

const technologyGroups: { label: string; items: Technology[] }[] = [
  {
    label: "Backend",
    items: [
      { name: "Go", logo: "/tech/go.svg", tone: "cyan" },
      { name: "Chi Router", mark: "χ", tone: "rose" },
      { name: "REST API", mark: "{ }", tone: "green" },
      { name: "JWT", logo: "/tech/jwt.svg", tone: "violet" },
    ],
  },
  {
    label: "Frontend",
    items: [
      { name: "React", logo: "/tech/react.svg", tone: "cyan" },
      { name: "TypeScript", logo: "/tech/typescript.svg", tone: "blue" },
      { name: "Vite", logo: "/tech/vite.svg", tone: "violet" },
    ],
  },
  {
    label: "Data & services",
    items: [
      { name: "PostgreSQL", logo: "/tech/postgresql.svg", tone: "blue" },
      { name: "Redis", logo: "/tech/redis.svg", tone: "red" },
      { name: "SendGrid", logo: "/tech/sendgrid.svg", tone: "cyan" },
    ],
  },
  {
    label: "Tooling",
    items: [
      { name: "Swagger", logo: "/tech/swagger.svg", tone: "green" },
      { name: "Docker Compose", logo: "/tech/docker.svg", tone: "blue" },
    ],
  },
];

const flows: Flow[] = [
  {
    title: "Account activation flow",
    tone: "blue",
    nodes: [
      { name: "React client", description: "Collects registration details", mark: "UI" },
      { name: "Chi router", description: "Routes the public API request", mark: "χ" },
      { name: "Auth handler", description: "Validates and hashes credentials", mark: "AU" },
      { name: "PostgreSQL", description: "Stores the user and invitation", mark: "DB" },
      { name: "SendGrid", description: "Delivers the activation message", mark: "SG" },
      { name: "Activation API", description: "Enables the verified account", mark: "OK" },
    ],
  },
  {
    title: "Authenticated request flow",
    tone: "green",
    nodes: [
      { name: "React client", description: "Sends the bearer token", mark: "UI" },
      { name: "Rate limiter", description: "Protects request capacity", mark: "RL" },
      { name: "JWT middleware", description: "Validates identity and claims", mark: "JWT" },
      { name: "API handler", description: "Applies authorization rules", mark: "API" },
      { name: "Store layer", description: "Runs typed data operations", mark: "ST" },
      { name: "Redis + Postgres", description: "Caches users and persists data", mark: "DB" },
    ],
  },
  {
    title: "Social feed flow",
    tone: "violet",
    nodes: [
      { name: "Feed UI", description: "Requests posts and filters", mark: "UI" },
      { name: "Feed endpoint", description: "Parses sort and pagination", mark: "API" },
      { name: "Follower store", description: "Resolves followed accounts", mark: "FL" },
      { name: "Post store", description: "Builds the feed query", mark: "PS" },
      { name: "PostgreSQL", description: "Joins posts and metadata", mark: "DB" },
      { name: "JSON response", description: "Returns the timeline to React", mark: "{}" },
    ],
  },
];

export function ProjectHeader({ active }: { active: "home" | "app" }) {
  return (
    <header className="project-header">
      <div className="project-header-inner">
        <Link className="project-brand" to="/" aria-label="GopherSocial home">
          <span className="project-brand-mark">GS</span>
          <span>GopherSocial</span>
        </Link>
        <nav className="project-nav" aria-label="Project navigation">
          <Link className={active === "home" ? "active" : ""} to="/">Home</Link>
          <Link className={active === "app" ? "active" : ""} to="/app">Social App</Link>
          <a href="https://github.com/martinrgarciap/GopherSocial" target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
        <details className="project-menu">
          <summary aria-label="Open navigation">☰</summary>
          <nav aria-label="Mobile project navigation">
            <Link to="/">Home</Link>
            <Link to="/app">Social App</Link>
            <a href="https://github.com/martinrgarciap/GopherSocial" target="_blank" rel="noreferrer">GitHub ↗</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <ProjectHeader active="home" />
      <main className="landing-main">
        <div className="landing-content">
          <section className="landing-hero">
            <div className="landing-intro">
              <h1>GopherSocial</h1>
              <p>
                A production-minded social-network API built in Go, with secure authentication,
                social feeds, followers, account activation, caching, and a responsive React client.
              </p>
              <div className="landing-actions">
                <Link className="landing-primary" to="/app">Open Social App</Link>
                <a className="landing-secondary" href="https://github.com/martinrgarciap/GopherSocial" target="_blank" rel="noreferrer">View on GitHub ↗</a>
              </div>
            </div>
            <div className="technology-panel">
              <h2>Built With</h2>
              <div className="technology-groups">
                {technologyGroups.map((group) => (
                  <div className="technology-group" key={group.label}>
                    <h3>{group.label}</h3>
                    <ul>
                      {group.items.map((technology) => (
                        <li className={`technology-item ${technology.tone}`} key={technology.name}>
                          {technology.logo ? <img src={technology.logo} alt="" /> : <span className="technology-mark">{technology.mark}</span>}
                          <span>{technology.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="architecture-section">
            <div className="architecture-heading">
              <div>
                <p>System architecture</p>
                <h2>How GopherSocial Works</h2>
              </div>
              <div className="flow-legend">
                <span><i className="blue" />Accounts</span>
                <span><i className="green" />Security</span>
                <span><i className="violet" />Feed</span>
              </div>
            </div>
            <div className="architecture-flows">
              {flows.map((flow, flowIndex) => (
                <article className={`architecture-flow ${flow.tone}`} key={flow.title}>
                  <header><span>{flowIndex + 1}</span><h3>{flow.title}</h3></header>
                  <ol>
                    {flow.nodes.map((node, nodeIndex) => (
                      <li key={node.name}>
                        <div className="flow-node">
                          <span className="flow-mark">{node.mark}</span>
                          <div><h4>{node.name}</h4><p>{node.description}</p></div>
                        </div>
                        {nodeIndex < flow.nodes.length - 1 && <span className="flow-arrow" aria-hidden="true">→</span>}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>

          <section className="project-panels">
            <InfoPanel mark="SH" title="Security model" items={[
              "JWT authentication on protected routes",
              "Password hashing and ownership checks",
              "Configurable fixed-window rate limiting",
              "Basic auth for operational metrics",
            ]} />
            <InfoPanel mark="DB" title="Data boundaries" items={[
              "PostgreSQL stores users, posts, and follows",
              "Redis optionally caches user lookups",
              "Versioned SQL migrations and seed tooling",
              "Pagination and filtering at the store layer",
            ]} />
            <InfoPanel mark="API" title="Project highlights" items={[
              "Swagger and generated OpenAPI documentation",
              "Invitation email delivery through SendGrid",
              "Docker Compose development services",
              "React feed, profiles, posts, and comments",
            ]} />
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoPanel({ mark, title, items }: { mark: string; title: string; items: string[] }) {
  return (
    <article className="project-panel">
      <header><span>{mark}</span><h2>{title}</h2></header>
      <ul>{items.map((item) => <li key={item}>✓ <span>{item}</span></li>)}</ul>
    </article>
  );
}
