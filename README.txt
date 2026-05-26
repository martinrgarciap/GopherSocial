# GopherSocial

GopherSocial is a Go social-network API with JWT authentication, posts, comments,
followers, user feeds, invitation-based account activation, rate limiting,
Swagger docs, Postgres persistence, and optional Redis-backed caching.

The repo also includes a small Vite/React frontend under `web/`.

## Tech Stack

- Go
- Chi router
- PostgreSQL
- Redis
- JWT authentication
- SendGrid email delivery
- Swagger/OpenAPI docs
- React, Vite, TypeScript
- Docker Compose for local services

## Project Structure

```text
cmd/api                 API server
cmd/migrate/migrations  SQL migrations
cmd/migrate/seed        Database seed command
internal/auth           JWT and auth helpers
internal/db             Database connection and seed logic
internal/mailer         SendGrid mailer and templates
internal/ratelimiter    Rate limiter implementations
internal/store          Postgres data stores
internal/store/cache    Redis cache stores
docs                    Generated Swagger files
web                     Vite/React frontend
```

## Requirements

- Go 1.26 or newer
- Docker and Docker Compose
- Node.js and npm
- `golang-migrate` CLI for database migrations
- `swag` CLI if you want to regenerate Swagger docs

## Environment

The API reads configuration from environment variables. For local development,
create a `.envrc` or export these values in your shell:

```sh
export ADDR=:8080
export EXTERNAL_URL=localhost:8080
export FRONTEND_URL=http://localhost:5173
export DB_ADDR=postgres://admin:adminpassword@localhost/socialnetwork?sslmode=disable
export ENV=development

export AUTH_BASIC_USER=admin
export AUTH_BASIC_PASS=admin
export AUTH_TOKEN_SECRET=replace-me

export SENDGRID_API_KEY=replace-me
export FROM_EMAIL=you@example.com

export REDIS_ENABLED=true
export REDIS_ADDR=localhost:6379
export REDIS_PW=
export REDIS_DB=0

export RATE_LIMITER_ENABLED=true
export RATELIMITER_REQUESTS_COUNT=20
export CORS_ALLOWED_ORIGIN=http://localhost:5173
```

Keep real API keys and secrets out of git.

## Run Locally

Start Postgres and Redis:

```sh
docker compose up -d
```

Run database migrations:

```sh
make migrate-up
```

Optional: seed the database:

```sh
make seed
```

Start the API:

```sh
go run ./cmd/api
```

The API runs at:

```text
http://localhost:8080/v1
```

Start the frontend:

```sh
cd web
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

## API Docs

Swagger UI is served by the API at:

```text
http://localhost:8080/v1/swagger/index.html
```

The generated OpenAPI files live in `docs/`.

To regenerate docs:

```sh
make gen-docs
```

## Main API Routes

Public routes:

```text
GET  /v1/health
POST /v1/authentication/user
POST /v1/authentication/token
PUT  /v1/users/activate/{token}
```

Authenticated routes:

```text
POST   /v1/posts/
GET    /v1/posts/{postID}/
PATCH  /v1/posts/{postID}/
DELETE /v1/posts/{postID}/

GET /v1/users/{userID}/
PUT /v1/users/{userID}/follow
PUT /v1/users/{userID}/unfollow
GET /v1/users/feed
```

Operational route:

```text
GET /v1/debug/vars
```

`/v1/debug/vars` is protected with HTTP basic auth.

## Authentication Flow

Register a user:

```sh
curl -i -X POST http://localhost:8080/v1/authentication/user \
  -H "Content-Type: application/json" \
  -d '{"username":"martin","email":"martin@example.com","password":"password123"}'
```

Activate the user with the returned invitation token:

```sh
curl -i -X PUT http://localhost:8080/v1/users/activate/YOUR_INVITATION_TOKEN
```

Create a JWT:

```sh
curl -i -X POST http://localhost:8080/v1/authentication/token \
  -H "Content-Type: application/json" \
  -d '{"email":"martin@example.com","password":"password123"}'
```

Use the JWT on protected routes:

```sh
Authorization: Bearer YOUR_JWT
```

## Example Requests

Create a post:

```sh
curl -i -X POST http://localhost:8080/v1/posts/ \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello GopherSocial","content":"First post","tags":["go","api"]}'
```

Get the user feed:

```sh
curl -i "http://localhost:8080/v1/users/feed?limit=20&offset=0&sort=desc" \
  -H "Authorization: Bearer YOUR_JWT"
```

Follow a user:

```sh
curl -i -X PUT http://localhost:8080/v1/users/2/follow \
  -H "Authorization: Bearer YOUR_JWT"
```

## Tests

Run the Go test suite:

```sh
make test
```

or:

```sh
go test ./...
```

Run frontend checks:

```sh
cd web
npm run lint
npm run build
```

## Notes

- Redis caching is optional and controlled by `REDIS_ENABLED`.
- API rate limiting is controlled by `RATE_LIMITER_ENABLED` and
  `RATELIMITER_REQUESTS_COUNT`.
- Registration sends an invitation email through SendGrid. In development, the
  mailer uses SendGrid sandbox mode unless the environment is configured as
  production.
- The API shuts down gracefully on interrupt or terminate signals.
